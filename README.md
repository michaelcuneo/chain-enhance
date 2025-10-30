# 🪄 chain-enhance

> **Sequentially chain multiple [SvelteKit 5](https://kit.svelte.dev) form actions**
> with progress tracking, automatic data passing between steps, and file-safe handling.

Designed for real multi-stage workflows such as uploads → parsing → SEO → database → publish.
Works seamlessly with `use:enhance`, Typescript, and Svelte 5 runes.

---

## 🚀 Install

```bash
npm install chain-enhance
# or
pnpm add chain-enhance
```

---

## ⚙️ Basic Usage

### 1️⃣ Attach the enhancer to a form

```ts
<script lang="ts">
	import { chainEnhance } from 'chain-enhance';
	import { goto } from '$app/navigation';

	let formState = $state<'idle' | string>('idle');
	let progress = $state<number>(0);

	const chained = chainEnhance(['markdown', 'seo', 'save', 'publish'], {
		onStep: (name, data, index, total) => {
			console.log(`Step ${index} of ${total}: ${name}`);
			formState = name;
			progress = Math.round((index / total) * 100);
		},
		onSuccess: (data) => {
			console.log('✅ Chain complete:', data);
			sessionStorage.setItem('chainEnhanceResult', JSON.stringify(data));
			goto('/success');
		},
		onError: (err) => console.error('❌ Chain failed', err)
	});
</script>

<form method="POST" action="?/upload" use:chained enctype="multipart/form-data">
	<input type="text" name="title" placeholder="Title" required />
	<input type="file" name="featuredImage" accept="image/*" required />
	<button type="submit">Start Workflow</button>
</form>

{#if formState !== 'idle'}
	<div class="progress-banner">
		Step {progress}% complete — running <strong>{formState}</strong>...
	</div>
{/if}
```

---

### 2️⃣ Define your actions

```ts
// +page.server.ts
export const actions = {
	// 1. Upload the file
	upload: async ({ request }) => {
		const data = await request.formData();
		const file = data.get('featuredImage') as File;
		// Simulate S3 upload
		await new Promise((r) => setTimeout(r, 800));
		return { step: 'upload', ok: true, featuredImageUrl: 'https://placekitten.com/600/400' };
	},

	// 2. Parse markdown or content
	markdown: async ({ request }) => {
		const prev = JSON.parse(request.formData().get('__previous')?.toString() || '{}');
		return { step: 'markdown', ok: true, wordCount: 245, ...prev };
	},

	// 3. Generate SEO
	seo: async ({ request }) => {
		const prev = JSON.parse(request.formData().get('__previous')?.toString() || '{}');
		return {
			step: 'seo',
			ok: true,
			meta: { title: prev.title, description: 'SEO generated description' }
		};
	},

	// 4. Save the record
	save: async ({ request }) => {
		const prev = JSON.parse(request.formData().get('__previous')?.toString() || '{}');
		return {
			step: 'save',
			ok: true,
			id: crypto.randomUUID(),
			timestamp: new Date().toISOString(),
			...prev
		};
	},

	// 5. Publish or notify
	publish: async ({ request }) => {
		const prev = JSON.parse(request.formData().get('__previous')?.toString() || '{}');
		return { step: 'publish', ok: true, message: `Project "${prev.title}" published!` };
	}
};
```

---

## 🧹 How It Works

1. The first `<form>` action runs via `enhance()`.
   If it succeeds, its response data (`result.data`) becomes your `combined` payload.
2. Each listed action (in order) is called via `fetch(?/action)` with:

   ```js
   fd.append('__previous', JSON.stringify(combined));
   ```

3. Responses are merged into `combined` and passed forward.
4. Once all steps complete, `onSuccess(combined)` fires.

---

## 📊 Tracking Progress

`chainEnhance` emits live progress through the `onStep` callback:

```ts
onStep?: (step: string, data: Record<string, unknown>, index: number, total: number) => void;
```

You can use this to show progress bars, banners, or step indicators.

```svelte
{#if formState !== 'idle'}
	<div class="progress">
		Step {index} of {total}: {formState}
	</div>
{/if}
```

---

## 🧬 Best Practices & Gotchas

| Feature                   | Notes                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File uploads**          | ✅ Fully supported in the **first** step only. Files are streamed once by the browser. Subsequent steps receive JSON (e.g. the file’s uploaded URL). |
| **Error handling**        | Return `{ ok: false, error: 'Message' }` or throw; it triggers `onError`.                                                                            |
| **Redirects / Errors**    | Stop the chain immediately.                                                                                                                          |
| **Nested actions**        | Supported — each action can return arbitrary data.                                                                                                   |
| **Non-serializable data** | Files, Blobs, and ArrayBuffers are stripped automatically with a warning.                                                                            |
| **Progress store**        | Optional: import your own store (`formChain`) to display UI changes globally.                                                                        |

---

## 📦 API Reference

```ts
chainEnhance(
	actions: string[],
	options?: {
		onSuccess?: (final: Record<string, unknown>) => void;
		onError?: (err: unknown) => void;
		onStep?: (
			step: string,
			data: Record<string, unknown>,
			index: number,
			total: number
		) => void;
	}
): (form: HTMLFormElement) => void;
```

| Option                             | Type                                    | Description                                                 |
| ---------------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| `actions`                          | `string[]`                              | Names of subsequent actions to call sequentially.           |
| `onSuccess(final)`                 | `(data) => void`                        | Fired after all steps complete.                             |
| `onError(err)`                     | `(err) => void`                         | Fired on any failure (network, fetch, or non-200 response). |
| `onStep(step, data, index, total)` | `(string, any, number, number) => void` | Fired after each successful step with progress info.        |

---

## ⚡ Example Output

```json
{
	"step": "publish",
	"ok": true,
	"featuredImageUrl": "https://placekitten.com/600/400",
	"wordCount": 245,
	"meta": {
		"title": "My Demo Project",
		"description": "SEO generated description"
	},
	"id": "b83a09b3-e4c3-46aa-8f3b-30d55f58519b",
	"timestamp": "2025-10-29T08:12:22.222Z",
	"message": "Project \"My Demo Project\" published!"
}
```

---

## 🧹 Integration with formChain Store (Optional)

If you use the included `formChain` store:

```ts
import { startStep, completeStep, failStep } from '$lib/stores/formChain';
```

These automatically emit reactive updates for UI components — ideal for dashboards or modals that watch progress globally.

---

## ✅ Supports

| Feature                           | Status |
| --------------------------------- | ------ |
| **SvelteKit ≥ 2.0 / 5.0 (runes)** | ✅     |
| **TypeScript**                    | ✅     |
| **Server Actions (Form Actions)** | ✅     |
| **Multipart Forms**               | ✅     |
| **SSR + SPA modes**               | ✅     |

---

## 📘 Live Demo

🔗 [https://chain-enhance.michaelcuneo.com.au](https://chain-enhance.michaelcuneo.com.au)

_(Deployed via SST v3 from the `routes/` demo app.)_

---

## 🧱 License

MIT © [Michael Cuneo](https://michaelcuneo.com.au)

---

### TL;DR

`chainEnhance()` turns SvelteKit 5 form actions into full multi-stage workflows:

> _Upload → Parse → SEO → Save → Publish → Done_

with:

- automatic JSON chaining
- safe file handling
- live progress callbacks
- and zero extra boilerplate. 🪄
