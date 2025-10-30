/**
 * Standardized types for all chainEnhance actions and results.
 * Shared between server actions and client-side enhancer logic.
 */

export interface ChainStepData {
	[key: string]: unknown;
}

/**
 * Standard response shape returned by each action step.
 */
export interface ChainStepResponse {
	/** The current step name (e.g., "upload", "seo", "publish") */
	step: string;

	/** Whether the step completed successfully */
	ok: boolean;

	/** Optional short description for logs or user feedback */
	message?: string;

	/** Optional additional data returned from the step */
	data?: ChainStepData;
}

/**
 * The combined result after all chained actions complete.
 * This accumulates every step's `data` as one merged object.
 */
export interface ChainCombinedResult extends ChainStepResponse {
	/** A record of all intermediate step responses */
	history?: ChainStepResponse[];

	/** The final merged data object */
	final?: ChainStepData;
}

/**
 *  Callback contracts for `chainEnhance` lifecycle.
 */
export interface ChainEnhanceCallbacks {
	/**
	 * Fired each time a new step begins.
	 */
	onStep?: (step: string, data: ChainStepData, index: number, total: number) => void;

	/**
	 * Fired after the entire chain completes successfully.
	 */
	onSuccess?: (result: ChainCombinedResult) => void;

	/**
	 * Fired if any step fails.
	 */
	onError?: (error: unknown) => void;
}

/**
 * Helper type for SvelteKit server action exports.
 * Ensures consistent response shape and prevents missing keys.
 */
export type ChainAction = (args: { request: Request }) => Promise<ChainStepResponse>;
