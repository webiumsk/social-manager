import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { brands } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

function getBrandId(params: { id: string }): number {
	const id = parseInt(params.id, 10);
	if (Number.isNaN(id)) throw new Error('Invalid brand id');
	return id;
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = getBrandId(params);
	const [row] = await db
		.select()
		.from(brands)
		.where(and(eq(brands.id, id), eq(brands.userId, locals.user!.id)));
	if (!row) return json({ error: 'Not found' }, { status: 404 });
	return json(row);
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = getBrandId(params);
	const [existing] = await db
		.select()
		.from(brands)
		.where(and(eq(brands.id, id), eq(brands.userId, locals.user!.id)));
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	const body = await request.json();
	const name = body.name != null ? String(body.name).trim() : existing.name;
	const description = body.description !== undefined ? (body.description && String(body.description)) : existing.description;
	const voicePrompt = body.voicePrompt != null ? String(body.voicePrompt).trim() : existing.voicePrompt;
	if (!name || !voicePrompt) return json({ error: 'Name and voice prompt required' }, { status: 400 });
	await db
		.update(brands)
		.set({ name, description, voicePrompt, updatedAt: new Date().toISOString() })
		.where(eq(brands.id, id));
	const [updated] = await db.select().from(brands).where(eq(brands.id, id));
	return json(updated!);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = getBrandId(params);
	const [existing] = await db
		.select()
		.from(brands)
		.where(and(eq(brands.id, id), eq(brands.userId, locals.user!.id)));
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	await db.delete(brands).where(eq(brands.id, id));
	return json({ ok: true });
};
