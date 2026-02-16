import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { payments } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const list = await db
		.select()
		.from(payments)
		.where(eq(payments.userId, locals.user.id))
		.orderBy(desc(payments.createdAt))
		.limit(50);
	return json(list);
};
