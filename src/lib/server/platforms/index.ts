import type { PlatformPublisher } from './types';
import { x } from './x';
import { nostr } from './nostr';
import { bluesky } from './bluesky';
import { mastodon } from './mastodon';
import { linkedin } from './linkedin';
import { facebook } from './facebook';
import { instagram } from './instagram';
import type { PlatformId } from '$lib/utils/constants';

const registry: Record<PlatformId, PlatformPublisher> = {
	x,
	nostr,
	linkedin,
	bluesky,
	mastodon,
	facebook,
	instagram
};

export function getPlatform(id: string): PlatformPublisher | null {
	return registry[id as PlatformId] ?? null;
}

export { type PlatformPublisher, type PublishResult, type TestResult } from './types.js';
