import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '$lib/utils/crypto';
import { testConnection } from '$lib/server/ai';
import { AI_PROVIDER_DEFAULTS } from '$lib/server/ai/providers';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = locals.user.id;

	const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
	const provider = settings?.aiProvider?.trim() || '';
	if (!provider || provider === 'none') {
		return json(
			{ success: false, error: 'Set AI provider in Settings' },
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
			return json({ success: false, error: 'Failed to decrypt API key' }, { status: 500 });
		}
	}
	if (needsKey && !apiKey) {
		return json({ success: false, error: 'Set API key for the selected provider in Settings' }, { status: 400 });
	}

	const endpoint = (settings?.aiEndpoint?.trim() || defaults?.endpoint) ?? '';
	const model = (settings?.aiModel?.trim() || defaults?.defaultModel) ?? '';
	const temperature = settings?.aiTemperature != null ? Number(settings.aiTemperature) : 0.7;

	const result = await testConnection({
		provider,
		endpoint,
		model,
		apiKey,
		temperature
	});
	return json(result);
};
