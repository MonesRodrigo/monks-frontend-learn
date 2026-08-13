// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://MonesRodrigo.github.io',
	base: '/monks-frontend-learn',
	integrations: [
		starlight({
			title: 'Frontend Learn',
			customCss: ['./src/styles/custom.css'],
			sidebar: [
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Example Guide', slug: 'guides/example' },
						{ label: 'QA & Testing', slug: 'guides/testing' },
						{ label: 'GitHub Actions CI/CD', slug: 'guides/github-actions-cicd' },
					],
				},
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
		}),
	],
});
