import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt } from '$lib/utils/crypto';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = locals.user.id;
	const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
	const settings = row
		? {
				aiProvider: row.aiProvider ?? undefined,
				aiEndpoint: row.aiEndpoint ?? undefined,
				aiModel: row.aiModel ?? undefined,
				aiTemperature: row.aiTemperature ?? undefined,
				accentColor: row.accentColor ?? '#7c3aed',
				theme: row.theme ?? 'dark',
				hasAiKey: !!row.aiApiKeyEncrypted
			}
		: {
				aiProvider: undefined,
				aiEndpoint: undefined,
				aiModel: undefined,
				aiTemperature: undefined,
				accentColor: '#7c3aed',
				theme: 'dark',
				hasAiKey: false
			};
	return json(settings);
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = locals.user.id;
	const body = await request.json();
	const aiApiKey = body.aiApiKey as string | undefined;
	const payload: Record<string, unknown> = {
		aiProvider: body.aiProvider ?? null,
		aiEndpoint: body.aiEndpoint ?? null,
		aiModel: body.aiModel ?? null,
		aiTemperature:
			typeof body.aiTemperature === 'number' ? body.aiTemperature : body.aiTemperature ?? null,
		accentColor: body.accentColor ?? '#7c3aed',
		theme: body.theme ?? 'dark',
		updatedAt: new Date().toISOString()
	};
	if (aiApiKey !== undefined) {
		if (aiApiKey === '' || aiApiKey === null) payload.aiApiKeyEncrypted = null;
		else payload.aiApiKeyEncrypted = encrypt(aiApiKey, userId);
	}
	const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
	const set = {
		aiProvider: (payload.aiProvider as string) ?? null,
		aiEndpoint: (payload.aiEndpoint as string) ?? null,
		aiModel: (payload.aiModel as string) ?? null,
		aiTemperature: (payload.aiTemperature as number) ?? null,
		accentColor: (payload.accentColor as string) ?? '#7c3aed',
		theme: (payload.theme as string) ?? 'dark',
		updatedAt: payload.updatedAt as string
	} as Record<string, unknown>;
	if (payload.aiApiKeyEncrypted !== undefined) set.aiApiKeyEncrypted = payload.aiApiKeyEncrypted;

	if (existing) {
		await db.update(userSettings).set(set).where(eq(userSettings.userId, userId));
	} else {
		await db.insert(userSettings).values({
			userId,
			aiProvider: set.aiProvider as string,
			aiApiKeyEncrypted: (set.aiApiKeyEncrypted as string) ?? null,
			aiEndpoint: set.aiEndpoint as string,
			aiModel: set.aiModel as string,
			aiTemperature: set.aiTemperature as number,
			accentColor: set.accentColor as string,
			theme: set.theme as string
		});
	}
	return json({ ok: true });
};
