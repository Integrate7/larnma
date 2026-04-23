# Commit — Authoring Rules for Git Commits

Authoritative rules for every commit made in this project — whether driven by `/commit`, `/ship`, or ad-hoc. The `/commit` skill is a thin dispatcher; this document is the single source of truth.

Other skills (`/ship`) that produce commits MUST follow these rules.

---

## Step 1 — Safety checks (abort if violated)

1. **Branch**: current branch is NOT `main` or `dev`. If it is, STOP and ask the user to branch off.
2. **Sensitive files**: refuse to stage any of the following — warn the user and ask for explicit confirmation if they insist:
   - `.env`, `.env.local`, `.env.*` (except `.env.example`, `.env.test`)
   - Anything with `credential`, `secret`, `token`, `auth`, `.pem`, `.key`, `id_rsa` in the path
   - Large binaries (> 5 MB) unless clearly intended (e.g. fonts, checked-in images)
3. **Staging**: always stage files explicitly by name. NEVER use `git add -A` or `git add .` — those pull in accidental files.

---

## Step 2 — Message format

```
<type>(<optional-scope>): <subject>

<body — WHY, not WHAT; bullet points OK>
```

### Subject line

- `<type>`: one of `feat`, `fix`, `enhance`, `refactor`, `chore`, `docs`, `test`, `perf`, `ci`, `build`
- `<type>` MUST match the current branch prefix (branch `feat/x` → commit `feat: …`). `docs:` / `test:` commits that directly support the same change on a `feat/` or `fix/` branch are also OK.
- `<scope>` (optional): affected module / area in lowercase (e.g. `workflow-detail`, `adapter`, `agents`)
- `<subject>`: imperative mood, ≤ 72 chars, no trailing period, lowercase start preferred

### Body

- Explain WHY the change is needed, not what the diff already shows
- Bullet points are fine; keep lines ≤ 100 chars
- Reference issue / ticket IDs at the end if relevant
- Skip the body only for one-line trivial changes (e.g. typo fix)

---

## Step 3 — Forbidden trailers and flags

### No Co-Authored-By trailer

**Never add `Co-Authored-By: Claude …` (or any AI / tool co-author line) to commits in this repo.**

Why: the team wants commit history to reflect the human author only. Even if a slash-command template (e.g. the default `/commit`) includes a `Co-Authored-By` hint, OMIT it when generating the final message. Do not modify the template file itself unless the user asks.

Applies to: new commits, amendments, fixups, cherry-picks, and rebased commits.

### No hook-skipping flags

Do NOT use the following unless the user explicitly requests them in the same turn:

- `--no-verify` (skips pre-commit / commit-msg hooks)
- `--no-gpg-sign`
- `-c commit.gpgsign=false`

If a pre-commit hook fails, fix the underlying issue — do not bypass.

### No silent amends of pushed commits

Do NOT `git commit --amend` a commit that is already on `origin/*` unless the user explicitly asks. Fix forward with a new commit.

---

## Step 4 — Writing the message safely

Use a HEREDOC so newlines and quoting survive the shell:

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

- <body bullet 1>
- <body bullet 2>
EOF
)"
```

Never pass the full message via `git commit -m "line1\nline2"` — shell escape bugs silently collapse newlines.

---

## Step 5 — After commit

1. Run `git log --oneline -1` to show the user the resulting commit.
2. Do NOT push automatically unless the user asked. `/ship` handles the push; `/commit` alone does not.

---

## Checklist (pre-commit gate)

```
[ ] Branch is NOT main / dev
[ ] No .env / credential / large binary in staged files
[ ] Staged files listed explicitly — no `git add -A` or `git add .`
[ ] <type> matches branch prefix
[ ] Subject ≤ 72 chars, imperative, no trailing period
[ ] Body explains WHY, not WHAT
[ ] NO Co-Authored-By trailer
[ ] NO --no-verify / --no-gpg-sign flags (unless user asked)
[ ] Used HEREDOC for multi-line message
```

---

## Hard Rules

- Never add `Co-Authored-By:` trailers.
- Never `git add -A` or `git add .`.
- Never `--amend` a pushed commit without explicit user ask.
- Never skip hooks.
- Never commit `.env`, credentials, or private keys — warn and stop.
