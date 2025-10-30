<script lang="ts">
  import { dev } from '$app/environment';
  import { fade } from 'svelte/transition';
	import { chainEnhance, formChain } from '$lib/index.js';
	import { onMount } from 'svelte';
	import { Marked } from 'marked';
	import { markedHighlight } from 'marked-highlight';
	import hljs from 'highlight.js/lib/core';
	import DOMPurify from 'dompurify';
	import typescript from 'highlight.js/lib/languages/typescript';
  import plaintext from 'highlight.js/lib/languages/plaintext';

  // import 'highlight.js/styles/github-dark.css'
  import 'highlight.js/styles/github.css'
	import FileDropper from './FileDropper/FileDropper.svelte';

  console.log('🌐 Running in', dev ? 'development' : 'production', 'mode');

	// Register syntax highlighting
	hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('plaintext', plaintext);

	// Markdown setup
	let htmlReadme = $state<string>('');
  const md = new Marked(
    markedHighlight({
    emptyLangClass: 'hljs',
      langPrefix: 'hljs language-',
      highlight(code, lang, info) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
		    return hljs.highlight(code, { language }).value;
      }
    })
  );

	// 🔹 Local form state
	let title = $state('Test Project');
	let abstract = $state('A test project to demonstrate chainEnhance.');
	let description = $state(
		'Detailed **markdown** description goes here.\n\n```ts\nconsole.log("Hello!");\n```'
	);
	let featuredImage: File[] = $state([]);

	// 🔹 Chain & UI state
	let chain = $derived($formChain);
	let formState: 'idle' | 'running' | 'complete' = $state('idle');
	let result: Record<string, any> = $state({});
	let activeTab: 'form' | 'docs' = $state('form');

	const chained = chainEnhance(['markdown', 'seo', 'save', 'publish'], {
		onStep: (name, data, index, total) => {
			console.log(`Step ${index} of ${total}: ${name}`);
			formState = 'running';
		},
		onSuccess: (data) => {
			result = data;
			formState = 'complete';
		},
		onError: (err) => {
			console.error('Error during chain:', err);
			formState = 'idle';
		}
	});

	const reset = () => {
		formState = 'idle';
		result = {};
		title = '';
		abstract = '';
		description = '';
		featuredImage = [];
		activeTab = 'form';
	};

  onMount(async () => {
    try {
      const localModules = import.meta.glob('../../README.md', {
        eager: true,
        query: '?raw'
      });

      const deployedModules = import.meta.glob('./README.md', {
        eager: true,
        query: '?raw'
      });

      const modules = dev ? localModules : deployedModules;

      const entry = Object.entries(modules)[0];
      if (!entry) throw new Error('README.md not found');

      const [_, mod] = entry;
      const content =
        typeof mod === 'string'
          ? mod
          : (mod as { default: string }).default ?? '';

      const rendered = await md.parse(content);
      htmlReadme = DOMPurify.sanitize(rendered as string);
    } catch (err) {
      console.error('❌ Failed to load README:', err);
      htmlReadme = '<p style="color:red;">Failed to load documentation.</p>';
    }
  });
</script>

<svelte:head>
	<title>Chain Enhance Demo</title>
	<meta name="description" content="Demonstration of sveltekit-form-chain with multiple steps." />
</svelte:head>

<main>
	<!-- Tabs -->
	<div class="tabs">
		<button
			class:active={activeTab === 'form'}
			onclick={() => (activeTab = 'form')}
		>
			Form Demo
		</button>
		<button
			class:active={activeTab === 'docs'}
			onclick={() => (activeTab = 'docs')}
		>
			Documentation
		</button>
	</div>

	<!-- FORM TAB -->
	{#if activeTab === 'form'}
		<section class="demo-section">
      <h1>chainEnhance Multi-Step Form Demo</h1>
      <p>
  	  	A demo showing a multi-step SvelteKit form workflow chained with
  		  <code>chain-enhance</code>.
	    </p>
      <p>
        Fill out the form below to simulate a content submission workflow that
        processes markdown, generates SEO metadata, saves to a mock database,
        and "publishes" the content.
      </p>

			{#if formState === 'idle'}
				<form
					method="POST"
					action="?/upload"
					use:chained
					enctype="multipart/form-data"
					class="demo-form"
				>
					<label>
						Project Title
						<input type="text" name="title" bind:value={title} required />
					</label>

					<label>
						Abstract
						<textarea name="abstract" bind:value={abstract}></textarea>
					</label>

					<label>
						Description (Markdown)
						<textarea rows={6} name="description" bind:value={description}></textarea>
					</label>

					<label>
						Featured Image
            <FileDropper name="featuredImage" bind:files={featuredImage} />
					</label>

					<button type="submit">🚀 Start Workflow</button>
				</form>
			{:else if formState === 'running'}
				<div class="progress-banner">
					⚙️ Running chained workflow...
					{#if chain.step && chain.step !== 'complete'}
						<br />
						Step: <strong>{chain.step}</strong>
					{/if}
				</div>
			{:else if formState === 'complete'}
				<div class="success-card">
					<h2>✅ Workflow Complete!</h2>
					<p>All chained actions succeeded. Here’s the final result:</p>
					<pre>{JSON.stringify(result, null, 2)}</pre>
					<button class="try-again" onclick={reset}>🔁 Try Again</button>
				</div>
			{/if}
		</section>
  {:else}
    <section class="docs-section">
      {#if htmlReadme}
        <div class="markdown-body" transition:fade>{@html htmlReadme}</div>
      {:else}
        <p class="loading-docs">📄 Loading documentation...</p>
      {/if}
    </section>
  {/if}
</main>

<style>
	main {
		max-width: 1020px;
		margin: 4rem auto;
		padding: 2rem;
	}

	h1 {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	p {
		color: var(--color-text-muted);
	}

	/* ===== Tabs ===== */
	.tabs {
		display: flex;
		gap: 0.5rem;
		margin: 2rem 0 1.5rem;
	}

	.tabs button {
		flex: 1;
		padding: 0.75rem;
		font-weight: 600;
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		transition: all var(--transition);
	}

	.tabs button:hover {
		background: var(--color-accent-hover);
		color: #fff;
	}

	.tabs button.active {
		background: var(--color-accent);
		color: #fff;
		border-color: var(--color-accent-hover);
	}

	.demo-section,
	.docs-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 2rem;
	}

	form.demo-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		font-weight: 600;
		color: var(--color-text);
		gap: 0.5rem;
	}

	input,
	textarea,
	button {
		font-size: 1rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		transition: all var(--transition);
	}

	button {
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
		padding: 0.75rem;
		border: none;
		border-radius: var(--radius);
		font-weight: 500;
	}

	button:hover {
		background: var(--color-accent-hover);
	}

	.progress-banner {
		margin-top: 2rem;
		padding: 1rem;
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		font-weight: 500;
		text-align: center;
	}

	.success-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 2rem;
		margin-top: 2rem;
	}

	.success-card pre {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		padding: 1rem;
		overflow-x: auto;
		margin-top: 1rem;
		color: var(--color-text);
	}

	.try-again {
		background: var(--color-success);
		margin-top: 1rem;
		color: #fff;
		border: none;
		padding: 0.75rem 1.25rem;
		border-radius: var(--radius);
		cursor: pointer;
		font-weight: 500;
	}
	.try-again:hover {
		opacity: 0.9;
	}

	.markdown-body {
		background: var(--color-surface);
		color: var(--color-text);
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		padding: 2rem;
		line-height: 1.6;
		overflow-x: auto;
	}

  .loading-docs {
    text-align: center;
    color: var(--color-text-muted);
    font-style: italic;
    margin: 2rem 0;
  }
</style>
