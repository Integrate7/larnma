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
| API / data fetching / new route handler | `context/03-data-layer.md` |
| Module state (`globalState`, forms, SSE consumption) | `context/04-state-management.md` |
| Auth / cookies / JWT / permissions | `context/05-auth-and-sessions.md` |
| Pluggable external boundaries (Gemini, repository, menu, eventBus, orderLifecycle, notifications, OTP) | `context/06-integrations.md` |
| Tests (unit / E2E / coverage gate / test-seed) | `context/07-testing.md` |
| i18n (Thai-first, `next-intl`, new copy keys) | `context/08-i18n-thai-first.md` |
| New elder screen or new caregiver screen / routing | `context/09-elder-caregiver-surfaces.md` |
| Starting an implementation task (`/implement`) | `skills/implement.md` |
| Running the pre-commit quality gate (`/verify`) | `skills/verify.md` |
| Reviewing your own branch (`/self-review`) | `skills/self-review.md` |
| Reviewing a teammate's PR (`/review-pr`) | `skills/review-pr.md` |
| Authoring a commit (`/commit`) | `skills/commit.md` |
| Shipping / opening a PR (`/ship`) | `skills/ship.md` |
| Product scope / specs / plans | `docs/mvp/mvp.md`, `docs/plans/` |

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

These mirror rules A1–A12 in `CLAUDE.md` / `skills/self-review.md`. `/ship` will block if any of these are violated.

```
[ ] A1  Always use @/components/ — never native HTML (<button>, <input>, <dialog>, <form>)
[ ] A2  No direct @radix-ui/* imports in src/modules/ — wrap via @/components/
[ ] A3  Follow the Controller-View pattern for all feature modules
[ ] A4  Client code uses fetcher() from services/adapter; server code uses getRepository() — never raw fetch/axios
[ ] A5  Use type, not interface
[ ] A6  types.ts is the single source of truth — never define types inline in hooks
[ ] A7  Views receive flat props only — no controller/store awareness
[ ] A8  Handler props use Pick<GlobalState, ...>
[ ] A9  Server Actions and API JSON responses use ActionResult<T>
[ ] A10 Never execute user expressions in the browser
[ ] A11 Use @/components/atom/button + variant/size — never reinvent
[ ] A12 No biome-ignore comments — fix the code, not the rule
[ ]     Never hard-code Thai strings — use next-intl keys from messages/th.json
[ ]     Route handlers run requireCaregiver / requireDevice before any repo call
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

### New Page (elder or caregiver)

```
1. Read context/01, 02, 09
2. Decide surface (elder vs caregiver) and add app/<surface>/<slug>/page.tsx (one-line module mount)
3. Create module in src/modules/<name>/ following Controller-View
4. Wire guard: getServerAuth() in the page.tsx if surface-gated; requireCaregiver/requireDevice in any new API route
5. Add copy keys to messages/th.json AND messages/en.json (keep parity)
6. Write unit tests (coverage ≥ 80%) + E2E spec if the flow is user-visible
```

### New API Endpoint

```
1. Read context/03, 05
2. Add (or reuse) Zod schema under src/services/adapter/schemas/
3. Create src/app/api/<path>/route.ts — export const runtime = 'nodejs'
4. Run requireCaregiver or requireDevice first; then checkPermission if the action is sensitive
5. Do work via getRepository(); publish to eventBus if other clients should re-render
6. Call it from the relevant module via fetcher(url, schema) — never raw fetch
7. Write unit tests for the handler (auth-missing + happy + failure paths)
```

### New Component

```
1. Read context/01
2. Atom? → src/components/atom/<name>/ (may import @radix-ui/*) with variant/size via CVA
   Molecule? → src/components/molecule/<name>/ (composes atoms only)
3. Files: <name>.tsx, types.ts, index.ts — types in types.ts, never inline
4. No native HTML — wrap Radix if needed
5. Write unit tests
```

### New Dialog

```
1. Read context/02
2. Open/close state lives in the parent's globalState.ts
3. If the dialog has a form → add formHandler.ts INSIDE the dialog's nested controller; Zod schema in schema.ts
4. Handler reads form via getValues/trigger — never owns form state
5. Write unit tests for globalState, formHandler, handler
```

### New External Integration

```
1. Read context/06
2. Add an interface in src/services/<name>/types.ts
3. Ship a mock implementation FIRST (createMock<Name>Adapter) — pass all tests against the mock
4. Add a factory: getXAdapter() returns mock by default, real if env var set
5. Expose __setXAdapter() for tests
6. Only then wire the real implementation (createReal<Name>Adapter)
```

---

## Anti-Patterns — What NOT to Do

| Don't | Do Instead |
|-------|------------|
| Use `<button>`, `<input>` directly | Use `@/components/atom/` |
| Import from `@radix-ui/` in `src/modules/` | Import from `@/components/atom/` |
| Call `fetch` / axios from a component or hook | Use `fetcher(url, schema)` from `services/adapter/fetcher.ts` |
| Read/write domain state inside a module-level `Map` | Use `getRepository()` |
| Use `interface` | Use `type` |
| Define types in hook files | Define in `types.ts` |
| Let views know about store / controller | Views receive flat props only |
| Hard-code Thai (or English) copy in JSX | Use `useTranslations()` keys from `messages/th.json` |
| Call `fetch` inside an API route handler to hit another internal route | Call the service directly (`getRepository()`, `fanOutEvent`, …) |
| Skip `requireCaregiver` / `requireDevice` because "the page redirects" | Every `/api/*` handler runs a guard first |
| Use ESLint / Prettier | Use Biome (rule A12 forbids `biome-ignore`) |
| Use `setTimeout` / `sleep()` in tests | Use Playwright `waitFor()` or Testing Library `await find…` |
| Add a `middleware.ts` to enforce auth | Enforce per-route via services/guards |
| Open a modal to carry form state across screens | Put form state in the page's `formHandler` and navigate |
| Add features that weren't requested | Do only what was asked |
| Merge your own PR | Let a human merge |
| Skip a `/ship` gate with `--no-verify` | Fix the root cause in a new commit |
