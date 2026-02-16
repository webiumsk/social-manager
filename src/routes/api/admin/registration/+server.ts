import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getAllowPublicRegistration, setAllowPublicRegistration } from '$lib/server/app-settings';

function isSelfHosted(): boolean {
	return env.SELF_HOSTED === 'true' || env.SELF_HOSTED === '1';
}

async function isAdmin(userId: string): Promise<boolean> {
	const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
	return row?.role === 'admin';
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isSelfHosted()) return json({ error: 'Not available' }, { status: 404 });
	if (!(await isAdmin(locals.user.id))) return json({ error: 'Forbidden' }, { status: 403 });
	const allowPublicRegistration = await getAllowPublicRegistration();
	return json({ allowPublicRegistration });
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!isSelfHosted()) return json({ error: 'Not available' }, { status: 404 });
	if (!(await isAdmin(locals.user.id))) return json({ error: 'Forbidden' }, { status: 403 });
	const body = await request.json();
	const allow = body.allowPublicRegistration === true;
	await setAllowPublicRegistration(allow);
	return json({ allowPublicRegistration: allow });
};
