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

> This is a GitHub Pages **project page**, so `astro.config.mjs` sets both
> `site` and `base: '/monks-frontend-learn'`. All internal links must respect
> that base path.

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
pnpm lh                       # Lighthouse CI (via pnpm dlx @lhci/cli)
```

## Workflows

Feature branches target `develop`; `main` only accepts PRs from `develop` or
`hotfix/*` and is what gets deployed.

| Workflow            | Trigger                       | What it does                                                                                                |
| :------------------ | :---------------------------- | :---------------------------------------------------------------------------------------------------------- |
| `_build.yml`        | called by other workflows     | Reusable build: installs, runs `astro build`, uploads `dist` as an artifact.                                |
| `ci.yml`            | PR + push to `main`/`develop` | `astro check` + calls `_build.yml`.                                                                         |
| `deploy.yml`        | push to `main` + manual       | Calls `_build.yml`, then publishes that artifact to GitHub Pages.                                           |
| `quality.yml`       | PR (code paths)               | Calls `_build.yml` once, then Lighthouse (3 runs), axe/a11y (SARIF) and bundle size all reuse the artifact. |
| `ai-review.yml`     | PR                            | LLM review via GitHub Models, posts inline comments.                                                        |
| `branch-policy.yml` | PR into `main`                | Rejects PRs whose source is not `develop` or `hotfix/*`.                                                    |

### Shared build artifact

The site is built **once per workflow run** and shared through an artifact, so
no job rebuilds what another job already produced:

```text
.github/actions/setup        pnpm + Node (.nvmrc) + cached `pnpm install --frozen-lockfile`
.github/actions/build-astro  setup -> `pnpm build` -> upload `dist/` artifact
.github/workflows/_build.yml reusable workflow wrapping build-astro; outputs `artifact-name`
```

Consumers (`deploy`, `lighthouse`, `a11y`, `bundle`) declare
`needs: build` and download it with
`actions/download-artifact` using `${{ needs.build.outputs.artifact-name }}`
into `dist/`, which is what `pnpm preview` and `pnpm size` expect.

Jobs that only need dependencies (content check, AI review) use
`.github/actions/setup` directly. `_build.yml` accepts optional
`node-version` (defaults to `.nvmrc`), `artifact-name` and `retention-days`
inputs — `deploy.yml` uses `dist-pages` to keep the Pages artifact separate.

## Architecture decisions

- **Zero budget.** LLM inference uses **GitHub Models** with the built-in
  `GITHUB_TOKEN` (`permissions: models: read`) — no external API keys.
- **Build once, reuse everywhere.** Quality gates and the Pages deploy consume
  the artifact from `_build.yml` instead of rebuilding, which cuts runner
  minutes and guarantees every gate inspects the exact same `dist/`.
- **Least-privilege permissions** and `concurrency` on every workflow;
  `cancel-in-progress: false` only for the Pages deploy. `pages: write` and
  `id-token: write` are scoped to the deploy job alone.
- **AI review is advisory**: it never blocks a legitimate PR (warns and exits 0
  on rate limit / 5xx / timeout) and is skippable with the `skip-ai` label.
- **Fork limitation:** `GITHUB_TOKEN` on PRs from forks is read-only and lacks
  `models: read`, so `ai-review.yml` only runs for same-repo branches.
