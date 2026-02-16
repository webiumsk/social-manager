import type { PlatformPublisher } from './types';

export const facebook: PlatformPublisher = {
	async testConnection() {
		return { success: true, displayName: 'Facebook (stub)' };
	},
	async publish() {
		return { success: false, error: 'Not implemented yet' };
	}
};
