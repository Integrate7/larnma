# E2E Tests (Playwright)

## Run

```
# 1. Start dev server (separate shell)
npm run dev

# 2. Run E2E
npm run test:e2e
```

## Conventions

- Specs in `tests/`
- Page Object Models in `pages/`
- Selectors: prefer `data-testid` > role > stable text
- Reset in-memory state between specs via `POST /api/__test/reset`
