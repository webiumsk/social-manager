<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { PLATFORMS, PLATFORM_MAP } from '$lib/utils/constants';
	import PlatformIcon from '$lib/components/PlatformIcon.svelte';
	import type { PlatformId } from '$lib/utils/constants';

	let { data } = $props();

	interface Connection {
		id: number;
		platform: string;
		displayName: string | null;
	}
	let connections = $state<Connection[]>([]);
	let originalText = $state('');
	let mediaPaths = $state<string[]>([]);
	let tags = $state<string[]>([]);
	let selectedPlatforms = $state<Set<string>>(new Set());
	let adaptedTexts = $state<Record<string, string>>({});
	/** true = user manually edited this platform's preview; then we don't overwrite from original */
	let platformDirty = $state<Record<string, boolean>>({});
	let postId = $state<number | null>(null);
	let scheduledAt = $state('');
	let saving = $state(false);
	let publishing = $state(false);
	let deleting = $state(false);
	let adapting = $state(false);
	let message = $state('');
	let publishResult = $state<{ published: number; total: number; results: { platform: string; success: boolean; postUrl?: string; error?: string }[] } | null>(null);

	const connectedPlatformIds = $derived(connections.map((c) => c.platform));

	async function loadConnections() {
		const res = await fetch('/api/platforms');
		if (res.ok) connections = await res.json();
	}

	function togglePlatform(platformId: string) {
		const meta = PLATFORM_MAP[platformId as PlatformId];
		if (meta?.requiresMedia && mediaPaths.length === 0) return; // e.g. Instagram requires at least one image
		const next = new Set(selectedPlatforms);
		if (next.has(platformId)) next.delete(platformId);
		else next.add(platformId);
		selectedPlatforms = next;
		if (!next.has(platformId)) return;
		adaptedTexts = { ...adaptedTexts, [platformId]: originalText };
		platformDirty = { ...platformDirty, [platformId]: false };
	}

	// Instagram requires media: deselect when user removes all media
	$effect(() => {
		if (mediaPaths.length > 0) return;
		if (!selectedPlatforms.has('instagram')) return;
		selectedPlatforms = new Set([...selectedPlatforms].filter((p) => p !== 'instagram'));
	});

	// Sync original text into preview for platforms that weren't manually edited
	$effect(() => {
		const orig = originalText;
		const platforms = Array.from(selectedPlatforms);
		let changed = false;
		const next = { ...adaptedTexts };
		for (const id of platforms) {
			if (!platformDirty[id] && next[id] !== orig) {
				next[id] = orig;
				changed = true;
			}
		}
		if (changed) adaptedTexts = next;
	});

	function markPlatformDirty(platformId: string) {
		platformDirty = { ...platformDirty, [platformId]: true };
	}

	function charColor(platformId: string): string {
		const meta = PLATFORM_MAP[platformId as PlatformId];
		if (!meta) return 'text-zinc-400';
		const len = (adaptedTexts[platformId] ?? '').length;
		if (len > meta.charLimit) return 'text-red-400';
		if (len > meta.charLimit * 0.9) return 'text-yellow-400';
		return 'text-green-400';
	}

	async function saveDraft() {
		saving = true;
		message = '';
		const platforms = Array.from(selectedPlatforms);
		const variants = platforms.map((platform) => ({
			platform,
			adaptedText: adaptedTexts[platform] ?? originalText
		}));
		try {
			if (postId != null) {
				const res = await fetch(`/api/posts/${postId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						originalText,
						mediaPaths,
						tags,
						scheduledAt: scheduledAt.trim() || null,
						variants: variants.map((v) => ({ platform: v.platform, adaptedText: v.adaptedText }))
					})
				});
				if (!res.ok) throw new Error('Update failed');
				message = 'Draft updated.';
			} else {
				const res = await fetch('/api/posts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						originalText,
						brandId: data.activeBrand?.id ?? null,
						platforms,
						mediaPaths,
						tags,
						scheduledAt: scheduledAt.trim() || null
					})
				});
				if (!res.ok) throw new Error('Create failed');
				const post = await res.json();
				postId = post.id;
				message = 'Draft saved.';
			}
		} catch (e) {
			message = 'Error: ' + (e instanceof Error ? e.message : 'Unknown');
		}
		saving = false;
	}

	async function onFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = input.files;
		if (!files?.length || !data.user) return;
		for (const file of Array.from(files)) {
			if (!file.type.startsWith('image/')) continue;
			const form = new FormData();
			form.set('file', file);
			const res = await fetch('/api/media/upload', { method: 'POST', body: form });
			if (res.ok) {
				const { path: p } = await res.json();
				mediaPaths = [...mediaPaths, p];
			}
		}
		input.value = '';
	}

	function removeMedia(index: number) {
		mediaPaths = mediaPaths.filter((_, i) => i !== index);
	}

	function mediaFileName(path: string): string {
		const parts = path.split('/');
		return parts[parts.length - 1] ?? path;
	}

	/** URL to display image (path is e.g. media/userId/filename) */
	function mediaPreviewUrl(path: string): string {
		const parts = path.split('/');
		if (parts.length < 3) return '';
		return `/api/media/file/${parts[1]}/${parts[2]}`;
	}

	function mediaCountLabel(): string {
		const n = mediaPaths.length;
		if (n === 0) return '';
		return n === 1 ? '1 image' : `${n} images`;
	}

	async function adaptWithAi() {
		if (selectedPlatforms.size === 0 || !originalText.trim()) return;
		adapting = true;
		message = '';
		try {
			const res = await fetch('/api/adapt', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					text: originalText,
					brandId: data.activeBrand?.id ?? null,
					platforms: Array.from(selectedPlatforms),
					hasMedia: mediaPaths.length > 0
				})
			});
			const dataRes = await res.json();
			if (!res.ok) {
				message = dataRes.error ?? 'Adaptation failed';
				return;
			}
			adaptedTexts = { ...adaptedTexts, ...dataRes };
			platformDirty = Object.fromEntries(Array.from(selectedPlatforms).map((p) => [p, true]));
			message = 'Previews generated.';
		} catch (e) {
			message = 'Error: ' + (e instanceof Error ? e.message : 'Unknown');
		}
		adapting = false;
	}

	async function publish() {
		if (postId == null) return;
		publishing = true;
		message = '';
		publishResult = null;
		try {
			const res = await fetch(`/api/posts/${postId}/publish`, { method: 'POST' });
			const data = await res.json();
			if (!res.ok) {
				message = data.error ?? 'Publish failed';
				return;
			}
			publishResult = data;
			message = data.published === data.total
				? `Published to ${data.total} platform(s).`
				: data.published > 0
					? `Partial: ${data.published}/${data.total} platform(s).`
					: 'Publish failed.';
		} catch (e) {
			message = 'Error: ' + (e instanceof Error ? e.message : 'Unknown');
		}
		publishing = false;
	}

	async function deleteDraft() {
		if (postId == null) return;
		if (!confirm('Really delete this draft?')) return;
		deleting = true;
		message = '';
		try {
			const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
			if (res.ok) {
				postId = null;
				originalText = '';
				mediaPaths = [];
				tags = [];
				scheduledAt = '';
				selectedPlatforms = new Set();
				adaptedTexts = {};
				platformDirty = {};
				message = 'Draft deleted.';
				// Leave publishResult visible briefly or clear it
				publishResult = null;
				// Go to clean compose URL
				window.history.replaceState({}, '', '/compose');
			} else {
				message = 'Delete failed';
			}
		} catch (e) {
			message = 'Error: ' + (e instanceof Error ? e.message : 'Unknown');
		}
		deleting = false;
	}

	async function loadDraft(id: number) {
		const res = await fetch(`/api/posts/${id}`);
		if (!res.ok) return;
		const post = await res.json();
		const text = post.originalText ?? '';
		postId = post.id;
		originalText = text;
		mediaPaths = post.mediaPaths ? JSON.parse(post.mediaPaths) : [];
		tags = post.tags ? JSON.parse(post.tags) : [];
		const variants = post.variants ?? [];
		selectedPlatforms = new Set(variants.map((v: { platform: string }) => v.platform));
		adaptedTexts = Object.fromEntries(
			variants.map((v: { platform: string; adaptedText?: string }) => [v.platform, v.adaptedText ?? text])
		);
		// Only mark as "edited" platforms where text was actually customized (differs from original)
		platformDirty = Object.fromEntries(
			variants.map((v: { platform: string; adaptedText?: string }) => [
				v.platform,
				(v.adaptedText ?? text) !== text
			])
		);
		scheduledAt = post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : '';
	}

	onMount(() => loadConnections());

	$effect(() => {
		const idParam = $page.url.searchParams.get('postId');
		const id = idParam ? parseInt(idParam, 10) : NaN;
		if (!Number.isNaN(id) && id !== postId) loadDraft(id);
	});
</script>

<div class="space-y-4">
	<h1 class="text-xl font-semibold sm:text-2xl">Compose</h1>
	{#if !data.activeBrand}
		<p class="text-zinc-500">Select a brand in the sidebar to see connected platforms.</p>
	{:else}
		<div class="grid gap-4 lg:grid-cols-[1fr_1fr] lg:gap-6">
			<!-- Left: original + media -->
			<div class="space-y-4">
				<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
					<label for="compose-original" class="block text-sm font-medium text-zinc-400">Original text</label>
					<textarea
						id="compose-original"
						class="mt-1 min-h-[160px] w-full resize-y rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 sm:min-h-[180px]"
						placeholder="Write your post..."
						bind:value={originalText}
					></textarea>
					<p class="mt-1 text-xs text-zinc-500">{originalText.length} characters</p>
				</div>
				<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
					<p class="mb-2 text-sm font-medium text-zinc-400">Media</p>
					<input
						id="compose-media-input"
						type="file"
						accept="image/*"
						multiple
						class="sr-only"
						onchange={onFileSelect}
					/>
					<div
						class="flex min-h-[100px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-600 bg-zinc-800/50 p-4 transition hover:border-zinc-500 hover:bg-zinc-800"
						role="button"
						tabindex="0"
						onclick={() => document.getElementById('compose-media-input')?.click()}
						onkeydown={(e) => e.key === 'Enter' && document.getElementById('compose-media-input')?.click()}
						ondragover={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-violet-500', 'bg-violet-500/10'); }}
						ondragleave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-violet-500', 'bg-violet-500/10'); }}
						ondrop={(e) => {
							e.preventDefault();
							e.currentTarget.classList.remove('border-violet-500', 'bg-violet-500/10');
							const input = document.getElementById('compose-media-input') as HTMLInputElement;
							if (input && e.dataTransfer?.files?.length) {
								const dt = new DataTransfer();
								Array.from(e.dataTransfer.files).forEach((f) => dt.items.add(f));
								input.files = dt.files;
								input.dispatchEvent(new Event('change', { bubbles: true }));
							}
						}}
					>
						<span class="text-sm text-zinc-400">Drag images here or</span>
						<button
							type="button"
							class="mt-1 text-sm font-medium text-violet-400 hover:text-violet-300 hover:underline"
						>
							click to select
						</button>
					</div>
					{#if mediaPaths.length > 0}
						<ul class="mt-3 flex flex-wrap gap-3">
							{#each mediaPaths as p, i}
								<li
									class="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800 p-2"
								>
									<img
										src={mediaPreviewUrl(p)}
										alt={mediaFileName(p)}
										class="h-20 w-20 shrink-0 rounded object-cover"
									/>
									<span class="max-w-[100px] truncate text-xs text-zinc-400" title={p}>{mediaFileName(p)}</span>
									<button
										type="button"
										class="rounded px-1.5 py-0.5 text-xs text-zinc-500 hover:bg-zinc-600 hover:text-red-400"
										aria-label="Remove"
										onclick={(ev) => { ev.stopPropagation(); removeMedia(i); }}
									>
										Remove
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
				<!-- Schedule -->
				<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
					<label for="compose-scheduled" class="block text-sm font-medium text-zinc-400">Schedule for</label>
					<input
						id="compose-scheduled"
						type="datetime-local"
						class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
						bind:value={scheduledAt}
					/>
					<p class="mt-1 text-xs text-zinc-500">Leave empty for immediate publish. Scheduled posts appear in Schedule.</p>
				</div>
				<!-- Platform toggles -->
				<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
					<p class="mb-2 text-sm font-medium text-zinc-400">Platforms (brand: {data.activeBrand.name})</p>
					{#if connections.length === 0}
						<p class="text-xs text-zinc-500">Connect platforms in Settings for this brand.</p>
					{:else}
						<div class="flex flex-wrap gap-2">
							{#each connections as conn}
								{@const meta = PLATFORM_MAP[conn.platform as PlatformId]}
								{@const isInstagramNoMedia = meta?.requiresMedia && mediaPaths.length === 0}
								<button
									type="button"
									title={isInstagramNoMedia ? 'Instagram requires at least one image' : ''}
									class="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition {selectedPlatforms.has(conn.platform)
										? 'border-violet-500 bg-violet-600/20 text-violet-300'
										: 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'} {isInstagramNoMedia ? 'cursor-not-allowed opacity-60' : ''}"
									disabled={isInstagramNoMedia}
									onclick={() => togglePlatform(conn.platform)}
								>
									<PlatformIcon platform={conn.platform} />
									{meta?.name ?? conn.platform}
								</button>
							{/each}
						</div>
						{#if connections.some((c) => PLATFORM_MAP[c.platform as PlatformId]?.requiresMedia) && mediaPaths.length === 0}
							<p class="mt-2 text-xs text-zinc-500">Instagram is disabled until you add at least one image.</p>
						{/if}
					{/if}
				</div>
			</div>
			<!-- Right: previews -->
			<div class="space-y-3">
				<p class="text-sm font-medium text-zinc-400">Preview by platform</p>
				{#each Array.from(selectedPlatforms) as platformId}
					{@const meta = PLATFORM_MAP[platformId as PlatformId]}
					<div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
						<div class="mb-2 flex items-center justify-between">
							<PlatformIcon platform={platformId} />
							<span class="text-sm font-medium">{meta?.name ?? platformId}</span>
							<span class="text-xs {charColor(platformId)}">
								{(adaptedTexts[platformId] ?? '').length}
								{#if meta}/{meta.charLimit}{/if}
							</span>
						</div>
						{#if mediaPaths.length > 0}
							<p class="mb-2 text-xs text-zinc-500">
								Attached: {mediaCountLabel()}
							</p>
						{/if}
						<textarea
							class="min-h-[100px] w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-100"
							bind:value={adaptedTexts[platformId]}
							oninput={() => markPlatformDirty(platformId)}
						></textarea>
					</div>
				{/each}
				{#if selectedPlatforms.size === 0}
					<p class="text-sm text-zinc-500">Select platforms on the left.</p>
				{/if}
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-4 pt-4">
			<button
				class="rounded-lg border border-violet-500 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-300 hover:bg-violet-600/30 disabled:opacity-50"
				disabled={adapting || saving || selectedPlatforms.size === 0 || !originalText.trim()}
				onclick={adaptWithAi}
			>
				{adapting ? 'Generating…' : 'Adapt with AI'}
			</button>
			<button
				class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
				disabled={saving}
				onclick={saveDraft}
			>
				{saving ? 'Saving…' : postId != null ? 'Update draft' : 'Save draft'}
			</button>
			{#if postId != null && selectedPlatforms.size > 0}
				<button
					class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
					disabled={publishing || saving}
					onclick={publish}
				>
					{publishing ? 'Publishing…' : 'Publish'}
				</button>
			{/if}
			{#if postId != null}
				<button
					class="rounded-lg border border-red-600/80 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-600/20 disabled:opacity-50"
					disabled={deleting || saving}
					onclick={deleteDraft}
				>
					{deleting ? 'Deleting…' : 'Delete draft'}
				</button>
			{/if}
			{#if message}
				<span class="text-sm text-zinc-400">{message}</span>
			{/if}
		</div>
		{#if publishResult}
			<div class="mt-2 rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-sm">
				<p class="mb-2 font-medium text-zinc-300">Publish result</p>
				<ul class="space-y-1">
					{#each publishResult.results as r}
						<li class="flex items-center gap-2">
							{r.platform}: {r.success ? 'OK' : (r.error ?? 'error')}
							{#if r.postUrl}
								<a href={r.postUrl} target="_blank" rel="noopener noreferrer" class="text-violet-400 hover:underline">link</a>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</div>
