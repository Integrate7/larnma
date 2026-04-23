---
name: commit
description: Author a git commit that follows the project's commit rules. Enforces <type>(<scope>): <subject> format, matches branch prefix, blocks sensitive files, blocks --no-verify, and NEVER adds Co-Authored-By trailers. Use instead of raw `git commit` for any commit on this repo.
user_invocable: true
---

# Commit

Read **`docs/agents/skills/commit.md`** and execute the flow exactly as specified there. That document is the single source of truth — do not improvise, do not shortcut the safety checks.

Key rules you MUST NOT bend:

- No `Co-Authored-By: Claude …` (or any AI co-author) trailer — ever.
- No `git add -A` / `git add .` — stage files explicitly by name.
- No `--no-verify`, `--no-gpg-sign`, or amending a pushed commit unless the user explicitly asks in the same turn.
- `<type>` in the subject MUST match the current branch prefix.

If a higher-level skill (e.g. `/ship`) invokes this skill, the same rules apply — they do not get an exception.

If the doc is missing or unreadable, STOP and tell the user — do not fall back to generic commit behavior.
