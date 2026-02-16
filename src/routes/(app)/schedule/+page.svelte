<script lang="ts">
	import { onMount } from 'svelte';

	let { data } = $props();

	interface Post {
		id: number;
		originalText: string;
		status: string | null;
		scheduledAt: string | null;
		brandId: number | null;
		createdAt: string | null;
	}
	let posts = $state<Post[]>([]);
	let unschedulingId = $state<number | null>(null);

	async function load() {
		const res = await fetch('/api/posts?status=scheduled');
		if (res.ok) posts = await res.json();
	}

	function formatDate(raw: string | null): string {
		if (!raw) return '—';
		const d = new Date(raw);
		return d.toLocaleDateString(undefined, {
			weekday: 'short',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function preview(text: string, max = 60): string {
		const t = text.replace(/\s+/g, ' ').trim();
		return t.length <= max ? t : t.slice(0, max) + '…';
	}

	async function unschedule(post: Post) {
		unschedulingId = post.id;
		try {
			const res = await fetch(`/api/posts/${post.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ scheduledAt: null })
			});
			if (res.ok) await load();
		} finally {
			unschedulingId = null;
		}
	}

	onMount(() => load());
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-semibold">Schedule</h1>
	<p class="text-zinc-400">Scheduled posts appear here. Call <code class="rounded bg-zinc-800 px-1 text-xs">GET /api/cron/publish-scheduled?secret=CRON_SECRET</code> periodically (e.g. every minute via cron) to publish them at the scheduled time.</p>

	{#if posts.length === 0}
		<p class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-500">
			No scheduled posts. In <a href="/compose" class="text-violet-400 hover:underline">Compose</a> you can set "Schedule for" when saving a draft.
		</p>
	{:else}
		<ul class="space-y-3">
			{#each posts as post}
				<li class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
					<div class="flex flex-wrap items-start justify-between gap-2">
						<div class="min-w-0 flex-1">
							<p class="text-zinc-200">{preview(post.originalText)}</p>
							<p class="mt-2 text-sm text-violet-400">
								Scheduled for: {formatDate(post.scheduledAt)}
							</p>
						</div>
						<div class="flex shrink-0 gap-2">
							<button
								type="button"
								class="rounded bg-zinc-600/80 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-500 disabled:opacity-50"
								disabled={unschedulingId === post.id}
								onclick={() => unschedule(post)}
							>
								{unschedulingId === post.id ? 'Unscheduling…' : 'Unschedule'}
							</button>
							<a
								href="/compose?postId={post.id}"
								class="rounded bg-violet-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-violet-500"
							>
								Edit
							</a>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
