import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserSubscription, getOrCreateSubscription } from '$lib/server/billing/subscription.js';
import { getCurrentUsage } from '$lib/server/billing/usage.js';
import { TIERS } from '$lib/server/billing/tiers.js';
import { isSelfHosted } from '$lib/server/billing/guard.js';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = locals.user.id;

	await getOrCreateSubscription(userId);
	const subscription = await getUserSubscription(userId);
	const usage = await getCurrentUsage(userId);
	const tier = TIERS[subscription.tier as keyof typeof TIERS] ?? TIERS.free;

	return json({
		tier: subscription.tier,
		tierName: tier.name,
		status: subscription.status,
		currentPeriodStart: subscription.currentPeriodStart,
		currentPeriodEnd: subscription.currentPeriodEnd,
		cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
		limits: tier.limits,
		usage: {
			postsThisMonth: usage.postsThisMonth,
			adaptationsThisMonth: usage.adaptationsThisMonth,
			brandsCount: usage.brandsCount,
			platformsCount: usage.platformsCount
		},
		selfHosted: isSelfHosted()
	});
};
