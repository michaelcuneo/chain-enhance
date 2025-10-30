<script lang="ts">
	import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

	let result: Record<string, any> = $state({});

	onMount(() => {
		const stored = sessionStorage.getItem('chainEnhanceResult');
		if (stored) result = JSON.parse(stored);
	});

  const submit = () => {
    sessionStorage.removeItem('chainEnhanceResult');
    result = {};
    goto('/');
  }
</script>

<svelte:head>
	<title>Chain Complete</title>
	<meta name="description" content="Workflow successfully completed using chainEnhance" />
</svelte:head>

<main>
	<h1>✅ Workflow Complete!</h1>
	<p>Your chained form actions ran successfully. Here's the combined result:</p>

	<div class="result-card">
		{#if Object.keys(result).length > 0}
			<pre>{JSON.stringify(result, null, 2)}</pre>
		{:else}
			<p>No result found — maybe you refreshed this page?</p>
		{/if}
	</div>

	<div class="actions">
		<button onclick={submit}>🔁 Try Again</button>
	</div>
</main>

<style>
	main {
		max-width: 640px;
		margin: 5rem auto;
		padding: 2rem;
		text-align: center;
		font-family: system-ui, sans-serif;
	}
	h1 {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		color: #16a34a;
	}
	p {
		color: #555;
		margin-bottom: 1rem;
	}
	.result-card {
		background: #111;
		color: #0f0;
		text-align: left;
		padding: 1rem;
		border-radius: 8px;
		font-family: monospace;
		font-size: 0.9rem;
		overflow-x: auto;
		max-height: 400px;
		margin-bottom: 2rem;
	}
	button {
		background: #3b82f6;
		color: white;
		font-size: 1rem;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1.25rem;
		cursor: pointer;
	}
	button:hover {
		background: #2563eb;
	}
</style>
