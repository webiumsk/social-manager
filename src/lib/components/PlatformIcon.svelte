<script lang="ts">
	import type { PlatformId } from '$lib/utils/constants';

	let { platform, class: className = '' } = $props();
	const label = $derived(platform ? String(platform).charAt(0).toUpperCase() : '?');
</script>

<span
	class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-medium {className}"
	title={platform}
>{label}</span>
