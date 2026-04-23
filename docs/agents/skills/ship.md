# Ship — Post-Implement → PR Pipeline

Authoritative rules for the full pre-PR gate. The `/ship` skill is a thin dispatcher; this document is the single source of truth.

`/ship` is how you go from "code is written" to "PR is open against `dev`". Every gate is fail-fast; nothing is skipped to get green.

---

## Prerequisites — check first, abort if violated

```bash
git branch --show-current
git status --porcelain
git fetch origin dev --quiet
git log --oneline origin/dev..HEAD
```

Abort with a clear message if ANY of the following is true:

- Current branch is `main` or `dev`.
- Branch name does not match `^(feat|fix|enhance|chore|refactor|docs|test|perf|ci|build)/[a-z0-9._-]+$` (see `docs/agents/skills/self-review.md` → rule D1).
- Working tree is clean AND there are no commits ahead of `origin/dev` (nothing to ship).

---

## Pipeline — run each gate in order; STOP on first failure

Do NOT auto-fix code between gates without user approval. A failed gate means the user fixes it, then re-runs `/ship`.

### Gate 1 — `/verify`

Invoke the `verify` skill. Rules live in `docs/agents/skills/verify.md`.
Must pass with zero errors and all changed files at coverage ≥ 80%.

### Gate 2 — E2E tests (Playwright)

```bash
npm run test:e2e
```

On failure: report the failing specs (first ~30 lines of output) and stop.
Reminder (per `docs/agents/skills/self-review.md` C1–C4): Monaco uses `keyboard.type()` not `.fill()`; waits use `waitFor()`.

### Gate 3 — `/self-review`

Invoke the `self-review` skill. Rules live in `docs/agents/skills/self-review.md`.
ANY blocking issue stops the pipeline. Print the blocking-issues section verbatim.

### Gate 4 — `/security-review`

Invoke the `security-review` skill on the pending changes.
- HIGH or CRITICAL finding → STOP.
- MEDIUM finding → continue, but must be acknowledged in the PR description's "Notes" section.

---

## Commit

After all 4 gates pass, invoke the **`/commit`** skill — canonical rules: [`commit.md`](./commit.md).

`/commit` enforces:

- Format `<type>(<optional-scope>): <subject>` + body (WHY, not WHAT)
- `<type>` matches the branch prefix
- Explicit file staging (no `git add -A` / `git add .`)
- Blocks `.env` / credentials / large binaries
- **No `Co-Authored-By:` trailer** — team rule
- No `--no-verify`, `--no-gpg-sign`, or amending pushed commits without explicit user approval

Do not bypass `/commit` by calling raw `git commit` — the rules apply the same way.

---

## Push

```bash
git push -u origin "$(git branch --show-current)"
```

If the remote rejects (non-fast-forward), STOP. Do NOT force-push. Tell the user to pull / rebase first.

---

## Open PR

Base branch is always `dev`.

```bash
gh pr create --base dev --title "<same as lead commit subject>" --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>

## Changes
- <file or area>: <what changed>

## Test plan
- [x] `npm run lint`
- [x] `npm run test:coverage` (all changed files ≥ 80%)
- [x] `npm run build`
- [x] `make sonar-scan`
- [x] `npm run test:e2e`
- [x] Self-review (project rules) — 0 blocking
- [x] Security review — 0 HIGH/CRITICAL

## Notes
<risks, follow-ups, MEDIUM security findings acknowledged, screenshots if UI>
EOF
)"
```

---

## Success Output

```
Shipped.
  Branch  : <branch>
  Base    : dev
  Commits : <n>
  PR URL  : <url>

Gates passed: verify, e2e, self-review, security-review.
```

---

## Hard Rules

- Never merge the PR — opening is the last step; humans merge.
- Never push to `main` or `dev` directly.
- Never skip a gate with a flag or env var to "just get it green".
- Never leave `TODO` / `console.log` / `debugger` in the commit that ships.
- If a gate fails, the fix belongs in a **new commit** — not an amend of a shipped commit.
