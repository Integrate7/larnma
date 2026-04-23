# Verify — Pre-Commit Quality Gate

Authoritative rules for the fast inner-loop quality gate. The `/verify` skill is a thin dispatcher; this document is the single source of truth for both humans and AI agents.

Use `/verify` during normal development. Use `/ship` (which calls `/verify` first) only when you're ready to open a PR.

---

## Scope

- **Included**: Biome lint, TypeScript type check, Jest unit tests with coverage, Next.js build, SonarQube scan.
- **NOT included**: Playwright E2E, self-review, security review — those belong to `/ship`.

---

## Execution Rules

- Run steps **one at a time** in the order below.
- **Stop on first failure** (non-zero exit). Do not continue to later steps.
- Report which step failed and the tail of the error output. Do NOT attempt to auto-fix code without user approval.
- Coverage below 80% on any metric for any **changed** file is a HARD FAIL — same severity as a failing test.

---

## Steps

### 1. Lint (Biome + `tsc --noEmit`)

```bash
npm run lint
```

On failure → report `Lint failed` + output tail. Stop.
Suggest `npm run lint:fix` for auto-fixable issues.

### 2. Unit tests with coverage

```bash
npm run test:coverage
```

On failure → report `Unit tests failed` + output tail. Stop.

After tests pass, enforce the **coverage gate**:

1. Determine changed files:
   ```bash
   git fetch origin dev --quiet
   git diff --name-only origin/dev...HEAD
   git diff --name-only
   ```
2. Filter to `.ts` / `.tsx` files under `src/` that are **not**:
   - `*.test.ts(x)` / `*.spec.ts(x)`
   - `types.ts`
   - `index.ts`
   - `*.d.ts`
3. For each changed file, read the coverage summary (`coverage/coverage-summary.json` if present; otherwise parse the text table).
4. If ANY changed file has coverage < 80% on statements, branches, functions, or lines → HARD FAIL.

Report format on coverage fail:

```
Coverage gate FAILED (threshold: 80% on all metrics)

  src/modules/xxx/foo.ts         stmts: 72%   branches: 65%   funcs: 80%   lines: 72%
  src/modules/yyy/bar.tsx        stmts: 85%   branches: 55%   funcs: 90%   lines: 85%

Add or expand unit tests for the files above, then re-run /verify.
```

Stop. Do NOT continue to Step 3.

### 3. Build

```bash
npm run build
```

On failure → report `Build failed` + output tail. Stop.

### 4. SonarQube scan

```bash
make sonar-scan
```

On failure → report `SonarQube scan failed` + output tail. Stop.
If the failure is "server not running", suggest `make sonar-up` first.

---

## Success Output

```
Verify complete — all gates passed:
  1. Lint        — passed
  2. Unit tests  — passed (coverage ≥ 80% on all changed files)
  3. Build       — passed
  4. SonarQube   — passed

Next: run /ship to execute E2E + self-review and open a PR.
```
