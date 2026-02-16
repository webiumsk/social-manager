import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { publishPost } from '$lib/server/publish-post.js';

function parseId(params: { id: string }): number {
	const id = parseInt(params.id, 10);
	if (Number.isNaN(id)) throw new Error('Invalid id');
	return id;
}

export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = parseId(params);
	try {
		const result = await publishPost(id, locals.user.id);
		return json(result);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg === 'Not found') return json({ error: 'Not found' }, { status: 404 });
		if (msg === 'No platforms selected for this post') {
			return json({ error: 'No platforms selected. Save the draft with platforms chosen.' }, { status: 400 });
		}
		return json({ error: msg }, { status: 500 });
	}
};
