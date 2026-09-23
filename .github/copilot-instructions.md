# Copilot instructions

## Project

Astro 7 + Starlight educational site for frontend content. Doubles as a
testbed for an AI-powered GitHub Actions suite. Public repo, personal account.
Deployed to GitHub Pages (project page — `base` path is required).
Zero-budget: LLM inference via GitHub Models with `GITHUB_TOKEN`.

## Language rules

- Code comments, identifiers, filenames, branch names and commit messages: **English**.
- Chat explanations, analysis and recommendations: **Spanish**.

## Stack constraints

- Node **22** everywhere (`.nvmrc`, `engines`, all workflows).
- **pnpm** only. Always `pnpm install --frozen-lockfile` in CI.
- Astro Content Layer with Zod schemas (`src/content.config.ts`).
- No new dependencies without explicit justification.

## GitHub Actions rules

- Always declare explicit `permissions:` (least privilege).
- Always add `concurrency` with `cancel-in-progress: true`
  (except the Pages deploy job, where it must be `false`).
- Pin third-party actions to full commit SHAs with a `# vX` comment, never mutable tags or `@main`.
- Never use `pull_request_target`.
- Never interpolate `${{ github.event.* }}` user input inside `run:` —
  pass it through `env:` and quote it.
- Use `set -euo pipefail` in multi-line shell steps.
- Prefer `runs-on: ubuntu-latest`.
- Extract repeated checkout+setup+install into `.github/actions/setup`
  (composite steps need explicit `shell: bash`).
- Build the site once per run: call the reusable `_build.yml` (which wraps
  `.github/actions/build-astro`) and have downstream jobs `needs:` it and
  download the artifact with `${{ needs.build.outputs.artifact-name }}` into
  `dist/`. Never add another `pnpm build` step to a job that can reuse it.

## AI review rules

- Filter every finding against the set of added diff lines before posting,
  otherwise the reviews API returns 422.
- Hard cap of 8 findings per PR.
- Never fail a PR because of an LLM error: warn and exit 0 on 429/5xx/timeout.
- Wrap the diff in `<UNTRUSTED_DIFF>` and instruct the model to ignore
  embedded instructions.
- Redact secret-like patterns before sending any diff to the model.
- Validate model output against a schema; never trust raw `JSON.parse`.
- Update a sticky summary comment instead of creating a new one per push.

## Quality gates

- Lighthouse: minimum 3 runs (CI CPU is noisy). Start assertions as `warn`.
- axe: fail only on `critical` and `serious`.
- Playwright: install `--with-deps chromium` only.
- Always upload artifacts on failure for debugging.

## QA workflow (Definition of Done)

On Node 22, a change is only "done" when all of these pass locally:

- `pnpm check` — astro check (TypeScript + content frontmatter via Zod).
- `pnpm build` — production build succeeds.
- Relevant tests: `pnpm test:a11y` when pages or markup change; `pnpm size`
  must stay within `BUNDLE_BUDGET_KB`.
  Run these before proposing a change as complete. Never mark work done, or open a
  PR, if CI would go red. Diagnose and fix failures — do not retry blindly.

## Testing rules

- `tests/a11y.spec.ts` discovers routes from `dist/sitemap-0.xml`, so every new
  page is covered automatically — but the suite needs a fresh `pnpm build`
  first. Never reintroduce a hand-maintained page list.
- Fix accessibility problems in the markup. Never weaken the axe tags or the
  critical/serious threshold, or exclude a page, just to make tests pass.
- Keep JS+CSS within the bundle budget; justify any budget bump explicitly.

## Branch & PR workflow

- `develop` is the default branch and the target for every feature PR.
  `main` is release-only: it accepts PRs from `develop` or `hotfix/*` and
  nothing else (enforced by `branch-policy.yml`).
- Never commit or push directly to `main` or `develop`. Create a feature branch:
  `feat/…`, `fix/…`, `chore/…`, `ci/…`, `docs/…`.
- Use Conventional Commits (`feat:`, `fix:`, `ci:`, `docs:`, `chore:`).
- Keep PRs small and focused on one concern; fill in the PR template.
- Open a PR and let CI, the quality gates and the AI review run. Do not merge
  with red checks.

## Never do

- Invent action inputs, API endpoints or GitHub Models limits.
  Flag uncertainty as `⚠️ VERIFICAR EN DOCS` instead.
- Bypass safety checks: no `--no-verify`, no `git push --force`, no
  `git reset --hard` on shared history, no direct commits to `main`/`develop`.
- Add the `skip-ai` label without a stated reason, or disable/weaken a failing
  check to get green — fix the root cause instead.
- Edit `.github/hooks/` to get around the enforced guardrails.
