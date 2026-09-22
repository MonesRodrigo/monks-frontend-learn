// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Markdown task lists (`- [ ] item`) render as disabled checkboxes with no
// accessible name, which axe reports as a critical `label` violation. Swap them
// for a decorative glyph so checklists keep their affordance as plain lists.
function rehypeChecklistMarkers() {
	/** @param {any} node */
	const walk = (node) => {
		if (!Array.isArray(node.children)) return;
		node.children = node.children.map((/** @type {any} */ child) => {
			if (
				child.type === 'element' &&
				child.tagName === 'input' &&
				child.properties?.type === 'checkbox'
			) {
				return {
					type: 'element',
					tagName: 'span',
					properties: { 'aria-hidden': 'true', className: ['task-marker'] },
					children: [{ type: 'text', value: '\u2610' }],
				};
			}
			walk(child);
			return child;
		});
	};
	/** @param {any} tree */
	return (tree) => walk(tree);
}

// https://astro.build/config
export default defineConfig({
	site: 'https://MonesRodrigo.github.io',
	base: '/monks-frontend-learn',
	markdown: {
		rehypePlugins: [rehypeChecklistMarkers],
	},
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
						{ label: 'AWS OIDC from Actions', slug: 'guides/github-actions-aws-oidc' },
						{ label: 'A11y PR Checklist', slug: 'guides/accessibility-pr-checklist' },
						{ label: 'Performance Budgets', slug: 'guides/performance-budget-playbook' },
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
