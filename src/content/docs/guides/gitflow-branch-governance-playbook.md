---
title: Gitflow, branch protection and release governance playbook
sidebar:
  label: Gitflow & release governance
description: How to implement clean Gitflow with develop/main, automated branch policy enforcement, rulesets as code, and predictable releases.
summary: Manage feature branching, release workflows, automated branch policies, and rulesets as code for production stability.
track: best-practices
level: intermediate
format: playbook
author: MonesRodrigo
publishedAt: 2026-09-23
reviewBy: 2026-12-23
status: published
---

A disciplined Git branching model prevents broken code from reaching production,
keeps release histories clean, and ensures every merge is backed by automated
verification.

This playbook documents how we structure branches, enforce protection rules as
code, and execute reliable releases.

## 1. Branch Hierarchy

We use a modified Gitflow model centered on two perpetual branches:

| Branch    | Purpose                                           | Protection Level                           | Allowed PR Sources                     |
| :-------- | :------------------------------------------------ | :----------------------------------------- | :------------------------------------- |
| `develop` | Default integration branch for active development | High (PR required, CI required)            | `feat/*`, `fix/*`, `chore/*`, `docs/*` |
| `main`    | Production / deployed release branch              | Maximum (CI + source-branch policy checks) | `develop`, `hotfix/*`                  |

All day-to-day work happens on short-lived feature branches cut from and targeted
back to `develop`.

## 2. Preventing Illegal Merges (`branch-policy.yml`)

GitHub branch protection rules cannot natively restrict which source branch is
allowed to target a destination branch. To prevent accidental merges of
unfinished feature branches directly into `main`, we enforce this via a lightweight
workflow gate:

```yaml
# .github/workflows/branch-policy.yml
name: Branch policy

on:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  source-branch:
    runs-on: ubuntu-latest
    steps:
      - name: Only develop and hotfix/* may target main
        env:
          HEAD_REF: ${{ github.head_ref }}
        run: |
          set -euo pipefail
          case "$HEAD_REF" in
            develop|hotfix/*)
              echo "Source branch \"$HEAD_REF\" is allowed to target main."
              ;;
            *)
              echo "::error::PRs into main must come from develop or hotfix/*. Got: $HEAD_REF"
              exit 1
              ;;
          esac
```

Making `source-branch` a required status check on `main` guarantees that feature
PRs cannot bypass `develop`.

## 3. Designing Required Status Checks

A common pitfall with GitHub Actions branch protection is marking jobs with
`paths:` filters as required status checks.

:::caution[The paths filter trap]
If a workflow has `paths: ['src/**']` and a pull request only modifies `README.md`,
the workflow is skipped entirely. If that job is configured as a "Required Status
Check", GitHub waits indefinitely for the status report, blocking the PR from
merging.
:::

**Best practice rule:**

- Only mark jobs that run on **every single PR** (e.g., `Check` and `Build / build`)
  as Required Status Checks.
- Keep path-filtered quality gates (e.g. Lighthouse, deep a11y) and AI reviews
  out of the required checks, or run them unconditionally on all PRs if they
  are fast enough.

## 4. Rulesets as Code

Instead of manually clicking through the GitHub web UI on every new repository,
define branch protection rules as JSON definitions in source control:

```json title=".github/rulesets/develop.json"
{
  "name": "develop protection",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": { "include": ["refs/heads/develop"], "exclude": [] }
  },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "required_review_thread_resolution": true
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": true,
        "required_status_checks": [{ "context": "Check" }, { "context": "Build / build" }]
      }
    }
  ]
}
```

Apply or update these rulesets across repositories with the
[GitHub CLI](https://cli.github.com/) (`gh auth login` first):

```bash
./.github/rulesets/apply-rulesets.sh
```

:::caution[Code only protects you once applied]
A ruleset file in the repository does nothing by itself. After editing one,
re-run the script — otherwise the UI and the code silently drift apart.
:::

## 5. Release Workflow Execution

When a milestone or batch of features is ready for production:

1. **Open Release PR:** Create a PR from `develop` targeting `main`.
2. **Review the diff:** Ensure all included changes have passed integration.
3. **Merge Strategy:**
   - Use **Create a merge commit** for `develop -> main`. It records that both
     branches share the same history, so the next release PR only lists new
     commits. This requires _linear history_ to be off for `main`.
   - Squash stays the default for feature branches into `develop`.
   - If a release was squashed by mistake, `main` and `develop` diverge and old
     commits reappear in the next release PR. Fix it by merging `main` back into
     `develop` through a PR (`git switch -c chore/sync-main-to-develop origin/develop`,
     `git merge origin/main`, push, open the PR) — never by pushing to `develop`
     directly.
4. **Deploy Verification:** GitHub Actions deploys the built artifact to
   production upon push to `main`.
