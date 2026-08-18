#!/usr/bin/env node
// PreToolUse guard: enforce the QA / branch-PR workflow deterministically.
// Reads the hook payload from stdin and denies terminal commands that bypass
// safety checks or write directly to the protected branch. Read-only otherwise.
//
// Scope: this is an advisory workflow guardrail, NOT a security sandbox. It is a
// denylist of known bypass patterns and is intentionally not exhaustive; the
// real security boundary is VS Code's tool approval and the terminal sandbox.
// The only execSync call below runs a constant command (no external input), so
// there is no command-injection surface here.

import { execSync } from 'node:child_process'

function readStdin() {
	return new Promise((resolve) => {
		let data = ''
		process.stdin.on('data', (c) => (data += c))
		process.stdin.on('end', () => resolve(data))
		process.stdin.on('error', () => resolve(''))
	})
}

function respond(decision, reason) {
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: 'PreToolUse',
				permissionDecision: decision,
				...(reason ? { permissionDecisionReason: reason } : {}),
			},
		}),
	)
	process.exit(0)
}

const allow = () => respond('allow')
const deny = (reason) => respond('deny', reason)

const raw = await readStdin()
let payload = {}
try {
	payload = JSON.parse(raw || '{}')
} catch {
	allow()
}

// Only guard terminal command executions; ignore file edits, reads, etc.
const toolName = String(payload.tool_name ?? payload.toolName ?? payload.name ?? '')
if (!/terminal/i.test(toolName)) allow()

const input = payload.tool_input ?? payload.toolInput ?? payload.input ?? payload.arguments ?? {}
const command = String(input.command ?? '')
if (!command) allow()

const DANGEROUS = [
	{ re: /--no-verify\b/, msg: 'Skipping git hooks with --no-verify is not allowed.' },
	{
		re: /git\s+push\b[^\n]*?(--force\b|--force-with-lease\b|(^|\s)-f(\s|$))/,
		msg: 'Force-pushing is not allowed on shared history.',
	},
	// Force-push via refspec, e.g. `git push origin +main`.
	{ re: /git\s+push\b[^\n]*\s\+\S/, msg: 'Force-pushing via +refspec is not allowed on shared history.' },
	{ re: /git\s+reset\s+--hard\b/, msg: 'git reset --hard can destroy work; run it yourself if truly needed.' },
]

for (const rule of DANGEROUS) {
	if (rule.re.test(command)) deny(`${rule.msg} Work on a feature branch and open a PR instead.`)
}

// Block direct commits/pushes to the protected branches.
const PROTECTED_BRANCHES = ['main', 'master', 'develop']

if (/\bgit\s+(commit|push)\b/.test(command)) {
	let branch = ''
	try {
		branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
	} catch {
		allow()
	}
	if (PROTECTED_BRANCHES.includes(branch)) {
		const action = /\bgit\s+commit\b/.test(command) ? 'Committing' : 'Pushing'
		deny(`${action} directly to "${branch}" is not allowed. Create a feature branch and open a PR.`)
	}
}

allow()
