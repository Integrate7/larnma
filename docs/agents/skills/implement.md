# Implement — Classify, Confirm, Guide

Entry point for starting an implementation task. Ensures the agent picks the right task type (not assumed), is on the right branch, and follows the right checklist.

---

## Step 1 — Classify the task with the user

If the user passed a type argument (e.g. `/implement feat`), skip to Step 2.

Otherwise, ask the user to confirm ONE of these types before writing code:

| Type | Prefix | Use when... |
|------|--------|-------------|
| feat | `feat/` | New user-facing capability |
| fix | `fix/` | Restoring broken behavior |
| enhance | `enhance/` | Improving existing working behavior (UX, validation, messaging) |
| refactor | `refactor/` | Restructuring without behavior change |
| chore | `chore/` | Deps, cleanup, tooling that touches no product logic |
| docs | `docs/` | Docs only |
| test | `test/` | Tests only — no production code change |
| perf | `perf/` | Performance-only change, no semantics |
| ci | `ci/` | CI / CD config (GitHub Actions, lint config) |
| build | `build/` | Build or bundling config (Next config, deps, scripts) |

**Rules**:
- If ambiguous, list your TOP 2 guesses with a one-line reason each and ask the user which — do NOT assume.
- If the user describes it as "fix" but the change would introduce new capability, call that out and ask to re-classify.
- If scope covers more than one type (e.g. fix + refactor), ask to split or pick the dominant one — one PR, one type.

---

## Step 2 — Branch check

```bash
git branch --show-current
```

Decide based on current branch:

- **`main` or `dev`** → STOP. Ask user to create a new branch: `git checkout -b <type>/<short-desc>`. Suggest a kebab-case slug derived from the task description.
- **Matches `^<type>/`** → proceed.
- **Different prefix** (e.g. on `feat/*` but type is `fix`) → STOP. Flag the mismatch and ask whether to (a) create a new branch, or (b) re-classify the task.

Branch-to-commit-type mapping is enforced by `/self-review` rule D4 — catching it here saves a failed ship later.

---

## Step 3 — Draft a plan file and confirm with the user

Before writing any code, create a plan file under `docs/plans/` and get the user to confirm the approach.

### 3.1 When a plan file is required

| Type | Plan file required? |
|------|---------------------|
| `feat`, `fix`, `enhance`, `refactor`, `perf` | **YES** — always |
| `chore`, `ci`, `build` | Only if > 3 files or non-trivial |
| `docs`, `test` | Optional — only if the change is large or cross-cutting |

For tiny tasks (one-liner fix, single-file doc tweak), you may skip the plan file but state the intent inline with the user and ask for confirmation before editing.

### 3.2 File location and naming

```
docs/plans/<YYYY-MM-DD>-<kebab-slug>.md
```

- `<YYYY-MM-DD>`: today's date (use the current date from the session context, NOT a relative date)
- `<kebab-slug>`: derived from the branch slug (usually the same as the branch, minus the type prefix)
- Example: branch `feat/workflow-export-dialog` on 2026-04-20 → `docs/plans/2026-04-20-workflow-export-dialog.md`

If a matching `*-design.md` already exists (human-authored design doc), reference it — do not duplicate. The implementation plan is separate and actionable.

### 3.3 Plan template

```markdown
# <Task title>

**Type:** <feat | fix | enhance | refactor | chore | docs | test | perf | ci | build>
**Branch:** `<type>/<slug>`
**Date:** <YYYY-MM-DD>

## Goal
One or two sentences stating what success looks like from the user's point of view.

## Non-goals
Bullets of what is explicitly OUT of scope — prevents scope creep.

## Context
- What exists today (files, flows, behavior)
- What is missing / broken / suboptimal
- Link to any related design doc in `docs/plans/*-design.md`, issue, or spec

## Approach
High-level strategy in 2–5 bullets. Key files to touch. Order of execution.

## Tasks
1. **<Task 1 name>** — files: `<path/a.ts>`, `<path/b.tsx>` — <what changes>
2. **<Task 2 name>** — files: `<...>` — <what changes>
...

## Tests
- Unit: which files get new tests, what scenarios (happy + error paths)
- E2E: which spec(s), if any — skip this subsection if none needed

## Risks / Open questions
Edge cases, unknowns, assumptions that the user should confirm before coding.
```

### 3.4 Confirmation loop

1. Write the file with `Write`.
2. Show the user the path and ask: **"Plan saved to `docs/plans/<file>.md` — ตกลงแนวทางนี้ไหม? ถ้าต้องการปรับ Approach / Tasks / Non-goals บอกได้"**
3. If the user asks for changes, edit the file and re-confirm. Do NOT start coding.
4. Once the user approves, proceed to Step 4.

**Hard rule**: No production code edits (`src/`, `app/`, etc.) before the plan is approved. Doc-only edits to create the plan file itself are fine.

---

## Step 4 — Load the right checklist

Follow the checklist for the chosen type. These are authoritative — `workflow.md §4.2` delegates to this file.

### feat — Build new functionality

1. Create `types.ts` first — define all types the module needs
2. Create `controller/` at the appropriate level:
   - Level 1 (Page): `globalState → queryHandler → handler`
   - Level 1 + form: `formHandler → globalState → queryHandler → handler`
   - Level 2 (Sub-component): `globalState → handler`
3. Create `views/` — pure components, flat props only
4. Create main component — wiring controller to views
5. If API needed: config → Zod schema → Query/Mutation class → export
6. If route needed: route → page → permissions → sidebar entry
7. Write unit tests for every new file (coverage ≥ 80%)

### fix — Fix a defect

1. Read the problematic code and mentally reproduce the issue
2. Find the root cause (not just the symptom)
3. Write a regression test that currently FAILS for the right reason
4. Fix at the root cause
5. Verify the new test passes and nothing else broke

### enhance — Improve an existing feature

1. Read all relevant existing code first
2. Change only what's necessary — do NOT refactor surrounding code
3. Preserve existing patterns (Controller-View, prop shape, naming)
4. Update or add tests covering the new behavior

### refactor — Restructure without behavior change

1. Confirm tests already pin the current behavior — if not, ADD them FIRST (separate commit)
2. Refactor in small steps, keeping tests green between each step
3. NEVER mix refactor with feature / fix in the same PR
4. Coverage must stay ≥ 80% — a refactor shouldn't reduce it

### chore — Maintenance work

1. Do only what was requested — no drive-by improvements
2. Don't add comments / docstrings to code you didn't change
3. If touching deps, read the changelog of the new version

### docs — Documentation only

1. No production code changes — if any `.ts` / `.tsx` under `src/` would change, re-classify
2. Keep tone / style consistent with the doc it lives next to
3. Update cross-references if you rename or move a file

### test — Tests only

1. No production code changes — if a test requires a code change to become testable, split into two PRs
2. Follow patterns in `context/07-testing.md`
3. Every added test must fail for the right reason before you make it pass

### perf — Performance-only change

1. Capture a baseline measurement BEFORE the change
2. Make the change
3. Capture the post-change measurement — report the improvement in the PR body
4. Behavior must not change — existing tests must stay green, no new assertions on output

### ci — CI / CD config

1. Touch only files under `.github/`, `.claude/`, `biome.json`, or similar config surfaces
2. Test the config locally where possible before pushing
3. Flag any change that could affect build time or cost in the PR body

### build — Build / bundling config

1. Touch only `next.config.*`, `tsconfig*.json`, `package.json`, `Makefile`, or similar
2. Run `npm run build` locally — must succeed
3. Flag any change in bundle size in the PR body

---

## Step 5 — Hand-off

When implementation is complete:

1. **Stop your reply.** The Stop-hook at `docs/agents/hooks/quality-gate.sh` will automatically run the quality gate (lint + coverage + build + sonar). If it fails, you will be rewaken with the error — fix it and stop again.
2. Once the Stop-hook reports **PASSED**, invoke **`/self-review`** to audit the diff against project rules (A1–E5).
3. When `/self-review` reports zero blocking issues, invoke **`/ship`** to run E2E + `/security-review` and open the PR.

**Do not invoke `/verify` manually** unless you want a fast intermediate check while still writing code — the Stop-hook already runs the same gates.

---

## Hard rule — no `biome-ignore`

Do **not** add `biome-ignore` comments during implementation. If Biome flags code, fix the code so the rule is satisfied — do not suppress it.

The only exception: if the Biome rule is genuinely wrong for the case at hand, **stop and ask the user** for explicit approval before adding the suppression, and record that approval (with the reason) in the commit body. `/self-review` rule E3a treats any unsanctioned `biome-ignore` as a blocking issue.

### Common lint fixes — apply these instead of suppressing

| Lint error | Fix pattern |
|------------|-------------|
| `lint/suspicious/noArrayIndexKey` / key-related warnings in JSX loops | Compute a stable key, **assign it to a variable first**, then pass the variable to `key=`. Example: `const key = \`${artifactCheck.name}-${checkId}\`` then `<Row key={key} …>`. Do not inline the template literal inside `key=` when the rule flags it. |
| `This hook is being called from within a function or method that is not a hook or component` (React Hooks rules) | Rename the enclosing function so it starts with `use` (hook) or an uppercase letter (component). Example: in `src/components/atom/combobox/controller/hooks/__tests__/useListener.test.ts`, a helper named `makeListener` that calls hooks must be renamed to `useMakeListener`. Update all call sites. |

Add new recipes here whenever you discover a clean fix for a recurring Biome/ESLint rule — the goal is that future `/implement` runs never need to reach for `biome-ignore`.

---

## Non-Goals

- Do not write production code during Steps 1–3. Classification, branch setup, and plan approval come first.
- Do not skip Step 1 "to save time" — misclassified work produces wrong commit types, which fails `/self-review` D4 later.
- Do not skip Step 3 for non-trivial tasks. The plan file is the contract with the user — coding without it leads to re-work and scope creep.
- Do not combine two types in one invocation. One `/implement` = one type = one PR = one plan file.
- Do not silence Biome with `biome-ignore` — see the hard rule above.
