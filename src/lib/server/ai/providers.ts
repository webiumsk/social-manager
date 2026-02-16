/** Default endpoint and model per provider (OpenAI-compatible unless noted) */
export const AI_PROVIDER_DEFAULTS: Record<
	string,
	{ endpoint: string; defaultModel: string; needsApiKey?: boolean }
> = {
	openai: {
		endpoint: 'https://api.openai.com/v1/chat/completions',
		defaultModel: 'gpt-4o',
		needsApiKey: true
	},
	google: {
		endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
		defaultModel: 'gemini-2.5-flash',
		needsApiKey: true
	},
	groq: {
		endpoint: 'https://api.groq.com/openai/v1/chat/completions',
		defaultModel: 'llama-3.3-70b-versatile',
		needsApiKey: true
	},
	mistral: {
		endpoint: 'https://api.mistral.ai/v1/chat/completions',
		defaultModel: 'mistral-large-latest',
		needsApiKey: true
	},
	openrouter: {
		endpoint: 'https://openrouter.ai/api/v1/chat/completions',
		defaultModel: 'anthropic/claude-sonnet-4',
		needsApiKey: true
	},
	ollama: {
		endpoint: 'http://localhost:11434/v1/chat/completions',
		defaultModel: 'llama3.1',
		needsApiKey: false
	},
	custom: {
		endpoint: '',
		defaultModel: '',
		needsApiKey: true
	}
};
