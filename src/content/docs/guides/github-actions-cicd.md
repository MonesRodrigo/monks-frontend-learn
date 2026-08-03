---
title: 'GitHub Actions CI/CD: what we built and why'
description: A recap of this project's automation and a short tour of the core GitHub Actions concepts behind it.
summary: What we set up so far and the GitHub Actions CI/CD building blocks it uses.
track: tooling
level: intro
author: MonesRodrigo
publishedAt: 2026-08-03
reviewBy: 2026-11-03
status: published
---

This site is two things at once: a place to publish frontend content, and a
sandbox to learn **GitHub Actions** for CI/CD. This first post recaps what we
built and explains the core concepts behind it.

## What we built

- An **Astro + Starlight** static site deployed to **GitHub Pages**.
- A **composite action** (`.github/actions/setup`) that installs pnpm, Node 22
  and dependencies once, reused by every workflow.
- Four workflows: continuous integration, deployment, quality gates and an
  AI-assisted review.
- **Dependabot** keeping npm packages and action versions up to date.

:::note
CI (Continuous Integration) means every change is automatically built and
tested. CD (Continuous Delivery/Deployment) means changes that pass are
automatically shipped — here, published to GitHub Pages.
:::

## Core concepts

A **workflow** is a YAML file in `.github/workflows/`. It runs when an **event**
happens and contains one or more **jobs**; each job runs on a fresh **runner**
(a virtual machine) and is made of ordered **steps**. A step either runs a shell
command or uses an **action** (a reusable unit of automation).

### Events (triggers)

Workflows start on events like `push`, `pull_request`, a schedule (`cron`), or a
manual `workflow_dispatch`. Choosing the right trigger — and narrowing it with
`paths` filters — avoids wasting minutes on irrelevant changes.

### Jobs, steps and runners

Jobs run in parallel by default and can depend on each other with `needs`. Each
runner starts clean, so anything a later job needs from an earlier one is passed
along as an **artifact**.

### Actions and reuse

Instead of repeating the same `checkout + setup + install` steps everywhere, we
extracted them into a composite action. Third-party actions are always pinned to
a major version (`@v4`) rather than a moving branch.

### Permissions and secrets

Every workflow declares explicit **permissions** following least privilege. The
built-in `GITHUB_TOKEN` is an ephemeral token GitHub injects per run — no API
keys are stored in the repo. That is how the AI review talks to GitHub Models
for free.

:::tip
Grant only the permissions a job needs. Our deploy job gets `pages: write` and
`id-token: write`; the CI job only gets `contents: read`.
:::

### Concurrency, caching and artifacts

- **Concurrency** cancels superseded runs on the same branch (except deploys,
  which must finish).
- **Caching** the pnpm store makes installs fast.
- **Artifacts** carry build output and debug reports (like Playwright traces)
  between jobs or out of the run.

### Environments and deployment

The Pages deploy uses a protected `github-pages` **environment** and the
official `configure-pages` → `upload-pages-artifact` → `deploy-pages` chain,
triggered only on `push` to `main`.

## How it maps to our workflows

| Workflow | Trigger | Purpose |
| :-- | :-- | :-- |
| CI | PR + push to `main` | Type-check and build the site |
| Deploy | push to `main` | Publish to GitHub Pages |
| Quality | PR | Lighthouse, accessibility and bundle-size checks |
| AI Review | PR | LLM review via GitHub Models |

## What's next

This is the starting point. From here we can add reusable workflows, a build
matrix, richer quality gates, and iterate on the site's UI — one small pull
request at a time.
