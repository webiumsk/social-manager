import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			external: ['@libsql/client', '@libsql/linux-x64-musl', 'libsql']
		})
	}
};

export default config;
