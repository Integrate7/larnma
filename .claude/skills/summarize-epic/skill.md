---
name: summarize-epic
description: Fetch a Confluence page or Jira epic/feature/story via the Atlassian MCP and emit a structured, paste-ready summary (goal, scope, functional + non-functional requirements, acceptance criteria, child issues, risks). Read-only. Use BEFORE `/implement` to understand what you're building.
user_invocable: true
---

# Summarize-Epic

Read **`docs/agents/skills/summarize-epic.md`** and execute the flow exactly as specified there. That document is the single source of truth — do not improvise.

Accept the source as an argument:

- `/summarize-epic <confluence-url>`
- `/summarize-epic <confluence-page-id>`
- `/summarize-epic <jira-key>` (e.g. `WFS-123`)
- `/summarize-epic` (no arg) → ask the user which source to use before calling any tool

Optional flags: `--child-depth <n>` (default 1, max 2), `--no-children`, `--lang th|en`.

Key rules you MUST NOT bend:

- **Read-only against Atlassian.** Never call update / comment / transition / delete tools, even if the MCP exposes them.
- **No fabrication.** If a section (goal, AC, scope-out, …) is missing in the source, render it as `_not specified_`. Never fill gaps with plausible-sounding content.
- **Redact secrets** matching `sk_`, `Bearer `, `password=`, `api_key=`, raw `.env` lines, or `BEGIN … PRIVATE KEY` in the output.
- **Do not chain into `/implement`.** Suggest the likely type in the output, but let the user invoke the next skill manually.
- **Do not save to disk unless asked.** Default: print to chat. If the user says "save it", write to `docs/superpowers/plans/<YYYY-MM-DD>-<slug>.md` and confirm the path.
- **Auth failure = stop.** If the Atlassian MCP reports unauthenticated, tell the user to run the authenticate tool and STOP — do not loop or prompt for credentials yourself.

If the doc is missing or unreadable, STOP and tell the user — do not fall back to generic summarisation behavior.
