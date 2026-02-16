<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	interface Post {
		id: number;
		originalText: string;
		status: string | null;
		brandId: number | null;
		createdAt: string | null;
		updatedAt: string | null;
		mediaPaths: string | null;
		tags: string | null;
	}
	let posts = $state<Post[]>([]);
	let statusFilter = $state<string>('');
	let publishingId = $state<number | null>(null);
	let deletingId = $state<number | null>(null);

	async function load() {
		const url = statusFilter ? `/api/posts?status=${encodeURIComponent(statusFilter)}` : '/api/posts';
		const res = await fetch(url);
		if (res.ok) posts = await res.json();
	}

	function formatDate(raw: string | null): string {
		if (!raw) return '—';
		const d = new Date(raw);
		return d.toLocaleDateString(undefined, {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function preview(text: string, max = 80): string {
		const t = text.replace(/\s+/g, ' ').trim();
		return t.length <= max ? t : t.slice(0, max) + '…';
	}

	async function publishPost(post: Post) {
		if (post.status !== 'draft') return;
		publishingId = post.id;
		try {
			const res = await fetch(`/api/posts/${post.id}/publish`, { method: 'POST' });
			if (res.ok) await load();
		} finally {
			publishingId = null;
		}
	}

	async function deletePost(post: Post) {
		if (!confirm('Delete this post?')) return;
		deletingId = post.id;
		try {
			const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
			if (res.ok) await load();
		} finally {
			deletingId = null;
		}
	}

	onMount(() => load());
</script>

<div class="space-y-4 sm:space-y-6">
	<h1 class="text-xl font-semibold sm:text-2xl">Posts</h1>

	<div class="flex flex-wrap items-center gap-3">
		<label class="flex items-center gap-2">
			<span class="text-sm text-zinc-400">Status:</span>
			<select
				class="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100"
				bind:value={statusFilter}
				onchange={load}
			>
				<option value="">All</option>
				<option value="draft">Draft</option>
				<option value="scheduled">Scheduled</option>
				<option value="published">Published</option>
				<option value="partial">Partial</option>
				<option value="failed">Failed</option>
			</select>
		</label>
		<a
			href="/compose"
			class="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
		>
			New post
		</a>
	</div>

	{#if posts.length === 0}
		<p class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-zinc-500 sm:p-6">
			No posts. Create a draft in <a href="/compose" class="text-violet-400 hover:underline">Compose</a>.
		</p>
	{:else}
		<ul class="space-y-3">
			{#each posts as post}
				<li class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
					<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
						<div class="min-w-0 flex-1">
							<p class="text-zinc-200">{preview(post.originalText)}</p>
							<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
								<span>{formatDate(post.createdAt)}</span>
								<span
									class="rounded px-1.5 py-0.5 {post.status === 'draft'
										? 'bg-zinc-600 text-zinc-300'
										: post.status === 'published'
											? 'bg-green-900/50 text-green-400'
											: 'bg-zinc-700 text-zinc-400'}"
								>
									{post.status ?? 'draft'}
								</span>
								{#if post.brandId}
									<span>Brand #{post.brandId}</span>
								{/if}
							</div>
						</div>
						<div class="flex flex-wrap gap-2">
							{#if post.status === 'draft'}
								<button
									type="button"
									class="rounded bg-emerald-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
									disabled={publishingId === post.id}
									onclick={() => publishPost(post)}
								>
									{publishingId === post.id ? 'Publishing…' : 'Publish'}
								</button>
							{/if}
							<a
								href="/compose?postId={post.id}"
								class="rounded bg-violet-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-violet-500"
							>
								Edit
							</a>
							<button
								type="button"
								class="rounded bg-red-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
								disabled={deletingId === post.id}
								onclick={() => deletePost(post)}
							>
								{deletingId === post.id ? 'Deleting…' : 'Delete'}
							</button>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
