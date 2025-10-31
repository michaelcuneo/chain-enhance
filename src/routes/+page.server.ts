import type { Actions, RequestEvent } from '@sveltejs/kit';

export const actions: Actions = {
	// 🔹 STEP 1 — Upload
	upload: async ({ request }: RequestEvent) => {
		const data = await request.formData();
		const file = data.get('featuredImage');
		const title = data.get('title')?.toString();
		const abstract = data.get('abstract')?.toString();
		const description = data.get('description')?.toString();

		await new Promise((r) => setTimeout(r, 1000));

		let featuredImageName = 'no-file';
		if (file instanceof File) featuredImageName = file.name;

		return {
			step: 'upload',
			ok: true,
			message: 'File uploaded successfully',
			data: {
				title,
				abstract,
				description,
				featuredImageName
			}
		};
	},

	// 🔹 STEP 2 — Markdown Parsing
	markdown: async ({ request }) => {
		const data = await request.formData();
		const prev = JSON.parse(data.get('__previous')?.toString() || '{}');

		await new Promise((r) => setTimeout(r, 1000));

		const description = prev.description ?? '';
		const wordCount = description.split(/\s+/).length;
		const abstract = prev.abstract || description.slice(0, 150);

		return {
			step: 'markdown',
			ok: true,
			message: 'Markdown processed',
			data: {
				wordCount,
				abstract
			}
		};
	},

	// 🔹 STEP 3 — SEO
	seo: async ({ request }) => {
		const data = await request.formData();
		const prev = JSON.parse(data.get('__previous')?.toString() || '{}');

		await new Promise((r) => setTimeout(r, 1000));

		return {
			step: 'seo',
			ok: true,
			message: 'SEO metadata generated',
			data: {
				meta: {
					title: prev.title,
					description: prev.abstract || prev.description,
					keywords: ['svelte', 'chain', 'form']
				}
			}
		};
	},

	// 🔹 STEP 4 — Save
	save: async ({ request }) => {
		await new Promise((r) => setTimeout(r, 1000));

		return {
			step: 'save',
			ok: true,
			message: 'Project saved to database',
			data: {
				projectId: crypto.randomUUID(),
				timestamp: new Date().toISOString()
			}
		};
	},

	// 🔹 STEP 5 — Publish
	publish: async ({ request }) => {
		const data = await request.formData();
		const prev = JSON.parse(data.get('__previous')?.toString() || '{}');

		await new Promise((r) => setTimeout(r, 1000));

		return {
			step: 'publish',
			ok: true,
			message: `Project "${prev.title}" published successfully!`,
			data: {
				summary: `Published "${prev.title}" (${prev.wordCount ?? 0} words)`
			}
		};
	}
};
