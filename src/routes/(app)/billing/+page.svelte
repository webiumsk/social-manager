<script lang="ts">
	import { onMount } from 'svelte';

	let subscription = $state<{
		tier: string;
		tierName: string;
		status: string;
		currentPeriodEnd: string | null;
		cancelAtPeriodEnd?: boolean;
		usage?: {
			postsThisMonth: number;
			adaptationsThisMonth: number;
			brandsCount: number;
			platformsCount: number;
		};
		limits?: {
			postsPerMonth: number;
			aiAdaptationsPerMonth: number;
			brands: number;
			platforms: number;
			mediaStorageMb?: number;
		};
		selfHosted?: boolean;
	} | null>(null);
	let payments = $state<{ id: number; amount: number; currency: string; tier: string; period: string | null; paymentMethod: string; status: string | null; createdAt: string | null }[]>([]);
	let loading = $state(true);

	onMount(async () => {
		loading = true;
		try {
			const [subRes, payRes] = await Promise.all([
				fetch('/api/billing/subscription'),
				fetch('/api/billing/payments')
			]);
			if (subRes.ok) subscription = await subRes.json();
			if (payRes.ok) payments = await payRes.json();
		} finally {
			loading = false;
		}
	});

	function progressPercent(used: number, limit: number): number {
		if (limit <= 0) return 0;
		if (limit === -1) return 0;
		return Math.min(100, Math.round((used / limit) * 100));
	}
	function progressColor(pct: number): string {
		if (pct >= 100) return 'bg-red-500';
		if (pct >= 80) return 'bg-amber-500';
		return 'bg-violet-500';
	}
</script>

<svelte:head><title>Subscription — Social Manager</title></svelte:head>

<div class="space-y-8">
	<h1 class="text-2xl font-semibold">Subscription</h1>

	{#if loading}
		<p class="text-zinc-500">Loading…</p>
	{:else if subscription?.selfHosted}
		<div class="rounded-xl border border-emerald-800/50 bg-emerald-900/20 p-6">
			<p class="font-medium text-emerald-200">Self-hosted instance</p>
			<p class="mt-1 text-sm text-emerald-300/90">All features available with no limits. Payments are disabled.</p>
		</div>
	{:else if subscription}
		<!-- Current plan -->
		<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
			<h2 class="text-lg font-medium">Current plan</h2>
			<p class="mt-1 text-zinc-400">
				<strong class="text-zinc-200">{subscription.tierName}</strong>
				{#if subscription.status}
					<span class="ml-2 text-sm">({subscription.status})</span>
				{/if}
			</p>
			{#if subscription.currentPeriodEnd}
				<p class="mt-1 text-sm text-zinc-500">Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
			{/if}
			{#if subscription.cancelAtPeriodEnd}
				<p class="mt-2 text-sm text-amber-400">Subscription will cancel at the end of the period.</p>
			{/if}
			<div class="mt-4 flex flex-wrap gap-3">
				{#if subscription.tier === 'free'}
					<a href="/pricing" class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500">Go to Pro / Team</a>
				{:else}
					<a href="/pricing" class="rounded-lg bg-zinc-700 px-4 py-2 text-sm hover:bg-zinc-600">Change plan</a>
				{/if}
			</div>
		</section>

		<!-- Usage -->
		{#if subscription.usage && subscription.limits}
			<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
				<h2 class="mb-4 text-lg font-medium">Usage this month</h2>
				<div class="space-y-4">
					<div>
						<div class="flex justify-between text-sm">
							<span class="text-zinc-400">Posts</span>
							<span class="text-zinc-300">
								{subscription.usage.postsThisMonth}
								{#if subscription.limits.postsPerMonth >= 0}
									/ {subscription.limits.postsPerMonth}
								{:else}
									/ ∞
								{/if}
							</span>
						</div>
						{#if subscription.limits.postsPerMonth >= 0}
							<div class="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800">
								<div
									class="h-full transition-all {progressColor(progressPercent(subscription.usage.postsThisMonth, subscription.limits.postsPerMonth))}"
									style="width: {progressPercent(subscription.usage.postsThisMonth, subscription.limits.postsPerMonth)}%"
								></div>
							</div>
						{/if}
					</div>
					<div>
						<div class="flex justify-between text-sm">
							<span class="text-zinc-400">AI adaptations</span>
							<span class="text-zinc-300">
								{subscription.usage.adaptationsThisMonth}
								{#if subscription.limits.aiAdaptationsPerMonth >= 0}
									/ {subscription.limits.aiAdaptationsPerMonth}
								{:else}
									/ ∞
								{/if}
							</span>
						</div>
						{#if subscription.limits.aiAdaptationsPerMonth >= 0}
							<div class="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800">
								<div
									class="h-full transition-all {progressColor(progressPercent(subscription.usage.adaptationsThisMonth, subscription.limits.aiAdaptationsPerMonth))}"
									style="width: {progressPercent(subscription.usage.adaptationsThisMonth, subscription.limits.aiAdaptationsPerMonth)}%"
								></div>
							</div>
						{/if}
					</div>
					<p class="text-sm text-zinc-500">
						Brands: {subscription.usage.brandsCount} / {subscription.limits.brands === -1 ? '∞' : subscription.limits.brands}
						· Platforms: {subscription.usage.platformsCount} / {subscription.limits.platforms}
					</p>
				</div>
			</section>
		{/if}

		<!-- Payment history -->
		<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
			<h2 class="mb-4 text-lg font-medium">Payment history</h2>
			{#if payments.length === 0}
				<p class="text-sm text-zinc-500">No payments yet.</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-zinc-700 text-left text-zinc-400">
								<th class="pb-2 pr-4">Date</th>
								<th class="pb-2 pr-4">Amount</th>
								<th class="pb-2 pr-4">Plan</th>
								<th class="pb-2 pr-4">Method</th>
								<th class="pb-2">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each payments as p}
								<tr class="border-b border-zinc-800">
									<td class="py-2 pr-4 text-zinc-300">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
									<td class="py-2 pr-4">{p.amount} {p.currency}</td>
									<td class="py-2 pr-4">{p.tier} {p.period ? `(${p.period})` : ''}</td>
									<td class="py-2 pr-4">{p.paymentMethod}</td>
									<td class="py-2" class:text-green-400={p.status === 'completed'} class:text-amber-400={p.status === 'pending'} class:text-red-400={p.status === 'failed'}>{p.status ?? '—'}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/if}
</div>
