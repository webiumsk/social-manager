import { db } from '$lib/server/db';
import { subscriptions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { TierId } from './tiers.js';

export type SubscriptionRow = typeof subscriptions.$inferSelect;

/** Get user's subscription; if none, return default free tier (no row). */
export async function getUserSubscription(userId: string): Promise<{
	tier: TierId;
	status: string;
	currentPeriodStart: string | null;
	currentPeriodEnd: string | null;
	cancelAtPeriodEnd: boolean;
	row: SubscriptionRow | null;
}> {
	const [row] = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.limit(1);

	if (!row) {
		return {
			tier: 'free',
			status: 'active',
			currentPeriodStart: null,
			currentPeriodEnd: null,
			cancelAtPeriodEnd: false,
			row: null
		};
	}

	const tier = (row.tier === 'pro' || row.tier === 'team' ? row.tier : 'free') as TierId;
	return {
		tier,
		status: row.status ?? 'active',
		currentPeriodStart: row.currentPeriodStart,
		currentPeriodEnd: row.currentPeriodEnd,
		cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd),
		row
	};
}

/** Get or create subscription for user. New users get a free tier row so we have a single source of truth. */
export async function getOrCreateSubscription(userId: string): Promise<SubscriptionRow> {
	const [existing] = await db
		.select()
		.from(subscriptions)
		.where(eq(subscriptions.userId, userId))
		.limit(1);

	if (existing) return existing;

	const [inserted] = await db
		.insert(subscriptions)
		.values({
			userId,
			tier: 'free',
			status: 'active'
		})
		.returning();

	if (!inserted) throw new Error('Failed to create subscription');
	return inserted;
}
