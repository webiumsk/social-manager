<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;
		const res = await authClient.signUp.email({
			email,
			password,
			name: name || email,
			callbackURL: '/'
		});
		loading = false;
		if ((res as { error?: { message?: string } }).error) {
			const err = (res as { error?: { message?: string } }).error!;
			const msg = err.message ?? (typeof err === 'string' ? err : 'Registration failed');
			error = msg;
			if (
				msg.toLowerCase().includes('table') ||
				msg.toLowerCase().includes('sql') ||
				msg.toLowerCase().includes('database')
			) {
				error = msg + ' Run: npm run db:push and confirm creating tables.';
			}
			return;
		}
		goto('/');
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8">
	<div class="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl">
		<h1 class="text-xl font-semibold text-zinc-100">Sign up</h1>
		{#if data?.allowRegistration === false}
			<p class="mt-4 text-sm text-zinc-400">
				Public registration is disabled on this instance. Ask the administrator for an account.
			</p>
			<p class="mt-4 text-center text-sm text-zinc-400">
				<a href="/login" class="text-violet-400 hover:underline">Log in</a>
			</p>
		{:else}
		<form onsubmit={handleSubmit} class="mt-6 space-y-4">
			<div>
				<label for="name" class="block text-sm font-medium text-zinc-400">Name</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
					placeholder="Optional"
				/>
			</div>
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
				{loading ? 'Creating account…' : 'Sign up'}
			</button>
		</form>
		<p class="mt-4 text-center text-sm text-zinc-400">
			Already have an account?
			<a href="/login" class="text-violet-400 hover:underline">Log in</a>
		</p>
		{/if}
	</div>
</div>
