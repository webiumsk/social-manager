import type { PlatformPublisher } from './types';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';
import { SimplePool, useWebSocketImplementation } from 'nostr-tools/pool';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46';
import WebSocket from 'ws';

useWebSocketImplementation(WebSocket);

const NOSTR_BUILD_UPLOAD = 'https://nostr.build/api/v2/upload/files';

/** Upload a file to nostr.build; returns public URL or throws. */
async function uploadToNostrBuild(filePath: string): Promise<string> {
	const buf = await readFile(filePath);
	const name = path.basename(filePath);
	const blob = new Blob([buf]);
	const form = new FormData();
	form.set('files', blob, name);
	const res = await fetch(NOSTR_BUILD_UPLOAD, { method: 'POST', body: form });
	if (!res.ok) {
		const t = await res.text();
		throw new Error(`nostr.build upload failed: ${res.status} ${t}`);
	}
	const data = (await res.json()) as unknown;
	const tags = Array.isArray(data) ? data : (data as { data?: unknown[] })?.data;
	if (!Array.isArray(tags)) throw new Error('Invalid nostr.build response');
	const urlTag = tags.find((t: unknown) => Array.isArray(t) && t[0] === 'url');
	const url = urlTag && Array.isArray(urlTag) ? urlTag[1] : null;
	if (typeof url !== 'string') throw new Error('No URL in nostr.build response');
	return url;
}

const DEFAULT_RELAYS = [
	'wss://relay.damus.io',
	'wss://nos.lol',
	'wss://relay.nostr.band'
];

function getRelays(credentials: Record<string, unknown>): string[] {
	const raw = credentials.relays;
	if (typeof raw === 'string' && raw.trim()) {
		return raw
			.split(/\r?\n/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0 && (s.startsWith('wss://') || s.startsWith('ws://')));
	}
	return DEFAULT_RELAYS;
}

function hexToBytes(hex: string): Uint8Array {
	const buf = Buffer.from(hex, 'hex');
	return new Uint8Array(buf);
}

async function withBunkerSigner(
	credentials: Record<string, unknown>,
	op: (signer: BunkerSigner, relays: string[]) => Promise<void>
): Promise<void> {
	const bunkerUri = credentials.bunkerUri;
	if (typeof bunkerUri !== 'string' || !bunkerUri.trim()) {
		throw new Error('Missing Bunker URI');
	}
	const clientSecretHex = credentials.clientSecret;
	if (typeof clientSecretHex !== 'string' || !clientSecretHex) {
		throw new Error('Missing bunker client secret (disconnect and connect again)');
	}
	const bp = await parseBunkerInput(bunkerUri.trim());
	if (!bp) throw new Error('Invalid Bunker URI');
	const clientSecret = hexToBytes(clientSecretHex);
	const relays = bp.relays?.length ? bp.relays : getRelays(credentials);
	const pool = new SimplePool();
	try {
		const signer = BunkerSigner.fromBunker(clientSecret, bp, { pool });
		try {
			await signer.connect();
			await op(signer, relays);
		} finally {
			await signer.close();
		}
	} finally {
		pool.close(relays);
	}
}

export const nostr: PlatformPublisher = {
	async testConnection(credentials: Record<string, unknown>) {
		const bunkerUri = credentials.bunkerUri;
		if (typeof bunkerUri === 'string' && bunkerUri.trim()) {
			try {
				let pubkey = '';
				await withBunkerSigner(credentials, async (signer) => {
					pubkey = await signer.getPublicKey();
				});
				const npub = nip19.npubEncode(pubkey);
				return { success: true, displayName: npub };
			} catch (e) {
				return { success: false, error: e instanceof Error ? e.message : String(e) };
			}
		}
		const nsec = credentials.nsec;
		if (typeof nsec !== 'string' || !nsec.trim()) {
			return { success: false, error: 'Enter Bunker URI or nsec' };
		}
		try {
			const decoded = nip19.decode(nsec.trim());
			if (decoded.type !== 'nsec') {
				return { success: false, error: 'Invalid nsec format' };
			}
			const npub = nip19.npubEncode(getPublicKey(decoded.data));
			return { success: true, displayName: npub };
		} catch (e) {
			return { success: false, error: e instanceof Error ? e.message : 'Invalid nsec' };
		}
	},

	async publish(
		text: string,
		media?: string[],
		credentials?: Record<string, unknown>
	) {
		if (!credentials) return { success: false, error: 'Missing credentials' };

		const bunkerUri = credentials.bunkerUri;
		if (typeof bunkerUri === 'string' && bunkerUri.trim()) {
			try {
				let content = text;
				if (media && media.length > 0) {
					const urls: string[] = [];
					for (const filePath of media) {
						const url = await uploadToNostrBuild(filePath);
						urls.push(url);
					}
					content = content ? `${text}\n\n${urls.join('\n')}` : urls.join('\n');
				}
				const template = {
					kind: 1,
					created_at: Math.floor(Date.now() / 1000),
					tags: [] as string[],
					content
				};
				let signedEvent: { id: string };
				await withBunkerSigner(credentials, async (signer, relays) => {
					signedEvent = await signer.signEvent(template);
					const pool = new SimplePool();
					try {
						const results = pool.publish(relays, signedEvent);
						await Promise.any(results);
					} finally {
						pool.close(relays);
					}
				});
				const noteId = nip19.noteEncode((signedEvent!).id);
				return { success: true, postId: noteId, postUrl: `https://njump.me/${noteId}` };
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				return { success: false, error: msg };
			}
		}

		const nsec = credentials.nsec;
		if (typeof nsec !== 'string' || !nsec.trim()) {
			return { success: false, error: 'Enter Bunker URI or nsec' };
		}

		try {
			const decoded = nip19.decode(nsec.trim());
			if (decoded.type !== 'nsec') {
				return { success: false, error: 'Invalid nsec format' };
			}
			const sk = decoded.data;
			const relays = getRelays(credentials);

			let content = text;
			if (media && media.length > 0) {
				const urls: string[] = [];
				for (const filePath of media) {
					try {
						const url = await uploadToNostrBuild(filePath);
						urls.push(url);
					} catch (e) {
						return {
							success: false,
							error: `Image upload failed: ${e instanceof Error ? e.message : String(e)}`
						};
					}
				}
				content = content ? `${text}\n\n${urls.join('\n')}` : urls.join('\n');
			}

			const template = {
				kind: 1,
				created_at: Math.floor(Date.now() / 1000),
				tags: [],
				content
			};
			const event = finalizeEvent(template, sk);

			const pool = new SimplePool();
			try {
				const results = pool.publish(relays, event);
				await Promise.any(results);
				const noteId = nip19.noteEncode(event.id);
				const postUrl = `https://njump.me/${noteId}`;
				return { success: true, postId: noteId, postUrl };
			} finally {
				pool.close(relays);
			}
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return { success: false, error: msg };
		}
	}
};
