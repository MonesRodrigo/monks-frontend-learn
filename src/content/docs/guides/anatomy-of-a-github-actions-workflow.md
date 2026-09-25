---
title: 'Anatomy of a GitHub Actions workflow'
sidebar:
  label: Workflow anatomy
description: One real workflow annotated line by line, showing which keys GitHub fixes, which are required and which names are yours to choose.
summary: Which words in a workflow file are fixed by GitHub, which are required, and which names you choose, on one annotated example.
track: tooling
level: intro
format: snippet
author: MonesRodrigo
publishedAt: 2026-09-24
reviewBy: 2026-12-24
status: published
---

A workflow file mixes two kinds of words, and telling them apart is most of the
learning curve:

1. **Keys fixed by GitHub's schema**: `on`, `jobs`, `runs-on`, `steps`, `needs`,
   `uses`, `with`, `permissions`… You cannot rename or translate them, and they
   are case-sensitive: `Jobs:` is an error.
2. **Names you choose**: job IDs, step `id`s, every `name:`, artifact and
   variable names, and the file name itself.

Workflows live in `.github/workflows/` and can have any name ending in `.yml` or
`.yaml`.

## The annotated example

This is the deploy workflow of this site, with every line labelled:

```yaml title=".github/workflows/deploy.yml"
name: Deploy # fixed key, free value (optional)

on: # fixed and REQUIRED: what triggers the run
  push: # fixed: a GitHub event name
    branches: [main] # fixed key; 'main' is your branch
  workflow_dispatch: # fixed: adds a "Run workflow" button

permissions: # fixed, optional (but always declare it)
  contents: read # fixed permission and level names

concurrency: # fixed, optional
  group: pages # free: runs sharing a group never overlap
  cancel-in-progress: false

jobs: # fixed and REQUIRED
  build: # FREE: the job ID
    name: Build # fixed key, free value: shown in the checks list
    uses: MonesRodrigo/gha-ai-suite/.github/workflows/build.yml@7d09fbe5601e5445577186e7cda86b6bc0f5734e # v1.0.0
    with: # fixed: inputs for the called workflow
      artifact-name: dist-pages # key defined by build.yml, value is yours

  deploy: # FREE
    needs: build # fixed key; must match a job ID above
    runs-on: ubuntu-latest # fixed and required for normal jobs
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }} # 'steps' fixed, 'deployment' is your id
    steps: # fixed and required for normal jobs
      - name: Download build output # free, optional
        uses: actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c # v8.0.1
        with:
          name: ${{ needs.build.outputs.artifact-name }}
          path: dist

      - id: deployment # FREE: lets later expressions read this step
        uses: actions/deploy-pages@368f82528645a54fb793d4d04e342629a3f51346 # v5
```

## What is required

| Level                  | Required                       | Common optional keys                                                                                    |
| :--------------------- | :----------------------------- | :------------------------------------------------------------------------------------------------------ |
| Workflow               | `on`, `jobs`                   | `name`, `run-name`, `permissions`, `env`, `defaults`, `concurrency`                                     |
| Job (normal)           | `runs-on`, `steps`             | `name`, `needs`, `if`, `permissions`, `environment`, `outputs`, `env`, `timeout-minutes`, `strategy`    |
| Job (calls a workflow) | `uses`                         | `name`, `needs`, `if`, `with`, `secrets`, `permissions`, `strategy`, `concurrency`                      |
| Step                   | exactly one of `uses` or `run` | `name`, `id`, `if`, `with`, `env`, `shell`, `working-directory`, `timeout-minutes`, `continue-on-error` |

A job that calls a reusable workflow cannot also have `runs-on` or `steps`: the
called workflow brings its own.

## Rules for the names you choose

- **Job IDs** start with a letter or `_` and contain only letters, digits, `-`
  and `_`. They must be unique in the file.
- **Step `id`s** are only needed when something reads the step later, for
  example `steps.deployment.outputs.page_url`.
- **`name:`** is free text for humans and has no effect on references, with one
  big exception below.

:::caution[Renaming a job can block every PR]
Branch protection matches checks by their **displayed name**. A normal job shows
as its `name:` (or its ID when there is no `name:`). A job that calls a reusable
workflow shows as `<caller job name> / <called job name>`, again falling back to
IDs. That is why this site requires `Build / build`. Rename either part and the
required check never reports, so every pull request waits forever.
:::

## How jobs connect

Jobs run **in parallel** and each one gets a fresh machine. Two keys connect
them:

- **`needs`** makes a job wait for others. If a needed job fails, the dependent
  job is skipped unless its `if:` says otherwise, for example
  `if: ${{ !cancelled() }}`.
- **`outputs`** pass small values forward. A step writes to `$GITHUB_OUTPUT`,
  the job exposes it, and later jobs read it through `needs`:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.meta.outputs.version }} # job output <- step output
    steps:
      - id: meta
        run: echo "version=1.2.3" >> "$GITHUB_OUTPUT"

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - env:
          VERSION: ${{ needs.build.outputs.version }}
        run: echo "Releasing $VERSION"
```

Files do not travel this way. Use artifacts (`upload-artifact` /
`download-artifact`) for build output.

## Expressions and contexts

`${{ … }}` is evaluated by GitHub before the step runs. The first word is always
a fixed **context**, and what follows the dot is usually your own name:

| Context   | Holds                                   | Example                             |
| :-------- | :-------------------------------------- | :---------------------------------- |
| `github`  | The event and repository                | `github.ref`, `github.event_name`   |
| `needs`   | Outputs and results of needed jobs      | `needs.build.outputs.artifact-name` |
| `steps`   | Outputs of earlier steps with an `id`   | `steps.deployment.outputs.page_url` |
| `inputs`  | Inputs of a reusable or manual workflow | `inputs.base-path`                  |
| `secrets` | Encrypted secrets                       | `secrets.GITHUB_TOKEN`              |
| `env`     | Variables set with `env:`               | `env.NODE_ENV`                      |
| `matrix`  | The current matrix combination          | `matrix.node`                       |

:::danger[Never put user input straight into `run:`]
`${{ github.event.pull_request.title }}` is pasted into the script before it
runs, so a crafted PR title becomes a shell command. Pass it through `env:` and
quote it:

```yaml
- env:
    TITLE: ${{ github.event.pull_request.title }}
  run: echo "$TITLE"
```

:::

## Reusable workflow or composite action?

Both avoid copy-paste. They differ in size:

|                      | Reusable workflow                          | Composite action               |
| :------------------- | :----------------------------------------- | :----------------------------- |
| Reuses               | Whole jobs                                 | A group of steps inside a job  |
| Called from          | A job: `jobs.<id>.uses`                    | A step: `steps[*].uses`        |
| Lives in             | `.github/workflows/*.yml`                  | `action.yml` in its own folder |
| Chooses its runner   | Yes                                        | No, runs on the caller's job   |
| Example on this site | `gha-ai-suite/.github/workflows/build.yml` | `gha-ai-suite/actions/setup`   |

## Further reading

- [GitHub Actions CI/CD: what we built and why](../github-actions-cicd/) puts
  these pieces together for this site.
- GitHub's reference:
  [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
  and
  [contexts](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts).
