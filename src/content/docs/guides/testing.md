---
title: QA & Testing workflow
description: How changes are validated before they ship in this project.
summary: The Definition of Done and the checks every change must pass before merge.
track: best-practices
level: intro
author: MonesRodrigo
publishedAt: 2026-07-29
reviewBy: 2026-10-29
status: published
---

Every change in this project follows the same quality bar before it can merge.

## Definition of Done

On Node 22, a change is only done when these pass locally:

- `pnpm check` — `astro check`: TypeScript plus content frontmatter (Zod).
- `pnpm build` — the production build succeeds.
- `pnpm test:a11y` — accessibility suite is green when pages or markup change.
- `pnpm size` — JS+CSS stays within the bundle budget.

## Branch and PR flow

- Work on a feature branch (`feat/…`, `fix/…`, `ci/…`, `docs/…`), never on `main`.
- Use Conventional Commits and keep pull requests small and focused.
- Open a PR and let CI, the quality gates and the AI review run. Never merge with
  red checks.

## Accessibility

New or changed pages are added to the axe/Playwright suite and must have no
`critical` or `serious` violations. Fix the markup rather than lowering the bar.
