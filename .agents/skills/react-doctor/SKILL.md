---
name: react-doctor
description: Use when finishing a feature, fixing a bug, before committing React code, after any React/TSX edit, or when the user types `/doctor`, asks to scan, triage, or clean up React diagnostics. Covers lint, accessibility, bundle size, architecture. Project gate: score must be 100/100.
version: "1.3.0"
---

# React Doctor（本仓库硬门禁：100/100）

Scans React codebases for security, performance, correctness, and architecture issues. Outputs a 0–100 health score.

## Project gate (non-negotiable)

**Every React/TSX (and related frontend) change must leave the project at score 100.**

After edits:

1. Run `npm run doctor` (full scan) or `npx react-doctor@latest --verbose -y`
2. If score `< 100`, fix issues (errors first, then warnings) and re-run
3. Repeat until score is **exactly 100**
4. Do not commit or claim done until score is 100

Quick score check: `npm run doctor:score`

Do **not** disable rules, ignore tags, or weaken `doctor.config` to inflate the score unless the user explicitly asks.

## After making React code changes

```bash
npx react-doctor@latest --verbose --scope changed -y
npx react-doctor@latest --verbose -y   # final gate: must be 100
```

If the score dropped or is below 100, fix before finishing.

## For general cleanup or `/doctor`

Run `npx react-doctor@latest --verbose -y` and fix until 100.

For the full local-triage playbook:

```bash
curl --fail --silent --show-error \
  --header 'Cache-Control: no-cache' \
  https://www.react.doctor/prompts/react-doctor-agent.md
```

Pair with per-rule prompts at `https://www.react.doctor/prompts/rules/<plugin>/<rule>.md`.

## For a focused UI design audit

```bash
npx react-doctor@latest design --verbose -y
```

## Configuring or explaining rules

When the user wants to understand or tune rules (not fix code), read [references/explain.md](references/explain.md). Prefer fixing code over disabling rules.

## Command reference

| Flag / command      | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `--verbose`         | Show files and line numbers per rule         |
| `--scope changed`   | Only issues introduced vs base branch        |
| `--score`           | Output only the numeric score                |
| `design`            | Focused UI design diagnostics                |
| `-y`                | Non-interactive / all workspace projects     |
