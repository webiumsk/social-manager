<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();
	let subscription = $state<{
		tier: string;
		tierName: string;
		usage?: { postsThisMonth: number; adaptationsThisMonth: number; brandsCount: number; platformsCount: number };
		limits?: { postsPerMonth: number; aiAdaptationsPerMonth: number };
		selfHosted?: boolean;
	} | null>(null);
	let activity = $state<{ id: number; platform: string | null; action: string | null; details: string | null; createdAt: string | null }[]>([]);

	onMount(async () => {
		const [subRes, actRes] = await Promise.all([
			fetch('/api/billing/subscription'),
			fetch('/api/activity')
		]);
		if (subRes.ok) subscription = await subRes.json();
		if (actRes.ok) activity = await actRes.json();
	});
</script>

<div class="space-y-6">
	<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
		<h1 class="text-xl font-semibold">Dashboard</h1>
		<p class="mt-2 text-zinc-400">Welcome, {data.user?.name ?? data.user?.email}.</p>
		{#if data.activeBrand}
			<p class="mt-1 text-sm text-zinc-500">Active brand: <strong class="text-zinc-300">{data.activeBrand.name}</strong></p>
		{/if}
	</div>

	{#if subscription && !subscription.selfHosted}
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
			<h2 class="text-lg font-medium">Your plan</h2>
			<p class="mt-1 text-zinc-400">
				<strong class="text-zinc-200">{subscription.tierName}</strong>
				{#if subscription.usage}
					— this month: {subscription.usage.postsThisMonth} posts
					{#if subscription.limits?.aiAdaptationsPerMonth !== undefined && subscription.limits.aiAdaptationsPerMonth >= 0}
						, {subscription.usage.adaptationsThisMonth} / {subscription.limits.aiAdaptationsPerMonth} AI adaptations
					{:else if subscription.usage.adaptationsThisMonth > 0}
						, {subscription.usage.adaptationsThisMonth} AI adaptations
					{/if}
				{/if}
			</p>
			{#if subscription.tier === 'free'}
				<div class="mt-4 rounded-lg border border-violet-800/50 bg-violet-900/20 p-4">
					<p class="text-sm text-violet-200">Upgrade to Pro for AI adaptation, more brands, and unlimited posts.</p>
					<a href="/pricing" class="mt-2 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500">View pricing</a>
				</div>
			{/if}
		</div>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		<a href="/compose" class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-violet-700 hover:bg-zinc-800/50">
			<span class="font-medium">New post</span>
			<p class="mt-1 text-sm text-zinc-500">Compose →</p>
		</a>
		<a href="/posts" class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-violet-700 hover:bg-zinc-800/50">
			<span class="font-medium">Posts</span>
			<p class="mt-1 text-sm text-zinc-500">History & publishing</p>
		</a>
	</div>

	{#if activity.length > 0}
		<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
			<h2 class="text-lg font-medium">Recent activity</h2>
			<ul class="mt-3 space-y-2 text-sm">
				{#each activity as item}
					<li class="flex flex-wrap items-center gap-2 text-zinc-400">
						<span class="text-zinc-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</span>
						{#if item.platform}
							<span class="rounded bg-zinc-700 px-1.5 py-0.5 text-xs">{item.platform}</span>
						{/if}
						{#if item.action}
							<span>{item.action}</span>
						{/if}
						{#if item.details}
							<span class="truncate text-zinc-500">{item.details}</span>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<form method="post" action="/api/auth/sign-out" class="pt-4">
		<button type="submit" class="rounded-lg bg-zinc-700 px-4 py-2 text-sm hover:bg-zinc-600">
			Sign out
		</button>
	</form>
</div>
