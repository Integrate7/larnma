---
name: review-pr
description: Review a GitHub pull request against this project's rules (A1–E5 from self-review + F1–F4 PR-meta checks). Uses `gh` to fetch PR diff/metadata. Reports blocking + advisory issues; never approves/merges — humans do. Use when reviewing a teammate's PR.
user_invocable: true
---

# Review-PR

Read **`docs/agents/skills/review-pr.md`** and execute the flow exactly as specified there. That document is the single source of truth — do not improvise.

Accept the PR reference as an argument (`/review-pr 123` or `/review-pr <url>`). If missing, ask the user for it before calling `gh`.

Key rules you MUST NOT bend:

- Never run `gh pr review --approve` — only humans approve.
- Never run `gh pr merge` — only humans merge.
- Never post the review to GitHub without explicit user consent in the same turn.
- Redact any detected secret values as `<REDACTED:<type>>` before posting.
- Check commits for `Co-Authored-By: Claude …` trailers (rule from [`commit.md`](../../../docs/agents/skills/commit.md)) — flag as blocking if found.

If the doc is missing or unreadable, STOP and tell the user — do not fall back to generic PR review behavior.
