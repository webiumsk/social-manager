import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { platformConnections } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '$lib/utils/crypto';

function parseId(params: { id: string }): number {
	const id = parseInt(params.id, 10);
	if (Number.isNaN(id)) throw new Error('Invalid id');
	return id;
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = parseId(params);
	const [row] = await db
		.select({
			id: platformConnections.id,
			brandId: platformConnections.brandId,
			platform: platformConnections.platform,
			displayName: platformConnections.displayName,
			connectionMode: platformConnections.connectionMode,
			isActive: platformConnections.isActive
		})
		.from(platformConnections)
		.where(and(eq(platformConnections.id, id), eq(platformConnections.userId, locals.user!.id)));
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	return json(row);
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = parseId(params);
	const [existing] = await db
		.select()
		.from(platformConnections)
		.where(and(eq(platformConnections.id, id), eq(platformConnections.userId, locals.user!.id)));
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	const body = await request.json();
	const displayName = body.displayName !== undefined ? (body.displayName && String(body.displayName)) : existing.displayName;
	const connectionMode =
		body.connectionMode === 'quick_connect' || body.connectionMode === 'manual'
			? body.connectionMode
			: existing.connectionMode;
	const credentials =
		body.credentials !== undefined && typeof body.credentials === 'object'
			? encrypt(JSON.stringify(body.credentials), locals.user.id)
			: existing.credentials;
	await db
		.update(platformConnections)
		.set({ displayName, connectionMode, credentials })
		.where(eq(platformConnections.id, id));
	const [updated] = await db.select().from(platformConnections).where(eq(platformConnections.id, id));
	return json({ ...updated!, credentials: undefined });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = parseId(params);
	const [existing] = await db
		.select()
		.from(platformConnections)
		.where(and(eq(platformConnections.id, id), eq(platformConnections.userId, locals.user!.id)));
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	await db.delete(platformConnections).where(eq(platformConnections.id, id));
	return json({ ok: true });
};
