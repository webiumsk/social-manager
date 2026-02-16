import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { userSettings, brands } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '$lib/utils/crypto';
import { adapt } from '$lib/server/ai';
import { AI_PROVIDER_DEFAULTS } from '$lib/server/ai/providers';
import { checkTierLimit } from '$lib/server/billing/guard.js';
import { incrementAiUsage } from '$lib/server/billing/usage.js';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = locals.user.id;

	const tierCheck = await checkTierLimit(userId, 'adapt');
	if (!tierCheck.allowed) {
		return json({ error: tierCheck.reason }, { status: 403 });
	}

	const body = await request.json();
	const text = typeof body.text === 'string' ? body.text.trim() : '';
	const brandId = body.brandId != null ? Number(body.brandId) : null;
	const platforms = Array.isArray(body.platforms) ? body.platforms.filter((p) => typeof p === 'string') : [];
	const hasMedia = Boolean(body.hasMedia);

	if (!text) return json({ error: 'Missing text' }, { status: 400 });
	if (platforms.length === 0) return json({ error: 'Select at least one platform' }, { status: 400 });

	let voicePrompt: string;
	if (brandId != null) {
		const [brand] = await db
			.select({ voicePrompt: brands.voicePrompt })
			.from(brands)
			.where(and(eq(brands.id, brandId), eq(brands.userId, userId)));
		if (!brand) return json({ error: 'Brand not found' }, { status: 404 });
		voicePrompt = brand.voicePrompt;
	} else {
		voicePrompt = 'You are a social media manager. Adapt the given text for each requested platform. Return ONLY valid JSON with keys for each platform. No markdown, no explanation.';
	}

	const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
	const provider = settings?.aiProvider?.trim() || '';
	if (!provider || provider === 'none') {
		return json(
			{ error: 'Set AI provider in Settings (AI configuration)' },
			{ status: 400 }
		);
	}

	const defaults = AI_PROVIDER_DEFAULTS[provider];
	const needsKey = defaults?.needsApiKey !== false;
	let apiKey: string | null = null;
	if (settings?.aiApiKeyEncrypted) {
		try {
			apiKey = decrypt(settings.aiApiKeyEncrypted, userId);
		} catch {
			return json({ error: 'Failed to decrypt API key' }, { status: 500 });
		}
	}
	if (needsKey && !apiKey) {
		return json({ error: 'Set API key for the selected provider in Settings' }, { status: 400 });
	}

	const endpoint = (settings?.aiEndpoint?.trim() || defaults?.endpoint) ?? '';
	const model = (settings?.aiModel?.trim() || defaults?.defaultModel) ?? '';
	const temperature = settings?.aiTemperature != null ? Number(settings.aiTemperature) : 0.7;

	try {
		const result = await adapt(
			{ text, voicePrompt, platforms, hasMedia },
			{ provider, endpoint, model, apiKey, temperature }
		);
		await incrementAiUsage(userId);
		return json(result);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return json({ error: msg }, { status: 500 });
	}
};
