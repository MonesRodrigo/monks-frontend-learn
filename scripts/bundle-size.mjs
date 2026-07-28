import { readdirSync, readFileSync, appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

// Fail the check when the shared JS+CSS assets exceed this gzip budget (KB).
// HTML is reported for visibility but excluded from the budget, since it grows
// with every new content page and would make the gate noisy.
const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 250)
const DIST = process.env.DIST_DIR ?? 'dist'
const EXTS = ['.js', '.css', '.html']

/** Collect every matching file under a directory. */
function collect(dir) {
	const files = []
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) files.push(...collect(path))
		else if (EXTS.some((ext) => entry.name.endsWith(ext))) files.push(path)
	}
	return files
}

const kb = (bytes) => (bytes / 1024).toFixed(1)

const totals = { '.js': 0, '.css': 0, '.html': 0 }
const perFile = []

for (const path of collect(DIST)) {
	const ext = EXTS.find((e) => path.endsWith(e))
	const gz = gzipSync(readFileSync(path)).length
	totals[ext] += gz
	perFile.push({ path, gz })
}

const assetsGz = totals['.js'] + totals['.css']
const overBudget = assetsGz > BUDGET_KB * 1024

// Table rows: per category plus the top 5 heaviest individual files.
const top = perFile.sort((a, b) => b.gz - a.gz).slice(0, 5)
const lines = [
	`JS gzip:    ${kb(totals['.js'])} KB`,
	`CSS gzip:   ${kb(totals['.css'])} KB`,
	`HTML gzip:  ${kb(totals['.html'])} KB (excluded from budget)`,
	`Assets (JS+CSS): ${kb(assetsGz)} KB / ${BUDGET_KB} KB budget`,
	'',
	'Top files:',
	...top.map((f) => `  ${kb(f.gz).padStart(7)} KB  ${f.path}`),
]
console.log(lines.join('\n'))

// Mirror the report into the GitHub Actions job summary when available.
if (process.env.GITHUB_STEP_SUMMARY) {
	const table = [
		'### Bundle size (gzip)',
		'',
		'| Category | Size |',
		'| :-- | --: |',
		`| JS | ${kb(totals['.js'])} KB |`,
		`| CSS | ${kb(totals['.css'])} KB |`,
		`| HTML (info) | ${kb(totals['.html'])} KB |`,
		`| **Assets (JS+CSS)** | **${kb(assetsGz)} KB / ${BUDGET_KB} KB** |`,
		'',
		overBudget ? '❌ Over budget' : '✅ Within budget',
		'',
	].join('\n')
	appendFileSync(process.env.GITHUB_STEP_SUMMARY, table + '\n')
}

if (overBudget) {
	console.error(`Bundle assets ${kb(assetsGz)} KB exceed the ${BUDGET_KB} KB budget.`)
	process.exit(1)
}
