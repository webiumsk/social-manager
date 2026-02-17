/**
 * Creates all required tables in the SQLite DB if they don't exist.
 * Run at container startup so production DB is ready (e.g. when volume is fresh).
 * Usage: node scripts/migrate-db.js
 * Requires: DATABASE_URL in env (e.g. file:/app/data/social-manager.db)
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const filePath = url.replace(/^file:\/\//, '').replace(/^file:/, '').trim();
const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
const dir = path.dirname(fullPath);
try {
	fs.mkdirSync(dir, { recursive: true });
} catch {}

const db = new Database(fullPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const statements = [
	`CREATE TABLE IF NOT EXISTS user (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		email TEXT NOT NULL UNIQUE,
		email_verified INTEGER DEFAULT 0 NOT NULL,
		image TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		role TEXT DEFAULT 'user' NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS session (
		id TEXT PRIMARY KEY,
		expires_at INTEGER NOT NULL,
		token TEXT NOT NULL UNIQUE,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		ip_address TEXT,
		user_agent TEXT,
		user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
	)`,
	`CREATE INDEX IF NOT EXISTS session_userId_idx ON session(user_id)`,
	`CREATE TABLE IF NOT EXISTS account (
		id TEXT PRIMARY KEY,
		account_id TEXT NOT NULL,
		provider_id TEXT NOT NULL,
		user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
		access_token TEXT,
		refresh_token TEXT,
		id_token TEXT,
		access_token_expires_at INTEGER,
		refresh_token_expires_at INTEGER,
		scope TEXT,
		password TEXT,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS account_userId_idx ON account(user_id)`,
	`CREATE TABLE IF NOT EXISTS verification (
		id TEXT PRIMARY KEY,
		identifier TEXT NOT NULL,
		value TEXT NOT NULL,
		expires_at INTEGER NOT NULL,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier)`,
	`CREATE TABLE IF NOT EXISTS user_settings (
		user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
		ai_provider TEXT,
		ai_api_key_encrypted TEXT,
		ai_endpoint TEXT,
		ai_model TEXT,
		ai_temperature INTEGER,
		accent_color TEXT DEFAULT '#7c3aed',
		theme TEXT DEFAULT 'dark',
		updated_at TEXT DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS brands (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		description TEXT,
		voice_prompt TEXT NOT NULL,
		is_active INTEGER DEFAULT 0,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS platform_connections (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
		brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
		platform TEXT NOT NULL,
		credentials TEXT NOT NULL,
		display_name TEXT,
		connection_mode TEXT,
		is_active INTEGER DEFAULT 1,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
		brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
		original_text TEXT NOT NULL,
		status TEXT DEFAULT 'draft',
		scheduled_at TEXT,
		published_at TEXT,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
		media_paths TEXT,
		tags TEXT
	)`,
	`CREATE TABLE IF NOT EXISTS post_variants (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
		platform TEXT NOT NULL,
		adapted_text TEXT NOT NULL,
		char_count INTEGER,
		published_at TEXT,
		platform_post_id TEXT,
		platform_url TEXT,
		status TEXT DEFAULT 'pending',
		error_message TEXT
	)`,
	`CREATE TABLE IF NOT EXISTS publish_log (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
		post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL,
		platform TEXT,
		action TEXT,
		details TEXT,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS subscriptions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
		tier TEXT NOT NULL DEFAULT 'free',
		status TEXT DEFAULT 'active',
		current_period_start TEXT,
		current_period_end TEXT,
		cancel_at_period_end INTEGER DEFAULT 0,
		payment_method TEXT,
		stripe_customer_id TEXT,
		stripe_subscription_id TEXT,
		created_at TEXT DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS payments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
		amount INTEGER NOT NULL,
		currency TEXT NOT NULL,
		tier TEXT NOT NULL,
		period TEXT,
		payment_method TEXT NOT NULL,
		external_id TEXT,
		status TEXT DEFAULT 'pending',
		created_at TEXT DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS ai_usage (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
		month TEXT NOT NULL,
		adaptations_count INTEGER DEFAULT 0,
		tokens_used INTEGER DEFAULT 0,
		provider_cost INTEGER DEFAULT 0
	)`,
	`CREATE TABLE IF NOT EXISTS app_settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL,
		updated_at TEXT DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS quick_connect_usage (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		platform TEXT NOT NULL,
		month TEXT NOT NULL,
		count INTEGER DEFAULT 0
	)`
];

for (const sql of statements) {
	try {
		db.exec(sql);
	} catch (e) {
		console.error('Migration error:', e.message);
		console.error('SQL:', sql);
		process.exit(1);
	}
}

db.close();
console.log('DB migration done.');
