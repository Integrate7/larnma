# E2E Tests (Playwright)

## Run

```
# All-in-one — Playwright starts its own dev server on :3100
npm run test:e2e
```

## Environment

`playwright.config.ts` loads `/.env.test` at the repo root and applies it as defaults
for the web server it spawns. Shell-exported vars always win, so you can override any
value (e.g. `JWT_SECRET=real npm run test:e2e`).

Required var for auth/OTP flows: `JWT_SECRET`. The tracked `.env.test` ships a dummy.

## Conventions

- Specs in `tests/`
- Page Object Models in `pages/`
- Selectors: prefer `data-testid` > role > stable text
- Reset in-memory state between specs via `POST /api/__test/reset`
