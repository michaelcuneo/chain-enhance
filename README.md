# 🪄 chain-enhance

> **Sequentially chain multiple SvelteKit 5 form actions** with:
>
> - strict **stage result contract** (schema below)
> - **automatic data propagation** between steps
> - **file-safe** handling (first step only)
> - **progress callbacks** and abort/timeout controls

Works with SvelteKit 2 + Svelte 5 runes, SSR or SPA.

---

## 🚀 Install

```bash
npm i chain-enhance
# or
pnpm add chain-enhance
```

---

## ⚙️ Quick Start

### 1) Attach to your form

```svelte
<script lang="ts">
	import { chainEnhance } from 'chain-enhance';
	import { goto } from '$app/navigation';

	let state = $state<'idle' | string>('idle');
	let pct = $state(0);

	const chained = chainEnhance(['markdown', 'seo', 'save', 'publish'], {
		onStep: (name, data, i, total) => {
			state = name;
			pct = Math.round((i / total) * 100);
		},
		onSuccess: (final) => {
			console.log('✅ done', final);
			goto('/success');
		},
		onError: (err) => console.error('❌', err),
		// optional controls:
		timeoutMs: 30000, // per-step timeout
		passHeaders: ['x-id'] // forward these request headers to each step
	});
</script>

<form method="POST" action="?/upload" use:chained enctype="multipart/form-data">
	<input name="title" placeholder="Title" required />
	<input type="file" name="featuredImage" accept="image/*" required />
	<button type="submit">Start</button>
</form>

{#if state !== 'idle'}
	<div class="progress-banner">Step {pct}% — <strong>{state}</strong></div>
{/if}
```

### 2) Define server actions

```ts
// +page.server.ts
import type { Actions } from './$types';

export const actions: Actions = {
	// 1) MUST handle files (only first step can read the File)
	upload: async ({ request }) => {
		const fd = await request.formData();
		const file = fd.get('featuredImage') as File;

		// ... upload to S3 (simulated)
		await new Promise((r) => setTimeout(r, 250));

		return {
			ok: true,
			step: 'upload',
			merge: { featuredImageUrl: 'https://placekitten.com/600/400' }
		};
	},

	// 2) Regular JSON-only steps
	markdown: async ({ request }) => {
		const prev = JSON.parse((await request.formData()).get('__previous')!.toString());
		return {
			ok: true,
			step: 'markdown',
			merge: { wordCount: 245, title: prev.title }
		};
	},

	seo: async ({ request }) => {
		const prev = JSON.parse((await request.formData()).get('__previous')!.toString());
		return {
			ok: true,
			step: 'seo',
			merge: { meta: { title: prev.title, description: 'SEO generated' } }
		};
	},

	save: async ({ request }) => {
		const prev = JSON.parse((await request.formData()).get('__previous')!.toString());
		return {
			ok: true,
			step: 'save',
			merge: { id: crypto.randomUUID(), savedAt: new Date().toISOString(), ...prev }
		};
	},

	publish: async ({ request }) => {
		const prev = JSON.parse((await request.formData()).get('__previous')!.toString());
		return {
			ok: true,
			step: 'publish',
			merge: { message: `Published "${prev.title}"` }
		};
	}
};
```

---

## 🧱 The Contract (READ THIS)

Every action (stage) **MUST** return **exactly** this shape:

```ts
type ChainStageResult = {
	ok: boolean; // REQUIRED
	step: string; // REQUIRED (the stage name)
	merge?: Record<string, any>; // OPTIONAL: shallow-merged into the running payload
	error?: string; // OPTIONAL: human-friendly error (when ok=false)
	redirect?: string; // OPTIONAL: URL to redirect; chain stops
	status?: number; // OPTIONAL: HTTP status, default 200 when ok=true
	// You can extend with extra metadata; it is ignored for merge unless inside `merge`
};
```

### Reserved fields (don’t use these as your own keys)

- `__previous` — JSON string of the cumulative payload sent by the client to each step
- `__chain` — internal, used by the enhancer (step index, total, etc.)

### Merge semantics

- The enhancer maintains a **cumulative `combined` payload**:
  - After each successful step, `combined = { ...combined, ...result.merge }` (shallow merge).
  - Only keys under `merge` are added forward.

- If `ok: false` → chain **stops**, `onError` fires with `{ step, error, status }`.

### Files (critical!)

- **Only the **first** request** contains the original `File`/`Blob`. Browsers do **not** re-stream files.
- Subsequent steps receive **JSON only** (the enhancer sends `__previous` plus any original fields).
- If you need the file later, **upload in step 1** and pass the **URL** forward in `merge`.

### Redirects / Errors

- If a stage returns `{ redirect: '/somewhere', ok: true }` → chain **stops** and the client navigates.
- SvelteKit “throw redirect/err” also stops the chain (the enhancer treats non-200 as failure).
- `ok: false` must include `error` (string). It’s surfaced to `onError`.

### Non-serializable data

- The enhancer serializes payloads for `__previous`. Non-serializable values are **dropped** with a console warning.
- Keep it to plain objects, arrays, strings, numbers, booleans, null, dates-as-ISO.

---

## 🔌 Client API

```ts
type ChainEnhanceOptions = {
	onSuccess?: (final: Record<string, unknown>) => void;
	onError?: (err: { step?: string; error?: string; status?: number; cause?: unknown }) => void;
	onStep?: (step: string, data: Record<string, unknown>, index: number, total: number) => void;

	timeoutMs?: number; // per-step timeout (AbortController)
	passHeaders?: string[]; // forward whitelisted headers to each step
	signal?: AbortSignal; // external cancel (eg. modal close)
	withCredentials?: boolean; // send cookies/csrf on sub-requests (default true)
};

declare function chainEnhance(
	actions: string[],
	options?: ChainEnhanceOptions
): (form: HTMLFormElement) => void;
```

**Behavior**

- The first submission goes to the form’s `action` (eg. `?/upload`).
- After success, each `actions[i]` is called via `fetch('?/stage-name', { method: 'POST', body: FormData })`.
- The enhancer appends `__previous = JSON.stringify(combined)` to each step’s `FormData`.
- On each 2xx JSON with `ok:true`, `merge` is shallow-merged and `onStep` is called.
- On any non-2xx, timeout, `ok:false`, or thrown error → `onError` fires and the chain stops.

---

## 🧪 Example “combined” payload (after all steps)

```json
{
	"featuredImageUrl": "https://placekitten.com/600/400",
	"wordCount": 245,
	"meta": { "title": "My Demo Project", "description": "SEO generated" },
	"id": "b83a09b3-e4c3-46aa-8f3b-30d55f58519b",
	"savedAt": "2025-10-30T10:00:00.000Z",
	"message": "Published \"My Demo Project\""
}
```

---

## 🧬 Best Practices (the “gotchas” we hit)

- **Stage naming**: `step` must match the action name you provided (helps debugging & UI).
- **Files**: do uploads **only in the first step**; pass URLs forward.
- **Shaping output**: put all data you want to carry forward under `merge`.
- **No deep merge**: we do shallow merges on purpose. If you need deep, merge on the server and return the shaped object.
- **Redirects**: include `redirect` to end the chain intentionally.
- **Timeouts**: use `timeoutMs` to avoid hanging stages; you can also pass an external `AbortSignal`.
- **Headers**: `passHeaders` lets you forward whitelisted request headers to each step (e.g., trace IDs).
- **Security**: keep CSRF/cookies on (default); never echo secrets into `merge`.

---

## 🧰 Optional: Progress store

If you prefer reactive UI without wiring callbacks everywhere:

```ts
// pseudo API – align with your implementation
import { formChain } from 'chain-enhance/store';

$formChain.step; // string | 'idle'
$formChain.index; // number
$formChain.total; // number
$formChain.status; // 'running' | 'complete' | 'error'
$formChain.payload; // combined data so far
```

The enhancer can emit into this store internally (if you wire it), and your UI can subscribe anywhere.

---

## 🔒 TypeScript Types (copy/paste into your codebase)

```ts
export type ChainStageResult = {
	ok: boolean;
	step: string;
	merge?: Record<string, unknown>;
	error?: string;
	redirect?: string;
	status?: number;
	// extra metadata allowed
	[key: string]: unknown;
};

export type ChainError = {
	step?: string;
	error?: string;
	status?: number;
	cause?: unknown;
};

export type ChainEnhanceOptions = {
	onSuccess?: (final: Record<string, unknown>) => void;
	onError?: (err: ChainError) => void;
	onStep?: (step: string, data: Record<string, unknown>, index: number, total: number) => void;
	timeoutMs?: number;
	passHeaders?: string[];
	signal?: AbortSignal;
	withCredentials?: boolean;
};
```

---

## 🧭 FAQ

**Why only shallow merge?**
Predictability. Stages should purposefully return the full object they want next, or mutate known keys. “Accidental” deep merges cause bugs.

**Can a step skip itself?**
Yes: return `{ ok: true, step: 'x' }` with no `merge` to pass through.

**Can I retry a failed step?**
Trigger another submission or build a small retry loop around `chainEnhance` (we don’t auto-retry to avoid duplicate writes).

**Can I resume?**
If you persist `combined` yourself, you can pre-seed the form and/or start a shorter chain with remaining steps.

---

## ✅ Compatibility

| Feature                            | Status |
| ---------------------------------- | ------ |
| SvelteKit ≥ 2.0 / Svelte 5 (runes) | ✅     |
| TypeScript                         | ✅     |
| Server Form Actions                | ✅     |
| Multipart (first step only)        | ✅     |
| SSR + SPA                          | ✅     |
| SST v3 deployments                 | ✅     |

---

## 🧱 License

MIT © Michael Cuneo

---

### TL;DR (the **important** bits)

- Each stage returns **`{ ok, step, merge?, error?, redirect? }`**.
- **Only the first step** can read `File`; upload there and pass a **URL** forward.
- We **shallow-merge** `merge` into a **cumulative payload** and send it to the next step in `__previous`.
- Any `ok:false`, non-2xx, timeout, or thrown error → chain stops and `onError` fires.
- Use `onStep` to show progress, `timeoutMs`/`signal` to control lifecycle, `passHeaders` for tracing.

If you want me to drop this straight into your repo and wire the `formChain` store emits so the example UI updates everywhere, say the word and I’ll hand you the exact code.
