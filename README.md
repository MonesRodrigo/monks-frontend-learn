# Frontend Learn

Personal, zero-budget educational site about frontend engineering, built with
[Astro](https://astro.build) + [Starlight](https://starlight.astro.build). It
doubles as a **testbed for an AI-powered GitHub Actions suite**.

> Personal learning project. Not affiliated with any employer's internal systems.

## Stack

- **Astro + Starlight** static site, deployed to **GitHub Pages** via GitHub
  Actions (`actions/deploy-pages`, Source = GitHub Actions).
- **Node 22** everywhere (`.nvmrc`, `engines`, workflows). **pnpm** as the only
  package manager (Corepack-pinned via `packageManager`).
- Content authored as MD/MDX under `src/content/docs/`, validated by a **Zod**
  schema in `src/content.config.ts` (Astro Content Layer).

> This is a GitHub Pages **project page**, so the site is served under a base
> path. Both values live in one place in `astro.config.mjs` and can be
> overridden per environment:
>
> ```bash
> SITE_URL=https://example.com SITE_BASE=/other-path pnpm build
> ```
>
> Never hardcode the base path in content. Use relative links
> (`./guides/testing/`) so pages keep working wherever the site is deployed.

## Local development

```bash
nvm use                       # Node 22 (see .nvmrc)
corepack enable               # activate the pinned pnpm version
pnpm install --frozen-lockfile

pnpm dev                      # dev server at http://localhost:4321/monks-frontend-learn/
pnpm check                    # astro check: TypeScript + content frontmatter (Zod)
pnpm build                    # production build to ./dist
pnpm preview                  # serve the built site under the base path

pnpm exec playwright install --with-deps chromium
pnpm test:a11y                # axe + Playwright accessibility tests
pnpm size                     # gzipped JS+CSS bundle budget (run after build)
pnpm lh                       # Lighthouse CI (via pnpm dlx @lhci/cli)
```

These local checks mirror the CI gates; CI itself runs the
[`gha-ai-suite`](https://github.com/MonesRodrigo/gha-ai-suite) versions.
`lighthouserc.json` holds only the assertions, so CI and `pnpm lh` share them.

## Workflows

Feature branches target `develop`; `main` only accepts PRs from `develop` or
`hotfix/*` and is what gets deployed.

| Workflow            | Trigger                       | What it does                                                                                           |
| :------------------ | :---------------------------- | :----------------------------------------------------------------------------------------------------- |
| `ci.yml`            | PR + push to `main`/`develop` | `astro check` + the suite's `build.yml` (required check `Build / build`).                              |
| `deploy.yml`        | push to `main` + manual       | Suite `build.yml`, then publishes that artifact to GitHub Pages.                                       |
| `quality.yml`       | PR (code paths)               | Suite `build.yml` once, then suite `quality.yml`: bundle size, axe a11y and Lighthouse (3 runs). The axe SARIF goes to code scanning. |
| `branch-policy.yml` | PR into `main`                | Rejects PRs whose source is not `develop` or `hotfix/*`.                                               |
| `codeql.yml`        | PR + push + schedule          | CodeQL SAST scanning for JavaScript / TypeScript.                                                      |

### Shared build artifact

The site is built **once per workflow run** by the suite's reusable
`build.yml`, which uploads `dist/` and exposes its name as the
`artifact-name` output. Every consumer (`deploy`, the quality gates) downloads
that artifact instead of rebuilding. `deploy.yml` names it `dist-pages` to keep
the Pages artifact separate.

The `Check` job only needs dependencies, so it uses the suite's
`actions/setup` action directly.

## Architecture decisions

- **Reuse, pinned.** Build and quality gates come from
  [`MonesRodrigo/gha-ai-suite`](https://github.com/MonesRodrigo/gha-ai-suite),
  pinned to the release commit SHA (`# v1.0.0`). Dependabot proposes upgrades.
- **Build once, reuse everywhere.** Quality gates and the Pages deploy consume
  the same artifact, which cuts runner minutes and guarantees every gate
  inspects the exact same `dist/`.
- **Least-privilege permissions** and `concurrency` on every workflow;
  `cancel-in-progress: false` only for the Pages deploy. `pages: write` and
  `id-token: write` are scoped to the deploy job alone, and
  `security-events: write` to the SARIF upload job.
- **AI review is paused.** It ran on GitHub Models, which was retired on
  2026-07-30. It returns as a provider-agnostic workflow in `gha-ai-suite`
  v1.1.
