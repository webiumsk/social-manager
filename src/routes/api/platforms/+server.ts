import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { randomBytes } from 'node:crypto';
import { db } from '$lib/server/db';
import { platformConnections, brands } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt } from '$lib/utils/crypto';
import { PLATFORM_IDS } from '$lib/utils/constants';
import { checkTierLimit } from '$lib/server/billing/guard.js';
import * as nip19 from 'nostr-tools/nip19';
import { getPublicKey } from 'nostr-tools/pure';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = locals.user.id;
	const brandIdParam = url.searchParams.get('brandId');
	let brandId: number | null = null;
	if (brandIdParam) {
		brandId = parseInt(brandIdParam, 10);
		if (Number.isNaN(brandId)) return json({ error: 'Invalid brandId' }, { status: 400 });
	} else {
		const [active] = await db
			.select()
			.from(brands)
			.where(and(eq(brands.userId, userId), eq(brands.isActive, true)));
		brandId = active?.id ?? null;
	}
	try {
		const list = await db
			.select({
				id: platformConnections.id,
				brandId: platformConnections.brandId,
				platform: platformConnections.platform,
				displayName: platformConnections.displayName,
				connectionMode: platformConnections.connectionMode,
				isActive: platformConnections.isActive,
				createdAt: platformConnections.createdAt
			})
			.from(platformConnections)
			.where(
				brandId != null
					? and(eq(platformConnections.userId, userId), eq(platformConnections.brandId, brandId))
					: eq(platformConnections.userId, userId)
			);
		return json(list);
	} catch (err) {
		// Fallback when connection_mode column does not exist yet (run npm run db:push)
		const msg = err instanceof Error ? err.message : String(err);
		if (msg.includes('connection_mode') || msg.includes('no such column')) {
			const list = await db
				.select({
					id: platformConnections.id,
					brandId: platformConnections.brandId,
					platform: platformConnections.platform,
					displayName: platformConnections.displayName,
					isActive: platformConnections.isActive,
					createdAt: platformConnections.createdAt
				})
				.from(platformConnections)
				.where(
					brandId != null
						? and(eq(platformConnections.userId, userId), eq(platformConnections.brandId, brandId))
						: eq(platformConnections.userId, userId)
				);
			return json(list.map((r) => ({ ...r, connectionMode: null })));
		}
		throw err;
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const userId = locals.user.id;
	const tierCheck = await checkTierLimit(userId, 'platform');
	if (!tierCheck.allowed) {
		return json({ error: tierCheck.reason }, { status: 403 });
	}
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}
	const brandId = body.brandId != null ? Number(body.brandId) : null;
	if (brandId != null && !Number.isNaN(brandId)) {
		const [brand] = await db
			.select()
			.from(brands)
			.where(and(eq(brands.id, brandId), eq(brands.userId, userId)));
		if (!brand) return json({ error: 'Brand not found or access denied' }, { status: 400 });
	}
	const platform = String(body.platform ?? '').toLowerCase();
	let displayName = body.displayName ? String(body.displayName) : null;
	const connectionMode = body.connectionMode === 'quick_connect' ? 'quick_connect' : 'manual';
	if (!platform || !PLATFORM_IDS.includes(platform as (typeof PLATFORM_IDS)[number])) {
		return json({ error: 'Invalid platform' }, { status: 400 });
	}
	const credentials: Record<string, unknown> =
		body.credentials && typeof body.credentials === 'object'
			? { ...(body.credentials as Record<string, unknown>) }
			: {};
	if (platform === 'nostr') {
		if (credentials.bunkerUri && typeof credentials.bunkerUri === 'string' && credentials.bunkerUri.trim()) {
			credentials.clientSecret = randomBytes(32).toString('hex');
			if (!displayName) displayName = 'Nostr (bunker)';
		} else if (credentials.nsec && typeof credentials.nsec === 'string' && credentials.nsec.trim() && !displayName) {
			try {
				const decoded = nip19.decode(credentials.nsec.trim());
				if (decoded.type === 'nsec') {
					displayName = nip19.npubEncode(getPublicKey(decoded.data));
				}
			} catch {
				// ignore
			}
		}
	}
	let credentialsEncrypted: string;
	try {
		credentialsEncrypted = encrypt(JSON.stringify(credentials), userId);
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Encryption failed';
		return json({ error: msg }, { status: 500 });
	}
	try {
		const [inserted] = await db
			.insert(platformConnections)
			.values({
				userId,
				brandId,
				platform,
				credentials: credentialsEncrypted,
				displayName,
				connectionMode
			})
			.returning();
		if (!inserted) return json({ error: 'Insert failed' }, { status: 500 });
		return json(inserted);
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Database error';
		return json({ error: msg }, { status: 500 });
	}
};
