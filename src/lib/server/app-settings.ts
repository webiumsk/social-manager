import { db } from '$lib/server/db';
import { appSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const KEY_ALLOW_PUBLIC_REGISTRATION = 'allow_public_registration';

export async function getAllowPublicRegistration(): Promise<boolean> {
	const [row] = await db
		.select({ value: appSettings.value })
		.from(appSettings)
		.where(eq(appSettings.key, KEY_ALLOW_PUBLIC_REGISTRATION))
		.limit(1);
	return row?.value === 'true';
}

export async function setAllowPublicRegistration(allow: boolean): Promise<void> {
	const value = allow ? 'true' : 'false';
	await db
		.insert(appSettings)
		.values({ key: KEY_ALLOW_PUBLIC_REGISTRATION, value })
		.onConflictDoUpdate({
			target: appSettings.key,
			set: { value }
		});
}
