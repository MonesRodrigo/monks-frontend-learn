// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Single source of truth for where the site is published. Everything else
// (links, tests) derives from the built output, never from a literal path.
const SITE = process.env.SITE_URL ?? 'https://MonesRodrigo.github.io';
const BASE = process.env.SITE_BASE ?? '/monks-frontend-learn';

// https://astro.build/config
export default defineConfig({
	site: SITE,
	base: BASE,
	integrations: [
		starlight({
			title: 'Frontend Learn',
			customCss: ['./src/styles/custom.css'],
			sidebar: [
				{
					label: 'Guides',
					items: [{ autogenerate: { directory: 'guides' } }],
				},
			],
		}),
	],
});
