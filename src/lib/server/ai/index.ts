import type { AdaptOptions, AdaptResult } from './types.js';
import { AI_PROVIDER_DEFAULTS } from './providers.js';

const PLATFORM_GUIDELINES = `
Platform guidelines (only include requested platforms in your JSON):
- x (280 chars): Punchy, concise, 1-3 hashtags
- nostr (~500 chars): Casual, community-oriented, minimal hashtags
- linkedin (3000 chars): Professional, business-focused, CTA
- bluesky (300 chars): Conversational, similar to X
- mastodon (500 chars): Community-friendly, CamelCase hashtags for accessibility
- facebook (long): Informative, engaging
- instagram (2200 chars): Visual-focused caption, relevant hashtags, emoji-friendly
`.trim();

function buildUserPrompt(text: string, platforms: string[], hasMedia: boolean): string {
	const platformList = platforms.join(', ');
	return `Adapt this post for the following platforms. Return ONLY valid JSON, no markdown fences, no preamble. Keys must be exactly: ${platformList}.

Original text:
"""
${text}
"""
${hasMedia ? '\nThe post includes media (image/video). Mention it if appropriate for the platform.\n' : ''}

Format:
{ ${platforms.map((p) => `"${p}": "..."`).join(', ')} }

${PLATFORM_GUIDELINES}`;
}

function stripMarkdownFences(raw: string): string {
	let s = raw.trim();
	const match = s.match(/^```(?:json)?\s*([\s\S]*?)```$/);
	if (match) s = match[1].trim();
	return s;
}

function parseAdaptResponse(raw: string, platforms: string[]): AdaptResult {
	const s = stripMarkdownFences(raw);
	let obj: unknown;
	try {
		obj = JSON.parse(s);
	} catch {
		throw new Error('AI did not return valid JSON');
	}
	if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
		throw new Error('AI did not return an object (platform -> text)');
	}
	const result: AdaptResult = {};
	for (const p of platforms) {
		const v = (obj as Record<string, unknown>)[p];
		result[p] = typeof v === 'string' ? v : String(v ?? '').trim() || '';
	}
	return result;
}

export interface AdaptConfig {
	provider: string;
	endpoint: string;
	model: string;
	apiKey: string | null;
	temperature?: number;
}

/** Call OpenAI-compatible chat completions API */
async function callOpenAICompatible(
	config: AdaptConfig,
	systemPrompt: string,
	userPrompt: string
): Promise<string> {
	const { endpoint, model, apiKey, temperature = 0.7 } = config;
	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};
	if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

	const res = await fetch(endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			model,
			temperature: typeof temperature === 'number' ? temperature : 0.7,
			max_tokens: 2000,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			]
		})
	});

	if (!res.ok) {
		const t = await res.text();
		throw new Error(`AI API error ${res.status}: ${t.slice(0, 200)}`);
	}

	const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
	const content = data.choices?.[0]?.message?.content;
	if (typeof content !== 'string') throw new Error('AI did not return any text');
	return content;
}

/** Call Anthropic Messages API */
async function callAnthropic(
	apiKey: string,
	model: string,
	systemPrompt: string,
	userPrompt: string
): Promise<string> {
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: model || 'claude-sonnet-4-20250514',
			max_tokens: 2000,
			system: systemPrompt,
			messages: [{ role: 'user', content: userPrompt }]
		})
	});

	if (!res.ok) {
		const t = await res.text();
		throw new Error(`Anthropic API error ${res.status}: ${t.slice(0, 200)}`);
	}

	const data = (await res.json()) as { content?: { text?: string }[] };
	const text = data.content?.[0]?.text;
	if (typeof text !== 'string') throw new Error('Anthropic did not return any text');
	return text;
}

/**
 * Adapt original text for each platform using the configured AI provider.
 * Returns a record platformId -> adapted text.
 */
export async function adapt(options: AdaptOptions, config: AdaptConfig): Promise<AdaptResult> {
	const { text, voicePrompt, platforms, hasMedia = false } = options;
	if (platforms.length === 0) return {};

	const defaults = AI_PROVIDER_DEFAULTS[config.provider];
	const endpoint = config.endpoint?.trim() || defaults?.endpoint || '';
	const model = config.model?.trim() || defaults?.defaultModel || '';

	if (!endpoint && config.provider !== 'anthropic') {
		throw new Error('Missing AI endpoint (set in Settings)');
	}

	const userPrompt = buildUserPrompt(text, platforms, hasMedia);
	const systemPrompt = `${voicePrompt}\n\nReturn ONLY valid JSON. No markdown, no explanation. Keys: ${platforms.join(', ')}.`;

	let raw: string;
	if (config.provider === 'anthropic') {
		if (!config.apiKey) throw new Error('Anthropic requires API key');
		raw = await callAnthropic(config.apiKey, model, systemPrompt, userPrompt);
	} else {
		raw = await callOpenAICompatible(config, systemPrompt, userPrompt);
	}

	return parseAdaptResponse(raw, platforms);
}

/** Test AI provider connection with a simple prompt. Does not count toward usage. */
export async function testConnection(config: AdaptConfig): Promise<{ success: boolean; error?: string }> {
	try {
		const defaults = AI_PROVIDER_DEFAULTS[config.provider];
		const endpoint = config.endpoint?.trim() || defaults?.endpoint || '';
		const model = config.model?.trim() || defaults?.defaultModel || '';
		const systemPrompt = 'You are a helpful assistant. Reply briefly.';
		const userPrompt = 'Reply with exactly: OK';
		if (!endpoint && config.provider !== 'anthropic') {
			return { success: false, error: 'Missing AI endpoint' };
		}
		let raw: string;
		if (config.provider === 'anthropic') {
			if (!config.apiKey) return { success: false, error: 'Anthropic requires API key' };
			raw = await callAnthropic(config.apiKey, model, systemPrompt, userPrompt);
		} else {
			raw = await callOpenAICompatible(config, systemPrompt, userPrompt);
		}
		const ok = typeof raw === 'string' && raw.trim().length > 0;
		return ok ? { success: true } : { success: false, error: 'Empty response' };
	} catch (e) {
		return { success: false, error: e instanceof Error ? e.message : String(e) };
	}
}
