# Claude AI Development Workflow

Standard workflow for Claude AI to develop, implement features, fix bugs, and handle chores in this project.

**Flow**: Research → Plan → `/implement` → `/self-review` → `/ship`

- `/implement` — classifies the task (feat/fix/...) with the user, checks the branch, drafts a plan file under `docs/plans/` for approval, then guides you through the right checklist. Rules: [`skills/implement.md`](./skills/implement.md).
- `/verify` — pre-commit gate: lint + unit + coverage ≥ 80% + build + SonarQube. Also runs automatically via the Stop-hook when `src/` files change. Rules: [`skills/verify.md`](./skills/verify.md).
- `/self-review` — audits the diff against rules A1–E5 before ship. Rules: [`skills/self-review.md`](./skills/self-review.md).
- `/review-pr <N>` — reviews a teammate's PR using the same A1–E5 rule set (plus F1–F4 PR-meta checks). Reports findings; never approves/merges. Rules: [`skills/review-pr.md`](./skills/review-pr.md).
- `/commit` — authors a commit that follows the project format; **never adds Co-Authored-By trailers**, blocks `.env` / credentials, enforces `<type>` matches branch prefix. Rules: [`skills/commit.md`](./skills/commit.md).
- `/ship` — pre-PR pipeline: `/verify` + E2E + `/self-review` + `/security-review` → `/commit` → push → PR. Rules: [`skills/ship.md`](./skills/ship.md).

---

## 1. Receive Task — Classify the Work

Branch prefix MUST match one of these types. `/self-review` rule D1 rejects anything outside this set.

| Type | Prefix | Examples |
|------|--------|----------|
| Feature | `feat/` | New page, new node type, new dialog |
| Bug Fix | `fix/` | Infinite loop, UI not rendering |
| Enhancement | `enhance/` | UX improvements, add validation |
| Refactor | `refactor/` | Extract helper, rename module, restructure internals without behavior change |
| Chore | `chore/` | Update dependency, cleanup unused code |
| Docs | `docs/` | Update `CLAUDE.md`, edit agent guides |
| Tests | `test/` | Add or repair unit / E2E tests |
| Performance | `perf/` | Memoize, optimize query, reduce bundle |
| CI | `ci/` | GitHub Actions, lint config |
| Build | `build/` | Next config, dependencies, build scripts |

Branch name: `<type>/<short-desc>` in kebab-case (e.g. `feat/workflow-export-dialog`). The commit `<type>` MUST match the branch prefix (`/self-review` rule D4).

---

## 2. Research — Study Context Before Writing Code

### 2.1 Always read these docs first

```
Read CLAUDE.md                                            # All critical rules
Read docs/agents/context/01-codebase-overview.md          # Project structure
Read docs/agents/context/02-controller-view-pattern.md    # Primary pattern
```

### 2.2 Read additional docs based on task type

| If the task involves... | Also read |
|---|---|
| API / data fetching | `context/03-data-layer.md` |
| Zustand store | `context/04-state-management.md` |
| Node system / workflow editor | `context/05-node-system.md` |
| Auth / permissions | `context/06-auth-and-rbac.md` |
| Testing (unit / E2E) | `context/07-testing.md` |
| Decision table | `context/09-decision-table.md` |
| Creating new page/component/node | `context/08-common-tasks.md` |
| Starting an implementation task (`/implement`) | `skills/implement.md` |
| Running the pre-commit quality gate (`/verify`) | `skills/verify.md` |
| Reviewing your own branch (`/self-review`) | `skills/self-review.md` |
| Reviewing a teammate's PR (`/review-pr`) | `skills/review-pr.md` |
| Authoring a commit (`/commit`) | `skills/commit.md` |
| Shipping / opening a PR (`/ship`) | `skills/ship.md` |
| Specs / plans | `docs/mvp/`, `docs/plans/`, `docs/superpowers/` |

### 2.3 Read the relevant source code

- Read all files you intend to modify — never guess
- Study patterns from nearby code (same module or similar feature)
- Always check `types.ts` of the module (single source of truth)

---

## 3. Plan — Write a Plan File Before Implementing

All non-trivial `/implement` invocations MUST produce a plan file under [`docs/plans/`](../plans/) BEFORE any production code is written. This is enforced by `/implement` Step 3 — see [`skills/implement.md §3`](./skills/implement.md) for the template and confirmation loop.

### 3.1 File location

```
docs/plans/<YYYY-MM-DD>-<kebab-slug>.md
```

Example: `docs/plans/2026-04-20-workflow-export-dialog.md`

### 3.2 When required

- `feat` / `fix` / `enhance` / `refactor` / `perf` — **always**
- `chore` / `ci` / `build` — only if > 3 files or non-trivial
- `docs` / `test` — optional, only for large or cross-cutting changes

For one-line fixes you may skip the file but MUST still state the intent inline and get the user's "ok" before editing.

### 3.3 What the plan contains

Goal, non-goals, context, approach, task breakdown (with files), test plan, risks / open questions. Full template in [`skills/implement.md §3.3`](./skills/implement.md).

### 3.4 Approval is mandatory

No production code edits until the user approves the plan. If they ask for changes, edit the plan file and re-confirm.

---

## 4. Implement — Write Code

### 4.1 Critical Rules (every time)

These mirror rules A1–A12 in `skills/self-review.md`. `/ship` will block if any of these are violated.

```
[ ] Always use @/components/ — never use native HTML (<button>, <input>, <dialog>, <form>)
[ ] No direct @radix-ui/* imports in src/modules/ — wrap via @/components/
[ ] Follow Controller-View pattern for all feature modules
[ ] API calls go through src/services/adapter/ only
[ ] Use type, not interface
[ ] types.ts is the single source of truth — never define types inline in hooks
[ ] Views receive flat props only — no controller/store awareness
[ ] Handler props use Pick<GlobalState, ...>
[ ] Server Actions return ActionResult<T>
[ ] Never execute user expressions in the browser
[ ] If-node handles use 'true'/'false', NOT 'success'/'failure'
[ ] Never call lock workflow API on the workflow detail page
[ ] Switch-node handles computed from cases, not hardcoded
```

### 4.2 Invoke `/implement` to start

Do NOT start writing code by improvising. Invoke **`/implement`** — canonical rules: [`skills/implement.md`](./skills/implement.md).

It will:

1. Ask you to classify the task (feat / fix / enhance / refactor / chore / docs / test / perf / ci / build) — it refuses to assume
2. Verify your branch prefix matches the chosen type (and will block `main` / `dev`)
3. **Draft a plan file** under `docs/plans/<YYYY-MM-DD>-<slug>.md` and wait for your approval before touching production code
4. Load the right checklist for that type and guide you through it

You can pass the type as an argument to skip Step 1: `/implement feat`, `/implement fix`, etc.

When implementation is done, stop your reply — the Stop-hook runs the quality gate automatically. Then invoke `/self-review` and `/ship`.

---

## 5. Test — Write Tests

### 5.1 Unit Tests (Jest)

- **Coverage ≥ 80%** on all metrics (branches, functions, lines, statements) for every changed/added file — `/verify` HARD-FAILS otherwise
- Test files go in `__tests__/` alongside the source, named `*.test.ts` or `*.test.tsx`
- Cover both happy path and error paths
- Use unique test names: `Test_${feature}_${Date.now()}`

```bash
npm run test                              # Run all tests
npm run test -- --testPathPattern=path    # Run specific file
npm run test:coverage                     # Full coverage report
```

See `context/07-testing.md` for patterns, global mocks, and examples.

### 5.2 E2E Tests (Playwright) — when needed

- Files named `*.spec.ts` under `e2e/`
- Monaco editor: use `keyboard.type()` or POM helpers — `.fill()` does NOT work
- Use `waitFor()` instead of arbitrary timeouts
- Cleanup in `test.afterEach()`
- Selector priority: `data-testid` > `role` > stable attributes > text content

```bash
npm run test:e2e       # Headless
npm run test:e2e:ui    # With UI
```

---

## 6. Verify — Quality Gate (runs automatically)

The same quality gate runs **automatically via a Stop-hook** (`docs/agents/hooks/quality-gate.sh`) whenever the agent stops with dirty `.ts` / `.tsx` files under `src/`. You rarely need to invoke `/verify` manually.

Steps (fail-fast — STOP on first failure):

1. `npm run lint` — Biome + `tsc --noEmit`
2. `npm run test:coverage` — unit tests; HARD-fails if any changed file < 80% on any metric
3. `npm run build`
4. `make sonar-scan` (skipped if `SONAR_TOKEN` is not set)

On failure, the hook exits with code 2 and re-wakes the agent with the error tail — fix and stop again to re-verify. Canonical rules: [`skills/verify.md`](./skills/verify.md).

Invoke **`/verify`** manually only when you want a fast intermediate check while still writing code (e.g. mid-refactor).

---

## 7. Ship — Run the Pre-PR Pipeline

Invoke **`/ship`** when ready to open a PR. Canonical rules: [`skills/ship.md`](./skills/ship.md).

Gates (fail-fast — a failed gate means fix in a NEW commit, then re-run `/ship`):

1. `/verify`
2. `npm run test:e2e`
3. `/self-review` — audits the diff against rules A1–E5 in `skills/self-review.md`
4. `/security-review` — HIGH / CRITICAL finding STOPS; MEDIUM must be acknowledged in the PR body

On all gates pass, `/ship` will:

1. Invoke **`/commit`** — canonical rules: [`skills/commit.md`](./skills/commit.md). Enforces `<type>(<scope>): <subject>` format, blocks `.env` / credentials, **never adds `Co-Authored-By:` trailers**, and requires `<type>` to match the branch prefix from Section 1.
2. Push to `origin`
3. Open a PR against `dev` with the Test Plan checklist filled in

Commit `<type>` values: `feat`, `fix`, `enhance`, `refactor`, `chore`, `docs`, `test`, `perf`, `ci`, `build`.

**Hard rules**:
- Never merge the PR yourself — opening is the last step; humans merge
- Never push to `main` or `dev` directly
- Never skip a gate with a flag / env var
- Never amend a commit that has already been pushed unless the user explicitly asks

---

## Quick Reference — Choose Workflow by Task

### New Page

```
1. Read context/01, 02, 08
2. Create route in app/
3. Create module in modules/ following Controller-View pattern
4. Add route permissions in config/
5. Add sidebar entry (if needed)
6. Write unit tests (coverage ≥ 80%)
```

### New API Endpoint

```
1. Read context/03
2. Add config in services/adapter/config.ts
3. Create Zod schema
4. Create Query/Mutation class
5. Export from index
6. Use in hook / server action
7. Write unit tests
```

### New Node Type

```
1. Read context/05, 04
2. Add to nodeRegistry
3. Create data type
4. Create config component (Controller-View)
5. Register in switch
6. Add validation
7. Write unit tests
```

### New Component

```
1. Read context/01, 08
2. Create in src/components/atom/myComponent/
3. Files: myComponent.tsx, types.ts, index.ts
4. No native HTML — wrap Radix if needed
5. Write unit tests
```

### New Dialog

```
1. Read context/02, 08
2. Dialog state lives in parent's globalState
3. If it has a form → use formHandler pattern
4. Form data lives in dialog's formHandler (not parent)
5. Write unit tests
```

---

## Anti-Patterns — What NOT to Do

| Don't | Do Instead |
|-------|------------|
| Use `<button>`, `<input>` directly | Use `@/components/atom/` |
| Import from `@radix-ui/` in modules | Import from `@/components/atom/` |
| Call API directly from components | Go through `services/adapter/` |
| Use `interface` | Use `type` |
| Define types in hook files | Define in `types.ts` |
| Let views know about store / controller | Views receive flat props only |
| Use ESLint / Prettier | Use Biome |
| Use `.fill()` on Monaco | Use `keyboard.type()` |
| Use `sleep()` in tests | Use `waitFor()` |
| Add features that weren't requested | Do only what was asked |
| Hardcode Switch node handles | Compute from cases |
| Call lock workflow API on detail page | Never call on detail page |
| Merge your own PR | Let a human merge |
| Skip a `/ship` gate with `--no-verify` | Fix the root cause in a new commit |
