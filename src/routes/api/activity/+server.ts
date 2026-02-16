import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { publishLog } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const list = await db
		.select()
		.from(publishLog)
		.where(eq(publishLog.userId, locals.user.id))
		.orderBy(desc(publishLog.createdAt))
		.limit(10);
	return json(list);
};
