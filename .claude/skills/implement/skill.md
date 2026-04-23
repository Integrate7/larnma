---
name: implement
description: Kick off an implementation task. Classifies the task type (feat/fix/enhance/refactor/chore/docs/test/perf/ci/build) with the user, checks the branch matches, then guides you through the right checklist. Use BEFORE writing any code.
user_invocable: true
---

# Implement

Read **`docs/agents/skills/implement.md`** and execute the flow exactly as specified there. That document is the single source of truth — do not improvise, do not skip the classification step.

If the user passed a type argument (e.g. `/implement feat` or `/implement fix`), skip the classification question and go straight to the branch check for that type.

If the doc is missing or unreadable, STOP and tell the user — do not fall back to an older version of the rules.
