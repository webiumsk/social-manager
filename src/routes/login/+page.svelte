<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;
		const res = await authClient.signIn.email({ email, password, callbackURL: '/' });
		loading = false;
		if (res.error) {
			error = res.error.message ?? 'Sign in failed';
			return;
		}
		goto('/');
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8">
	<div class="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl">
		<h1 class="text-xl font-semibold text-zinc-100">Log in</h1>
		<form onsubmit={handleSubmit} class="mt-6 space-y-4">
			<div>
				<label for="email" class="block text-sm font-medium text-zinc-400">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
					placeholder="you@example.com"
				/>
			</div>
			<div>
				<label for="password" class="block text-sm font-medium text-zinc-400">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
				/>
			</div>
			{#if error}
				<p class="text-sm text-red-400">{error}</p>
			{/if}
			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-violet-600 py-2 font-medium text-white hover:bg-violet-500 disabled:opacity-50"
			>
				{loading ? 'Signing in…' : 'Log in'}
			</button>
		</form>
		<p class="mt-4 text-center text-sm text-zinc-400">
			Don't have an account?
			<a href="/register" class="text-violet-400 hover:underline">Sign up</a>
		</p>
	</div>
</div>
