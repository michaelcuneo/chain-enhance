import { enhance } from '$app/forms';
import type { Actions, ActionResult } from '@sveltejs/kit';
import type {
	ChainStepResponse,
	ChainEnhanceCallbacks,
	ChainCombinedResult
} from './types/chain-types.js';
import { parse as devalueParse } from 'devalue';
import { startStep, completeStep, failStep } from '$lib/stores/formChain.js';

export type ActionData = Record<string, unknown>;

function safeStringify(value: unknown): string {
	try {
		return JSON.stringify(value, (_, v) => {
			if (v instanceof File) {
				console.warn(`[form-chain] File "${v.name}" skipped (files only supported in first step).`);
				return `[File:${v.name}]`;
			}
			if (v instanceof Blob) return '[Blob]';
			if (v instanceof ArrayBuffer) return `[ArrayBuffer(${v.byteLength})]`;
			return v;
		});
	} catch (err) {
		console.error('[form-chain] Failed to stringify form data:', err);
		return '{}';
	}
}

/**
 * Merge step payloads deeply
 */
function deepMerge<T extends Record<string, unknown>>(
	target: T,
	source: Record<string, unknown>
): T {
	for (const [key, srcVal] of Object.entries(source)) {
		const tgtVal = target[key];
		if (
			srcVal &&
			typeof srcVal === 'object' &&
			!Array.isArray(srcVal) &&
			tgtVal &&
			typeof tgtVal === 'object' &&
			!Array.isArray(tgtVal)
		) {
			(target as Record<string, unknown>)[key] = deepMerge(
				{ ...(tgtVal as Record<string, unknown>) },
				srcVal as Record<string, unknown>
			);
		} else {
			(target as Record<string, unknown>)[key] = srcVal as unknown;
		}
	}
	return target;
}

function extractStrictPayload(resp: unknown, action: string): ChainStepResponse {
	if (!resp || typeof resp !== 'object' || Array.isArray(resp)) {
		throw new Error(
			`[sveltekit-form-chain] Step "${action}" returned invalid data (not an object).`
		);
	}

	let raw = resp;
	// if the response includes a devalue array, try to parse it
	if (
		Array.isArray(raw) ||
		(typeof raw === 'object' &&
			raw !== null &&
			typeof (raw as { data?: unknown }).data === 'string')
	) {
		try {
			raw = devalueParse(JSON.stringify(raw));
		} catch {
			try {
				const d = (raw as Record<string, unknown>).data;
				if (typeof d === 'string') raw = devalueParse(d);
			} catch {
				console.warn(`[sveltekit-form-chain] Could not parse devalue payload in step "${action}".`);
			}
		}
	}

	const r = raw as Record<string, unknown>;
	const step = (typeof r.step === 'string' && r.step) || action;
	const ok = typeof r.ok === 'boolean' ? r.ok : true;
	const message = typeof r.message === 'string' ? r.message : '';

	let data: Record<string, unknown> = {};
	if (r.data && typeof r.data === 'object') data = r.data as Record<string, unknown>;

	return { step, ok, message, data };
}

/**
 * Chains multiple SvelteKit 5 form actions sequentially.
 * Each step must return { step, ok, message, data }
 */
export function chainEnhance(
	actions: string[],
	{ onSuccess, onError, onStep }: ChainEnhanceCallbacks = {}
): (form: HTMLFormElement) => void {
	return (form: HTMLFormElement): void => {
		enhance(form, () => {
			return async ({ result }: { result: ActionResult<ActionData> }): Promise<void> => {
				if (!result) {
					console.warn('[form-chain] Missing initial action result.');
					return;
				}

				if (result.type === 'failure') {
					failStep(result);
					onError?.(result);
					return;
				}

				if (result.type === 'redirect' || result.type === 'error') return;

				let combined: Record<string, unknown> = {};
				if (result.type === 'success' && result.data) {
					const initial = extractStrictPayload(result.data, actions[0] ?? 'default-action');
					combined = initial.data ?? {};
				}

				startStep('initial', combined);

				const total = actions.length;
				const history: { step: string; ok: boolean; durationMs: number; message?: string }[] = [];
				const chainStart = performance.now();

				for (let i = 0; i < total; i++) {
					const action = actions[i];
					const index = i + 1;

					startStep(action ?? 'unknown-action', combined, index, total);
					onStep?.(action ?? 'unknown-action', combined, index, total);

					const fd = new FormData();
					fd.append('__previous', safeStringify(combined));

					const stepStart = performance.now();
					let res: Response;

					try {
						res = await fetch(`?/${action}`, { method: 'POST', body: fd });
					} catch (err) {
						const durationMs = +(performance.now() - stepStart).toFixed(2);
						failStep(err);
						history.push({ step: action ?? 'unknown-step', ok: false, durationMs });
						onError?.(err);
						return;
					}

					const durationMs = +(performance.now() - stepStart).toFixed(2);

					if (!res.ok) {
						const txt = await res.text();
						failStep(txt);
						history.push({ step: action ?? 'unknown-step', ok: false, durationMs });
						onError?.(txt);
						return;
					}

					try {
						const parsed = await res.json();
						const { step, ok, message, data } = extractStrictPayload(
							parsed,
							action ?? 'unknown-action'
						);
						history.push({ step, ok, durationMs, message });
						if (ok && data) combined = deepMerge(combined, data);
					} catch (err) {
						failStep(err);
						history.push({ step: action ?? 'unknown-step', ok: false, durationMs });
						onError?.(err);
						return;
					}
				}

				const totalDuration = +(performance.now() - chainStart).toFixed(2);
				const finalStep = actions.at(-1) ?? 'complete';
				const finalizedCombined = { ...combined, step: finalStep };

				const finalResult: ChainCombinedResult = {
					step: finalStep,
					ok: true,
					message: `Completed ${actions.length} chained actions in ${totalDuration}ms.`,
					final: finalizedCombined,
					history
				};

				completeStep(finalResult);
				onSuccess?.(finalResult);
			};
		});
	};
}

/**
 * Type-safe variant
 */
export function chainEnhanceFrom<T extends Actions, K extends (keyof T & string)[]>(
	actions: T,
	keys: K,
	options?: ChainEnhanceCallbacks
): (form: HTMLFormElement) => void {
	return chainEnhance(keys, options);
}
