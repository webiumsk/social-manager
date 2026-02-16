import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { PLATFORMS_WITH_QUICK_CONNECT } from '$lib/utils/constants';
import { generatePKCE } from '$lib/server/oauth-pkce.js';

const X_SCOPES = 'tweet.read users.read tweet.write offline.access';
const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';

/** Quick Connect OAuth: redirect to platform auth or return 501 if not configured. */
export const GET: RequestHandler = async ({ locals, params, url, cookies }) => {
	if (!locals.user) {
		return new Response(null, { status: 302, headers: { Location: '/login' } });
	}
	const platform = params.platform?.toLowerCase();
	if (!platform || !PLATFORMS_WITH_QUICK_CONNECT.includes(platform as (typeof PLATFORMS_WITH_QUICK_CONNECT)[number])) {
		return json({ error: 'Unsupported platform for Quick Connect' }, { status: 400 });
	}

	// Only X is implemented for now
	if (platform !== 'x') {
		return json(
			{ error: 'OAuth not implemented for this platform yet. Use Advanced and your own API keys.' },
			{ status: 501 }
		);
	}

	const clientId = env.X_CLIENT_ID;
	const clientSecret = env.X_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		return json(
			{
				error: 'Quick Connect is not configured.',
				hint: 'Set X_CLIENT_ID and X_CLIENT_SECRET in .env (or use Advanced and your own API keys).'
			},
			{ status: 501 }
		);
	}

	const baseUrl = (env.BETTER_AUTH_URL ?? 'http://localhost:5173').replace(/\/$/, '');
	const redirectUri = `${baseUrl}/api/oauth/x/callback`;
	const brandId = url.searchParams.get('brandId') ?? '';

	const { codeVerifier, codeChallenge } = generatePKCE();
	const state = Buffer.from(JSON.stringify({ r: randomBytes(16).toString('hex'), b: brandId })).toString('base64url');

	cookies.set('oauth_x', JSON.stringify({ state, codeVerifier }), {
		path: '/',
		httpOnly: true,
		secure: baseUrl.startsWith('https'),
		sameSite: 'lax',
		maxAge: 600
	});

	const authUrl = new URL(X_AUTH_URL);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('redirect_uri', redirectUri);
	authUrl.searchParams.set('scope', X_SCOPES);
	authUrl.searchParams.set('state', state);
	authUrl.searchParams.set('code_challenge', codeChallenge);
	authUrl.searchParams.set('code_challenge_method', 'S256');

	return new Response(null, { status: 302, headers: { Location: authUrl.toString() } });
};
