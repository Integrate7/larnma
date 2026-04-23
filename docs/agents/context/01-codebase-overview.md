# Codebase Overview (Agent Reference)

Larnma — หลานม่า — Thai-first, voice-first elder-care MVP. Two surfaces (caregiver + elder) in a single Next.js app, with pluggable external integrations so the MVP runs with zero real infra.

## Setup

### Prerequisites
- Node.js ≥ 20.9, npm ≥ 9, Git ≥ 2.30

### Quick Start
```bash
git clone <repository-url>
cd larnma
npm install
cp .env.example .env.local   # if present — MVP runs without env vars by default
npm run dev                  # → http://localhost:3000
```

### Environment Variables (all optional — mocks apply when missing)
```env
GEMINI_API_KEY=              # if set, the real GeminiAdapter is used; otherwise mock
JWT_SECRET=                  # session signing secret (dev default applied if missing)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (Next 16 + Turbopack) on `:3000` |
| `npm run build` | Production build (standalone output) |
| `npm run start` | Production server on `:8080` |
| `npm run lint` | Biome lint + `tsc --noEmit` |
| `npm run lint:fix` | Biome auto-fix |
| `npm test` | Jest unit tests |
| `npm run test:coverage` | Jest with coverage gate (≥ 80%) |
| `npm run test:e2e` | Playwright E2E (auto-starts dev server on `:3100`) |
| `npm run test:e2e:ui` | Playwright interactive UI |

---

## Tech Stack (exact versions matter)

| Technology | Version | Notes |
|------------|---------|-------|
| Next.js | 16.1.6 | App Router, Turbopack dev & build |
| React | 19.2 | Server Components + Client Components |
| TypeScript | 5.7 | Strict mode, `@/*` → `src/*` |
| next-intl | 4.8 | Thai-first i18n, default locale `th`, TZ `Asia/Bangkok` |
| Zod | 4.x | Request / response validation in `fetcher` and API routes |
| TanStack Query | 5.x | Query client in `Providers` (used sparingly; most state is local controller state) |
| Zustand | 5.x | Available but modules currently use `useState`-based controllers |
| react-hook-form | 7.x + `@hookform/resolvers` | Multi-step forms (register, elderProfile edit) |
| jose | 5.x | JWT sign/verify for cookie sessions |
| Leaflet + react-leaflet | 1.9 / 5 | Caregiver map view (`ElderMap` molecule) |
| `@zxing/browser` + `qrcode` | — | QR scanner / QR display for pairing |
| `@google/generative-ai` | 0.24 | Real Gemini adapter (mock used by default) |
| sonner | 2.x | Toast notifications |
| Tailwind CSS | 4.1 | Utility CSS + CSS variables in `styles/globals.css` |
| Biome | 2.3 | Linter + formatter (NOT ESLint / Prettier) |
| Jest 30 + Testing Library | — | Unit tests, jsdom env |
| Playwright | 1.57 | E2E tests under `e2e/` |

---

## Architecture — Two Surfaces, One App

```
Browser (elder device)            Browser (caregiver device)
   │                                 │
   ▼                                 ▼
src/app/elder/*                  src/app/caregiver/*  +  src/app/dashboard/*
(large targets, voice-first,     (lists, maps, feeds,
 device-bound cookie,             OTP + JWT cookies)
 no login screen)
   │                                 │
   └──────────────┬──────────────────┘
                  ▼
         src/modules/* (Controller-View)
                  ▼
         src/services/*
            adapter/   — fetch wrapper + Zod schemas + queryClient
            auth/      — issue/rotate caregiver + device sessions
            jwt/       — sign/verify, cookie helpers
            guards/    — requireCaregiver / requireDevice / checkPermission
            otp/       — mock SMS OTP (phone ↔ code)
            gemini/    — GeminiAdapter interface (mock or real)
            repository/— IRepository interface (in-memory default)
            eventBus/  — in-process pub/sub powering SSE
            menu/      — food catalog + allergy-aware recommender
            notifications/ — fan-out + escalation
            orderLifecycle/ — auto-advance order status (mock fulfilment)
                  ▼
           src/app/api/**/route.ts
         (read/write via repository,
          publish to eventBus, stream SSE)
```

### Push: SSE, not WebSocket
- Caregiver: `GET /api/events/stream` → `Content-Type: text/event-stream`, subscribes via `eventBus.subscribe(caregiverId, …)`
- Elder:    `GET /api/elder/events/stream` → subscribes via `eventBus.subscribeElder(elderId, …)`
- Heartbeat every 15 s. The client layer is just `new EventSource(url)` with JSON payloads.

---

## Directory Map

```
src/
├── app/                       # Next.js App Router (plain folders — no route groups)
│   ├── page.tsx               # Root — redirects based on session (caregiver → /dashboard, elder → /elder)
│   ├── layout.tsx             # Root layout: fonts + NextIntlClientProvider + Providers
│   ├── auth/callback/         # Google OAuth return
│   ├── register/              # Caregiver OTP + Google registration
│   ├── invite/[token]/        # Secondary caregiver accepts invite
│   ├── dashboard/             # Caregiver main screen
│   ├── caregiver/elders/[id]/ # Elder detail + /edit
│   ├── elder/                 # Elder surface (+ /food, /me, /pair)
│   ├── privacy/               # Static privacy page
│   └── api/                   # Route handlers (see "API Routes" below)
├── modules/                   # Feature modules — Controller-View
│   ├── dashboard/             # Caregiver dashboard
│   ├── elderHome/             # Elder mic-first home
│   ├── elderFood/             # Elder food order history + request
│   ├── elderMe/               # Elder read-only self profile
│   ├── elderProfile/          # Caregiver view/edit of an elder profile
│   ├── inviteLanding/         # Accept caregiver invite
│   ├── pair/                  # Elder scans QR, consumes pairing token
│   └── register/              # Caregiver multi-step signup
├── services/                  # All side effects live here (see "Services" below)
├── components/
│   ├── atom/                  # Radix-wrapped primitives — only place @radix-ui/* may be imported
│   └── molecule/              # Composed domain components (MicButton, ElderMap, QrScanner, …)
├── shared/
│   ├── helpers/               # cn (classnames), deviceFingerprint
│   └── types/                 # Domain entities + ActionResult + Mood/Intent/Role/Permission
├── providers/Providers.tsx    # Client: QueryClientProvider + Sonner Toaster
├── styles/globals.css         # Tailwind base + design tokens (CSS vars: --ink, --brand-ink, --rule, --danger, …)
└── i18n.ts                    # next-intl request config (locales ['th','en'], default 'th')

messages/
├── th.json                    # Primary — use these keys
└── en.json                    # Parity translations
```

No `middleware.ts` at project root — auth is enforced per-route via `guards` (see `context/05-auth-and-sessions.md`).

---

## API Routes (`src/app/api/**/route.ts`)

All handlers are Node runtime; most take `NextRequest` and return `NextResponse.json(...)`.

| Path | Methods | Purpose | Guard |
|---|---|---|---|
| `/api/audio` | POST | Upload elder audio → Gemini analyse → create `AudioEvent` → fan-out notifications | `requireDevice` |
| `/api/events` | GET | Caregiver's 50 most recent events + notifications | `requireCaregiver` |
| `/api/events/stream` | GET | SSE push of `DashboardEvent` (audio / notification / ack / order / point / heartbeat) | `requireCaregiver` |
| `/api/elder/events/stream` | GET | SSE push of `ElderEvent` (order_delivered / heartbeat) | `requireDevice` |
| `/api/elder/me` | GET | Current elder's profile | `requireDevice` |
| `/api/elder/location` | POST | Elder submits geolocation | `requireDevice` |
| `/api/elder/food/menus` | GET | Personalised menu suggestions (allergy + condition aware) | `requireDevice` |
| `/api/elder/food/request` | POST | Elder-initiated food request (before caregiver confirms) | `requireDevice` |
| `/api/auth/google` | GET | Start Google OAuth | — |
| `/api/auth/google/callback` | GET | Google OAuth return → issue caregiver session | — |
| `/api/auth/otp/send` | POST | Send mock SMS OTP | `checkOriginAllowed` |
| `/api/auth/otp/verify` | POST | Verify OTP → issue caregiver session | `checkOriginAllowed` |
| `/api/auth/logout` | POST | Clear cookies, revoke session | `requireCaregiver` |
| `/api/auth/refresh` | POST | Rotate access/refresh pair | (refresh cookie) |
| `/api/caregivers/me` | GET | Caregiver profile | `requireCaregiver` |
| `/api/elders` | GET | Paired elders | `requireCaregiver` |
| `/api/elders/[id]` | GET / PATCH | Elder detail / edit profile | `requireCaregiver` + `checkPermission('edit_elder_profile')` on PATCH |
| `/api/elders/location` | GET | Latest location for all paired elders | `requireCaregiver` |
| `/api/menus` | GET | Full `MENU_CATALOG` | — |
| `/api/orders` | POST | Caregiver orders food for an elder based on an `AudioEvent` | `requireCaregiver` + `pay_food_orders` |
| `/api/orders/[id]` | PATCH | Advance order status / mark paid | `requireCaregiver` |
| `/api/pairings/qr` | POST | Generate a short-lived invite token + QR payload | `requireCaregiver` |
| `/api/pairings/consume` | POST | Elder device consumes QR token → create pairing → issue device session | — (device fingerprint in body) |
| `/api/pairings/[id]` | PATCH | Update pairing permissions (primary-only) | `requireCaregiver` + `requirePrimary` |
| `/api/invites` | POST | Caregiver invites secondary caregiver | `requireCaregiver` + `invite_caregivers` |
| `/api/invites/[token]` | GET | Fetch invite summary | — |
| `/api/invites/[token]/accept` | POST | Secondary caregiver accepts | `requireCaregiver` |
| `/api/notifications/[id]/ack` | POST | Ack / lock a notification (only one caregiver wins the lock) | `requireCaregiver` |
| `/api/points/me` | GET | Current point balance | `requireCaregiver` |
| `/api/consents` | POST | Record consent (audio_ai / health_data / marketing) | `requireCaregiver` or `requireDevice` |
| `/api/test-seed` | POST | **Dev/test only** — reset repo + seed deterministic data + set cookies | NODE_ENV ≠ production |
| `/api/test-reset` | POST | **Dev/test only** — reset repository, Gemini adapter, event bus | NODE_ENV ≠ production |

---

## Component Usage Rules

**NEVER use native HTML** (`<button>`, `<input>`, `<dialog>`, `<form>`) — always use `@/components/atom/*`.
**NEVER import from `@radix-ui/*`** in `src/modules/` — only `src/components/atom/*` may. (Rules A1–A2.)

### Hierarchy

```
@radix-ui/*  (wrapped ONLY by atoms)
   │
   ▼
src/components/atom/*   — Button, Input, Label, Dialog, RadioGroup, Checkbox, Switch, Textarea,
                          Card, Badge, Avatar, Skeleton
   │
   ▼
src/components/molecule/* — domain components that compose atoms
   │
   ▼
src/modules/*, src/app/* — only import from @/components/*
```

### Atoms (`src/components/atom/`)

`avatar`, `badge`, `button`, `card`, `checkbox`, `dialog`, `input`, `label`, `radioGroup`, `skeleton`, `switch`, `textarea`.

All expose `variant` / `size` props via `class-variance-authority`. Use `size="xl"` for elder-surface CTAs (rule of thumb: ≥ 56 px tappable).

### Molecules (`src/components/molecule/`)

| Component | Purpose |
|---|---|
| `MicButton` | Large mic trigger with states `idle / listening / uploading / error` + waveform |
| `ElderMap` | Leaflet map + pins for paired elders' last known locations |
| `QrDisplay` | Render pairing QR from payload URL (qrcode lib) |
| `QrScanner` + `QrImageUpload` | Live scan via camera (zxing) + fallback image upload |
| `MoodChip` | Mood badge with emoji + Thai label (`MOOD_LABEL_TH`) |
| `PriorityBadge` | Notification priority styling (`critical / high / normal / log`) |
| `ConsentToggle` | Switch + legal label for PDPA consent |
| `OtpInput` | 6-digit input with auto-advance |
| `Stepper` | Registration wizard indicator |
| `FormField` | Label + error + hint wrapper around an Input |

---

## Shared Types (`src/shared/types/`)

Everything re-exported from `index.ts`:

- `actionResult.ts` — `ActionResult<T> = { success: true; data: T; error: null } | { success: false; data: null; error: string; errorCode?: string }`
- `entities.ts` — `User`, `ElderProfile`, `Medication`, `Contact`, `Pairing`, `OtpChallenge`, `Session`, `DeviceSession`, `AudioEvent`, `Notification`, `Order`, `Invite`, `PointEntry`, `Consent`, `ElderLocation`
- `role.ts` — `Role = 'elder' | 'caregiver'`
- `intent.ts` — `INTENTS = ['HUNGRY','PAIN','DANGER','LONELY','CHAT','UNKNOWN']`, `Intent`
- `mood.ts` — `MOODS = ['DANGER','PAIN','HUNGRY','LONELY','SAD','HAPPY','NORMAL']`, `Priority = 'critical'|'high'|'normal'|'log'`, `MOOD_PRIORITY`, `MOOD_LABEL_TH`
- `permission.ts` — `PERMISSION_KEYS`, `PermissionKey`, `Permissions`, `DEFAULT_PRIMARY_PERMISSIONS`, `DEFAULT_SECONDARY_PERMISSIONS`

---

## Critical Rules

See `CLAUDE.md` for the full A1–A12 list. The high-leverage ones:

- **A1** Use `@/components/` — never native HTML
- **A2** No `@radix-ui/*` imports in `src/modules/`
- **A3** Controller-View pattern (see `02-controller-view-pattern.md`)
- **A4** API calls go through `src/services/adapter/fetcher.ts` (client) or `src/services/repository` (server)
- **A9** Server Actions and API responses both use `ActionResult<T>`-shaped JSON
- **A10** Never `eval`/execute user expressions in the browser

---

## Feature Status (MVP)

### Implemented
- Caregiver auth: Google OAuth + phone OTP + JWT cookie sessions with refresh rotation
- Elder device session (no login) — bound to `deviceFingerprint`
- QR pairing flow: caregiver generates QR → elder scans → consume → device session issued
- Secondary caregiver invites with permission scoping (`DEFAULT_SECONDARY_PERMISSIONS`)
- Elder home voice-first capture → upload → Gemini mock analyse → AudioEvent → fan-out to caregivers
- Caregiver dashboard: SSE event feed, mood counts, notifications ack (with lock), elder map, food order trigger
- Food ordering: menu catalog + allergy-safe recommendations + caregiver-initiated order + mock lifecycle advancement + elder delivery notification
- PDPA consent capture (audio_ai, health_data, marketing)
- Elder profile CRUD (conditions, medications, allergies, contacts)
- Points (pay-on-behalf economy — MVP stub)
- Thai-first i18n (`th` default, `en` parity)

### Not in MVP
- Real SMS / real payment — both are mocks
- Push notifications (web push)
- Offline support beyond in-memory repo
- Elder-to-elder social features

---

## Key Design Decisions

- **Pluggable boundaries** — every external dep (Gemini, repo, payment/food) sits behind an interface with a mock default. See `06-integrations.md`.
- **SSE, not WebSocket** — cheaper infra, survives most proxies, fits our read-mostly push needs.
- **Controller-View, not MVC/Redux** — local `useState` inside `globalState.ts` keeps each module self-contained; Zustand is available but unused in current modules.
- **In-memory repo by default** — `IRepository` implementation in `inMemoryRepository.ts` is the ground truth; swap via `__setRepository()` to go to Postgres later without touching routes or modules.
- **Thai-first** — never hard-code Thai strings in components; use `useTranslations()` keys from `messages/th.json`. See `08-i18n-thai-first.md`.
- **Elder surface ≠ caregiver surface** — large targets, no nav chrome, no login screen. See `09-elder-caregiver-surfaces.md`.
- **Biome over ESLint** — faster, fewer moving parts. No `biome-ignore` (rule A12).
