import { db } from '$lib/server/db';
import { quickConnectUsage } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { QUICK_CONNECT_QUOTA } from '$lib/utils/constants';
import type { PlatformId } from '$lib/utils/constants';

function currentMonth(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Increment Quick Connect usage for a platform this month (call after successful publish). */
export async function incrementQuickConnectUsage(platform: string): Promise<void> {
	const month = currentMonth();
	const [row] = await db
		.select()
		.from(quickConnectUsage)
		.where(and(eq(quickConnectUsage.platform, platform), eq(quickConnectUsage.month, month)))
		.limit(1);
	if (row) {
		await db
			.update(quickConnectUsage)
			.set({ count: (row.count ?? 0) + 1 })
			.where(eq(quickConnectUsage.id, row.id));
	} else {
		await db.insert(quickConnectUsage).values({ platform, month, count: 1 });
	}
}

/** Get current month usage and quota for Quick Connect platforms. */
export async function getQuickConnectQuotaStatus(): Promise<
	Record<string, { usage: number; limit: number }>
> {
	const month = currentMonth();
	const rows = await db
		.select()
		.from(quickConnectUsage)
		.where(eq(quickConnectUsage.month, month));
	const out: Record<string, { usage: number; limit: number }> = {};
	for (const r of rows) {
		const limit = QUICK_CONNECT_QUOTA[r.platform as PlatformId] ?? 0;
		out[r.platform] = { usage: r.count ?? 0, limit };
	}
	// Ensure all platforms with quota have an entry
	for (const platform of Object.keys(QUICK_CONNECT_QUOTA)) {
		if (!out[platform]) {
			out[platform] = { usage: 0, limit: QUICK_CONNECT_QUOTA[platform as PlatformId] ?? 0 };
		}
	}
	return out;
}
