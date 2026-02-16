<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';

	const DEFAULT_VOICE_PROMPT = `You are a social media manager for [BRAND NAME].

[BRAND DESCRIPTION AND CONTEXT]

Brand voice:
- [Describe tone]
- [Key terminology]
- [Things to avoid]

Adapt the given text for each requested platform. Return ONLY valid JSON, no markdown fences, no preamble.

Format:
{
  "x": "...",
  "nostr": "...",
  "linkedin": "...",
  "bluesky": "...",
  "mastodon": "...",
  "facebook": "...",
  "instagram": "..."
}

Platform guidelines:
- X/TWITTER (280 chars): Punchy, concise, 1-3 hashtags
- NOSTR (~500 chars): Casual, community-oriented, minimal hashtags
- LINKEDIN (3000 chars): Professional, business-focused, CTA
- BLUESKY (300 chars): Conversational, similar to X
- MASTODON (500 chars): Community-friendly, can use CamelCase hashtags for accessibility
- FACEBOOK (long): Informative, engaging, can be longer
- INSTAGRAM (2200 chars): Visual-focused caption, relevant hashtags, emoji-friendly

Only include platforms that are requested.`;

	interface Brand {
		id: number;
		name: string;
		description: string | null;
		voicePrompt: string;
		isActive: boolean | null;
	}

	let brands = $state<Brand[]>([]);
	let name = $state('');
	let description = $state('');
	let voicePrompt = $state(DEFAULT_VOICE_PROMPT);
	let editingId = $state<number | null>(null);
	let editName = $state('');
	let editDescription = $state('');
	let editVoicePrompt = $state('');
	let saving = $state(false);

	async function load() {
		const res = await fetch('/api/brands');
		if (res.ok) brands = await res.json();
	}

	async function create() {
		const n = name.trim();
		const v = voicePrompt.trim();
		if (!n || !v) return;
		saving = true;
		const res = await fetch('/api/brands', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: n, description: description.trim() || null, voicePrompt: v })
		});
		saving = false;
		if (res.ok) {
			name = '';
			description = '';
			voicePrompt = DEFAULT_VOICE_PROMPT;
			await load();
			await invalidateAll();
		}
	}

	function startEdit(b: Brand) {
		editingId = b.id;
		editName = b.name;
		editDescription = b.description ?? '';
		editVoicePrompt = b.voicePrompt;
	}

	async function saveEdit() {
		if (editingId == null) return;
		const n = editName.trim();
		const v = editVoicePrompt.trim();
		if (!n || !v) return;
		saving = true;
		const res = await fetch(`/api/brands/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name: n,
				description: editDescription.trim() || null,
				voicePrompt: v
			})
		});
		saving = false;
		if (res.ok) {
			editingId = null;
			await load();
			await invalidateAll();
		}
	}

	async function remove(id: number) {
		if (!confirm('Really delete this brand?')) return;
		await fetch(`/api/brands/${id}`, { method: 'DELETE' });
		await load();
		await invalidateAll();
	}

	async function activate(id: number) {
		await fetch(`/api/brands/${id}/activate`, { method: 'PUT' });
		await invalidateAll();
		await load();
	}

	onMount(() => load());
</script>

<div class="space-y-8">
	<h1 class="text-2xl font-semibold">Brands</h1>

	<!-- New brand -->
	<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
		<h2 class="mb-4 text-lg font-medium">New brand</h2>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="block text-sm text-zinc-400">Name</label>
				<input
					type="text"
					class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
					placeholder="My brand, Blog..."
					bind:value={name}
				/>
			</div>
			<div class="sm:col-span-2">
				<label class="block text-sm text-zinc-400">Description (optional)</label>
				<input
					type="text"
					class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
					placeholder="Short context about the brand"
					bind:value={description}
				/>
			</div>
			<div class="sm:col-span-2">
				<label class="block text-sm text-zinc-400">Voice prompt (AI tone and style)</label>
				<textarea
					class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100"
					rows="12"
					bind:value={voicePrompt}
				></textarea>
			</div>
		</div>
		<button
			class="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
			disabled={saving || !name.trim() || !voicePrompt.trim()}
			onclick={create}
		>
			Add brand
		</button>
	</section>

	<!-- List -->
	<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
		<h2 class="mb-4 text-lg font-medium">Your brands</h2>
		{#if brands.length === 0}
			<p class="text-zinc-500">You have no brands yet. Add one above.</p>
		{:else}
			<ul class="space-y-3">
				{#each brands as b}
					<li class="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 p-4">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="font-medium">{b.name}</span>
								{#if b.isActive}
									<span class="rounded bg-violet-600/30 px-1.5 py-0.5 text-xs text-violet-300">active</span>
								{/if}
							</div>
							{#if b.description}
								<p class="mt-0.5 truncate text-sm text-zinc-500">{b.description}</p>
							{/if}
						</div>
						<div class="ml-4 flex shrink-0 gap-2">
							{#if editingId === b.id}
								<button
									class="rounded bg-zinc-600 px-2 py-1 text-xs hover:bg-zinc-500"
									onclick={() => (editingId = null)}
								>
									Cancel
								</button>
								<button
									class="rounded bg-violet-600 px-2 py-1 text-xs hover:bg-violet-500"
									onclick={saveEdit}
								>
									Save
								</button>
							{:else}
								{#if !b.isActive}
									<button
										class="rounded bg-zinc-700 px-2 py-1 text-xs hover:bg-zinc-600"
										onclick={() => activate(b.id)}
									>
										Activate
									</button>
								{/if}
								<button
									class="rounded bg-zinc-700 px-2 py-1 text-xs hover:bg-zinc-600"
									onclick={() => startEdit(b)}
								>
									Edit
								</button>
								<button
									class="rounded bg-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-900/70"
									onclick={() => remove(b.id)}
								>
									Delete
								</button>
							{/if}
						</div>
					</li>
					{#if editingId === b.id}
						<li class="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
							<div class="grid gap-2 sm:grid-cols-2">
								<div>
									<label class="block text-xs text-zinc-500">Name</label>
									<input
										type="text"
										class="mt-0.5 w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm"
										bind:value={editName}
									/>
								</div>
								<div class="sm:col-span-2">
									<label class="block text-xs text-zinc-500">Description</label>
									<input
										type="text"
										class="mt-0.5 w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm"
										bind:value={editDescription}
									/>
								</div>
								<div class="sm:col-span-2">
									<label class="block text-xs text-zinc-500">Voice prompt</label>
									<textarea
										class="mt-0.5 w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 font-mono text-sm"
										rows="8"
										bind:value={editVoicePrompt}
									></textarea>
								</div>
							</div>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</section>
</div>
