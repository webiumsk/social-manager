export interface PublishResult {
	success: boolean;
	postId?: string;
	postUrl?: string;
	error?: string;
}

export interface TestResult {
	success: boolean;
	displayName?: string;
	error?: string;
}

export interface PlatformPublisher {
	publish(
		text: string,
		media?: string[],
		credentials?: Record<string, unknown>
	): Promise<PublishResult>;
	testConnection(credentials: Record<string, unknown>): Promise<TestResult>;
}
