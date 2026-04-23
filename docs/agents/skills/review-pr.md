# Review-PR — Audit Someone Else's Pull Request

Authoritative rules for reviewing a GitHub PR on this repo. The `/review-pr` skill is a thin dispatcher; this document is the single source of truth.

This is a **code-correctness, convention, and safety** review applied to someone else's branch. The same rule set as `/self-review` (A1–E5), but the inputs come from `gh` instead of the local branch, and the output is a structured review (optionally posted to GitHub).

`/review-pr` never approves or merges the PR — only humans do that.

---

## Inputs

### Required

The user must provide a PR reference. Accept any of:

- `/review-pr 123` — PR number
- `/review-pr https://github.com/<owner>/<repo>/pull/123` — full URL
- `/review-pr` (no arg) → ask the user for the PR number before continuing

### Collect PR context

```bash
gh pr view <N> --json number,title,body,baseRefName,headRefName,author,isDraft,state,url
gh pr diff <N>
gh pr view <N> --json files --jq '.files[].path'
gh pr view <N> --json commits --jq '.commits[] | "\(.oid[0:7]) \(.messageHeadline)"'
```

If the PR is `draft` or `closed`, warn the user and ask whether to continue.

---

## Pre-flight checks (fast fail)

Abort and report if any of these are true:

- `baseRefName` is NOT `dev` (this repo's convention — PRs must target `dev`). Report it as a blocking issue.
- `headRefName` does NOT match `^(feat|fix|enhance|chore|refactor|docs|test|perf|ci|build)/[a-z0-9._-]+$`. Blocking (rule D1).
- `headRefName` is `main` or `dev`. Blocking (rule D2).
- PR body is empty or missing a Test Plan section. Advisory — call it out but don't block.

---

## Review Checklist

Apply the same rule IDs as `/self-review` ([`self-review.md`](./self-review.md)) so fixers can look them up. Every rule violation is **blocking** unless noted.

### A. Critical project rules

A1–A12 — see `self-review.md §A`. Scan the PR diff for:

- Native HTML tags (`<button>`, `<input>`, `<dialog>`, `<form>`, `<select>`, `<textarea>`) in `src/app/` or `src/modules/`
- `@radix-ui/*` imports in `src/modules/`
- `fetch(` / `axios` outside `src/services/adapter/`
- `interface Foo {` for object shapes
- Types defined inline in hook / handler files (should be in `types.ts`)
- `useStore` / `useQuery` / controller imports inside `views/`
- Handler props NOT using `Pick<GlobalState, ...>`
- Server actions that return something other than `ActionResult<T>`
- Browser-side expression evaluation (e.g. `new Function`, `eval`, `vm.runInThisContext`)
- If-node handles using `'success'` / `'failure'`
- Lock-workflow API calls on `workflow/[id]` detail page files
- Switch-node handles hardcoded rather than computed from cases

### B. Tests

B1–B3 — see `self-review.md §B`. Verify:

- Every changed `.ts` / `.tsx` under `src/` (excluding `types.ts`, `index.ts`, `*.d.ts`) has a colocated `__tests__/*.test.ts(x)` in the PR. If a test file for a changed source file is missing, blocking.
- Both happy path and error paths appear covered (heuristic: multiple `it(` / `test(` blocks; look for `.rejects.` or `throw` assertions).
- Test names unique — check for duplicate `it('...')` strings across the diff.

### C. E2E (only if files under `e2e/` changed)

C1–C4 — see `self-review.md §C`. Scan `e2e/**/*.spec.ts` in the diff for:

- `.fill(` on Monaco selectors — must be `keyboard.type()`
- `sleep(` / `waitForTimeout(` — must be `waitFor()`
- Missing `test.afterEach` cleanup
- Selectors by text content when a `data-testid` exists

### D. Commit / branch hygiene

D1–D4 — see `self-review.md §D`. Verify:

- Branch name matches the prefix regex (already checked in pre-flight)
- All commits follow `<type>(<scope>): <subject>`
- Commit `<type>` is consistent with the branch prefix
- **No `Co-Authored-By: Claude …` (or other AI tool) trailers in any commit** — see [`commit.md §3`](./commit.md). Blocking.

### E. Security & discipline

E1–E5 — see `self-review.md §E`. Scan the diff for:

- Secrets / tokens / credentials: `sk_`, `Bearer `, `password\s*=`, `api[_-]?key`, raw `.env` contents, `BEGIN (RSA\|EC\|OPENSSH) PRIVATE KEY`, base64 blobs > 40 chars after `auth=`
- `console.log` / `debugger` / orphan `TODO` / `FIXME` in production files
- New `// @ts-ignore`, `// @ts-expect-error`, `any`, or `as unknown as` without a one-line justification comment directly above (E3)
- **Any new `biome-ignore`** — blocking under E3a regardless of justification, unless the PR body records explicit user approval with a reason. Flag every occurrence with the file + line.
- Drive-by changes unrelated to the PR title / commit subjects — call them out
- New entries in `dependencies` / `devDependencies` that don't align with the stated scope

### F. Review-PR-specific extras

These apply only to PR reviews, not `/self-review`.

- **F1** — PR body has a Test Plan section and at least the standard checkboxes (`npm run lint`, `npm run test:coverage`, `npm run build`, `e2e`, self-review, security). Advisory if missing.
- **F2** — PR title mirrors the lead commit subject (or close enough). Advisory if mismatched.
- **F3** — PR is NOT a direct commit to `main` / `dev` via a branch that looks like a rebase of main (check `headRefName` != `main` / `dev`, already in pre-flight).
- **F4** — The changes are within the scope implied by `headRefName` and title — flag scope creep (aligns with E4).

---

## Output Format

```
## PR Review: #<N> — <title>

Author: <login> · Base: <baseRefName> · Head: <headRefName>
Files: <count> · +<additions>/-<deletions>

### Blocking Issues (<n>)

1. <path>:<line> — [A1] uses native <button>. Replace with @/components/atom/Button.
2. <path>:<line> — [A3] calls fetch() directly. Move to services/adapter/<name>.ts.
3. <path>:<line> — [D4] commit `feat: x` on branch `fix/y` — mismatch.
4. <path>:<line> — [Co-Authored-By] commit <sha> includes AI trailer. Rewrite history or squash without trailer.
...

### Advisory (<n>)

1. <path>:<line> — unused import.
2. PR body missing Test Plan section [F1].
...

### Summary

- Critical project rules (A): <pass|N violations>
- Tests (B): <pass|N violations>
- E2E (C): <pass|N violations|n/a>
- Commit / branch hygiene (D): <pass|N violations>
- Security & discipline (E): <pass|N violations>
- PR meta (F): <pass|N notes>
```

If zero blocking issues:

```
Review passed — 0 blocking issues, <N> advisory notes.
Safe to approve (human reviewer still required).
```

If blocking issues exist:

```
REQUEST CHANGES — <N> blocking issues above must be fixed before merge.
```

---

## Posting to GitHub (optional, requires explicit user consent)

Default behaviour: **print the review to the terminal only**. Do NOT post to GitHub automatically.

If the user says "post it" / "add the review to the PR" / similar, then:

```bash
gh pr review <N> --request-changes --body "$(cat <<'EOF'
<paste the output block above, minus the terminal-only header>
EOF
)"
```

Or, if there were zero blocking issues and the user explicitly asks to leave a neutral comment (not an approval):

```bash
gh pr review <N> --comment --body "$(cat <<'EOF'
<summary only>
EOF
)"
```

**Hard rules**:

- Never `gh pr review --approve` — only humans approve.
- Never `gh pr merge` — only humans merge.
- Never post a review that contains raw secret values detected during scan — redact them as `<REDACTED:<type>>` before posting.
- When posting, explicitly confirm the PR number with the user one more time to prevent posting to the wrong PR.

---

## Non-Goals

- Do not run tests / lint / build against the PR locally — that's `/verify` on the PR author's side.
- Do not rewrite the PR author's code. Report, don't fix.
- Do not review features / UX / architecture — human concerns.
- Do not review style bikeshedding that Biome would catch — if it passed lint, skip it.
