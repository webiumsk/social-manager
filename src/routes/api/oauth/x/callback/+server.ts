import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { platformConnections } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { encrypt } from '$lib/utils/crypto';

const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');
	if (error) {
		// User denied or error from X
		cookies.delete('oauth_x', { path: '/' });
		throw redirect(302, '/settings?oauth=denied');
	}
	if (!code || !state) {
		cookies.delete('oauth_x', { path: '/' });
		throw redirect(302, '/settings?oauth=invalid');
	}

	const raw = cookies.get('oauth_x');
	cookies.delete('oauth_x', { path: '/' });
	if (!raw) {
		throw redirect(302, '/settings?oauth=expired');
	}
	let payload: { state: string; codeVerifier: string };
	try {
		payload = JSON.parse(raw);
	} catch {
		throw redirect(302, '/settings?oauth=invalid');
	}
	if (payload.state !== state) {
		throw redirect(302, '/settings?oauth=invalid');
	}

	const baseUrl = (env.BETTER_AUTH_URL ?? 'http://localhost:5173').replace(/\/$/, '');
	const redirectUri = `${baseUrl}/api/oauth/x/callback`;
	const clientId = env.X_CLIENT_ID;
	const clientSecret = env.X_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw redirect(302, '/settings?oauth=config');
	}

	const body = new URLSearchParams({
		code,
		grant_type: 'authorization_code',
		redirect_uri: redirectUri,
		code_verifier: payload.codeVerifier
	});
	const tokenRes = await fetch(X_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
		},
		body: body.toString()
	});
	if (!tokenRes.ok) {
		const t = await tokenRes.text();
		console.error('X token exchange failed', tokenRes.status, t);
		throw redirect(302, '/settings?oauth=token_failed');
	}
	const tokenData = (await tokenRes.json()) as {
		access_token?: string;
		refresh_token?: string;
		expires_in?: number;
	};
	const accessToken = tokenData.access_token;
	const refreshToken = tokenData.refresh_token;
	if (!accessToken) {
		throw redirect(302, '/settings?oauth=token_failed');
	}

	let brandId: number | null = null;
	try {
		const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as { b?: string };
		if (decoded.b && decoded.b !== '') {
			const n = parseInt(decoded.b, 10);
			if (!Number.isNaN(n)) brandId = n;
		}
	} catch {
		// ignore
	}

	const credentials = encrypt(
		JSON.stringify({
			accessToken,
			...(refreshToken && { refreshToken }),
			...(tokenData.expires_in && { expiresAt: Date.now() + tokenData.expires_in * 1000 })
		}),
		locals.user.id
	);

	// Upsert: if connection for this user + brand + platform exists, update; else insert
	const existing = await db
		.select()
		.from(platformConnections)
		.where(
			and(
				eq(platformConnections.userId, locals.user.id),
				eq(platformConnections.platform, 'x'),
				brandId != null ? eq(platformConnections.brandId, brandId) : isNull(platformConnections.brandId)
			)
		)
		.limit(1);
	// Resolve display name from X (optional): we could call X API with accessToken to get username
	const displayName = null; // will be set on first test or we could fetch here
	if (existing.length > 0) {
		await db
			.update(platformConnections)
			.set({
				credentials,
				connectionMode: 'quick_connect',
				displayName: displayName ?? existing[0].displayName
			})
			.where(eq(platformConnections.id, existing[0].id));
	} else {
		await db.insert(platformConnections).values({
			userId: locals.user.id,
			brandId,
			platform: 'x',
			credentials,
			connectionMode: 'quick_connect',
			displayName
		});
	}

	throw redirect(302, '/settings?oauth=success');
};
