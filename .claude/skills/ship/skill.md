---
name: ship
description: Full pre-PR gate for this project. Runs /verify (lint + unit + coverage >80% + build + sonar), then Playwright E2E, then /self-review, then /security-review. Only after ALL pass will it /commit, push, and open a PR against dev.
user_invocable: true
---

# Ship

Read **`docs/agents/skills/ship.md`** and execute the pipeline exactly as specified there. That document is the single source of truth — do not improvise, do not skip gates, do not reorder steps.

If the doc is missing or unreadable, STOP and tell the user — do not fall back to an older version of the rules.
