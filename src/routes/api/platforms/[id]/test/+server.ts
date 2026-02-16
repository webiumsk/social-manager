import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { platformConnections } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { decrypt } from '$lib/utils/crypto';
import { getPlatform } from '$lib/server/platforms';

export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = parseInt(params.id, 10);
	if (Number.isNaN(id)) return json({ error: 'Invalid id' }, { status: 400 });
	const [row] = await db
		.select()
		.from(platformConnections)
		.where(and(eq(platformConnections.id, id), eq(platformConnections.userId, locals.user.id)));
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	const publisher = getPlatform(row.platform);
	if (!publisher) return json({ error: 'Unknown platform' }, { status: 400 });
	let credentials: Record<string, unknown>;
	try {
		credentials = JSON.parse(decrypt(row.credentials, locals.user.id)) as Record<string, unknown>;
	} catch {
		return json({ success: false, error: 'Failed to decrypt credentials' }, { status: 500 });
	}
	const result = await publisher.testConnection(credentials);
	if (result.success && result.displayName) {
		await db
			.update(platformConnections)
			.set({ displayName: result.displayName })
			.where(eq(platformConnections.id, id));
	}
	return json(result);
};
