import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const MEDIA_DIR = path.join(process.cwd(), 'data', 'media');

export async function saveUpload(
	userId: string,
	file: File
): Promise<{ path: string; url: string }> {
	const dir = path.join(MEDIA_DIR, userId);
	await mkdir(dir, { recursive: true });
	const ext = path.extname(file.name) || '.bin';
	const name = `${randomUUID()}${ext}`;
	const filePath = path.join(dir, name);
	await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
	const relativePath = `media/${userId}/${name}`;
	return { path: relativePath, url: `/api/media/file/${userId}/${name}` };
}
