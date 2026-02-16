import type { PlatformPublisher } from './types';
import { TwitterApi } from 'twitter-api-v2';

/** OAuth 2.0 Quick Connect: only accessToken (and optionally refreshToken). */
function isOAuth2UserToken(credentials: Record<string, unknown>): boolean {
	return (
		typeof credentials.accessToken === 'string' &&
		credentials.accessToken.trim() !== '' &&
		(credentials.apiKey == null || credentials.apiKey === '')
	);
}

function getClient(credentials: Record<string, unknown>): import('twitter-api-v2').TwitterApi {
	if (isOAuth2UserToken(credentials)) {
		return new TwitterApi(credentials.accessToken as string);
	}
	const appKey = credentials.apiKey;
	const appSecret = credentials.apiSecret;
	const accessToken = credentials.accessToken;
	const accessTokenSecret = credentials.accessTokenSecret;
	if (
		typeof appKey !== 'string' ||
		!appKey.trim() ||
		typeof appSecret !== 'string' ||
		!appSecret.trim() ||
		typeof accessToken !== 'string' ||
		!accessToken.trim() ||
		typeof accessTokenSecret !== 'string' ||
		!accessTokenSecret.trim()
	) {
		throw new Error('X/Twitter requires API Key, API Secret, Access Token and Access Token Secret (or OAuth 2.0 access token only)');
	}
	return new TwitterApi({ appKey, appSecret, accessToken, accessTokenSecret });
}

export const x: PlatformPublisher = {
	async testConnection(credentials) {
		try {
			const client = getClient(credentials);
			const user = await client.v2.me();
			const handle = user.data?.username;
			const displayName = handle ? `@${handle}` : 'X (Twitter)';
			return { success: true, displayName };
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return { success: false, error: msg };
		}
	},

	async publish(text, media, credentials) {
		if (!credentials) {
			return { success: false, error: 'Missing credentials' };
		}
		try {
			const client = getClient(credentials);
			const mediaIds: string[] = [];
			if (media && media.length > 0) {
				for (const filePath of media.slice(0, 4)) {
					const mediaId = await client.v1.uploadMedia(filePath);
					mediaIds.push(mediaId);
				}
			}
			const payload =
				mediaIds.length > 0
					? { media: { media_ids: mediaIds as [string] | [string, string] | [string, string, string] | [string, string, string, string] } }
					: undefined;
			const result = await client.v2.tweet(text, payload);
			const tweetId = result.data?.id;
			const postUrl = tweetId ? `https://x.com/i/status/${tweetId}` : undefined;
			return { success: true, postId: tweetId, postUrl };
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return { success: false, error: msg };
		}
	}
};
