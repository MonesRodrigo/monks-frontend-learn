import { defineConfig } from '@playwright/test'

// The site is served under the GitHub Pages project base path, so tests must
// navigate to URLs that include `/monks-frontend-learn/`. `astro preview`
// serves the built `dist/` output under that base.
export default defineConfig({
	testDir: './tests',
	retries: process.env.CI ? 1 : 0,
	reporter: [['html', { open: 'never' }]],
	use: {
		baseURL: 'http://localhost:4321',
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'pnpm preview --port 4321',
		url: 'http://localhost:4321/monks-frontend-learn/',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
})
