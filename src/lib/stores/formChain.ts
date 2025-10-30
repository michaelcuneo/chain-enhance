import { writable } from 'svelte/store';
import type { ChainCombinedResult } from '../types/chain-types.js';

export type ChainStep = 'idle' | 'initial' | 'complete' | 'error' | string;

export interface ChainProgress {
	step: ChainStep;
	current: number;
	total: number;
	percent: number;
	ok?: boolean;
	message?: string;
	data?: Record<string, unknown>;
	error?: unknown;
}

/**
 * Reactive store that tracks progress across the entire chainEnhance sequence.
 */
export const formChain = writable<ChainProgress>({
	step: 'idle',
	current: 0,
	total: 0,
	percent: 0
});

/**
 * Called at the beginning of each step in the chain.
 */
export function startStep(step: ChainStep, data?: Record<string, unknown>, current = 0, total = 0) {
	const percent = total > 0 ? Math.round((current / total) * 100) : 0;
	formChain.set({ step, data, current, total, percent });
}

/**
 * Called when the chain completes successfully.
 */
export function completeStep(final?: Record<string, unknown> | ChainCombinedResult): void {
	// 🔹 Explicit type guard instead of "any"
	let message: string | undefined;
	let ok: boolean | undefined;

	if (final && typeof final === 'object') {
		if ('message' in final && typeof final.message === 'string') {
			message = final.message;
		}
		if ('ok' in final && typeof final.ok === 'boolean') {
			ok = final.ok;
		}
	}

	formChain.set({
		step: 'complete',
		current: 1,
		total: 1,
		percent: 100,
		ok: ok ?? true,
		message,
		data: final as Record<string, unknown>
	});
}

/**
 * Called when a chain step fails.
 */
export function failStep(error: unknown) {
	formChain.set({
		step: 'error',
		current: 1,
		total: 1,
		percent: 100,
		ok: false,
		error
	});
}
