---
title: Accessibility checklist for pull requests
sidebar:
  label: PR accessibility checklist
description: A short, practical checklist to run over any frontend pull request before approving it, covering what automated accessibility tooling cannot detect.
summary: What to verify by hand in a PR, and which problems axe will never report for you.
track: a11y
level: intro
format: checklist
author: MonesRodrigo
publishedAt: 2026-09-22
reviewBy: 2026-12-22
status: published
---

Automated tooling catches roughly a third of accessibility problems. The rest
need a human. This is the list to run over a pull request that touches markup,
styles or interaction — it should take a few minutes, not an afternoon.

:::note
If something here fails, fix the markup. Weakening a rule, excluding a page from
the suite or lowering the severity threshold turns a real defect into an
invisible one.
:::

## Structure and semantics

- [ ] Headings descend one level at a time (`h1` → `h2` → `h3`), with exactly one `h1`.
- [ ] Headings describe the content, and are not chosen for their font size.
- [ ] Lists are `ul`/`ol`, tables are `table` with a `th` row, not divs styled to look like them.
- [ ] Landmarks are used once each: `header`, `nav`, `main`, `footer`.
- [ ] Any `div` or `span` with a click handler is actually a `button` or an `a`.
- [ ] The page has a `title` that identifies it, and `html` has a `lang`.

## Keyboard

- [ ] Every interactive element is reachable with `Tab`, in an order that matches the visual layout.
- [ ] Focus is clearly visible on every control — including on dark backgrounds and custom components.
- [ ] Nothing traps focus. Modals return focus to the trigger when dismissed with `Esc`.
- [ ] Custom widgets respond to the expected keys (`Enter`/`Space` to activate, arrows inside menus and tabs).
- [ ] Scrollable regions are reachable by keyboard, or do not scroll at all.
- [ ] Skip-to-content works and is visible when focused.

## Text and links

- [ ] Link text makes sense read on its own — no bare "click here" or "read more".
- [ ] Links that open a new tab say so, or do not open a new tab.
- [ ] Buttons describe the action, and icon-only controls have an accessible name.
- [ ] Nothing is hidden behind `title` attributes alone.

## Images and media

- [ ] Informative images have `alt` text describing the information, not the file.
- [ ] Decorative images have `alt=""` so screen readers skip them.
- [ ] Images of text are avoided; if unavoidable, the text is also in the markup.
- [ ] Video has captions, audio has a transcript.
- [ ] Nothing autoplays with sound.

## Forms

- [ ] Every input has a `label` tied to it — placeholder text is not a label.
- [ ] Required fields are marked in text, not only with colour or an asterisk.
- [ ] Errors say what went wrong and how to fix it, next to the field.
- [ ] Errors are announced, not only painted red.
- [ ] Related controls (radios, checkboxes) sit in a `fieldset` with a `legend`.

## Colour and motion

- [ ] Text contrast meets 4.5:1 (3:1 for large text); UI borders and icons meet 3:1.
- [ ] No information is conveyed by colour alone — add text, an icon or a pattern.
- [ ] The page survives 200% zoom and a 320px viewport without horizontal scrolling.
- [ ] Animation respects `prefers-reduced-motion`.
- [ ] Nothing flashes more than three times per second.

## Dynamic content

- [ ] Content that appears after an action (toasts, validation, results) is announced.
- [ ] Loading states are communicated to assistive technology, not only as a spinner.
- [ ] Route changes in a SPA move focus and update the page title.
- [ ] `aria-*` attributes are only present where a native element could not do the job.

## Before approving

- [ ] The new or changed page is registered in the automated suite.
- [ ] The accessibility job is green, with no `critical` or `serious` violations.
- [ ] You navigated the change once with the keyboard only.

:::tip
The last item is the highest-value line in this list. Most keyboard traps, focus
losses and unreachable controls surface within thirty seconds of putting the
mouse away.
:::

## What automation will never tell you

axe and similar tools verify machine-checkable rules: a missing `alt`, a
contrast ratio, a broken ARIA reference. They cannot judge whether your `alt`
text is _useful_, whether the heading structure tells a coherent story, whether
the tab order makes sense, or whether an error message helps anybody.

That is the reason this list exists, and the reason a green pipeline is a floor
rather than a ceiling.
