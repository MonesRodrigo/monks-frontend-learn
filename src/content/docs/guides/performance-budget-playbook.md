---
title: Performance budget playbook
description: How to pick a performance budget, enforce it in CI without generating noise, and decide what to do the day a pull request breaks it.
summary: Choosing, enforcing and defending a performance budget — including what to do when it breaks.
track: performance
level: intermediate
format: playbook
author: MonesRodrigo
publishedAt: 2026-09-22
reviewBy: 2026-12-22
status: published
---

A performance budget is a number that a pull request is not allowed to exceed.
Its value is not the number itself — it is that regressions become a
conversation at review time instead of a discovery six months later.

This playbook covers picking the number, wiring it into CI, and the part most
teams skip: deciding in advance what happens when somebody breaks it.

## 1. Pick what to measure

Budgets fail when they measure something nobody can act on. Three categories,
in increasing order of usefulness:

| Category | Example | Good for |
| :-- | :-- | :-- |
| Quantity | Number of requests, total bytes | Catching accidental bloat |
| Timing | LCP, INP, CLS | Reflecting real user experience |
| Score | Lighthouse category score | Communicating upwards |

Start with **quantity** — it is deterministic, fast to measure and never flaky.
Add **timing** once the quantity budget is stable. Treat scores as reporting,
not as a gate: they compress too much into one number to be actionable.

This project measures gzipped JS+CSS as the hard gate and treats Lighthouse
metrics as warnings:

```js
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 250)
const assetsGz = totals['.js'] + totals['.css']
const overBudget = assetsGz > BUDGET_KB * 1024
```

Note what is deliberately excluded: HTML grows with every content page, so
including it would make the gate fire for reasons nobody can fix.

## 2. Set the first number

Do not invent a target. Measure what you ship today, then set the budget
slightly above it:

1. Build the project and record the current value.
2. Add 10–15% of headroom.
3. Write that number down as the budget.

This feels unambitious, and that is the point. A budget below your current
number is red on day one, and a gate that is red by default gets ignored within
a week. Tighten it later, in deliberate steps, once you have reduced the real
number.

:::tip
The budget is a ratchet. Every time you genuinely reduce the payload, lower the
budget to lock the win in. Otherwise the space you freed gets silently consumed
by the next feature.
:::

## 3. Enforce it in CI

Two separate mechanisms, because they fail differently.

**The deterministic gate** runs on every pull request and fails the job:

```yaml
- name: Check bundle size
  run: pnpm size
  env:
    BUNDLE_BUDGET_KB: 250
```

**The lab measurement** runs Lighthouse. CI runners have noisy, shared CPUs, so
a single run produces numbers that swing wildly between builds. Two defences:

```json
{
  "collect": { "numberOfRuns": 3 },
  "assert": {
    "assertions": {
      "categories:performance": ["warn", { "minScore": 0.9 }],
      "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }]
    }
  }
}
```

Three runs minimum, and every timing assertion starts as `warn`. Promote an
assertion to `error` only after watching it stay stable for several weeks. A
gate that fails randomly teaches the team to re-run the job until it passes,
which is worse than having no gate at all.

## 4. Triage a broken budget

The pipeline is red. Work through this in order — the first question is the one
teams most often skip.

**Is the regression real?**
Check whether the failure is the budget or the measurement. Deterministic gates
(bytes) are always real. Timing failures may be runner noise: look at the other
runs in the same job before doing anything.

**What caused it?**
The report ranks the heaviest files. Compare against the previous build. In
practice it is almost always one of: a new dependency, a dependency that grew on
upgrade, an unoptimised asset, or a component that stopped being lazy-loaded.

**Choose a response.** In descending order of preference:

1. **Remove it.** The dependency does something you could write in thirty lines,
   or something the platform now does natively.
2. **Defer it.** Move it behind a dynamic import so it no longer lands in the
   initial payload. Most regressions are fixed here.
3. **Replace it.** A lighter library with the same API surface.
4. **Absorb it.** Reduce something else to stay under the number.
5. **Raise the budget.** Last resort, and only with a written justification in
   the pull request: what the feature is worth, why the weight is irreducible,
   and what the new number is.

:::caution
Raising the budget is a legitimate decision. Raising it *silently*, in the same
commit that broke it, is how budgets die. If the number moves, the reason lives
in the diff.
:::

## 5. Keep it honest

- **Review the budget quarterly.** Numbers set against a codebase from a year
  ago describe an application that no longer exists.
- **Report the value on every build**, not only on failure. A budget people see
  moving is a budget people think about.
- **Never disable the gate to unblock a release.** Raise the number explicitly
  instead, so the decision is visible and reversible.
- **Keep the failure message actionable.** "Over budget" is useless; "164.0 KB
  of 250 KB, largest file `pagefind-ui.js` at 29.5 KB" tells you where to look.

## The part that actually matters

Budgets do not make applications fast. They make *slowdowns visible while
somebody still remembers why the code was added*. A regression caught in review
costs a conversation. The same regression found six months later costs an
investigation, a refactor and a negotiation about priorities.

Pick a number you can defend, enforce it where it cannot be ignored, and decide
now — while nothing is on fire — what you will do the day it goes red.
