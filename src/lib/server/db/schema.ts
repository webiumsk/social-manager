import { relations, sql } from 'drizzle-orm';
import {
	integer,
	index,
	sqliteTable,
	text
} from 'drizzle-orm/sqlite-core';

// ============================================
// AUTH TABLES (Better Auth)
// ============================================

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' })
		.default(false)
		.notNull(),
	image: text('image'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull(),
	role: text('role').default('user').notNull()
});

export const session = sqliteTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = sqliteTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: integer('access_token_expires_at', {
			mode: 'timestamp_ms'
		}),
		refreshTokenExpiresAt: integer('refresh_token_expires_at', {
			mode: 'timestamp_ms'
		}),
		scope: text('scope'),
		password: text('password'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = sqliteTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	})
}));

// ============================================
// APPLICATION TABLES
// ============================================

export const userSettings = sqliteTable('user_settings', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	aiProvider: text('ai_provider'),
	aiApiKeyEncrypted: text('ai_api_key_encrypted'),
	aiEndpoint: text('ai_endpoint'),
	aiModel: text('ai_model'),
	aiTemperature: integer('ai_temperature'),
	accentColor: text('accent_color').default('#7c3aed'),
	theme: text('theme').default('dark'),
	updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const brands = sqliteTable('brands', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	voicePrompt: text('voice_prompt').notNull(),
	isActive: integer('is_active', { mode: 'boolean' }).default(false),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const platformConnections = sqliteTable('platform_connections', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	brandId: integer('brand_id').references(() => brands.id, { onDelete: 'cascade' }),
	platform: text('platform').notNull(),
	credentials: text('credentials').notNull(),
	displayName: text('display_name'),
	/** 'quick_connect' = OAuth via app credentials; 'manual' = user's own API keys */
	connectionMode: text('connection_mode'),
	isActive: integer('is_active', { mode: 'boolean' }).default(true),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});

export const posts = sqliteTable('posts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	brandId: integer('brand_id').references(() => brands.id, { onDelete: 'set null' }),
	originalText: text('original_text').notNull(),
	status: text('status').default('draft'),
	scheduledAt: text('scheduled_at'),
	publishedAt: text('published_at'),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
	mediaPaths: text('media_paths'),
	tags: text('tags')
});

export const postVariants = sqliteTable('post_variants', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	postId: integer('post_id')
		.notNull()
		.references(() => posts.id, { onDelete: 'cascade' }),
	platform: text('platform').notNull(),
	adaptedText: text('adapted_text').notNull(),
	charCount: integer('char_count'),
	publishedAt: text('published_at'),
	platformPostId: text('platform_post_id'),
	platformUrl: text('platform_url'),
	status: text('status').default('pending'),
	errorMessage: text('error_message')
});

export const publishLog = sqliteTable('publish_log', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	postId: integer('post_id').references(() => posts.id, { onDelete: 'set null' }),
	platform: text('platform'),
	action: text('action'),
	details: text('details'),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});

// ============================================
// SUBSCRIPTION & BILLING TABLES
// ============================================

/** One subscription per user (enforced in app logic; no unique index to avoid drizzle-kit push duplicate). */
export const subscriptions = sqliteTable('subscriptions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	tier: text('tier').notNull().default('free'),
	status: text('status').default('active'),
	currentPeriodStart: text('current_period_start'),
	currentPeriodEnd: text('current_period_end'),
	cancelAtPeriodEnd: integer('cancel_at_period_end').default(0),
	paymentMethod: text('payment_method'),
	stripeCustomerId: text('stripe_customer_id'),
	stripeSubscriptionId: text('stripe_subscription_id'),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

export const payments = sqliteTable('payments', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	amount: integer('amount').notNull(),
	currency: text('currency').notNull(),
	tier: text('tier').notNull(),
	period: text('period'),
	paymentMethod: text('payment_method').notNull(),
	externalId: text('external_id'),
	status: text('status').default('pending'),
	createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
});

export const aiUsage = sqliteTable('ai_usage', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	month: text('month').notNull(),
	adaptationsCount: integer('adaptations_count').default(0),
	tokensUsed: integer('tokens_used').default(0),
	providerCost: integer('provider_cost').default(0)
});

/** Instance-wide settings (e.g. allow public registration when self-hosted). Admin-only. */
export const appSettings = sqliteTable('app_settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull(),
	updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

/** Quick Connect usage per platform per month (app-wide quota for OAuth users). */
export const quickConnectUsage = sqliteTable('quick_connect_usage', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	platform: text('platform').notNull(),
	month: text('month').notNull(),
	count: integer('count').default(0)
});
