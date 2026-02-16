import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ locals }) => {
	// When not self-hosted, landing is not used; redirect to login
	const selfHosted = env.SELF_HOSTED === 'true' || env.SELF_HOSTED === '1';
	if (!selfHosted) {
		throw redirect(303, '/login');
	}
	if (locals.user) {
		throw redirect(303, '/');
	}
	return {};
};
