# Larnma — หลานม่า

> เสียง + AI สำหรับผู้สูงอายุและบุตรหลาน (SCB Tech X Hackathon — Social Impact)

**Tagline:** "กดปุ่มเดียว พูดธรรมดา หลานอยู่ข้างคุณเสมอ"

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack) · React 19 · Tailwind 4 · shadcn/ui (Radix wrapped) |
| State | Zustand · React Query · React Hook Form + Zod |
| i18n | next-intl (Thai primary) |
| Backend | Next.js Route Handlers · JOSE (JWT) · In-memory repository (pluggable → Prisma) |
| AI | `GeminiAdapter` interface — `MockGeminiAdapter` by default (keyword heuristics); real Gemini swappable |
| Push | Server-Sent Events via `ReadableStream` route handler |
| QR | `qrcode` (generate) · `@zxing/browser` (scan) |
| Testing | Jest 30 + Testing Library (unit, coverage ≥ 80%) · Playwright (E2E) |
| Lint | Biome 2 |

See [`docs/plans/2026-04-23-larnma-mvp.md`](./docs/plans/2026-04-23-larnma-mvp.md) for the full implementation plan and [`docs/mvp/mvp.md`](./docs/mvp/mvp.md) for the product spec.

---

## Setup

```bash
make install      # npm install
make dev          # next dev on :3000
```

## Commands

```bash
make lint           # biome lint + tsc --noEmit
make lint-fix       # auto-fix biome
make test           # jest
make test-coverage  # jest --coverage (80% threshold)
make e2e            # playwright
make build          # next build
```

## Project structure

```
src/
├── app/
│   ├── (caregiver)/        # Caregiver routes: /register, /dashboard, /elders/[id]/...
│   ├── (elder)/            # Elder routes: /, /pair, /me
│   ├── api/                # Route handlers (auth, elders, pairings, audio, events, ...)
│   └── layout.tsx
├── components/
│   ├── atom/               # button, input, label, dialog, ... (wrap Radix)
│   └── molecule/           # otpInput, stepper, qrDisplay, micButton, ...
├── modules/                # Feature modules — Controller-View pattern
│   ├── auth/
│   ├── register/
│   ├── dashboard/
│   └── ...
├── services/
│   ├── adapter/            # fetcher, queryClient, cookie, jwt
│   ├── gemini/             # GeminiAdapter interface + MockGeminiAdapter
│   ├── repository/         # IRepository + InMemoryRepository
│   ├── otp/                # OTP send + verify
│   ├── guards/             # session guards
│   └── notifications/      # fan-out + escalation
├── shared/types/           # ActionResult, Mood, Intent, Role, Permission
├── providers/              # I18nProvider, QueryProvider, NotificationProvider
├── stores/                 # Zustand stores
└── styles/globals.css

e2e/                        # Playwright specs + POMs
docs/
├── agents/                 # workflow.md + context/ + skills/ + hooks/
├── plans/                  # implementation plans (per feature PR)
└── mvp/                    # MVP spec
```

## Elder vs Caregiver session

- **Caregiver** — Phone + OTP (mock `123456`) → HttpOnly `access` (15 min) + `refresh` (30 d) cookies. JWT signed with `jose`.
- **Elder** — Scans caregiver's QR → HttpOnly `device_session` (365 d) cookie bound to device fingerprint. No login.

## Pluggable mocks (swap to production without touching call sites)

| Adapter | Interface | Default impl | Swap via |
|---|---|---|---|
| AI | `GeminiAdapter` | `MockGeminiAdapter` (keyword heuristics) | `GEMINI_ADAPTER=real` + env keys |
| Data | `IRepository` | `InMemoryRepository` | replace export in `src/services/repository/index.ts` with Prisma impl |
| Payment | `PaymentAdapter` | `MockPaymentAdapter` | same pattern |
| Food | `FoodAdapter` | `MockFoodAdapter` (static menu) | same pattern |

## Coverage + E2E policy

- Unit tests co-located under `__tests__/`. Jest threshold = 80% on branches / functions / lines / statements.
- E2E under `e2e/tests/` — Playwright. See plan §Tests for the 7 critical-path specs.
