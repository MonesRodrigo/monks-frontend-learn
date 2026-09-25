---
title: Frontend environment & DX onboarding checklist
sidebar:
  label: Environment & DX checklist
description: A practical checklist for configuring a reproducible, secure, and fast frontend engineering environment from day one.
summary: Set up a local development environment with Node 22, pnpm, SSH profiles, editor settings and local quality gates.
track: onboarding
level: intro
format: checklist
author: MonesRodrigo
publishedAt: 2026-09-23
reviewBy: 2026-12-23
status: published
---

A modern frontend workflow requires strict version consistency, isolated package
management, and automated local quality gates. This checklist covers setting up
a fresh machine or repository for daily development.

## 1. Runtime & Package Manager

- [ ] Node version manager installed (`nvm`, `fnm`, or `mise`).
- [ ] Correct Node version activated matching `.nvmrc` (`Node 22 LTS`).
- [ ] Corepack enabled (`corepack enable`) to enforce the exact `pnpm` binary.
- [ ] Dependencies installed with lockfile immutability (`pnpm install --frozen-lockfile`).
- [ ] No global npm packages conflicting with project binaries.

## 2. Git & Authentication

- [ ] Git author details configured locally (`git config user.name` and `git config user.email`).
- [ ] Dedicated SSH key generated and registered with your GitHub account.
- [ ] Multi-account SSH config set up in `~/.ssh/config` using `IdentitiesOnly yes` if using personal and work profiles.
- [ ] New branches are cut from `develop`, never from `main`.
- [ ] Commit messages follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).

## 3. Editor & Workspace (VS Code / Cursor)

- [ ] Extensions recommended in `.vscode/extensions.json` installed.
- [ ] Editor formatting configured to respect `.editorconfig` (LF line endings, 2 spaces, UTF-8).
- [ ] Format-on-save verified to not corrupt YAML or Markdown structures.
- [ ] GitHub Copilot / LLM assistant configured with workspace context (`.github/copilot-instructions.md` / `AGENTS.md`).

## 4. Local Quality Gates (Definition of Done)

- [ ] `pnpm check` passes with 0 type errors and valid content schemas.
- [ ] `pnpm build` completes without errors and produces `dist/`.
- [ ] Browser binaries installed for testing (`pnpm exec playwright install --with-deps chromium`).
- [ ] `pnpm test:a11y` passes all routes discovered from `dist/sitemap-0.xml`.
- [ ] `pnpm size` verifies JS+CSS remains within the bundle budget (`250 KB`).

## 5. Security & Push Protection

- [ ] Pushes never use `--no-verify` or `--force` on shared branches.
- [ ] Secret scanning and Push Protection enabled on the repository.
- [ ] No secrets or `.env` files committed to Git.
- [ ] Third-party GitHub Actions pinned by commit SHA in `.github/workflows/`.

:::tip[Pre-PR routine]
Before opening a pull request, run the verification chain in a single command:

```bash
pnpm check && pnpm build && pnpm size && pnpm test:a11y
```

If this passes locally, CI will be green on the first push.
:::
