import type { PlatformPublisher } from './types';

export const linkedin: PlatformPublisher = {
	async testConnection() {
		return { success: true, displayName: 'LinkedIn (stub)' };
	},
	async publish() {
		return { success: false, error: 'Not implemented yet' };
	}
};
