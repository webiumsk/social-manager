import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const filePath = env.DATABASE_URL.replace(/^file:\/\//, '').replace(/^file:/, '').trim();
const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
const dir = path.dirname(fullPath);

try {
	mkdirSync(dir, { recursive: true });
} catch {
	// ignore if already exists
}

const sqlite = new Database(fullPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });