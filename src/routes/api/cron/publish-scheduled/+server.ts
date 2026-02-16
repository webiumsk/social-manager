import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { posts } from '$lib/server/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { publishPost } from '$lib/server/publish-post.js';

/**
 * Cron endpoint: publish posts that are scheduled for now or in the past.
 * Call periodically (e.g. every minute) with CRON_SECRET in query or Authorization header.
 *
 * Example: GET /api/cron/publish-scheduled?secret=YOUR_CRON_SECRET
 * Or: Authorization: Bearer YOUR_CRON_SECRET
 */
export const GET: RequestHandler = async ({ url, request }) => {
	const secret = url.searchParams.get('secret') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
	const expected = env.CRON_SECRET;
	if (!expected || secret !== expected) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const now = new Date().toISOString();
	const due = await db
		.select({ id: posts.id, userId: posts.userId })
		.from(posts)
		.where(and(eq(posts.status, 'scheduled'), lte(posts.scheduledAt, now)));

	const results: { postId: number; ok: boolean; published?: number; total?: number; error?: string }[] = [];
	for (const row of due) {
		try {
			const result = await publishPost(row.id, row.userId);
			results.push({ postId: row.id, ok: true, published: result.published, total: result.total });
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			results.push({ postId: row.id, ok: false, error: msg });
		}
	}

	return json({
		ok: true,
		processed: due.length,
		results
	});
};
