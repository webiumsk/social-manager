import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { count } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { getAllowPublicRegistration } from '$lib/server/app-settings';

/** Same logic as auth.ts before hook: when self-hosted, registration allowed if no users yet or admin enabled it in settings. */
export async function load() {
	const selfHosted = env.SELF_HOSTED === 'true' || env.SELF_HOSTED === '1';
	if (!selfHosted) return { allowRegistration: true };
	const [row] = await db.select({ count: count() }).from(user);
	const userCount = row?.count ?? 0;
	if (userCount === 0) return { allowRegistration: true };
	const allowed = await getAllowPublicRegistration();
	return { allowRegistration: allowed };
}
