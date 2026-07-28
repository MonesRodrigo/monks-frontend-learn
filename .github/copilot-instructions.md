# Copilot instructions

## Project
Astro 5 + Starlight educational site for frontend content. Doubles as a
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
- Pin third-party actions to a major tag (`@v4`), never `@main`.
- Never use `pull_request_target`.
- Never interpolate `${{ github.event.* }}` user input inside `run:` —
  pass it through `env:` and quote it.
- Use `set -euo pipefail` in multi-line shell steps.
- Prefer `runs-on: ubuntu-latest`.
- Extract repeated checkout+setup+install into `.github/actions/setup`
  (composite steps need explicit `shell: bash`).

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

## Never do
- Invent action inputs, API endpoints or GitHub Models limits.
  Flag uncertainty as `⚠️ VERIFICAR EN DOCS` instead.