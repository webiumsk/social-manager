<script lang="ts">
	import { onMount } from 'svelte';
	import { PLATFORMS, PLATFORM_CREDENTIAL_FIELDS, PLATFORM_HELP_LINKS, PLATFORMS_WITH_QUICK_CONNECT } from '$lib/utils/constants';
	import type { PlatformId } from '$lib/utils/constants';

	let { data } = $props();

	interface Connection {
		id: number;
		platform: string;
		displayName: string | null;
		connectionMode?: string | null;
		isActive: boolean | null;
	}
	let quotaStatus = $state<Record<string, { usage: number; limit: number }>>({});
	let showAdvanced = $state<Record<string, boolean>>({});
	let oauthError = $state<string | null>(null);
	let connections = $state<Connection[]>([]);
	let connectingPlatform = $state<PlatformId | null>(null);
	let connectForm = $state<Record<string, string>>({});
	let testResult = $state<Record<string, { ok?: boolean; error?: string }>>({});
	let platformSaving = $state(false);
	let generatedNpub = $state<string | null>(null);
	let nostrGenerateError = $state<string | null>(null);

	async function loadConnections() {
		const res = await fetch('/api/platforms');
		if (res.ok) connections = await res.json();
	}
	async function loadQuota() {
		const res = await fetch('/api/billing/quota');
		if (res.ok) quotaStatus = await res.json();
	}

	function getConnection(platformId: string): Connection | undefined {
		return connections.find((c) => c.platform === platformId);
	}

	async function connect(platformId: PlatformId) {
		const fields = PLATFORM_CREDENTIAL_FIELDS[platformId];
		const credentials: Record<string, string> = {};
		for (const f of fields) credentials[f.key] = connectForm[f.key] ?? '';
		platformSaving = true;
		const res = await fetch('/api/platforms', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				brandId: data.activeBrand?.id ?? null,
				platform: platformId,
				credentials,
				displayName: credentials.handle ?? credentials.instanceUrl ?? null,
				connectionMode: PLATFORMS_WITH_QUICK_CONNECT.includes(platformId) ? 'manual' : undefined
			})
		});
		platformSaving = false;
		if (res.ok) {
			connectingPlatform = null;
			connectForm = {};
			generatedNpub = null;
			nostrGenerateError = null;
			await loadConnections();
		}
	}

	async function disconnect(connectionId: number) {
		if (!confirm('Disconnect this platform?')) return;
		await fetch(`/api/platforms/${connectionId}`, { method: 'DELETE' });
		await loadConnections();
	}

	async function testConnection(connectionId: number, platformId: string) {
		testResult = { ...testResult, [platformId]: {} };
		const res = await fetch(`/api/platforms/${connectionId}/test`, { method: 'POST' });
		const result = await res.json();
		testResult = { ...testResult, [platformId]: { ok: result.success, error: result.error } };
	}

	async function generateNostrKeypair() {
		generatedNpub = null;
		nostrGenerateError = null;
		try {
			const { generateSecretKey, getPublicKey } = await import('nostr-tools/pure');
			const nip19 = await import('nostr-tools/nip19');
			const sk = generateSecretKey();
			const nsec = nip19.nsecEncode(sk);
			const npub = nip19.npubEncode(getPublicKey(sk));
			connectForm = { ...connectForm, nsec };
			generatedNpub = npub;
		} catch (e) {
			nostrGenerateError = e instanceof Error ? e.message : 'Generation error';
		}
	}

	let subscription = $state<{
		tier: string;
		tierName: string;
		usage?: { postsThisMonth: number; adaptationsThisMonth: number; brandsCount: number; platformsCount: number };
		limits?: { postsPerMonth: number; aiAdaptationsPerMonth: number; brands: number; platforms: number };
		selfHosted?: boolean;
	} | null>(null);
	let settings = $state<{
		aiProvider?: string;
		aiEndpoint?: string;
		aiModel?: string;
		aiTemperature?: number;
		accentColor?: string;
		theme?: string;
		hasAiKey?: boolean;
	}>({});
	let aiApiKey = $state('');
	let saving = $state(false);
	let message = $state('');
	let aiTestResult = $state<{ success: boolean; error?: string } | null>(null);
	let aiTestLoading = $state(false);
	let allowPublicRegistration = $state(false);
	let adminRegistrationSaving = $state(false);

	const isAdmin = $derived((data.user as { role?: string })?.role === 'admin');

	const providers = [
		{ id: 'none', name: 'No AI (manual mode)' },
		{ id: 'openai', name: 'OpenAI' },
		{ id: 'anthropic', name: 'Anthropic' },
		{ id: 'google', name: 'Google Gemini' },
		{ id: 'groq', name: 'Groq' },
		{ id: 'mistral', name: 'Mistral' },
		{ id: 'openrouter', name: 'OpenRouter' },
		{ id: 'ollama', name: 'Ollama (local)' },
		{ id: 'custom', name: 'Custom (OpenAI compatible)' }
	];

	async function loadSettings() {
		const res = await fetch('/api/settings');
		if (res.ok) settings = await res.json();
	}
	async function loadSubscription() {
		const res = await fetch('/api/billing/subscription');
		if (res.ok) subscription = await res.json();
	}
	async function loadAdminRegistration() {
		const res = await fetch('/api/admin/registration');
		if (res.ok) {
			const j = await res.json();
			allowPublicRegistration = j.allowPublicRegistration === true;
		}
	}
	async function saveAdminRegistration() {
		adminRegistrationSaving = true;
		const res = await fetch('/api/admin/registration', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ allowPublicRegistration })
		});
		adminRegistrationSaving = false;
		if (res.ok) await loadAdminRegistration();
	}
	async function startQuickConnect(platformId: string) {
		oauthError = null;
		const brandId = data.activeBrand?.id;
		const authUrl =
			brandId != null
				? `/api/oauth/${platformId}/authorize?brandId=${encodeURIComponent(brandId)}`
				: `/api/oauth/${platformId}/authorize`;
		const res = await fetch(authUrl, { redirect: 'manual' });
		const location = res.headers.get('location');
		if ((res.status === 301 || res.status === 302) && location) {
			window.location.href = location;
			return;
		}
		const data = await res.json().catch(() => ({}));
		if (!res.ok) oauthError = data.error || data.hint || `Error ${res.status}`;
	}
	async function testAiConnection() {
		aiTestResult = null;
		aiTestLoading = true;
		try {
			const res = await fetch('/api/ai/test', { method: 'POST' });
			const data = await res.json();
			aiTestResult = { success: data.success === true, error: data.error };
		} catch {
			aiTestResult = { success: false, error: 'Network error' };
		} finally {
			aiTestLoading = false;
		}
	}

	async function saveSettings() {
		saving = true;
		message = '';
		const body: Record<string, unknown> = {
			aiProvider: settings.aiProvider || null,
			aiEndpoint: settings.aiEndpoint || null,
			aiModel: settings.aiModel || null,
			aiTemperature: settings.aiTemperature ?? 0.7,
			accentColor: settings.accentColor ?? '#7c3aed',
			theme: settings.theme ?? 'dark'
		};
		if (aiApiKey !== '') body.aiApiKey = aiApiKey;
		const res = await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		saving = false;
		if (res.ok) {
			message = 'Settings saved.';
			aiApiKey = '';
			await loadSettings();
		} else {
			message = 'Error saving.';
		}
	}

	onMount(async () => {
		loadSettings();
		loadConnections();
		await loadSubscription();
		loadQuota();
		if (subscription?.selfHosted && isAdmin) await loadAdminRegistration();
	});
</script>

<div class="space-y-8">
	<h1 class="text-2xl font-semibold">Settings</h1>

	<!-- AI -->
	<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
		<h2 class="mb-4 text-lg font-medium">AI configuration</h2>
		<div class="grid gap-4 sm:grid-cols-2">
			<div>
				<label class="block text-sm text-zinc-400">Provider</label>
				<select
					class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
					bind:value={settings.aiProvider}
				>
					{#each providers as p}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</div>
			{#if settings.aiProvider && settings.aiProvider !== 'none'}
				<div>
					<label class="block text-sm text-zinc-400">API key</label>
					<input
						type="password"
						class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
						placeholder={settings.hasAiKey ? '•••••••• (leave empty to keep)' : ''}
						bind:value={aiApiKey}
					/>
				</div>
				<div>
					<label class="block text-sm text-zinc-400">Endpoint (optional)</label>
					<input
						type="text"
						class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
						placeholder="https://..."
						bind:value={settings.aiEndpoint}
					/>
				</div>
				<div>
					<label class="block text-sm text-zinc-400">Model</label>
					<input
						type="text"
						class="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
						bind:value={settings.aiModel}
					/>
				</div>
				<div class="sm:col-span-2 flex items-end gap-2">
					<button
						type="button"
						class="rounded-lg bg-zinc-700 px-4 py-2 text-sm hover:bg-zinc-600 disabled:opacity-50"
						disabled={aiTestLoading}
						onclick={testAiConnection}
					>
						{aiTestLoading ? 'Testing…' : 'Test AI connection'}
					</button>
					{#if aiTestResult}
						<span class="text-sm" class:text-green-400={aiTestResult.success} class:text-red-400={!aiTestResult.success}>
							{aiTestResult.success ? 'Connection OK' : aiTestResult.error ?? 'Error'}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</section>

	<!-- Subscription -->
	<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
		<h2 class="mb-4 text-lg font-medium">Subscription</h2>
		{#if subscription?.selfHosted}
			<p class="text-sm text-emerald-400">Self-hosted instance — all features available.</p>
		{:else if subscription}
			<p class="text-sm text-zinc-400">Current plan: <strong class="text-zinc-200">{subscription.tierName}</strong></p>
			{#if subscription.usage && subscription.limits}
				<div class="mt-3 grid gap-2 text-sm">
					<p class="text-zinc-500">
						Posts this month: {subscription.usage.postsThisMonth}
						{#if subscription.limits.postsPerMonth >= 0}
							/ {subscription.limits.postsPerMonth}
						{:else}
							/ ∞
						{/if}
					</p>
					<p class="text-zinc-500">
						AI adaptations: {subscription.usage.adaptationsThisMonth}
						{#if subscription.limits.aiAdaptationsPerMonth >= 0}
							/ {subscription.limits.aiAdaptationsPerMonth}
						{:else}
							/ ∞
						{/if}
					</p>
					<p class="text-zinc-500">
						Brands: {subscription.usage.brandsCount} · Platforms: {subscription.usage.platformsCount}
					</p>
				</div>
			{/if}
			{#if subscription.tier === 'free'}
				<a href="/pricing" class="mt-4 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm hover:bg-violet-500">Go to Pro / Team</a>
			{:else}
				<a href="/pricing" class="mt-4 inline-block text-sm text-violet-400 hover:underline">Change subscription</a>
			{/if}
		{:else}
			<p class="text-sm text-zinc-500">Loading…</p>
		{/if}
	</section>

	<!-- Instance (admin, self-hosted only) -->
	{#if subscription?.selfHosted && isAdmin}
		<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
			<h2 class="mb-4 text-lg font-medium">Instance</h2>
			<p class="mb-4 text-sm text-zinc-500">
				When public registration is off, only you (and existing users) can use this instance. New users cannot sign up unless you turn it on.
			</p>
			<label class="flex items-center gap-3">
				<input
					type="checkbox"
					class="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-violet-600 focus:ring-violet-500"
					bind:checked={allowPublicRegistration}
				/>
				<span class="text-sm text-zinc-300">Allow public registration</span>
			</label>
			<button
				type="button"
				class="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
				disabled={adminRegistrationSaving}
				onclick={saveAdminRegistration}
			>
				{adminRegistrationSaving ? 'Saving…' : 'Save'}
			</button>
		</section>
	{/if}

	<!-- Platform connections -->
	<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
		<h2 class="mb-4 text-lg font-medium">Platform connections</h2>
		{#if !data.activeBrand}
			<p class="text-sm text-zinc-500">Create and activate a brand in the Brands section.</p>
		{:else}
			<p class="mb-4 text-sm text-zinc-500">For brand „{data.activeBrand.name}". Credentials are stored encrypted.</p>
			<div class="grid gap-3 sm:grid-cols-2">
				{#each PLATFORMS as platform}
					{@const conn = getConnection(platform.id)}
					<div class="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
						<div class="flex items-center justify-between">
							<span class="font-medium">{platform.name}</span>
							{#if conn}
								<span class="text-xs text-green-500">Connected</span>
							{:else}
								<span class="text-xs text-zinc-500">Not connected</span>
							{/if}
						</div>
						{#if conn}
							<p class="mt-1 text-sm text-zinc-400">
								<span class="text-zinc-500">Account:</span>
								{#if conn.displayName}
									<code class="ml-1 break-all text-violet-300">{conn.displayName}</code>
								{:else}
									<span class="ml-1 italic text-zinc-500">—</span>
								{/if}
								{#if PLATFORMS_WITH_QUICK_CONNECT.includes(platform.id)}
									{#if conn.connectionMode === 'quick_connect'}
										<span class="ml-2 rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">Shared quota</span>
									{:else}
										<span class="ml-2 rounded bg-zinc-600 px-1.5 py-0.5 text-xs text-zinc-300">Own quota</span>
									{/if}
								{/if}
							</p>
							{#if conn.connectionMode === 'quick_connect' && quotaStatus[platform.id]}
								{@const q = quotaStatus[platform.id]}
								<p class="mt-1 text-xs text-zinc-500">
									Quick Connect usage: {q.usage} / {q.limit} this month
									{#if q.limit > 0 && q.usage >= q.limit * 0.8}
										<span class="text-amber-400"> · Near limit. Use your own API keys (Advanced) for more posts.</span>
									{/if}
								</p>
							{/if}
							<div class="mt-2 flex gap-2">
								<button
									class="rounded bg-zinc-600 px-2 py-1 text-xs hover:bg-zinc-500"
									onclick={() => testConnection(conn.id, platform.id)}
								>
									Test
								</button>
								<button
									class="rounded bg-red-900/50 px-2 py-1 text-xs text-red-300 hover:bg-red-900/70"
									onclick={() => disconnect(conn.id)}
								>
									Disconnect
								</button>
							</div>
							{#if testResult[platform.id]}
								<p class="mt-1 text-xs" class:text-green-400={testResult[platform.id].ok} class:text-red-400={testResult[platform.id].error}>
									{testResult[platform.id].ok ? 'OK' : testResult[platform.id].error ?? 'Error'}
								</p>
							{/if}
						{:else}
							{#if connectingPlatform === platform.id}
								{#if PLATFORMS_WITH_QUICK_CONNECT.includes(platform.id)}
									<div class="mt-3 space-y-2">
										<div>
											<button
												type="button"
												class="rounded bg-violet-600 px-3 py-1.5 text-sm hover:bg-violet-500"
												onclick={() => startQuickConnect(platform.id)}
											>
												Connect via {platform.name} (Quick Connect)
											</button>
											<p class="mt-1 text-xs text-zinc-500">OAuth — uses the app's shared quota.</p>
											{#if oauthError}
												<p class="mt-2 text-xs text-amber-400">{oauthError}</p>
											{/if}
										</div>
										<p class="text-xs text-zinc-500">or</p>
										<button
											type="button"
											class="rounded border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-700"
											onclick={() => showAdvanced = { ...showAdvanced, [platform.id]: !showAdvanced[platform.id] }}
										>
											{showAdvanced[platform.id] ? 'Hide' : 'Own API keys (Advanced)'}
										</button>
									</div>
								{/if}
								{#if !PLATFORMS_WITH_QUICK_CONNECT.includes(platform.id) || showAdvanced[platform.id]}
								<form
									class="mt-3 space-y-2"
									onsubmit={(e) => {
										e.preventDefault();
										connect(platform.id);
									}}
								>
									{#if platform.id === 'nostr'}
										<div class="rounded border border-zinc-600 bg-zinc-800/50 p-2">
											<button
												type="button"
												class="rounded bg-violet-600/80 px-2 py-1 text-xs hover:bg-violet-500"
												onclick={generateNostrKeypair}
											>
												Generate new keypair
											</button>
											{#if generatedNpub}
												<p class="mt-2 text-xs text-zinc-400">Public key (npub): <code class="break-all text-violet-300">{generatedNpub}</code></p>
												<p class="mt-0.5 text-xs text-zinc-500">nsec is filled below. Click Connect to save.</p>
											{/if}
											{#if nostrGenerateError}
												<p class="mt-1 text-xs text-red-400">{nostrGenerateError}</p>
											{/if}
										</div>
									{/if}
									{#each PLATFORM_CREDENTIAL_FIELDS[platform.id] as field}
										<div>
											<label class="block text-xs text-zinc-500">{field.label}</label>
											{#if field.key === 'relays'}
												<textarea
													class="mt-0.5 w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm"
													rows="2"
													placeholder={field.placeholder}
													bind:value={connectForm[field.key]}
												></textarea>
											{:else}
												<input
													type={field.type ?? 'text'}
													class="mt-0.5 w-full rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm"
													placeholder={field.placeholder}
													bind:value={connectForm[field.key]}
												/>
											{/if}
										</div>
									{/each}
									{#if PLATFORM_HELP_LINKS[platform.id]?.length}
										<p class="text-xs text-zinc-500">Where to get credentials:</p>
										<ul class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
											{#each PLATFORM_HELP_LINKS[platform.id] as link}
												<li>
													<a href={link.url} target="_blank" rel="noopener noreferrer" class="text-violet-400 hover:underline">{link.label}</a>
												</li>
											{/each}
										</ul>
									{/if}
									<div class="flex gap-2 pt-1">
										<button type="submit" class="rounded bg-violet-600 px-2 py-1 text-xs hover:bg-violet-500" disabled={platformSaving}>
											Connect
										</button>
										<button
											type="button"
											class="rounded bg-zinc-600 px-2 py-1 text-xs hover:bg-zinc-500"
											onclick={() => { connectingPlatform = null; generatedNpub = null; nostrGenerateError = null; oauthError = null; showAdvanced = {}; }}
										>
											Cancel
										</button>
									</div>
								</form>
								{/if}
							{:else}
								<button
									class="mt-2 rounded bg-violet-600/80 px-2 py-1 text-xs hover:bg-violet-500"
									onclick={() => (connectingPlatform = platform.id)}
								>
									Connect
								</button>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Account -->
	<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
		<h2 class="mb-4 text-lg font-medium">Account</h2>
		<p class="text-sm text-zinc-500">Password change and account deletion (Better Auth).</p>
	</section>

	<!-- Appearance -->
	<section class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
		<h2 class="mb-4 text-lg font-medium">Appearance</h2>
		<div class="flex flex-wrap gap-4">
			<div>
				<label class="block text-sm text-zinc-400">Accent color</label>
				<input
					type="color"
					class="mt-1 h-10 w-20 cursor-pointer rounded border border-zinc-700 bg-zinc-800"
					bind:value={settings.accentColor}
				/>
				<span class="ml-2 text-sm text-zinc-500">{settings.accentColor ?? '#7c3aed'}</span>
			</div>
			<div>
				<label class="block text-sm text-zinc-400">Theme</label>
				<select
					class="mt-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
					bind:value={settings.theme}
				>
					<option value="dark">Dark</option>
					<option value="light">Light</option>
				</select>
			</div>
		</div>
	</section>

	<div class="flex items-center gap-4">
		<button
			class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
			disabled={saving}
			onclick={saveSettings}
		>
			{saving ? 'Saving…' : 'Save settings'}
		</button>
		{#if message}
			<span class="text-sm" class:text-green-400={message.includes('saved')} class:text-red-400={message.includes('Error')}>{message}</span>
		{/if}
	</div>
</div>
