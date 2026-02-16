/** Tier definitions, limits, and pricing (from spec) */
export const TIERS = {
	free: {
		name: 'Free',
		price: { monthly: 0, yearly: 0 },
		limits: {
			brands: 1,
			platforms: 3,
			postsPerMonth: 30,
			aiAdaptationsPerMonth: 0,
			mediaStorageMb: 50
		},
		features: {
			scheduling: false,
			analytics: false,
			customBranding: false,
			prioritySupport: false
		}
	},
	pro: {
		name: 'Pro',
		price: {
			monthly: { usd: 900, sats: 15000 },
			yearly: { usd: 7900, sats: 130000 }
		},
		limits: {
			brands: 5,
			platforms: 7,
			postsPerMonth: -1,
			aiAdaptationsPerMonth: 500,
			mediaStorageMb: 1000
		},
		features: {
			scheduling: true,
			analytics: true,
			customBranding: true,
			prioritySupport: false
		}
	},
	team: {
		name: 'Team',
		price: {
			monthly: { usd: 2500, sats: 42000 },
			yearly: { usd: 22000, sats: 370000 }
		},
		limits: {
			brands: -1,
			platforms: 7,
			postsPerMonth: -1,
			aiAdaptationsPerMonth: -1,
			mediaStorageMb: 5000
		},
		features: {
			scheduling: true,
			analytics: true,
			customBranding: true,
			prioritySupport: true,
			teamMembers: 5,
			approvalWorkflow: true
		}
	}
} as const;

export type TierId = keyof typeof TIERS;
