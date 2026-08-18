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

| Workflow | Trigger | What it does |
| :-- | :-- | :-- |
| `ci.yml` | PR + push to `main`/`develop` | `astro check` + build, uploads `dist` artifact. |
| `deploy.yml` | push to `main` + manual | Builds and deploys to GitHub Pages. |
| `quality.yml` | PR (code paths) | Lighthouse (3 runs), axe/a11y (SARIF), bundle size. |
| `ai-review.yml` | PR | LLM review via GitHub Models, posts inline comments. |
| `branch-policy.yml` | PR into `main` | Rejects PRs whose source is not `develop` or `hotfix/*`. |

The shared `checkout + pnpm + Node 22 + install` steps live in the composite
action `.github/actions/setup`.

## Architecture decisions

- **Zero budget.** LLM inference uses **GitHub Models** with the built-in
  `GITHUB_TOKEN` (`permissions: models: read`) — no external API keys.
- **Least-privilege permissions** and `concurrency` on every workflow;
  `cancel-in-progress: false` only for the Pages deploy.
- **AI review is advisory**: it never blocks a legitimate PR (warns and exits 0
  on rate limit / 5xx / timeout) and is skippable with the `skip-ai` label.
- **Fork limitation:** `GITHUB_TOKEN` on PRs from forks is read-only and lacks
  `models: read`, so `ai-review.yml` only runs for same-repo branches.

