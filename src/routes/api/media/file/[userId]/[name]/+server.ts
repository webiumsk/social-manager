import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const MEDIA_DIR = path.join(process.cwd(), 'data', 'media');

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });
	const { userId, name } = params;
	if (userId !== locals.user.id) return new Response('Forbidden', { status: 403 });
	const filePath = path.join(MEDIA_DIR, userId, name);
	try {
		const buf = await readFile(filePath);
		const ext = path.extname(name).toLowerCase();
		const types: Record<string, string> = {
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.png': 'image/png',
			'.gif': 'image/gif',
			'.webp': 'image/webp'
		};
		const contentType = types[ext] ?? 'application/octet-stream';
		return new Response(buf, {
			headers: { 'Content-Type': contentType }
		});
	} catch {
		return new Response('Not Found', { status: 404 });
	}
};
