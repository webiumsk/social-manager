import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { brands, userSettings } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		const selfHosted = env.SELF_HOSTED === 'true' || env.SELF_HOSTED === '1';
		throw redirect(303, selfHosted ? '/landing' : '/login');
	}
	const [brandsList, settingsRow] = await Promise.all([
		db.select().from(brands).where(eq(brands.userId, locals.user.id)).orderBy(asc(brands.id)),
		db.select({ theme: userSettings.theme, accentColor: userSettings.accentColor })
			.from(userSettings)
			.where(eq(userSettings.userId, locals.user.id))
			.limit(1)
	]);
	const activeBrand = brandsList.find((b) => b.isActive) ?? brandsList[0] ?? null;
	const settings = settingsRow[0] ?? null;
	return {
		user: locals.user,
		session: locals.session,
		brands: brandsList,
		activeBrand,
		theme: settings?.theme ?? 'dark',
		accentColor: settings?.accentColor ?? '#7c3aed'
	};
};
