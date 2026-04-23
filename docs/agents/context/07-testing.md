# Testing (Agent Reference)

Two tiers: **Jest** for unit/integration (jsdom), **Playwright** for end-to-end (real Chromium against a running Next dev server). Coverage is a hard gate — `/verify` and `/ship` will fail below 80 %.

---

## 1. Jest (unit)

### Layout

Tests live in `__tests__/` folders beside the source they cover:

```
src/modules/dashboard/controller/hooks/
├── globalState.ts
├── __tests__/globalState.test.ts
├── handler.ts
├── __tests__/handler.test.ts
└── …

src/services/guards/
├── guards.ts
├── serverAuth.ts
└── __tests__/{guards,serverAuth}.test.ts
```

### Config (`jest.config.ts`)

- Uses `next/jest` → handles TS + SWC + CSS + path aliases for you
- `testEnvironment: 'jsdom'`
- `setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']`
- Module aliases: `@/*` → `src/*`
- `transformIgnorePatterns` includes `uuid`, `next-intl`, `use-intl`, `jose` (ESM-only packages)
- Coverage provider `v8`; collection ignores: types, `index.ts`, `page.tsx`, `layout.tsx`, `error.tsx`, `modules/**/views/**`, `modules/**/*Page.tsx`, `modules/**/controller/controller.ts`, `providers/**`, `i18n.ts`

### Coverage gate — hard 80 %

```
coverageThreshold.global: { branches: 80, functions: 80, lines: 80, statements: 80 }
```

`/verify` runs `npm run test:coverage` and fails the whole gate if any metric dips below 80 % for a **changed** file. This means: when you add a new hook, you add its test in the same PR.

### Global mocks (`jest.setup.ts`)

Baked-in mocks so you don't need to re-stub every test file:

| Mock | Effect |
|---|---|
| `'uuid'` | `v4()` returns deterministic `'test-uuid-1'`, `'test-uuid-2'`, … |
| `'next-intl'` | `useTranslations()` returns `(key) => key` — assertions see the key |
| `'next-intl/server'` | same for RSC helpers |
| `ResizeObserver`, `matchMedia`, `TextEncoder/Decoder`, `Request` | polyfilled for jsdom |
| `@testing-library/jest-dom` | extends expect with `toBeInTheDocument`, etc. |

### Writing a hook test

```ts
// src/modules/register/controller/hooks/__tests__/globalState.test.ts (shape)
import { renderHook, act } from '@testing-library/react'
import { useRegisterGlobalState } from '../globalState'

test('nextStep advances the step index', () => {
  const { result } = renderHook(() => useRegisterGlobalState())
  expect(result.current.state.step).toBe(0)
  act(() => result.current.nextStep())
  expect(result.current.state.step).toBe(1)
})
```

### Writing a route handler test

```ts
// src/app/api/caregivers/me/__tests__/route.test.ts (shape)
import { GET } from '../route'
import { __setRepository, createInMemoryRepository } from '@/services/repository'

beforeEach(() => __setRepository(createInMemoryRepository()))

test('returns 401 without a session cookie', async () => {
  const res = await GET(new Request('http://x/api/caregivers/me') as any)
  expect(res.status).toBe(401)
})
```

For authenticated routes, call `issueCaregiverSession({ userId })` to get a real JWT and attach it via `Request` headers — see `src/app/api/elder/me/__tests__/route.test.ts` and `src/services/guards/__tests__/guards.test.ts` for working patterns.

### Commands

```bash
npm test                        # all tests (no coverage output)
npm run test:watch              # watch mode
npm run test:coverage           # full run + coverage gate
npm test -- path/to/file.test.ts                   # single file
npm test -- -t 'advances the step'                 # single test name
```

---

## 2. Playwright (E2E)

### Layout

```
e2e/
├── playwright.config.ts
├── tests/
│   ├── register.spec.ts         # Caregiver OTP + profile wizard + QR
│   ├── invite.spec.ts           # Secondary caregiver accepts invite
│   ├── pair.spec.ts             # Elder scans QR, gets device session
│   ├── pdpa.spec.ts             # Consent capture
│   ├── voice-hungry.spec.ts     # Elder says 'หิว' → caregiver sees notification, orders food, elder gets 'order_delivered'
│   ├── voice-danger.spec.ts     # Elder says 'ช่วย' → critical notification + escalation path
│   └── profile-edit.spec.ts     # Caregiver edits elder allergies + conditions
├── pages/                        # Page Object Models
│   ├── dashboardPage.ts
│   ├── elderHomePage.ts
│   └── registerPage.ts
└── helpers/
    ├── reset.ts                  # resetServerState(baseURL) — POST /api/test-reset
    └── seed.ts                   # full test fixtures: loginCaregiver / createElder / createPairingQr / sendAudio / …
```

### Config

- `testDir: './tests'`
- Serial: `fullyParallel: false`, `workers: 1` (shared in-memory repo in dev server)
- Base URL: `http://localhost:${PORT}` where `PORT` defaults to `3100`
- Auto-starts `next dev --turbo -p ${PORT}` with `cwd: '..'` and `reuseExistingServer: !CI`
- Browser permissions: `microphone`, `camera`, `notifications` pre-granted
- Retries: 1 on CI, 0 local
- Artifacts: HTML + JSON + JUnit reports; screenshots and video on failure

### Golden path for a new spec

```ts
import { test, expect } from '@playwright/test'
import { resetServerState } from '../helpers/reset'
import { seedPrimaryAndElder } from '../helpers/seed'

test.describe('my flow', () => {
  test.beforeEach(async ({ baseURL }) => {
    await resetServerState(baseURL!)      // fresh in-memory repo
  })

  test('does the thing', async ({ page, baseURL, context }) => {
    const { ctx, fixture } = await seedPrimaryAndElder(baseURL!)
    // ... navigate, assert, mutate …
  })
})
```

### The seed helper toolbox (`e2e/helpers/seed.ts`)

The MVP has zero real infra, so every spec can **pre-load state via API** instead of driving the whole UI. Use these:

- `makeSeedContext(baseURL)` → `{ baseURL, api: APIRequestContext }`
- `resetServer(ctx)` → POST `/api/test-reset`
- `loginCaregiver(ctx, phone)` — OTP send + verify with mock OTP `'123456'` — leaves caregiver session cookies on the API context
- `setCaregiverName(ctx, name)`
- `grantDefaultConsents(ctx)` — audio_ai + health_data = true, marketing = false
- `createElder(ctx, input)` → elder id
- `createPairingQr(ctx, elderId)` → `{ token, exp }`
- `consumePairingWithContext(context, baseURL, token)` — mounts device cookies onto a *browser* context
- `sendAudio(ctx, baseURL, keyword)` → `{ mood, eventId }`
- `createInvite(ctx, elderId)` → `{ token, url }`
- `copyCookies(sourceApi, targetBrowserCtx, baseURL)` — transfer session cookies between contexts
- `seedPrimaryAndElder(baseURL, overrides?)` — the big one: reset → login → consent → create elder → generate pairing QR. Returns `{ ctx, fixture: { caregiverPhone, elderPhone, elderId, pairingToken } }`

### Mock OTP

The mock OTP in dev is always **`123456`**. Don't type it into E2E tests — seed through `loginCaregiver(ctx, phone)` instead, which takes the returned `ref` and verifies it.

### Selector priority

1. `data-testid` — add one whenever a test needs a stable handle
2. `role=…` / `aria-label` — accessible by construction
3. Text content — fine for elder-surface screens where Thai copy is stable
4. CSS classes — last resort

### Commands

```bash
npm run test:e2e                # headless
npm run test:e2e:headed         # opens chromium
npm run test:e2e:ui             # interactive time-travel UI
npm run test:e2e:report         # open last HTML report
```

---

## 3. Dev-only test endpoints

These live under `src/app/api/test-*/route.ts` and return 404 when `NODE_ENV === 'production'`:

- `POST /api/test-reset` — `__setRepository(createInMemoryRepository())` + `__setGeminiAdapter(createMockGeminiAdapter())` + `resetEventBus()`
- `POST /api/test-seed` — same reset, then seeds one caregiver + one elder + one pairing + sample events, and **sets session cookies** on the response so the caller is logged in without going through OTP

Use `/api/test-reset` at the start of every E2E test. Reach for `/api/test-seed` only when you want a shortcut to a logged-in dashboard without asserting the registration flow.

---

## 4. What to test — the minimum bar

Before marking a PR ready:

| Layer | Required tests |
|---|---|
| Services (`gemini`, `guards`, `jwt`, `auth`, `otp`, `repository`, `eventBus`, `menu`, `notifications`, `orderLifecycle`) | Unit tests with happy path + at least one error path |
| Hooks (`globalState`, `handler`, `queryHandler`, `formHandler`) | Unit tests — render with `renderHook`, assert on mutator calls |
| API routes | Unit tests — construct a `Request`, call the exported `GET`/`POST` directly, assert status + body |
| UI flows that cross multiple screens | Playwright spec in `e2e/tests/` |

Coverage-excluded files (pages, layouts, `controller.ts` wiring) don't need unit tests — but if they break an E2E spec, add one that reproduces the bug first.

---

## 5. Common pitfalls

- **`uuid` IDs are deterministic in Jest** — if your assertion checks an id, use `test-uuid-1` (etc.) or `expect.stringMatching(/^test-uuid-\d+$/)`
- **Repository state leaks between tests** — reset it in `beforeEach`: `__setRepository(createInMemoryRepository())`
- **`getServerAuth` uses `next/headers`**, which only works inside the RSC render. Test guards via `requireCaregiver(req)` with a fake `NextRequest` instead
- **Playwright runs against dev Turbopack** — first `npm run test:e2e` on a cold repo can take ~30 s to compile. Let it finish before declaring a flake
- **`next-intl` is mocked in Jest** — assertions see the translation **key**, not the Thai/English string. This is intentional; assert on keys like `'pair.title'`
- **Never import `middleware.ts`** in a unit test — there isn't one, and adding one would break route-level guards in unexpected ways
- **`zod` schemas from `@/services/adapter/schemas/`** can be reused in tests to assert shape without re-typing

---

## 6. Quick checklist

```
[ ] Added a __tests__ folder next to new source files
[ ] Each hook has happy-path + at least one error test
[ ] Route handler has an auth-required + auth-missing case
[ ] Coverage for the changed file ≥ 80 % on all metrics
[ ] E2E spec added if a user-visible flow changed
[ ] beforeEach resets the repository
[ ] Selectors use data-testid or role=... before text/css
```
