import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { brands } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkTierLimit } from '$lib/server/billing/guard.js';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const list = await db
		.select()
		.from(brands)
		.where(eq(brands.userId, locals.user.id))
		.orderBy(brands.createdAt);
	return json(list);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const tierCheck = await checkTierLimit(locals.user.id, 'brand');
	if (!tierCheck.allowed) {
		return json({ error: tierCheck.reason }, { status: 403 });
	}
	const body = await request.json();
	const name = String(body.name ?? '').trim();
	const description = body.description != null ? String(body.description) : null;
	const voicePrompt = String(body.voicePrompt ?? '').trim();
	if (!name || !voicePrompt) return json({ error: 'Name and voice prompt required' }, { status: 400 });
	const [existing] = await db.select().from(brands).where(eq(brands.userId, locals.user.id));
	const isActive = !existing;
	const [inserted] = await db
		.insert(brands)
		.values({
			userId: locals.user.id,
			name,
			description,
			voicePrompt,
			isActive
		})
		.returning();
	return json(inserted!);
};
