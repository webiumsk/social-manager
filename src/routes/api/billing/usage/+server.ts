import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCurrentUsage } from '$lib/server/billing/usage.js';
import { getUserSubscription } from '$lib/server/billing/subscription.js';
import { TIERS } from '$lib/server/billing/tiers.js';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const usage = await getCurrentUsage(locals.user.id);
	const subscription = await getUserSubscription(locals.user.id);
	const tier = TIERS[subscription.tier as keyof typeof TIERS] ?? TIERS.free;

	return json({
		...usage,
		limits: {
			postsPerMonth: tier.limits.postsPerMonth,
			aiAdaptationsPerMonth: tier.limits.aiAdaptationsPerMonth,
			brands: tier.limits.brands,
			platforms: tier.limits.platforms
		}
	});
};
