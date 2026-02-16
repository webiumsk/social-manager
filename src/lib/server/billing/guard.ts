import { env } from '$env/dynamic/private';
import { getUserSubscription } from './subscription.js';
import { getCurrentUsage } from './usage.js';
import { TIERS, type TierId } from './tiers.js';

export function isSelfHosted(): boolean {
	return env.SELF_HOSTED === 'true' || env.SELF_HOSTED === '1';
}

export type TierAction = 'post' | 'adapt' | 'brand' | 'platform';

export interface TierCheckResult {
	allowed: boolean;
	reason?: string;
}

/** Check tier limit before performing an action. When self-hosted, always allow. */
export async function checkTierLimit(
	userId: string,
	action: TierAction
): Promise<TierCheckResult> {
	if (isSelfHosted()) return { allowed: true };

	const subscription = await getUserSubscription(userId);
	const tierKey = subscription.tier as TierId;
	const tier = TIERS[tierKey] ?? TIERS.free;
	const usage = await getCurrentUsage(userId);

	switch (action) {
		case 'post':
			if (
				tier.limits.postsPerMonth !== -1 &&
				usage.postsThisMonth >= tier.limits.postsPerMonth
			) {
				return {
					allowed: false,
					reason: `Post limit reached (${tier.limits.postsPerMonth}/month). Upgrade to Pro for unlimited posts.`
				};
			}
			break;
		case 'adapt':
			if (tier.limits.aiAdaptationsPerMonth === 0) {
				return {
					allowed: false,
					reason:
						'AI adaptation requires a Pro subscription. You can still edit texts manually.'
				};
			}
			if (
				tier.limits.aiAdaptationsPerMonth !== -1 &&
				usage.adaptationsThisMonth >= tier.limits.aiAdaptationsPerMonth
			) {
				return {
					allowed: false,
					reason: `AI adaptation limit reached (${tier.limits.aiAdaptationsPerMonth}/month).`
				};
			}
			break;
		case 'brand':
			if (
				tier.limits.brands !== -1 &&
				usage.brandsCount >= tier.limits.brands
			) {
				return {
					allowed: false,
					reason: `Brand limit reached (${tier.limits.brands}). Upgrade for more brands.`
				};
			}
			break;
		case 'platform':
			if (usage.platformsCount >= tier.limits.platforms) {
				return {
					allowed: false,
					reason: `Platform connection limit reached (${tier.limits.platforms}). Upgrade for more platforms.`
				};
			}
			break;
	}
	return { allowed: true };
}
