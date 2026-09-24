# Copilot instructions

## Project

Astro 7 + Starlight educational site for frontend content. Doubles as a
testbed for an AI-powered GitHub Actions suite. Public repo, personal account.
Deployed to GitHub Pages (project page — `base` path is required).
Zero-budget. CI comes from the reusable workflows in
[`MonesRodrigo/gha-ai-suite`](https://github.com/MonesRodrigo/gha-ai-suite).
The AI review is paused until the suite ships it (v1.1): GitHub Models, its
previous provider, was retired on 2026-07-30.

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
  Resolve the peeled commit (`git ls-remote <repo> 'refs/tags/vX^{}'`); annotated
  tags otherwise return the tag object SHA, not the commit.
- Never use `pull_request_target`.
- Never interpolate `${{ github.event.* }}` user input inside `run:` —
  pass it through `env:` and quote it.
- Use `set -euo pipefail` in multi-line shell steps.
- Prefer `runs-on: ubuntu-latest`.
- Reuse `gha-ai-suite` instead of writing local build/setup steps: its
  `build.yml` and `quality.yml` reusable workflows and its `actions/setup`
  action. Pin them to the release **commit** SHA with a `# vX.Y.Z` comment.
- Build the site once per run: call the suite's `build.yml` and have
  downstream jobs `needs:` it and consume `${{ needs.build.outputs.artifact-name }}`.
  Never add another `pnpm build` step to a job that can reuse it.
- Keep the CI job named `Build`: branch protection requires `Build / build`.

## AI review rules (for when it returns in gha-ai-suite v1.1)

- Advisory is not silent: only 429/5xx/timeouts may warn and exit 0. Any other
  error (auth, bad endpoint, unexpected response) must fail the check.
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
- Open a PR and let CI and the quality gates run. Do not merge
  with red checks.

## Never do

- Invent action inputs, API endpoints or model provider limits.
  Flag uncertainty as `⚠️ VERIFICAR EN DOCS` instead.
- Bypass safety checks: no `--no-verify`, no `git push --force`, no
  `git reset --hard` on shared history, no direct commits to `main`/`develop`.
- Disable or weaken a failing check to get green — fix the root cause instead.
- Edit `.github/hooks/` to get around the enforced guardrails.
