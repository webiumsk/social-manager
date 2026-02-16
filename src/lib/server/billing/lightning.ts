/** Lightning (SatFlux) invoice creation — stub for future integration. */
export interface CreateInvoiceParams {
	userId: string;
	amountSats: number;
	tier: string;
	period: 'monthly' | 'yearly';
}

export interface CreateInvoiceResult {
	bolt11: string;
	paymentHash: string;
	expiresAt: string;
}

/** Create Lightning invoice via SatFlux API. Not implemented yet. */
export async function createLightningInvoice(
	_params: CreateInvoiceParams
): Promise<CreateInvoiceResult> {
	throw new Error(
		'Lightning (SatFlux) payments are not configured yet. Set SATFLUX_API_URL and SATFLUX_API_KEY.'
	);
}
