import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { env } from '$env/dynamic/private';

const ALG = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 16;
const AUTH_TAG_LEN = 16;

function getSecret(): string {
	const secret = env.BETTER_AUTH_SECRET;
	if (!secret || secret.length < 16) throw new Error('BETTER_AUTH_SECRET must be set and at least 16 chars');
	return secret;
}

function deriveKey(userId: string): Buffer {
	const secret = getSecret();
	return scryptSync(secret + userId, 'social-manager-salt', KEY_LEN);
}

/**
 * Encrypt a string for storage (e.g. API keys, platform credentials).
 * Uses AES-256-GCM with a key derived from BETTER_AUTH_SECRET and userId.
 */
export function encrypt(plaintext: string, userId: string): string {
	const key = deriveKey(userId);
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALG, key, iv);
	const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();
	const combined = Buffer.concat([iv, authTag, enc]);
	return combined.toString('base64');
}

/**
 * Decrypt a string previously encrypted with encrypt(plaintext, userId).
 */
export function decrypt(ciphertext: string, userId: string): string {
	const key = deriveKey(userId);
	const combined = Buffer.from(ciphertext, 'base64');
	const iv = combined.subarray(0, IV_LEN);
	const authTag = combined.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
	const enc = combined.subarray(IV_LEN + AUTH_TAG_LEN);
	const decipher = createDecipheriv(ALG, key, iv);
	decipher.setAuthTag(authTag);
	return decipher.update(enc).toString('utf8') + decipher.final('utf8');
}
