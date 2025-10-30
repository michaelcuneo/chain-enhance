<script lang="ts">
  import { onMount } from 'svelte';
	import type { Snippet } from "svelte";
  import Header from './Header.svelte';
  import Footer from './Footer.svelte';
  import './app.css';

  onMount(async () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      await import('highlight.js/styles/github-dark.css');
    } else {
      await import('highlight.js/styles/github.css');
    }
  });

  let { children }: { children: Snippet  } = $props();  
</script>

<Header />
{@render children?.()}
<Footer />