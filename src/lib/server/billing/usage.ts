import { db } from '$lib/server/db';
import { posts, brands, platformConnections, aiUsage } from '$lib/server/db/schema';
import { eq, and, count, gte } from 'drizzle-orm';

function currentMonth(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function startOfCurrentMonth(): string {
	const d = new Date();
	d.setDate(1);
	d.setHours(0, 0, 0, 0);
	return d.toISOString();
}

export interface CurrentUsage {
	postsThisMonth: number;
	adaptationsThisMonth: number;
	brandsCount: number;
	platformsCount: number;
	month: string;
}

export async function getCurrentUsage(userId: string): Promise<CurrentUsage> {
	const month = currentMonth();
	const start = startOfCurrentMonth();

	const [postsResult] = await db
		.select({ count: count() })
		.from(posts)
		.where(and(eq(posts.userId, userId), gte(posts.createdAt, start)));

	const usageRows = await db
		.select({ adaptationsCount: aiUsage.adaptationsCount })
		.from(aiUsage)
		.where(and(eq(aiUsage.userId, userId), eq(aiUsage.month, month)));
	const adaptationsThisMonth = usageRows.reduce((s, r) => s + (r.adaptationsCount ?? 0), 0);

	const [brandsResult] = await db
		.select({ count: count() })
		.from(brands)
		.where(eq(brands.userId, userId));

	const [platformsResult] = await db
		.select({ count: count() })
		.from(platformConnections)
		.where(eq(platformConnections.userId, userId));

	return {
		postsThisMonth: postsResult?.count ?? 0,
		adaptationsThisMonth,
		brandsCount: brandsResult?.count ?? 0,
		platformsCount: platformsResult?.count ?? 0,
		month
	};
}

export async function incrementAiUsage(userId: string, addCount = 1): Promise<void> {
	const month = currentMonth();
	const existing = await db
		.select()
		.from(aiUsage)
		.where(and(eq(aiUsage.userId, userId), eq(aiUsage.month, month)))
		.limit(1);

	if (existing.length > 0) {
		await db
			.update(aiUsage)
			.set({
				adaptationsCount: (existing[0].adaptationsCount ?? 0) + addCount
			})
			.where(eq(aiUsage.id, existing[0].id));
	} else {
		await db.insert(aiUsage).values({
			userId,
			month,
			adaptationsCount: addCount
		});
	}
}
