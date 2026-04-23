# Self-Review — Audit Changes Against Project Rules

Authoritative checklist for reviewing your own branch before shipping. The `/self-review` skill is a thin dispatcher; this document is the single source of truth.

This is a **code-correctness and convention** review. It does NOT review features, UX, or architecture — those are human concerns.

---

## Inputs

Collect the full diff against `origin/dev`:

```bash
git fetch origin dev --quiet
git diff --name-only origin/dev...HEAD
git diff origin/dev...HEAD
git branch --show-current
git log --format=%s origin/dev..HEAD
```

---

## Review Checklist

Every rule below is a **blocking issue** when violated. Report rule IDs in the output so fixers know which rule to look up.

### A. Critical project rules (from `CLAUDE.md`)

- **A1** — No native HTML in app/module code: `<button>`, `<input>`, `<dialog>`, `<form>`, `<select>`, `<textarea>` must come from `@/components/atom/` or `@/components/molecules/`.
- **A2** — No direct `@radix-ui/*` imports in `src/modules/` — wrap via `@/components/`.
- **A3** — API calls go only through `src/services/adapter/` — no `fetch` / `axios` in components, hooks, or server actions.
- **A4** — `type` over `interface` for object shapes.
- **A5** — `types.ts` is the single source of truth — no types defined inline in hook / handler files.
- **A6** — Views receive **flat props only** — no `useStore`, `useQuery`, or controller imports in `views/`.
- **A7** — Handler props use the `Pick<GlobalState, ...>` pattern.
- **A8** — Server Actions return `ActionResult<T>` shape.
- **A9** — User expressions are never executed in the browser — only in the backend sandbox.
- **A10** — If-node handles use `'true'` / `'false'`, NOT `'success'` / `'failure'`.
- **A11** — No lock-workflow API calls on the workflow detail page.
- **A12** — Switch-node handles are computed from cases, not hardcoded.

### B. Controller-View structure (from `docs/agents/context/02-controller-view-pattern.md`)

Apply only to feature modules under `src/modules/**` that own state (pages, dialogs, complex sub-components). Pure presentational views are exempt.

- **B1** — Folder layout respected: the feature has `controller/`, `views/`, `types.ts`, `index.ts`, and a main `<feature>.tsx`. Level 1 adds `controller/controller.ts`, `controller/hooks/`, and `controller/actions.ts` (when Server Actions are used).
- **B2** — Hook files use the canonical names — `globalState.ts`, `queryHandler.ts`, `handler.ts`, `formHandler.ts` (plus `controller.ts`, `actions.ts` at the controller root). No ad-hoc hook filenames.
- **B3** — Hook dependency chain is one-directional: `formHandler → globalState → queryHandler → handler`. No circular imports between hooks.
- **B4** — `controller.ts` is a pure orchestrator — composes hooks and returns a flat API. No business logic, no effects, no JSX.
- **B5** — Main `<feature>.tsx` is pure wiring — destructures the controller and passes flat props to views. No hook calls other than the controller, no inline state.
- **B6** — Hook / handler / controller files `import type { ... } from '../../types'` — no inline `type` / `interface` declarations in these files (reinforces A5).
- **B7** — Sub-components with local UI state nest their own Level 2 controller (`controller/hooks/globalState.ts` [+ `handler.ts`]). Sub-components with no state remain pure views (no controller folder).
- **B8** — `formHandler` rules respected: owns `useForm` + Zod schema + default values, resets on mode / open change via `useEffect`, and `handler` reads form via `getValues` / `trigger` (handler does NOT own form state).
- **B9** — Level choice matches the decision tree in `02-controller-view-pattern.md` (Level 1 / Level 1 + formHandler / Level 2 / Pure view) — flag mismatches (e.g. page-level feature missing `queryHandler` / `actions`, or sub-component that fetches data without being promoted to Level 1).

### C. Tests

- **C1** — Every changed `.ts` / `.tsx` under `src/` (excluding `types.ts`, `index.ts`, `*.d.ts`) has a colocated `__tests__/*.test.ts(x)`.
- **C2** — Both happy path AND error paths are covered.
- **C3** — Test names are unique (follow the `Test_${feature}_${Date.now()}` convention from `CLAUDE.md`).

### D. E2E (only if files under `e2e/` changed)

- **D1** — Monaco interactions use `keyboard.type()` or POM helpers — NOT `.fill()`.
- **D2** — Waits use `waitFor()` — no `sleep` / `waitForTimeout` with arbitrary numbers.
- **D3** — Cleanup lives in `test.afterEach()`.
- **D4** — Selector priority respected: `data-testid` > `role` > stable attribute > text.

### E. Commit / branch hygiene

- **E1** — Branch name matches `^(feat|fix|enhance|chore|refactor|docs|test|perf|ci|build)/[a-z0-9._-]+$`.
- **E2** — Branch is NOT `main` or `dev`.
- **E3** — All commits follow Conventional Commits: `<type>(<scope>): <subject>`.
- **E4** — Commit `<type>` is consistent with the branch prefix (branch `feat/x` → commits are `feat: …`, maybe plus `test:` / `docs:` that support the same change).

### F. Security & discipline

- **F1** — No secrets / tokens / credentials in the diff. Scan for patterns: `sk_`, `Bearer `, `password\s*=`, `api[_-]?key`, raw `.env` contents, private keys.
- **F2** — No `console.log` / `debugger` / orphan `TODO` / `FIXME` left in changed source files.
- **F3** — No `// @ts-ignore`, `// @ts-expect-error`, `any`, or `as unknown as` added without a one-line justification comment directly above it.
- **F3a** — **No `biome-ignore` added, period.** Fix the underlying code to satisfy Biome. If the rule is genuinely wrong for this case, stop and ask the user for explicit approval before adding the suppression — record that approval in the commit body.
- **F4** — No changes outside the scope described by the branch / commit subjects — flag unrelated drive-by edits.
- **F5** — No new entries in `package.json` `dependencies` / `devDependencies` unless the task genuinely required it.

---

## Output Format

```
## Self-Review Result

### Blocking Issues (N)

1. src/path/to/file.tsx:42 — [A1] uses native <button>. Replace with @/components/atom/Button.
2. src/modules/foo/handler.ts:8 — [A3] calls fetch() directly. Move to services/adapter/foo.ts.
3. ...

### Advisory (N)

1. src/path/to/file.tsx:10 — unused import can be removed (not blocking).
```

If there are zero blocking issues:

```
Self-review passed — 0 blocking issues, N advisory notes.
Ready for /ship.
```

If there are blocking issues, end with:

```
/ship is NOT safe yet — fix the blocking issues above and re-run /self-review.
```

---

## Non-Goals

- Do not rewrite code — only report.
- Do not re-run lint / tests — that's `/verify`.
- Do not review features, UX, or architecture.
