/** Platform IDs used in DB and API */
export const PLATFORM_IDS = [
	'x',
	'nostr',
	'linkedin',
	'bluesky',
	'mastodon',
	'facebook',
	'instagram'
] as const;

export type PlatformId = (typeof PLATFORM_IDS)[number];

export interface PlatformMeta {
	id: PlatformId;
	name: string;
	charLimit: number;
	/** Whether this platform requires at least one media (e.g. Instagram) */
	requiresMedia?: boolean;
}

export const PLATFORMS: PlatformMeta[] = [
	{ id: 'x', name: 'X (Twitter)', charLimit: 280 },
	{ id: 'nostr', name: 'Nostr', charLimit: 500 },
	{ id: 'linkedin', name: 'LinkedIn', charLimit: 3000 },
	{ id: 'bluesky', name: 'Bluesky', charLimit: 300 },
	{ id: 'mastodon', name: 'Mastodon', charLimit: 500 },
	{ id: 'facebook', name: 'Facebook', charLimit: 63206 },
	{ id: 'instagram', name: 'Instagram', charLimit: 2200, requiresMedia: true }
];

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));

/** Credential field config per platform for Settings UI */
export const PLATFORM_CREDENTIAL_FIELDS: Record<
	PlatformId,
	{ key: string; label: string; type?: string; placeholder?: string }[]
> = {
	x: [
		{ key: 'apiKey', label: 'API Key', type: 'password' },
		{ key: 'apiSecret', label: 'API Secret', type: 'password' },
		{ key: 'accessToken', label: 'Access Token', type: 'password' },
		{ key: 'accessTokenSecret', label: 'Access Token Secret', type: 'password' }
	],
	nostr: [
		{ key: 'bunkerUri', label: 'Bunker URI (NIP-46)', placeholder: 'bunker://npub1...?relay=wss://... or user@domain.com' },
		{ key: 'nsec', label: 'nsec (private key)', type: 'password', placeholder: 'nsec1... (if not using bunker)' },
		{ key: 'relays', label: 'Relay list (jeden na riadok)', placeholder: 'wss://relay.damus.io' }
	],
	linkedin: [{ key: 'accessToken', label: 'OAuth 2.0 Access Token', type: 'password' }],
	bluesky: [
		{ key: 'handle', label: 'Handle', placeholder: 'user.bsky.social' },
		{ key: 'appPassword', label: 'App Password', type: 'password' }
	],
	mastodon: [
		{ key: 'instanceUrl', label: 'Instance URL', placeholder: 'https://mastodon.social' },
		{ key: 'accessToken', label: 'Access Token', type: 'password' }
	],
	facebook: [
		{ key: 'pageAccessToken', label: 'Page Access Token', type: 'password' },
		{ key: 'pageId', label: 'Page ID' }
	],
	instagram: [
		{ key: 'pageAccessToken', label: 'Page Access Token (Meta)', type: 'password' },
		{ key: 'pageId', label: 'Facebook Page ID' },
		{ key: 'instagramBusinessAccountId', label: 'Instagram Business Account ID' }
	]
};

/** Platforms that support Quick Connect (OAuth with app's credentials) vs manual API keys */
export const PLATFORMS_WITH_QUICK_CONNECT: PlatformId[] = ['x', 'linkedin', 'facebook', 'instagram'];

/** Default monthly quota for Quick Connect (app-wide). X free tier ~500. */
export const QUICK_CONNECT_QUOTA: Partial<Record<PlatformId, number>> = {
	x: 500,
	linkedin: 500,
	facebook: 500,
	instagram: 500
};

/** "Where to get credentials" links for connecting platforms */
export const PLATFORM_HELP_LINKS: Record<
	PlatformId,
	{ label: string; url: string }[] | null
> = {
	x: [{ label: 'X Developer Portal (API Keys)', url: 'https://developer.x.com/en/portal/dashboard' }],
	nostr: null,
	linkedin: [{ label: 'LinkedIn Developers', url: 'https://www.linkedin.com/developers/' }],
	bluesky: [
		{ label: 'App Password (account settings)', url: 'https://bsky.social/settings/app-passwords' }
	],
	mastodon: [
		{
			label: 'Create application (token)',
			url: 'https://docs.joinmastodon.org/client/token/'
		}
	],
	facebook: [
		{ label: 'Meta for Developers (Page Token)', url: 'https://developers.facebook.com/docs/pages/getting-started' }
	],
	instagram: [
		{
			label: 'Meta Business (Instagram API)',
			url: 'https://developers.facebook.com/docs/instagram-api/getting-started'
		}
	]
};
