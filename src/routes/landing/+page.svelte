<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Social Manager — Publish everywhere</title></svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100">
	<header class="border-b border-zinc-800 px-4 py-4 sm:px-6">
		<div class="mx-auto flex max-w-6xl items-center justify-between">
			<span class="text-lg font-semibold">Social Manager</span>
			<nav class="flex gap-4">
				<a href="/login" class="text-sm text-zinc-400 hover:text-zinc-100">Log in</a>
				<a href="/register" class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500">Sign up</a>
			</nav>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
		<section class="text-center">
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
				Publish to every platform from one place
			</h1>
			<p class="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
				Write once, adapt for X, Nostr, Bluesky, LinkedIn, Mastodon, Facebook & Instagram. Schedule posts and manage your brands.
			</p>
			<div class="mt-10 flex flex-wrap items-center justify-center gap-4">
				<a
					href="/register"
					class="rounded-lg bg-violet-600 px-6 py-3 text-base font-medium hover:bg-violet-500"
				>
					Get started
				</a>
				<a href="/login" class="rounded-lg border border-zinc-600 px-6 py-3 text-base hover:bg-zinc-800">
					Log in
				</a>
			</div>
		</section>

		<section class="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
				<h2 class="font-semibold text-zinc-100">Multi-platform</h2>
				<p class="mt-2 text-sm text-zinc-400">One post, all your networks. Tune the message per platform or use AI to adapt.</p>
			</div>
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
				<h2 class="font-semibold text-zinc-100">Brands & scheduling</h2>
				<p class="mt-2 text-sm text-zinc-400">Multiple brands, voice prompts, and schedule posts for later.</p>
			</div>
			<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:col-span-2 lg:col-span-1">
				<h2 class="font-semibold text-zinc-100">Self-hosted</h2>
				<p class="mt-2 text-sm text-zinc-400">Your data, your server. All features available when self-hosting.</p>
			</div>
		</section>
	</main>
</div>
