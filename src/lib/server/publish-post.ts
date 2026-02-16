import path from 'node:path';
import { db } from '$lib/server/db';
import {
	posts,
	postVariants,
	platformConnections,
	publishLog
} from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { decrypt } from '$lib/utils/crypto';
import { getPlatform } from '$lib/server/platforms';
import { incrementQuickConnectUsage } from '$lib/server/billing/quick-connect-usage.js';

export interface PublishPostResult {
	ok: boolean;
	published: number;
	total: number;
	results: { platform: string; success: boolean; postUrl?: string; error?: string }[];
}

/**
 * Publish a post to its selected platforms. Used by the manual Publish action and by the scheduled-publish cron.
 */
export async function publishPost(postId: number, userId: string): Promise<PublishPostResult> {
	const [post] = await db
		.select()
		.from(posts)
		.where(and(eq(posts.id, postId), eq(posts.userId, userId)));
	if (!post) {
		throw new Error('Not found');
	}

	const variants = await db
		.select()
		.from(postVariants)
		.where(eq(postVariants.postId, postId));
	if (variants.length === 0) {
		throw new Error('No platforms selected for this post');
	}

	const connections = await db
		.select()
		.from(platformConnections)
		.where(
			and(
				eq(platformConnections.userId, userId),
				post.brandId != null
					? eq(platformConnections.brandId, post.brandId)
					: isNull(platformConnections.brandId)
			)
		);
	const connectionByPlatform = new Map(connections.map((c) => [c.platform, c]));

	const mediaPathsRaw: string[] = post.mediaPaths ? JSON.parse(post.mediaPaths) : [];
	const mediaPaths = mediaPathsRaw.map((p: string) => path.join(process.cwd(), 'data', p));
	const now = new Date().toISOString();
	const results: { platform: string; success: boolean; postUrl?: string; error?: string }[] = [];
	let publishedCount = 0;

	for (const variant of variants) {
		const conn = connectionByPlatform.get(variant.platform);
		const publisher = getPlatform(variant.platform);

		if (!conn || !publisher) {
			await db
				.update(postVariants)
				.set({
					status: 'failed',
					errorMessage: !conn ? 'No connection for platform.' : 'Platform not supported.'
				})
				.where(eq(postVariants.id, variant.id));
			await db.insert(publishLog).values({
				userId,
				postId,
				platform: variant.platform,
				action: 'error',
				details: !conn ? 'No connection' : 'Unknown platform'
			});
			results.push({ platform: variant.platform, success: false, error: !conn ? 'Missing connection' : 'Unknown platform' });
			continue;
		}

		let credentials: Record<string, unknown>;
		try {
			credentials = JSON.parse(decrypt(conn.credentials, userId)) as Record<string, unknown>;
		} catch {
			await db
				.update(postVariants)
				.set({ status: 'failed', errorMessage: 'Failed to decrypt credentials.' })
				.where(eq(postVariants.id, variant.id));
			await db.insert(publishLog).values({
				userId,
				postId,
				platform: variant.platform,
				action: 'error',
				details: 'Decrypt failed'
			});
			results.push({ platform: variant.platform, success: false, error: 'Invalid credentials' });
			continue;
		}

		try {
			const result = await publisher.publish(
				variant.adaptedText,
				mediaPathsRaw.length > 0 ? mediaPaths : undefined,
				credentials
			);

			if (result.success) {
				await db
					.update(postVariants)
					.set({
						status: 'published',
						publishedAt: now,
						platformPostId: result.postId ?? null,
						platformUrl: result.postUrl ?? null,
						errorMessage: null
					})
					.where(eq(postVariants.id, variant.id));
				await db.insert(publishLog).values({
					userId,
					postId,
					platform: variant.platform,
					action: 'publish',
					details: result.postUrl ?? result.postId ?? 'ok'
				});
				if (conn.connectionMode === 'quick_connect') {
					await incrementQuickConnectUsage(variant.platform);
				}
				publishedCount++;
				results.push({ platform: variant.platform, success: true, postUrl: result.postUrl });
			} else {
				await db
					.update(postVariants)
					.set({
						status: 'failed',
						errorMessage: result.error ?? 'Unknown error'
					})
					.where(eq(postVariants.id, variant.id));
				await db.insert(publishLog).values({
					userId,
					postId,
					platform: variant.platform,
					action: 'error',
					details: result.error ?? 'publish failed'
				});
				results.push({ platform: variant.platform, success: false, error: result.error });
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			await db
				.update(postVariants)
				.set({ status: 'failed', errorMessage: msg })
				.where(eq(postVariants.id, variant.id));
			await db.insert(publishLog).values({
				userId,
				postId,
				platform: variant.platform,
				action: 'error',
				details: msg
			});
			results.push({ platform: variant.platform, success: false, error: msg });
		}
	}

	const postStatus =
		publishedCount === 0 ? 'failed' : publishedCount === variants.length ? 'published' : 'partial';
	await db
		.update(posts)
		.set({
			status: postStatus,
			...(publishedCount > 0 ? { publishedAt: now } : {}),
			updatedAt: now
		})
		.where(eq(posts.id, postId));

	return {
		ok: true,
		published: publishedCount,
		total: variants.length,
		results
	};
}
