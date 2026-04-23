# `docs/agents/` — Claude / AI Agent Playbook

This folder is the **single source of truth** for how Claude (and any AI agent) works on this repo: rules, skills, hooks, and the end-to-end dev flow.

> `.claude/` เป็น gitignored — แต่ละคนต้อง set skill + hook ของตัวเอง **ครั้งเดียว** ตามวิธีในข้อ 2

---

## 1. What's in this folder

```
docs/agents/
├── README.md            ← you are here (setup + how-to-use)
├── workflow.md          ← THE flow: Research → Plan → /implement → /self-review → /ship
├── context/             ← codebase / pattern / data docs to read BEFORE coding
│   ├── 01-codebase-overview.md
│   ├── 02-controller-view-pattern.md
│   ├── 03-data-layer.md
│   ├── 04-state-management.md
│   ├── 05-node-system.md
│   ├── 06-auth-and-rbac.md
│   ├── 07-testing.md
│   ├── 08-common-tasks.md
│   └── 09-decision-table.md
├── skills/              ← canonical rules for each slash command
│   ├── implement.md
│   ├── verify.md
│   ├── self-review.md
│   ├── review-pr.md
│   ├── commit.md
│   └── ship.md
└── hooks/               ← shared hook scripts (Stop-hook quality gate)
    ├── README.md
    └── quality-gate.sh
```

The files under `skills/` and `hooks/` are **checked into git**. The `.claude/` wiring that activates them in your local Claude Code is **not** — see the setup below.

---

## 2. One-time setup — activate skills + hook locally

Each teammate does this **once** in their clone. Paths are relative to the repo root.

### 2.1 Register slash-command skills

Create `.claude/skills/<name>/skill.md` for every skill you want to invoke as `/<name>`. Each stub just points to the canonical rules in `docs/agents/skills/<name>.md` — the stub tells Claude Code "this skill exists", the rule doc tells it what to do.

Example: `.claude/skills/implement/skill.md`

```markdown
---
name: implement
description: Kick off an implementation task. Classifies the task type (feat/fix/enhance/refactor/chore/docs/test/perf/ci/build) with the user, checks the branch matches, then guides you through the right checklist. Use BEFORE writing any code.
user_invocable: true
---

# Implement

Read **`docs/agents/skills/implement.md`** and execute the flow exactly as specified there. That document is the single source of truth — do not improvise, do not skip the classification step.
```

Repeat for: `verify`, `self-review`, `review-pr`, `commit`, `ship`. The stubs already exist in this repo's local `.claude/` on the maintainer's machine — copy that shape, or ask a teammate to share theirs.

### 2.2 Register the Stop-hook quality gate

Add to `.claude/settings.local.json` (create if missing):

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "allow": ["Bash", "Edit", "Write", "Read", "Glob", "Grep"]
  },
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "docs/agents/hooks/quality-gate.sh",
            "asyncRewake": true,
            "timeout": 900,
            "statusMessage": "Running quality gate (lint + coverage + build + sonar)…",
            "rewakeSummary": "Quality gate failed — fix before declaring done"
          }
        ]
      }
    ]
  }
}
```

Full details + optional `SONAR_TOKEN` setup → [`hooks/README.md`](./hooks/README.md).

### 2.3 Reload Claude Code

Run `/hooks` once inside Claude Code (or restart the session) so the settings watcher picks up the new skills and hook.

### 2.4 Verify it works

```
/verify
```

If Claude runs `npm run lint` → `npm run test:coverage` → `npm run build` → `make sonar-scan` in order, you're wired up correctly.

---

## 3. How to use skills — slash-command reference

All skills are invoked as `/<name>` inside Claude Code. Canonical rules for each one live in `docs/agents/skills/<name>.md`; the short line below is just the "when to use it".

| Slash command | When to use | Rules |
|---|---|---|
| `/implement [type]` | **Start any coding task.** Classifies feat/fix/…, checks branch, drafts a plan file, then runs the checklist. | [`skills/implement.md`](./skills/implement.md) |
| `/verify` | Fast inner-loop gate: lint + unit + coverage ≥ 80% + build + sonar. Stops on first failure. Also runs automatically via Stop-hook. | [`skills/verify.md`](./skills/verify.md) |
| `/self-review` | Audit your own diff against project rules A1–E5 before shipping. | [`skills/self-review.md`](./skills/self-review.md) |
| `/review-pr <N>` | Review a teammate's PR with the same A1–E5 rules + F1–F4 PR-meta checks. Never approves/merges. | [`skills/review-pr.md`](./skills/review-pr.md) |
| `/commit` | Author a commit in the project format. Enforces `<type>` matches branch, blocks `.env`, never adds `Co-Authored-By`. | [`skills/commit.md`](./skills/commit.md) |
| `/ship` | Full pre-PR pipeline: `/verify` + E2E + `/self-review` + `/security-review` → `/commit` → push → open PR against `dev`. | [`skills/ship.md`](./skills/ship.md) |

**Normal flow:** `/implement` → write code → stop (hook auto-runs `/verify`) → `/self-review` → `/ship`.

---

## 4. How to implement — feat / fix / chore / …

The workflow is the same regardless of task type; only the **branch prefix**, **commit type**, and **per-type checklist** change. Full flow lives in [`workflow.md`](./workflow.md); the summary below is the minimum you need to start.

### 4.1 Task types

Branch prefix MUST match the type. `/self-review` rule D1 rejects anything else.

| Type | Prefix | Use when… | Example branch |
|---|---|---|---|
| `feat` | `feat/` | New user-facing capability | `feat/workflow-export-dialog` |
| `fix` | `fix/` | Restore broken behavior | `fix/loop-node-infinite-rerender` |
| `enhance` | `enhance/` | Improve existing working behavior (UX, validation) | `enhance/form-error-copy` |
| `refactor` | `refactor/` | Restructure without behavior change | `refactor/extract-query-handler` |
| `chore` | `chore/` | Deps, cleanup, tooling — no product logic | `chore/bump-playwright` |
| `docs` | `docs/` | Docs only | `docs/agents-readme` |
| `test` | `test/` | Tests only — no production change | `test/add-node-system-coverage` |
| `perf` | `perf/` | Perf-only change, no semantics | `perf/memoize-node-registry` |
| `ci` | `ci/` | GitHub Actions, lint config | `ci/add-sonar-job` |
| `build` | `build/` | Next config, deps, build scripts | `build/tighten-tsconfig` |

### 4.2 The loop (same for every type)

1. **Research** — read `CLAUDE.md`, `context/01-codebase-overview.md`, `context/02-controller-view-pattern.md`, plus any task-specific context doc (API → `03`, store → `04`, nodes → `05`, auth → `06`, tests → `07`, new page/component → `08`). Read the actual source files you plan to touch.
2. **Branch** — `git checkout -b <type>/<kebab-slug>` (never work on `main` / `dev`).
3. **Invoke `/implement`** (or `/implement <type>` to skip the classification question). It will:
   - Confirm the type
   - Check the branch prefix matches
   - Draft a plan file at `docs/plans/<YYYY-MM-DD>-<slug>.md` and **wait for your approval** before touching production code
   - Load the checklist for that type
4. **Write code** following the per-type checklist. Never use native HTML, never import `@radix-ui/*` in modules, go through `services/adapter/` for APIs — full rules in [`workflow.md §4.1`](./workflow.md) (A1–A12).
5. **Stop your reply.** The Stop-hook runs `/verify` automatically. If it fails, fix and stop again.
6. **`/self-review`** — audits diff against A1–E5. Fix every blocking issue.
7. **`/ship`** — runs `/verify` + E2E + `/self-review` + `/security-review`, then `/commit`, push, open PR against `dev`.

### 4.3 Per-type quick checklists

Full versions in [`skills/implement.md §4`](./skills/implement.md).

- **feat** — `types.ts` first → controller (Level 1: `globalState → queryHandler → handler`; + form: prepend `formHandler`; Level 2: `globalState → handler`) → views (flat props only) → wire main component → adapter config + Zod + Query/Mutation class if API → route + perms + sidebar if page → unit tests ≥ 80%.
- **fix** — reproduce → find root cause → write failing regression test → fix at the root → verify nothing else broke.
- **enhance** — change only what's necessary, preserve Controller-View + prop shape, add tests for new behavior.
- **refactor** — confirm tests pin current behavior (add them first if not) → refactor in small green steps → never mix with feat/fix → coverage stays ≥ 80%.
- **chore** — only what was asked, no drive-by improvements, read changelog for dep bumps.
- **docs** — no `.ts`/`.tsx` under `src/` changes (re-classify if so), update cross-refs.
- **test** — no production-code edits; if a test needs code changes to pass, split into two PRs.
- **perf** — capture baseline → change → capture post-change → report delta in PR body; existing tests stay green.
- **ci** — touch only `.github/`, `.claude/`, `biome.json` or similar; flag cost/time impact.
- **build** — touch only `next.config.*`, `tsconfig*.json`, `package.json`, `Makefile`; `npm run build` must succeed; flag bundle-size delta.

### 4.4 Plan file requirements

| Type | Plan file required? |
|---|---|
| `feat`, `fix`, `enhance`, `refactor`, `perf` | **YES** — always |
| `chore`, `ci`, `build` | Only if > 3 files or non-trivial |
| `docs`, `test` | Optional |

For a one-liner you may skip the file, but still **state intent inline and get the user's OK** before editing. Template → [`skills/implement.md §3.3`](./skills/implement.md).

### 4.5 Hard don'ts (apply to every type)

- Don't start coding without `/implement`.
- Don't push to `main` / `dev`.
- Don't add `biome-ignore` — fix the code instead ([`skills/implement.md §hard rule`](./skills/implement.md)).
- Don't add a `Co-Authored-By:` trailer to any commit.
- Don't skip a `/ship` gate with `--no-verify` or env flags — fix the root cause in a new commit.
- Don't merge your own PR — humans merge.

---

## 5. Where to look next

- **Starting a task right now** → [`workflow.md`](./workflow.md)
- **Setting up hooks** → [`hooks/README.md`](./hooks/README.md)
- **Looking up a skill rule** → [`skills/<name>.md`](./skills/)
- **Understanding the codebase** → [`context/`](./context/)
- **Project-wide rules Claude always loads** → [`../../CLAUDE.md`](../../CLAUDE.md)
