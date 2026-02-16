<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	interface Brand {
		id: number;
		name: string;
		isActive: boolean | null;
	}

	let { brands = [], activeBrand = null }: { brands: Brand[]; activeBrand: Brand | null } = $props();

	async function setActive(id: number) {
		await fetch(`/api/brands/${id}/activate`, { method: 'PUT' });
		await invalidateAll();
	}
</script>

{#if brands.length > 0}
	<div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
		<p class="mb-1.5 px-1 text-xs font-medium text-zinc-500">Brand</p>
		<select
			class="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
			value={activeBrand?.id ?? ''}
			onchange={(e) => {
				const v = (e.currentTarget as HTMLSelectElement).value;
				if (v) setActive(Number(v));
			}}
		>
			{#each brands as b}
				<option value={b.id} selected={activeBrand?.id === b.id}>{b.name}</option>
			{/each}
		</select>
	</div>
{:else}
	<p class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 text-xs text-zinc-500">
		No brand. <a href="/brands" class="text-violet-400 hover:underline">Add one</a>
	</p>
{/if}
