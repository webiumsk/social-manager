/** Stripe Checkout — stub for future integration. */
export interface CreateCheckoutParams {
	userId: string;
	tier: 'pro' | 'team';
	period: 'monthly' | 'yearly';
	successUrl: string;
	cancelUrl: string;
}

export interface CreateCheckoutResult {
	url: string;
	sessionId: string;
}

/** Create Stripe Checkout session. Not implemented yet. */
export async function createStripeCheckoutSession(
	_params: CreateCheckoutParams
): Promise<CreateCheckoutResult> {
	throw new Error(
		'Stripe payments are not configured yet. Set STRIPE_SECRET_KEY and price IDs.'
	);
}
