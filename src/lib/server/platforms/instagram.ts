import type { PlatformPublisher } from './types';

export const instagram: PlatformPublisher = {
	async testConnection() {
		return { success: true, displayName: 'Instagram (stub)' };
	},
	async publish() {
		return { success: false, error: 'Not implemented yet' };
	}
};
