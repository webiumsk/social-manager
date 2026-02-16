import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { posts, postVariants } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { checkTierLimit } from '$lib/server/billing/guard.js';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = locals.user.id;
	const brandId = url.searchParams.get('brandId');
	const status = url.searchParams.get('status');
	let q = db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt));
	const rows = await q;
	let list = rows;
	if (brandId) {
		const id = parseInt(brandId, 10);
		if (!Number.isNaN(id)) list = list.filter((p) => p.brandId === id);
	}
	if (status) list = list.filter((p) => p.status === status);
	return json(list);
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const tierCheck = await checkTierLimit(locals.user.id, 'post');
	if (!tierCheck.allowed) {
		return json({ error: tierCheck.reason }, { status: 403 });
	}
	const body = await request.json();
	const originalText = String(body.originalText ?? '').trim();
	const brandId = body.brandId != null ? Number(body.brandId) : null;
	const platformIds = Array.isArray(body.platforms) ? body.platforms : [];
	const mediaPaths = Array.isArray(body.mediaPaths) ? body.mediaPaths : null;
	const tags = Array.isArray(body.tags) ? body.tags : null;
	const scheduledAtRaw = body.scheduledAt;
	const scheduledAt =
		typeof scheduledAtRaw === 'string' && scheduledAtRaw.trim()
			? new Date(scheduledAtRaw).toISOString()
			: null;
	const status = scheduledAt ? 'scheduled' : 'draft';
	const [post] = await db
		.insert(posts)
		.values({
			userId: locals.user.id,
			brandId,
			originalText: originalText || '(empty)',
			status,
			scheduledAt,
			mediaPaths: mediaPaths ? JSON.stringify(mediaPaths) : null,
			tags: tags ? JSON.stringify(tags) : null
		})
		.returning();
	if (!post) return json({ error: 'Insert failed' }, { status: 500 });
	for (const platform of platformIds) {
		await db.insert(postVariants).values({
			postId: post.id,
			platform: String(platform),
			adaptedText: originalText || '(empty)',
			status: 'pending'
		});
	}
	const [full] = await db.select().from(posts).where(eq(posts.id, post.id));
	return json(full!);
};
