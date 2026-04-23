# Larnma — Agent Instructions

## Development Workflow (MANDATORY)

**Before starting ANY task**, read [`/docs/agents/workflow.md`](./docs/agents/workflow.md) — it is the single source of truth for the agent flow (Research → Plan → `/implement` → `/self-review` → `/ship`), task classification, critical rules, testing policy, and the pre-PR pipeline.

Do NOT skip steps. Do NOT start coding without reading the relevant context docs in [`/docs/agents/context/`](./docs/agents/context/) and the source code first.

## Critical rules (A1–A12)

Mirror of `workflow-service` — `/self-review` will block any violation.

- **A1** Always use `@/components/` — never use native HTML (`<button>`, `<input>`, `<dialog>`, `<form>`)
- **A2** No direct `@radix-ui/*` imports in `src/modules/` — wrap via `@/components/`
- **A3** Follow the Controller-View pattern for all feature modules (see `docs/agents/context/02-controller-view-pattern.md`)
- **A4** API calls go through `src/services/adapter/` only
- **A5** Use `type`, not `interface`
- **A6** `types.ts` is the single source of truth — never define types inline in hooks
- **A7** Views receive flat props only — no controller/store awareness
- **A8** Handler props use `Pick<GlobalState, ...>`
- **A9** Server Actions return `ActionResult<T>`
- **A10** Never execute user expressions in the browser
- **A11** Use `@/components/atom/button` + `variant`/`size` — never reinvent
- **A12** No `biome-ignore` comments — fix the code, not the rule. Exception: ask user first with written reason in commit body.

## Quick Links

- Setup / commands / stack → [`README.md`](./README.md)
- Agent flow + critical rules → [`docs/agents/workflow.md`](./docs/agents/workflow.md)
- Context docs (codebase, patterns, data, testing) → [`docs/agents/context/`](./docs/agents/context/)
- Skill playbooks (`/implement`, `/verify`, `/self-review`, `/ship`) → [`docs/agents/skills/`](./docs/agents/skills/)
- MVP spec → [`docs/mvp/mvp.md`](./docs/mvp/mvp.md) (authoritative product scope)
- Implementation plan → [`docs/superpowers/plans/2026-04-23-larnma-mvp.md`](./docs/superpowers/plans/2026-04-23-larnma-mvp.md)

## Larnma-specific notes

- **Two surfaces, one app** — `src/app/(caregiver)/*` vs `src/app/(elder)/*`. Shared components live under `src/components/`.
- **Elder session = device-bound cookie, no login**. Caregiver session = OTP + JWT cookies.
- **All external integrations are pluggable**:
  - `src/services/gemini/` — `GeminiAdapter` interface (mock by default)
  - `src/services/repository/` — `IRepository` interface (in-memory by default)
  - `src/services/payment/` + `src/services/food/` — mock modules
  - Push = SSE route handler, not Socket.IO
- **Thai-first**. Use `next-intl` keys from `messages/th.json` — never hard-code Thai strings in components.
