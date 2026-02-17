import { betterAuth, APIError } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { user } from './db/schema';
import { eq, count } from 'drizzle-orm';
import { getOrCreateSubscription } from './billing/subscription.js';
import { getAllowPublicRegistration, setAllowPublicRegistration } from './app-settings.js';

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL ?? 'http://localhost:5173',
	trustedOrigins: [
		'http://localhost:5173',
		'http://localhost:5174',
		'http://127.0.0.1:5173',
		'http://127.0.0.1:5174',
		...(env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [])
	],
	database: drizzleAdapter(db, { provider: 'sqlite' }),
	emailAndPassword: { enabled: true },
	plugins: [sveltekitCookies(getRequestEvent)],
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: true,
				defaultValue: 'user',
				input: false
			}
		}
	},
	databaseHooks: {
		user: {
			create: {
				before: async (userData) => {
					const selfHosted = env.SELF_HOSTED === 'true' || env.SELF_HOSTED === '1';
					if (!selfHosted) return { data: userData };
					const [row] = await db.select({ count: count() }).from(user);
					if ((row?.count ?? 0) === 0) return { data: userData };
					let allowed = false;
					try {
						allowed = await getAllowPublicRegistration();
					} catch {
						// app_settings table may be missing; treat as disabled
					}
					if (!allowed) {
						throw new APIError('BAD_REQUEST', {
							message: 'Public registration is disabled on this instance.'
						});
					}
					return { data: userData };
				},
				after: async (createdUser) => {
					const [result] = await db.select({ count: count() }).from(user);
					if (result?.count === 1) {
						await db.update(user).set({ role: 'admin' }).where(eq(user.id, createdUser.id));
						try {
							await setAllowPublicRegistration(false);
						} catch {
							// app_settings table may be missing in DB; don't break registration
						}
					}
					await getOrCreateSubscription(createdUser.id);
				}
			}
		}
	}
});
