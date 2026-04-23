# Claude Code Hooks

Shared hook scripts for this project. `.claude/` is gitignored, so each teammate registers these hooks in their own local Claude Code settings (one-time setup).

## Available hooks

### `quality-gate.sh` — Stop hook

Runs after Claude finishes a turn. Short-circuits if no `src/**/*.ts(x)` production files are dirty. Otherwise runs:

1. `npm run lint` (Biome + tsc)
2. `npm run test:coverage` (jest enforces 80% via `coverageThreshold`)
3. `make sonar-scan` (only if `SONAR_TOKEN` is set)

Any failure → exit 2 → `asyncRewake` pokes Claude back with the error tail so it can fix before declaring done. Runs in background — you don't wait.

Self-review is **not** run automatically (Stop hooks can't use `agent` type). The success output reminds Claude to run `/self-review` manually.

## One-time setup (per teammate)

The `.claude/settings.local.json` snippet that registers this Stop-hook lives in **[`../README.md` §2.2](../README.md#22-register-the-stop-hook-quality-gate)** — copy it from there to avoid JSON drift.

Optional: export `SONAR_TOKEN` in your shell to include the SonarQube gate — otherwise step 3 is skipped silently.
