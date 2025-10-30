import type { Actions, RequestEvent } from '@sveltejs/kit';

export const actions: Actions = {
	upload: async ({ request }: RequestEvent) => {
		const data = await request.formData();
		const file = data.get('featuredImage');
		const title = data.get('title')?.toString();
		console.log('🟢 Step 1: upload', { title, fileType: (file as File)?.type });

		// Simulate a small delay
		await new Promise((r) => setTimeout(r, 1000));

		// ✅ Extract file name if it's a real File
		let featuredImageName = 'no-file';
		if (file instanceof File) {
			featuredImageName = file.name;
		}

		// ✅ Return the real uploaded file name
		return {
			step: 'upload',
			ok: true,
			message: 'File uploaded successfully',
			data: {
				title,
				featuredImageName
			}
		};
	},

	markdown: async ({ request }) => {
		const data = await request.formData();
		const prev = JSON.parse(data.get('__previous')?.toString() || '{}');
		console.log('🟡 Step 2: markdown', prev);

		await new Promise((r) => setTimeout(r, 1000));
		const wordCount = prev.description ? prev.description.split(/\s+/).length : 0;
		return {
			step: 'markdown',
			ok: true,
			message: 'Markdown processed',
			data: {
				wordCount
			}
		};
	},

	seo: async ({ request }) => {
		const data = await request.formData();
		const prev = JSON.parse(data.get('__previous')?.toString() || '{}');
		console.log('🟠 Step 3: seo', prev);

		await new Promise((r) => setTimeout(r, 1000));
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

	save: async ({ request }) => {
		const data = await request.formData();
		const prev = JSON.parse(data.get('__previous')?.toString() || '{}');
		console.log('🔵 Step 4: save', prev);

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

	publish: async ({ request }) => {
		const data = await request.formData();
		const prev = JSON.parse(data.get('__previous')?.toString() || '{}');
		console.log('🟣 Step 5: publish', prev);

		await new Promise((r) => setTimeout(r, 1000));
		return {
			step: 'publish',
			ok: true,
			message: `Project "${prev.title}" published successfully!`,
			data: {}
		};
	}
};
