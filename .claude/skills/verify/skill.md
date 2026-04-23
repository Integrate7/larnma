---
name: verify
description: Fast pre-commit quality gate — lint, unit tests with hard coverage gate (>80%), build, SonarQube. Stops on first failure. Does NOT run E2E — use /ship for the full pre-PR gate.
user_invocable: true
---

# Verify

Read **`docs/agents/skills/verify.md`** and execute the pipeline exactly as specified there. That document is the single source of truth — do not improvise.

If the doc is missing or unreadable, STOP and tell the user — do not fall back to an older version of the rules.
