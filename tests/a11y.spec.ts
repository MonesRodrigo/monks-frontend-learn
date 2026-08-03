import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFileSync } from 'node:fs'

// Derive axe types from AxeBuilder so we don't depend on axe-core directly.
type AxeResults = Awaited<ReturnType<InstanceType<typeof AxeBuilder>['analyze']>>
type Violation = AxeResults['violations'][number]

// Real routes served under the project base path.
const PAGES = [
	'/monks-frontend-learn/',
	'/monks-frontend-learn/guides/example/',
	'/monks-frontend-learn/guides/testing/',
	'/monks-frontend-learn/guides/github-actions-cicd/',
	'/monks-frontend-learn/reference/example/',
]

type PageViolations = { path: string; violations: Violation[] }
const collected: PageViolations[] = []

// Map axe impact levels to SARIF result levels.
function sarifLevel(impact: Violation['impact']): 'error' | 'warning' {
  return impact === 'critical' || impact === 'serious' ? 'error' : 'warning'
}

// Build a minimal, valid SARIF 2.1.0 log from the collected axe violations.
function toSarif(pages: PageViolations[]) {
  const ruleIds = new Set<string>()
  const results = []

  for (const { path, violations } of pages) {
    for (const v of violations) {
      ruleIds.add(v.id)
      results.push({
        ruleId: v.id,
        level: sarifLevel(v.impact),
        message: { text: `${v.help} (${v.nodes.length} node(s)). ${v.helpUrl}` },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: path },
              region: { startLine: 1 },
            },
          },
        ],
      })
    }
  }

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'axe-core',
            informationUri: 'https://github.com/dequelabs/axe-core',
            rules: [...ruleIds].map((id) => ({ id })),
          },
        },
        results,
      },
    ],
  }
}

for (const path of PAGES) {
  test(`a11y ${path}`, async ({ page }) => {
    await page.goto(path)
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    collected.push({ path, violations })
    // Fail only on critical/serious; moderate/minor are reported in SARIF as warnings.
    const blocking = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
    expect(blocking).toEqual([])
  })
}

test.afterAll(() => writeFileSync('a11y.sarif', JSON.stringify(toSarif(collected), null, 2)))
