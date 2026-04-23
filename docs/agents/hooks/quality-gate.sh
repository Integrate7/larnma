#!/usr/bin/env bash
# Stop-hook quality gate: lint -> test+coverage -> build -> sonar.
# Fires on every Stop; short-circuits if no src/ ts(x) files are dirty.
# Exit 2 -> asyncRewake pokes the model with stdout as feedback.

set -uo pipefail

REPO="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$REPO"

# Skip unless there are uncommitted changes to production TS/TSX under src/
CHANGED=$(git status --porcelain -- src/ 2>/dev/null \
  | awk '{print $NF}' \
  | grep -E '\.(ts|tsx)$' \
  | grep -vE '\.(test|spec|d)\.(ts|tsx)$' \
  | grep -vE '(^|/)(index|types)\.(ts|tsx)$' || true)

[ -z "$CHANGED" ] && exit 0

run_step() {
  local label="$1"; shift
  STEP_OUTPUT=$("$@" 2>&1)
  STEP_RC=$?
  if [ $STEP_RC -ne 0 ]; then
    cat <<EOF
Quality gate FAILED at step: $label

--- output tail ---
$(echo "$STEP_OUTPUT" | tail -40)
-------------------

Changed files that triggered this check:
$CHANGED

Fix the issue above, then the next Stop will re-verify automatically.
EOF
    exit 2
  fi
}

run_step "lint (biome + tsc)"       npm run lint
run_step "unit tests + coverage 80%" npm run test:coverage
run_step "next build"                npm run build

if [ -n "${SONAR_TOKEN:-}" ]; then
  run_step "sonarqube scan" make sonar-scan SONAR_TOKEN="$SONAR_TOKEN"
  SONAR_MSG=" + sonar"
else
  SONAR_MSG=" (sonar skipped: SONAR_TOKEN not set)"
fi

cat <<EOF
Quality gate PASSED: lint + tests/coverage + build$SONAR_MSG.

Reminder: run /self-review before committing to check CLAUDE.md compliance.
EOF
exit 0
