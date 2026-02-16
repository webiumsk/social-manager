import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveUpload } from '$lib/server/media';

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const formData = await request.formData();
	const file = formData.get('file');
	if (!(file instanceof File)) return json({ error: 'No file' }, { status: 400 });
	const result = await saveUpload(locals.user.id, file);
	return json(result);
};
