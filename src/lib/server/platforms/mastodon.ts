import type { PlatformPublisher } from './types';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

function getBaseUrl(credentials: Record<string, unknown>): string {
	const url = credentials.instanceUrl;
	if (typeof url !== 'string' || !url.trim()) {
		throw new Error('Mastodon instance URL is required');
	}
	return url.replace(/\/$/, '');
}

function getToken(credentials: Record<string, unknown>): string {
	const token = credentials.accessToken;
	if (typeof token !== 'string' || !token.trim()) {
		throw new Error('Mastodon access token is required');
	}
	return token;
}

async function uploadMedia(
	baseUrl: string,
	token: string,
	filePath: string
): Promise<string> {
	const buf = await readFile(filePath);
	const name = path.basename(filePath);
	const blob = new Blob([buf]);
	const form = new FormData();
	form.set('file', blob, name);
	const res = await fetch(`${baseUrl}/api/v1/media`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}` },
		body: form
	});
	if (!res.ok) {
		const t = await res.text();
		throw new Error(`Mastodon media upload failed: ${res.status} ${t}`);
	}
	const data = (await res.json()) as { id?: string };
	if (typeof data?.id !== 'string') {
		throw new Error('Mastodon media response missing id');
	}
	return data.id;
}

export const mastodon: PlatformPublisher = {
	async testConnection(credentials) {
		try {
			const baseUrl = getBaseUrl(credentials);
			const token = getToken(credentials);
			const res = await fetch(`${baseUrl}/api/v1/accounts/verify_credentials`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!res.ok) {
				const t = await res.text();
				return { success: false, error: `Mastodon API error: ${res.status} ${t}` };
			}
			const data = (await res.json()) as { display_name?: string; username?: string };
			const displayName =
				data?.display_name || data?.username
					? `@${(data.username as string) ?? 'user'}@${new URL(baseUrl).hostname}`
					: 'Mastodon';
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
			const baseUrl = getBaseUrl(credentials);
			const token = getToken(credentials);
			const mediaIds: string[] = [];
			if (media && media.length > 0) {
				for (const filePath of media) {
					const id = await uploadMedia(baseUrl, token, filePath);
					mediaIds.push(id);
				}
			}
			const body: { status: string; media_ids?: string[] } = { status: text };
			if (mediaIds.length > 0) body.media_ids = mediaIds;
			const res = await fetch(`${baseUrl}/api/v1/statuses`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const t = await res.text();
				return { success: false, error: `Mastodon post failed: ${res.status} ${t}` };
			}
			const data = (await res.json()) as { id?: string; url?: string };
			const postUrl = typeof data?.url === 'string' ? data.url : undefined;
			const postId = typeof data?.id === 'string' ? data.id : undefined;
			return { success: true, postId, postUrl };
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return { success: false, error: msg };
		}
	}
};
