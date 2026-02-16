#!/usr/bin/env node
/** One-off: fix DB so drizzle-kit push can run (drop duplicate index, add missing columns). Run: node scripts/drop-subscriptions-index.mjs */
import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
	const p = resolve(process.cwd(), '.env');
	if (!existsSync(p)) return;
	const content = readFileSync(p, 'utf8');
	for (const line of content.split('\n')) {
		const m = line.match(/^\s*([^#=]+)=(.*)$/);
		if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
	}
}
loadEnv();

const url = process.env.DATABASE_URL || 'file:./data/social-manager.db';
const client = createClient({ url });

async function run(sql, successMsg) {
	try {
		await client.execute(sql);
		console.log(successMsg);
	} catch (e) {
		const errMsg = (e && (e.message || e.cause?.message || String(e))).toLowerCase();
		if (errMsg.includes('already exists') || errMsg.includes('duplicate column')) return;
		throw e;
	}
}

try {
	await run('DROP INDEX IF EXISTS subscriptions_user_id_unique', 'Dropped index subscriptions_user_id_unique (if existed).');
	await run('DROP INDEX IF EXISTS sub_user_id_unique', 'Dropped index sub_user_id_unique (if existed).');
	await run('ALTER TABLE platform_connections ADD COLUMN connection_mode text', 'Added platform_connections.connection_mode (if missing).');
	console.log('Done. Run: npm run db:push');
} catch (e) {
	console.error(e);
	process.exit(1);
}
