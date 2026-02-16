<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let monthly = $state(true);
	let displaySats = $state(false);
	let subscription = $state<{
		tier: string;
		tierName: string;
		usage?: { postsThisMonth: number; adaptationsThisMonth: number };
		limits?: { postsPerMonth: number; aiAdaptationsPerMonth: number };
		selfHosted?: boolean;
	} | null>(null);

	onMount(async () => {
		try {
			const res = await fetch('/api/billing/subscription');
			if (res.ok) subscription = await res.json();
		} catch {
			// not logged in or no subscription
		}
	});

	const tiers = [
		{
			id: 'free',
			name: 'Free',
			priceMonthly: 0,
			priceYearly: 0,
			satsMonthly: 0,
			satsYearly: 0,
			limits: { brands: 1, platforms: 3, postsPerMonth: 30, ai: 0 },
			features: ['Manual editing', '1 brand', '3 platforms', '30 posts/month']
		},
		{
			id: 'pro',
			name: 'Pro',
			priceMonthly: 9,
			priceYearly: 79,
			satsMonthly: 15000,
			satsYearly: 130000,
			limits: { brands: 5, platforms: 7, postsPerMonth: -1, ai: 500 },
			features: ['Everything in Free', 'AI adaptation (500/month)', '5 brands', 'Unlimited posts', 'Scheduling', 'Analytics']
		},
		{
			id: 'team',
			name: 'Team',
			priceMonthly: 25,
			priceYearly: 220,
			satsMonthly: 42000,
			satsYearly: 370000,
			limits: { brands: -1, platforms: 7, postsPerMonth: -1, ai: -1 },
			features: ['Everything in Pro', 'Unlimited brands', 'Unlimited AI', '5 team members', 'Priority support']
		}
	];
</script>

<svelte:head><title>Pricing — Social Manager</title></svelte:head>

<div class="min-h-screen bg-zinc-950 text-zinc-100">
	<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
		<h1 class="text-2xl font-bold text-zinc-100 sm:text-3xl">Pricing</h1>
		<p class="mt-2 text-zinc-400">Choose a plan. Pay with Lightning (sats) or card (Stripe).</p>

		{#if subscription?.selfHosted}
			<div class="mt-6 rounded-xl border border-emerald-800/50 bg-emerald-900/20 p-4 text-emerald-200">
				<p class="font-medium">This is a self-hosted instance.</p>
				<p class="mt-1 text-sm text-emerald-300/90">All features are available with no limits.</p>
			</div>
		{:else}
			<div class="mt-6 flex flex-wrap items-center gap-4">
				<label class="flex cursor-pointer items-center gap-2">
					<input type="radio" name="period" checked={monthly} onchange={() => (monthly = true)} class="rounded border-zinc-600 text-violet-600 focus:ring-violet-500" />
					<span class="text-zinc-300">Monthly</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input type="radio" name="period" checked={!monthly} onchange={() => (monthly = false)} class="rounded border-zinc-600 text-violet-600 focus:ring-violet-500" />
					<span class="text-zinc-300">Yearly (save)</span>
				</label>
				<label class="ml-0 flex cursor-pointer items-center gap-2 sm:ml-4">
					<input type="checkbox" bind:checked={displaySats} class="rounded border-zinc-600 text-violet-600 focus:ring-violet-500" />
					<span class="text-zinc-300">Show in sats</span>
				</label>
			</div>

			<div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
				{#each tiers as tier}
					<div
						class="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 sm:p-6 {subscription?.tier === tier.id
							? 'ring-2 ring-violet-500'
							: ''}"
					>
						<h2 class="text-lg font-semibold text-zinc-100">{tier.name}</h2>
						<div class="mt-2">
							{#if displaySats}
								<span class="text-2xl font-bold text-zinc-100">
									{monthly ? tier.satsMonthly.toLocaleString() : tier.satsYearly.toLocaleString()}
								</span>
								<span class="text-zinc-400"> sats/{monthly ? 'month' : 'year'}</span>
							{:else}
								<span class="text-2xl font-bold text-zinc-100">
									${monthly ? tier.priceMonthly : tier.priceYearly}
								</span>
								<span class="text-zinc-400"> / {monthly ? 'month' : 'year'}</span>
							{/if}
						</div>
						<ul class="mt-4 list-inside list-disc space-y-1 text-sm text-zinc-400">
							{#each tier.features as f}
								<li>{f}</li>
							{/each}
						</ul>
						<div class="mt-6 flex-1">
							{#if subscription?.tier === tier.id}
								<span class="inline-block rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-300">
									Current plan
								</span>
							{:else if tier.id === 'free'}
								<a
									href="/register"
									class="inline-block rounded-lg bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600"
								>
									Get started
								</a>
							{:else}
								<button
									type="button"
									class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
									onclick={() => goto('/settings')}
								>
									Subscribe
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<div class="mt-10 flex flex-wrap items-center gap-4 border-t border-zinc-800 pt-8">
			<a href="/" class="text-violet-400 hover:underline">← Back to app</a>
			{#if subscription == null}
				<a href="/login" class="text-zinc-400 hover:underline">Log in</a>
			{/if}
		</div>
	</div>
</div>
