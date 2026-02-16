import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getQuickConnectQuotaStatus } from '$lib/server/billing/quick-connect-usage.js';
import { QUICK_CONNECT_QUOTA } from '$lib/utils/constants';
import type { PlatformId } from '$lib/utils/constants';

/** Returns Quick Connect usage and limit per platform (for showing warnings in Settings). */
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	try {
		const status = await getQuickConnectQuotaStatus();
		return json(status);
	} catch (err) {
		// Table may be missing (run npm run db:push) or DB error — return safe default
		const fallback: Record<string, { usage: number; limit: number }> = {};
		for (const platform of Object.keys(QUICK_CONNECT_QUOTA)) {
			fallback[platform] = { usage: 0, limit: QUICK_CONNECT_QUOTA[platform as PlatformId] ?? 0 };
		}
		return json(fallback);
	}
};
