---
title: "GitHub Actions CI/CD: what we built and why"
description: A recap of this project's automation and a short tour of the core GitHub Actions concepts behind it.
summary: What we set up so far and the GitHub Actions CI/CD building blocks it uses.
track: tooling
level: intro
author: MonesRodrigo
publishedAt: 2026-08-03
updatedAt: 2026-09-24
reviewBy: 2026-12-24
status: published
---

This site is two things at once: a place to publish frontend content, and a
sandbox to learn **GitHub Actions** for CI/CD. This post recaps what we
built and explains the core concepts behind it.

## What we built

- An **Astro + Starlight** static site deployed to **GitHub Pages**.
- A separate repository,
  [`gha-ai-suite`](https://github.com/MonesRodrigo/gha-ai-suite), with
  **reusable workflows** for the build and the quality gates, and a
  **composite action** that installs pnpm, Node 22 and dependencies.
- A build that runs once per workflow run: every other job downloads the
  resulting `dist` artifact instead of rebuilding it.
- Three workflows here that call the suite: continuous integration,
  deployment and quality gates.
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
extracted them into a composite action.

A **reusable workflow** goes one step further: it is a whole job that other
workflows call with `uses:`. Ours live in another repository, so any project can
adopt them:

```yaml
jobs:
  build:
    name: Build
    uses: MonesRodrigo/gha-ai-suite/.github/workflows/build.yml@7d09fbe5601e5445577186e7cda86b6bc0f5734e # v1.0.0
```

The build publishes the `dist` artifact and exposes its name as an **output**,
which downstream jobs read through `needs.build.outputs.artifact-name`.

Every action and reusable workflow is pinned to a full **commit SHA**, with the
version as a comment. A tag like `@v4` can be moved to point at different code;
a commit SHA cannot. For annotated tags, resolve the commit the tag points to
(`git ls-remote <repo> 'refs/tags/v1.0.0^{}'`), not the tag object itself.

### Permissions and secrets

Every workflow declares explicit **permissions** following least privilege. The
built-in `GITHUB_TOKEN` is an ephemeral token GitHub injects per run, so no API
keys are stored in the repo.

:::tip
Grant only the permissions a job needs. Our deploy job gets `pages: write` and
`id-token: write`; the CI job only gets `contents: read`.
:::

### Concurrency, caching and artifacts

- **Concurrency** cancels superseded runs on the same branch (except deploys,
  which must finish).
- **Caching** the pnpm store makes installs fast.
- **Artifacts** carry build output and debug reports (like Playwright traces)
  between jobs or out of the run. Our build runs once and every consumer job
  downloads the same `dist` artifact — fewer minutes spent, and all gates
  inspect identical output.

### Environments and deployment

The Pages deploy uses a protected `github-pages` **environment** and the
official `configure-pages` → `upload-pages-artifact` → `deploy-pages` chain,
triggered only on `push` to `main`.

## How it maps to our workflows

| Workflow | Trigger             | Purpose                                                                                |
| :------- | :------------------ | :------------------------------------------------------------------------------------- |
| CI       | PR + push to `main` | Type-check, then build with the suite's reusable workflow                              |
| Deploy   | push to `main`      | Build with the suite, then publish that artifact to GitHub Pages                       |
| Quality  | PR                  | The suite's Lighthouse, accessibility and bundle-size gates on the shared artifact     |

The AI review that used to run here is paused; see
[the AI code review post-mortem](../ai-code-reviewer-github-actions/).

## What's next

This is the starting point. From here we can add a build matrix, richer quality
gates, and iterate on the site's UI — one small pull request at a time.
