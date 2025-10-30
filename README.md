---

# 🪄 chain-enhance

> **Sequentially chain multiple [SvelteKit 5](https://kit.svelte.dev) form actions**
> with deep-merged data propagation, type-safe results, reactive progress tracking,
> and automatic file-safety.

Designed for real multi-stage workflows like
**upload → parse → SEO → save → publish**.

---

## 🚀 Install

```bash
npm i chain-enhance
# or
pnpm add chain-enhance
```

---

## ⚙️ Basic Usage

### 1️⃣ Attach the enhancer to a form

```svelte
<script lang="ts">
	import { chainEnhance, formChain } from 'chain-enhance';
	import { goto } from '$app/navigation';

	let formState = $state<'idle' | 'running' | 'complete' | 'error'>('idle');
	let result: Record<string, any> = $state({});

	const chained = chainEnhance(['markdown', 'seo', 'save', 'publish'], {
		onStep: (step, data, index, total) => {
			console.log(`Step ${index}/${total}: ${step}`, data);
			formState = 'running';
		},
		onSuccess: (final) => {
			console.log('✅ Chain complete', final);
			result = final.final ?? {};
			formState = 'complete';
			goto('/success');
		},
		onError: (err) => {
			console.error('❌ Chain failed', err);
			formState = 'error';
		}
	});
</script>

<form method="POST" action="?/upload" use:chained enctype="multipart/form-data">
	<input type="text" name="title" required />
	<input type="file" name="featuredImage" accept="image/*" required />
	<button>Start Workflow</button>
</form>

{#if formState === 'running'}
	<p>⚙️ Running workflow — step {$formChain.current} of {$formChain.total}</p>
{/if}
```

---

### 2️⃣ Define Server Actions

Each step must return the standardized `ChainStepResponse` shape.

```ts
import type { ChainStepResponse } from 'chain-enhance';

export const actions = {
	upload: async ({ request }): Promise<ChainStepResponse> => {
		const data = await request.formData();
		const title = data.get('title')?.toString();
		const file = data.get('featuredImage') as File;

		await new Promise((r) => setTimeout(r, 800)); // simulate upload

		return {
			step: 'upload',
			ok: true,
			message: 'File uploaded',
			data: {
				title,
				featuredImageName: file.name
			}
		};
	},

	markdown: async ({ request }): Promise<ChainStepResponse> => {
		const prev = JSON.parse((await request.formData()).get('__previous')?.toString() ?? '{}');
		await new Promise((r) => setTimeout(r, 800));

		return {
			step: 'markdown',
			ok: true,
			message: 'Markdown processed',
			data: {
				wordCount: prev.description?.split(/\s+/).length ?? 0
			}
		};
	},

	seo: async ({ request }): Promise<ChainStepResponse> => {
		const prev = JSON.parse((await request.formData()).get('__previous')?.toString() ?? '{}');
		await new Promise((r) => setTimeout(r, 800));

		return {
			step: 'seo',
			ok: true,
			message: 'SEO metadata generated',
			data: {
				meta: {
					title: prev.title,
					description: prev.abstract,
					keywords: ['svelte', 'chain', 'form']
				}
			}
		};
	},

	save: async ({ request }): Promise<ChainStepResponse> => {
		const prev = JSON.parse((await request.formData()).get('__previous')?.toString() ?? '{}');
		await new Promise((r) => setTimeout(r, 800));

		return {
			step: 'save',
			ok: true,
			message: 'Saved to database',
			data: {
				projectId: crypto.randomUUID(),
				timestamp: new Date().toISOString()
			}
		};
	},

	publish: async ({ request }): Promise<ChainStepResponse> => {
		const prev = JSON.parse((await request.formData()).get('__previous')?.toString() ?? '{}');
		await new Promise((r) => setTimeout(r, 800));

		return {
			step: 'publish',
			ok: true,
			message: `Project "${prev.title}" published successfully!`,
			data: {}
		};
	}
};
```

---

## 🧱 Type Contracts

```ts
export interface ChainStepData {
	[key: string]: unknown;
}

/** Response shape required from each action step. */
export interface ChainStepResponse {
	step: string; // step name
	ok: boolean; // success flag
	message?: string; // optional short message
	data?: ChainStepData; // optional structured payload
}

/** Accumulated result returned to `onSuccess`. */
export interface ChainCombinedResult extends ChainStepResponse {
	history?: ChainStepResponse[]; // all intermediate step responses
	final?: ChainStepData; // deeply merged result
}

/** Lifecycle callbacks for `chainEnhance`. */
export interface ChainEnhanceCallbacks {
	onStep?: (step: string, data: ChainStepData, index: number, total: number) => void;
	onSuccess?: (result: ChainCombinedResult) => void;
	onError?: (error: unknown) => void;
}
```

---

## 🔗 How It Works

1. The first form submission runs normally via `enhance()`.
2. Its result’s `data` becomes the base payload.
3. Each next action is called with:

   ```ts
   fd.append('__previous', JSON.stringify(combined));
   ```

4. Step responses are validated and **deeply merged**:

   ```ts
   combined = deepMerge(combined, response.data);
   ```

5. After all steps complete, `onSuccess` fires with the merged `ChainCombinedResult`.

### Important rules

- **Files/Blobs:** only supported in the **first** step.
  Later steps receive JSON only.
- Any error, `ok: false`, or thrown exception stops the chain.
- Each step’s duration and result are recorded in `history`.

---

## 🧠 Deep Merge

Nested objects are recursively merged between steps.
Arrays and primitives are replaced.

```ts
// Step A
data: { meta: { title: 'Hello', keywords: ['x'] } }

// Step B
data: { meta: { description: 'World' } }

// Result
combined = { meta: { title: 'Hello', keywords: ['x'], description: 'World' } }
```

---

## 📊 Reactive Progress Store

The `formChain` store tracks real-time progress across the workflow.

```ts
import { formChain } from 'chain-enhance';

$formChain = {
	step: 'seo',
	current: 3,
	total: 5,
	percent: 60,
	ok: true,
	message: 'SEO metadata generated',
	data: { meta: {...} }
};
```

### API

```ts
export interface ChainProgress {
	step: 'idle' | 'initial' | 'complete' | 'error' | string;
	current: number;
	total: number;
	percent: number;
	ok?: boolean;
	message?: string;
	data?: Record<string, unknown>;
	error?: unknown;
}

startStep(step, data?, current?, total?)
completeStep(final)
failStep(error)
```

---

## 🧾 Example Final Result

```json
{
	"step": "publish",
	"ok": true,
	"message": "Completed 5 chained actions in 5021.44ms.",
	"final": {
		"title": "Demo Project",
		"featuredImageName": "cat.jpg",
		"wordCount": 243,
		"meta": {
			"title": "Demo Project",
			"description": "SEO generated description",
			"keywords": ["svelte", "chain", "form"]
		},
		"projectId": "0fa69e9c-74e8-465d-b8b0-62fa8b6d958d",
		"timestamp": "2025-10-30T14:32:10.202Z"
	},
	"history": [
		{ "step": "upload", "ok": true, "message": "File uploaded" },
		{ "step": "markdown", "ok": true, "message": "Markdown processed" },
		{ "step": "seo", "ok": true, "message": "SEO metadata generated" },
		{ "step": "save", "ok": true, "message": "Saved to database" },
		{ "step": "publish", "ok": true, "message": "Project \"Demo Project\" published successfully!" }
	]
}
```

---

## ⚙️ API Reference

```ts
chainEnhance(actions: string[], options?: ChainEnhanceCallbacks): (form: HTMLFormElement) => void
```

| Parameter           | Type                             | Description                                       |
| ------------------- | -------------------------------- | ------------------------------------------------- |
| `actions`           | `string[]`                       | Ordered list of action names to chain             |
| `options.onStep`    | `(step, data, i, total) => void` | Fired after each successful step                  |
| `options.onSuccess` | `(result) => void`               | Fired when all steps complete                     |
| `options.onError`   | `(err) => void`                  | Fired on network, parsing, or `ok:false` failures |

---

## ✅ Compatibility

| Feature                     | Status |
| --------------------------- | ------ |
| SvelteKit 2 / 5 (runes)     | ✅     |
| TypeScript                  | ✅     |
| Multipart (first step only) | ✅     |
| Deep merge data propagation | ✅     |
| Reactive progress store     | ✅     |
| SSR + SPA                   | ✅     |

---

## 🧱 License

MIT © Michael Cuneo (2025)

---

### TL;DR

`chainEnhance()` = **`enhance()` on steroids**

> _Upload → Parse → SEO → Save → Publish → Done_

- Each step returns `{ step, ok, message?, data? }`
- `data` objects deep-merge between steps
- Files supported only in step 1
- Reactive `formChain` store tracks progress
- Fully typed · Zero boilerplate 🪄
