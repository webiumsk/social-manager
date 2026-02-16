import type { PlatformPublisher } from './types';
import { AtpAgent } from '@atproto/api';
import { readFile } from 'node:fs/promises';

function getCredentials(credentials: Record<string, unknown>) {
	const handle = credentials.handle;
	const appPassword = credentials.appPassword;
	if (typeof handle !== 'string' || !handle.trim() || typeof appPassword !== 'string' || !appPassword.trim()) {
		throw new Error('Bluesky requires handle and app password');
	}
	return { handle: handle.trim(), appPassword: appPassword.trim() };
}

export const bluesky: PlatformPublisher = {
	async testConnection(credentials) {
		try {
			const { handle, appPassword } = getCredentials(credentials);
			const agent = new AtpAgent({ service: 'https://bsky.social' });
			await agent.login({ identifier: handle, password: appPassword });
			const profile = await agent.getProfile({ actor: handle });
			const displayName =
				profile.data?.displayName && typeof profile.data.displayName === 'string'
					? `${profile.data.displayName} (@${handle})`
					: `@${handle}`;
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
			const { handle, appPassword } = getCredentials(credentials);
			const agent = new AtpAgent({ service: 'https://bsky.social' });
			await agent.login({ identifier: handle, password: appPassword });

			let embed: { $type: 'app.bsky.embed.images'; images: { image: { $type: string; ref: { $link: string }; mimeType: string }; alt: string }[] } | undefined;
			if (media && media.length > 0) {
				const images: { image: { $type: string; ref: { $link: string }; mimeType: string }; alt: string }[] = [];
				for (const filePath of media.slice(0, 4)) {
					const buf = await readFile(filePath);
					const res = await agent.uploadBlob(new Uint8Array(buf), {
						encoding: filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
					});
					images.push({
						image: res.data.blob as { $type: string; ref: { $link: string }; mimeType: string },
						alt: ''
					});
				}
				embed = { $type: 'app.bsky.embed.images', images };
			}

			const record = {
				text,
				createdAt: new Date().toISOString(),
				...(embed && { embed })
			};
			const result = await agent.post(record);
			const uri = result.uri as string;
			const rkey = uri.split('/').pop() ?? '';
			const postUrl = `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${rkey}`;
			return { success: true, postId: rkey, postUrl };
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return { success: false, error: msg };
		}
	}
};
