<script lang="ts">
	import '../layout.css';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { Menu } from 'lucide-svelte';

	let { data, children } = $props();
	let sidebarOpen = $state(false);
</script>

<div
	class="flex min-h-screen bg-zinc-950 text-zinc-100"
	data-theme={data.theme ?? 'dark'}
	style="--accent: {data.accentColor ?? '#7c3aed'}"
>
	<Sidebar
		user={data.user}
		brands={data.brands}
		activeBrand={data.activeBrand}
		open={sidebarOpen}
		onClose={() => (sidebarOpen = false)}
	/>
	<div class="flex min-w-0 flex-1 flex-col">
		<header class="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/50 px-4 py-3 md:hidden">
			<button
				type="button"
				class="rounded p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
				aria-label="Open menu"
				onclick={() => (sidebarOpen = true)}
			>
				<Menu class="h-5 w-5" />
			</button>
			{#if data.user}
				<span class="truncate text-sm text-zinc-400">Signed in as {data.user.email}</span>
			{/if}
		</header>
		<main class="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
			{#if data.user}
				<div class="mb-4 hidden items-center gap-2 md:flex">
					<span class="text-sm text-zinc-400">Signed in as {data.user.email}</span>
					{#if (data.user as { role?: string })?.role === 'admin'}
						<span class="rounded bg-violet-600/30 px-2 py-0.5 text-xs text-violet-300">admin</span>
					{/if}
				</div>
			{/if}
			{@render children()}
		</main>
	</div>
</div>
