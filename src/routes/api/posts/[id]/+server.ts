import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { posts, postVariants } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

function parseId(params: { id: string }): number {
	const id = parseInt(params.id, 10);
	if (Number.isNaN(id)) throw new Error('Invalid id');
	return id;
}

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = parseId(params);
	const [post] = await db
		.select()
		.from(posts)
		.where(and(eq(posts.id, id), eq(posts.userId, locals.user!.id)));
	if (!post) return json({ error: 'Not found' }, { status: 404 });
	const variants = await db.select().from(postVariants).where(eq(postVariants.postId, id));
	return json({ ...post, variants });
};

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = parseId(params);
	const [existing] = await db
		.select()
		.from(posts)
		.where(and(eq(posts.id, id), eq(posts.userId, locals.user!.id)));
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	const body = await request.json();
	const originalText = body.originalText !== undefined ? String(body.originalText).trim() : existing.originalText;
	const mediaPaths = body.mediaPaths !== undefined ? body.mediaPaths : null;
	const tags = body.tags !== undefined ? body.tags : null;
	const scheduledAtRaw = body.scheduledAt;
	const scheduledAt =
		scheduledAtRaw === null || scheduledAtRaw === ''
			? null
			: typeof scheduledAtRaw === 'string' && scheduledAtRaw.trim()
				? new Date(scheduledAtRaw).toISOString()
				: existing.scheduledAt;
	const status = scheduledAt ? 'scheduled' : (body.status !== undefined ? body.status : existing.status);
	// If clearing schedule, set back to draft
	const nextStatus = scheduledAt ? 'scheduled' : (existing.status === 'scheduled' ? 'draft' : existing.status);
	await db
		.update(posts)
		.set({
			originalText: originalText || existing.originalText,
			mediaPaths: mediaPaths != null ? JSON.stringify(mediaPaths) : existing.mediaPaths,
			tags: tags != null ? JSON.stringify(tags) : existing.tags,
			scheduledAt,
			status: nextStatus,
			updatedAt: new Date().toISOString()
		})
		.where(eq(posts.id, id));
	if (body.variants && Array.isArray(body.variants)) {
		for (const v of body.variants) {
			if (v.platform != null && v.adaptedText !== undefined) {
				await db
					.update(postVariants)
					.set({
						adaptedText: String(v.adaptedText),
						charCount: String(v.adaptedText).length
					})
					.where(and(eq(postVariants.postId, id), eq(postVariants.platform, v.platform)));
			}
		}
	}
	const [updated] = await db.select().from(posts).where(eq(posts.id, id));
	const variants = await db.select().from(postVariants).where(eq(postVariants.postId, id));
	return json({ ...updated!, variants });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = parseId(params);
	const [existing] = await db
		.select()
		.from(posts)
		.where(and(eq(posts.id, id), eq(posts.userId, locals.user!.id)));
	if (!existing) return json({ error: 'Not found' }, { status: 404 });
	await db.delete(posts).where(eq(posts.id, id));
	return json({ ok: true });
};
