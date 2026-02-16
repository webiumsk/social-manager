/** Options for AI adaptation */
export interface AdaptOptions {
	text: string;
	voicePrompt: string;
	platforms: string[];
	hasMedia?: boolean;
}

/** Result: platform id -> adapted text */
export type AdaptResult = Record<string, string>;
