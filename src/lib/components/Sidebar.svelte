<script lang="ts">
	import { page } from '$app/stores';
	import BrandSwitcher from './BrandSwitcher.svelte';
	import { LayoutDashboard, PenLine, FileText, Calendar, Palette, Settings, CreditCard, Receipt, Menu, X } from 'lucide-svelte';

	interface Brand {
		id: number;
		name: string;
		isActive: boolean | null;
	}

	let { user, brands = [], activeBrand = null, open = false, onClose }: {
		user: { email?: string; name?: string };
		brands: Brand[];
		activeBrand: Brand | null;
		open?: boolean;
		onClose?: () => void;
	} = $props();

	const nav = [
		{ href: '/', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/compose', label: 'Compose', icon: PenLine },
		{ href: '/posts', label: 'Posts', icon: FileText },
		{ href: '/schedule', label: 'Schedule', icon: Calendar },
		{ href: '/brands', label: 'Brands', icon: Palette },
		{ href: '/billing', label: 'Billing', icon: Receipt },
		{ href: '/pricing', label: 'Pricing', icon: CreditCard },
		{ href: '/settings', label: 'Settings', icon: Settings }
	];
</script>

<!-- Mobile: overlay sidebar -->
{#if open && onClose}
	<div
		class="fixed inset-0 z-40 bg-zinc-950/80 md:hidden"
		role="button"
		tabindex="-1"
		aria-label="Close menu"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
	></div>
	<aside
		class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-zinc-900/95 p-4 shadow-xl md:hidden"
	>
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium text-zinc-200">Menu</span>
			<button type="button" class="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" onclick={onClose} aria-label="Close">
				<X class="h-5 w-5" />
			</button>
		</div>
		<div class="mb-4 mt-4">
			<p class="truncate text-sm font-medium text-zinc-200">{user?.name ?? user?.email ?? 'Account'}</p>
			<p class="truncate text-xs text-zinc-500">{user?.email}</p>
		</div>
		<nav class="mb-4 flex flex-col gap-0.5">
			{#each nav as item}
				{@const Icon = item.icon}
				<a
					href={item.href}
					class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100 {$page.url.pathname === item.href ? 'bg-violet-600/20 text-violet-300' : ''}"
					onclick={onClose}
				>
					<Icon class="h-4 w-4 shrink-0" />
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="mt-auto">
			<BrandSwitcher {brands} {activeBrand} />
		</div>
	</aside>
{:else}
	<!-- Desktop: always-visible sidebar -->
	<aside class="hidden w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/30 p-4 md:flex md:w-56">
		<div class="mb-4">
			<p class="truncate text-sm font-medium text-zinc-200">{user?.name ?? user?.email ?? 'Account'}</p>
			<p class="truncate text-xs text-zinc-500">{user?.email}</p>
		</div>
		<nav class="mb-4 flex flex-col gap-0.5">
			{#each nav as item}
				{@const Icon = item.icon}
				<a
					href={item.href}
					class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100 {$page.url.pathname === item.href ? 'bg-violet-600/20 text-violet-300' : ''}"
				>
					<Icon class="h-4 w-4 shrink-0" />
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="mt-auto">
			<BrandSwitcher {brands} {activeBrand} />
		</div>
	</aside>
{/if}
