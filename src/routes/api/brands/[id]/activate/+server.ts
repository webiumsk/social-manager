import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { brands } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = parseInt(params.id, 10);
	if (Number.isNaN(id)) return json({ error: 'Invalid brand id' }, { status: 400 });
	const [existing] = await db
		.select()
		.from(brands)
		.where(and(eq(brands.id, id), eq(brands.userId, locals.user.id)));
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	await db.update(brands).set({ isActive: false }).where(eq(brands.userId, locals.user.id));
	await db.update(brands).set({ isActive: true }).where(and(eq(brands.id, id), eq(brands.userId, locals.user.id)));
	return json({ ok: true, activeBrandId: id });
};
