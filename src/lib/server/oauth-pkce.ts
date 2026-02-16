import { randomBytes, createHash } from 'node:crypto';

function base64UrlEncode(buf: Buffer): string {
	return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
	const codeVerifier = base64UrlEncode(randomBytes(32));
	const hash = createHash('sha256').update(codeVerifier).digest();
	const codeChallenge = base64UrlEncode(hash);
	return { codeVerifier, codeChallenge };
}
