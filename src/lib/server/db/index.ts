import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Ensure directory exists for file: URLs so libSQL can create the DB file
const url = env.DATABASE_URL;
if (url.startsWith('file:')) {
	const filePath = url.replace(/^file:\/\//, '').replace(/^file:/, '').trim();
	const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
	const dir = path.dirname(fullPath);
	try {
		mkdirSync(dir, { recursive: true });
	} catch {
		// ignore if already exists
	}
}

const client = createClient({ url: env.DATABASE_URL });

export const db = drizzle(client, { schema });
