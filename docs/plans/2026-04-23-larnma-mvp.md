# Larnma MVP — Single-PR Implementation Plan

**Type:** `feat`
**Branch:** `feat/larnma-mvp`
**Date:** 2026-04-23
**Source spec:** `/Users/roj.wilai/Downloads/larnma/mvp.md` (read in full)
**Reference codebase:** `/Users/roj.wilai/Documents/scb tech x/workflow_builder/repos/workflow-service` (Next.js 16 + Controller-View pattern, copy conventions)

---

## Goal

Deliver the Larnma MVP as a single Next.js 16 PWA app serving BOTH the Elder and Caregiver experiences, with a working end-to-end slice of: OTP auth, caregiver register wizard, Elder profile CRUD, QR pairing (device-bound cookie), voice capture + mock-AI mood/intent analysis, Caregiver dashboard with live event feed, mock food ordering + points, emergency (DANGER) flow with first-click-wins lock, secondary-caregiver invite, and PDPA consent. **All production files ≥ 80% Jest coverage**, **Playwright E2E** covering the register + pairing + voice + dashboard critical path.

## Non-goals

- Real Gemini API integration — use a **pluggable mock** behind a `GeminiAdapter` interface (real integration is a one-line swap, but not this PR)
- Real payment gateway — `mock-payment` module returns simulated success
- Real food-delivery partner integration — `mock-food` module with static menu filtered by `conditions`
- Real WebSocket infrastructure — use **Server-Sent Events (SSE)** via Next.js route handlers (simpler, same UX, testable); Socket.IO can be swapped later
- Real Postgres + Prisma — use **in-memory repository layer** behind an `IRepository` interface (swap to Prisma later is a single-module change); this keeps tests hermetic and the PR reviewable. Schemas from the spec are documented for the future migration.
- Wake word detection (Porcupine) — Elder app uses tap-to-record only (spec §3.1 fallback)
- Gemma on-device offline (stretch in spec §3.7)
- Primary transfer + soft-delete restore (spec §3.10) — data model prepared, UI deferred
- Weekly mood chart, video call, medication reminder, fall detection (spec §12 future roadmap)
- Real audio storage / Supabase — audio is processed in-memory and discarded (satisfies PDPA 24h auto-delete trivially)

These exclusions are called out in the PR body. All are isolated behind adapter interfaces so Phase 2 is plug-in work, not rewrite.

## Context

### What exists today
- Empty repo: only `README.md` + `docs/` (with `docs/agents/` workflow + skill playbooks copied from workflow-service, and `docs/plans/` for this file).
- Branch: will be `feat/larnma-mvp` (currently `main` — user to run `git checkout -b feat/larnma-mvp` before coding starts).

### What we copy from workflow-service
- Toolchain: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 4 + shadcn/ui (Radix wrapped) + Biome + Jest + Playwright + next-intl
- Patterns: Controller-View (`globalState → queryHandler → handler` or `globalState → handler`), `types.ts` as single source of truth, `@/components/atom` wrappers over Radix, `src/services/adapter/` for all server calls, Zustand for global state, React Query for server state, Zod for schemas
- Project layout: `src/{app,components,modules,services,stores,providers,shared,config}`, `e2e/{pages,tests,helpers}`, `__tests__/` co-located with source
- Jest config: coverage threshold 80% on branches/functions/lines/statements, `collectCoverageFrom` excludes `types.ts` / `index.ts` / `__tests__` / `__mocks__` / `*.stories.*` / `*.d.ts`
- Lint rules: all 12 A-rules from `workflow-service/CLAUDE.md` §4.1 apply — no native HTML, no direct `@radix-ui/*` in modules, Controller-View mandatory, `type` not `interface`, etc.

### What is unique to larnma (not in workflow-service)
- Two distinct app surfaces under one Next.js project: `/elder/*` vs `/caregiver/*` route groups
- Device-bound session cookie for Elder (no login) vs JWT cookie for Caregiver (OTP login)
- QR code generation + scan (use `qrcode` npm for PNG data URL; Elder-side scan uses `@zxing/browser`)
- Audio capture (`MediaRecorder` API) + upload to `/api/audio`
- SSE push from server to Caregiver dashboard
- Thai-first UI (`next-intl` locale `th`), large-touch Elder screens (font 24–28px, high-contrast), Caregiver screens normal size
- PDPA consent screen with 3 toggles (2 required, 1 optional)

### Key references
- `/Users/roj.wilai/Downloads/larnma/mvp.md` — authoritative spec (12 sections)
- `/Users/roj.wilai/Downloads/larnma/prototype/*.jsx` — existing UI prototypes (`app.jsx`, `caregiver.jsx`, `elder.jsx`, `profile.jsx`, `register.jsx`) — mine for visual patterns, do not copy as-is (they are not Controller-View)
- `/Users/roj.wilai/Downloads/larnma/Larnma Prototype.html` + `Larnma Spec.html` — visual reference if the jsx is ambiguous

---

## Approach

### Architectural decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Backend | Next.js Route Handlers (`src/app/api/**/route.ts`) — not a separate NestJS service | Spec says NestJS but hackathon scope + single PR needs one runtime. Guards + Zod schemas give us the equivalent hygiene. |
| Data layer | In-memory `InMemoryRepository` behind `IRepository` interface | Hermetic tests, zero infra, future Prisma swap = one file |
| AI | `GeminiAdapter` interface with `MockGeminiAdapter` returning deterministic mood/intent from keyword heuristics | Keeps tests hermetic + stable; real Gemini is one config flip |
| Push | Server-Sent Events via `ReadableStream` in a route handler | Simpler than Socket.IO, works with cookie auth trivially |
| Auth | HttpOnly cookie JWT (access 15m + refresh 30d) for caregivers; separate HttpOnly `device_session` cookie (365d) for elders | Matches spec §5.1 exactly |
| OTP | Mock code `123456`, rate-limit 3/10min, lock 30min — persisted in `otp_challenges` in-memory | Matches spec §3.9.7 |
| QR pairing | `POST /api/pairings/qr` returns `{ qrDataUrl, token, exp }`; token = JWT exp 15m one-time | Matches spec §3.9.6 |
| Invite | JWT exp 24h, one-time, `elder_id + inviter_id` embedded | Matches spec §3.9.6 |
| State | Zustand per module for global state; React Query for `/api/*` calls | Mirrors workflow-service |
| i18n | `next-intl` with `th` as primary, `en` stub | Spec is Thai-first |
| PWA | `next-pwa` or manual `manifest.webmanifest` + service worker | Spec §5 — "PWA (installable)" |

### Order of execution (9 tracks)

```
Track 0 — Bootstrap (tooling)
  ├─ package.json, tsconfig, biome.json, jest.config, playwright.config
  ├─ next.config.ts (PWA manifest + rewrites), postcss.config, Tailwind 4 setup
  ├─ CLAUDE.md + AGENTS.md (copy from workflow-service, adapt)
  └─ docker-compose.yml for sonar (optional, skipped if SONAR_TOKEN absent)

Track 1 — Shared primitives
  ├─ @/components/atom/{button,input,label,dialog,card,checkbox,radio,select,toast,skeleton,...}
  ├─ @/components/molecule/{otpInput,formField,stepper,consentToggle,qrDisplay,micButton,...}
  ├─ src/shared/types — ActionResult<T>, Mood, Intent, Role, Permission
  └─ src/services/adapter — fetcher, config, queryClient, cookieSession

Track 2 — Auth module
  ├─ src/modules/auth/{otp,session} (Controller-View)
  ├─ API: /api/auth/otp/send, /api/auth/otp/verify, /api/auth/refresh, /api/auth/logout
  ├─ JWT sign/verify (jose), cookie helpers
  └─ Guard: requireCaregiverSession, requireDeviceSession

Track 3 — Caregiver Register Flow A (screens 1–11)
  ├─ src/app/(caregiver)/register/page.tsx (wizard)
  ├─ src/modules/register/{controller,views} with formHandler pattern
  ├─ API: /api/caregivers, /api/elders, /api/consents, /api/pairings/qr
  └─ Review & Confirm screen + QR display

Track 4 — Elder App (pairing + home + profile)
  ├─ src/app/(elder)/page.tsx (big mic button)
  ├─ src/app/(elder)/pair/page.tsx (@zxing/browser scanner)
  ├─ src/app/(elder)/me/page.tsx (ข้อมูลของฉัน, read-only)
  ├─ API: /api/pairings/consume, /api/elder/me, /api/audio
  └─ MediaRecorder integration + upload

Track 5 — AI + Audio pipeline
  ├─ src/services/gemini/{interface,mock} — GeminiAdapter
  ├─ src/modules/audio/controller — upload + transcript + save audio_event
  ├─ Mood→Priority mapping (DANGER/PAIN/SAD → noti; HUNGRY → food flow)
  └─ Menu recommender (filters by elder.conditions)

Track 6 — Caregiver Dashboard + SSE
  ├─ src/app/(caregiver)/dashboard/page.tsx
  ├─ src/modules/dashboard/{controller,views} — live feed, weekly mood
  ├─ API: /api/events/stream (SSE), /api/events (list)
  └─ Notification toast + browser Notification API opt-in

Track 7 — Emergency (DANGER) flow
  ├─ src/modules/emergency/ — ringtone, first-click-wins, 5-min escalate
  ├─ API: /api/notifications/:id/ack (first caller wins, others see "locked")
  └─ Auto-escalate cron via setInterval in a shared module (in-memory)

Track 8 — Food + Points (mocked)
  ├─ src/modules/food/ — menu suggest, order creation, mock lifecycle
  ├─ src/modules/points/ — wallet + history
  └─ API: /api/orders, /api/orders/:id/pay, /api/points/me

Track 9 — Invite + Profile Edit + Permissions
  ├─ src/modules/invite/ — generate, landing, accept
  ├─ src/modules/elderProfile/ — view + edit
  ├─ src/modules/permissions/ — Primary-only toggle UI
  └─ API: /api/invites, /api/invites/:token, /api/invites/:token/accept,
         /api/elders/:id (GET+PATCH), /api/pairings/:id/permissions
```

Tests are co-located (`__tests__/`) and written **as each file is created**, not batched at the end. E2E is written last per track but before moving to the next track.

---

## Tasks

Numbered so `/implement` checkpoints map cleanly. Each task has a test target.

### 0 — Tooling bootstrap
1. **`package.json` + deps** — Next 16, React 19, Tailwind 4, Biome, Jest 30, Playwright, next-intl, zustand, @tanstack/react-query, zod, react-hook-form, @hookform/resolvers, jose (JWT), qrcode, @zxing/browser, sonner, lucide-react, dayjs. Files: `package.json`
2. **TS + lint + test configs** — `tsconfig.json`, `biome.json`, `jest.config.ts`, `jest.setup.ts` (copy from workflow-service, trim unused mocks), `e2e/playwright.config.ts`
3. **Next config** — `next.config.ts` (App Router, turbo, PWA manifest), `postcss.config.mjs`, `src/styles/globals.css` (Tailwind 4 @theme), `public/manifest.webmanifest`, minimal service worker
4. **CLAUDE.md / AGENTS.md / README.md** — project-specific, reference `docs/agents/workflow.md`. README with setup + `make` targets (`make dev`, `make test`, `make e2e`, `make lint`, `make build`)
5. **Makefile** — parity with workflow-service
6. **Sanity test** — `src/__tests__/sanity.test.ts` asserts env is wired

### 1 — Shared primitives & adapter
7. **Atom components** — `button`, `input`, `label`, `dialog`, `card`, `checkbox`, `radio`, `select`, `toast` (sonner), `skeleton`, `textarea`, `avatar`, `badge`. Each: `component.tsx + types.ts + index.ts + __tests__/*.test.tsx`
8. **Molecule components** — `otpInput` (6-digit), `formField`, `stepper`, `consentToggle`, `qrDisplay`, `qrScanner`, `micButton`, `moodChip`, `priorityBadge`, `elderHeader`. Tests per file.
9. **Shared types** — `src/shared/types/{actionResult,mood,intent,role,permission,user,pairing}.ts`
10. **Adapter base** — `src/services/adapter/{config,fetcher,queryClient,cookie,jwt}.ts` — Zod-guarded fetcher returning `ActionResult<T>`
11. **i18n setup** — `src/i18n.ts`, `messages/th.json`, `messages/en.json`, `src/providers/I18nProvider.tsx`

### 2 — Auth module
12. **Types + Zod schemas** — `src/modules/auth/types.ts`, `src/services/adapter/schemas/auth.ts`
13. **In-memory repository** — `src/services/repository/{interface,inMemory,index}.ts` (otpChallenges, sessions, deviceSessions, users, elderProfiles, pairings, invites, audioEvents, notifications, orders, points, consents)
14. **OTP service** — `src/services/otp/{sendOtp,verifyOtp}.ts` (rate-limit, lock, one-time)
15. **JWT service** — `src/services/jwt/{sign,verify,cookies}.ts` (jose)
16. **Route handlers** — `src/app/api/auth/otp/send/route.ts`, `verify/route.ts`, `refresh/route.ts`, `logout/route.ts`
17. **Guards** — `src/services/guards/{requireCaregiver,requireDevice,requirePrimary,requirePermission}.ts`
18. **Auth module (Controller-View)** — `src/modules/auth/{controller/globalState,handler,queryHandler,views/{phoneInput,otpVerify},types,index}.ts`

### 3 — Register wizard (Flow A, screens 1–11)
19. **Register types + Zod schemas** — `src/modules/register/types.ts`, `adapter/schemas/register.ts`
20. **Caregiver + Elder + Consent APIs** — `/api/caregivers` (POST, GET /me), `/api/elders` (POST, GET, PATCH), `/api/consents` (POST)
21. **QR pairing API** — `/api/pairings/qr` (POST, caregiver-only)
22. **Register wizard shell** — `src/app/(caregiver)/register/page.tsx` + `src/modules/register/controller/{globalState,formHandler,handler,queryHandler}.ts`
23. **11 screen views** — welcome, phoneInput, otpVerify, caregiverProfile, pdpaConsent, elderBasic, elderHealth, elderEmergency, elderOptional, reviewSummary, qrDisplay — under `src/modules/register/views/`
24. **Stepper + validation** — per-screen Zod resolve, Thai error messages
25. **i18n keys** — all screen copy in `messages/th.json`

### 4 — Elder app (pairing + home + me)
26. **Elder layout** — `src/app/(elder)/layout.tsx` (large font, high contrast theme)
27. **Pair page** — `src/app/(elder)/pair/page.tsx` + `src/modules/pair/` — `@zxing/browser` scanner → POST consume
28. **Pairing consume API** — `/api/pairings/consume` (sets `device_session` cookie, fingerprint check)
29. **Home page** — `src/app/(elder)/page.tsx` — big mic button, state machine (idle/listening/uploading/done/error), fallback call-to-primary button when offline (`navigator.onLine`)
30. **Me page** — `src/app/(elder)/me/page.tsx` + `src/modules/elderMe/` — read-only profile, one-tap `tel:` call to primary caregiver
31. **Audio upload module** — `src/modules/audio/` — `MediaRecorder` controller, 30s max, silence detection
32. **Elder-side API** — `/api/elder/me` (GET, device-session auth)

### 5 — AI + audio pipeline
33. **Gemini adapter** — `src/services/gemini/{interface,mockGeminiAdapter,index}.ts` — returns `{transcript, intent, mood, confidence, summary, entities}` from deterministic keyword heuristics (e.g. "หิว"→HUNGRY, "เจ็บ"→PAIN, "ล้ม"/"ช่วย"→DANGER, silence→NORMAL)
34. **Audio route handler** — `/api/audio` (POST, multipart, device-session) → Gemini → save `audio_events` → fan-out to notifications → SSE broadcast
35. **Menu recommender** — `src/services/menu/recommend.ts` — filter static menu by `conditions` and `allergies`
36. **Mood→Priority mapper** — `src/services/notifications/fanout.ts` — see spec §3.3 table

### 6 — Caregiver dashboard + SSE
37. **SSE stream** — `/api/events/stream` (GET, caregiver session) — `ReadableStream`, heartbeat every 15s, emits on new notifications/audio_events for that caregiver's paired elders
38. **Events list API** — `/api/events` (GET, paginated)
39. **Dashboard module** — `src/modules/dashboard/{controller,views}` — `views/latestStatus.tsx`, `views/timeline.tsx`, `views/weeklyMood.tsx`
40. **Dashboard page** — `src/app/(caregiver)/dashboard/page.tsx`
41. **SSE React hook** — `src/services/adapter/hooks/useEventStream.ts` (EventSource w/ cookie auth, auto-reconnect)
42. **Browser Notification opt-in** — `src/providers/NotificationProvider.tsx`

### 7 — Emergency (DANGER) flow
43. **Notification ack API** — `/api/notifications/:id/ack` — first-click-wins via CAS on `locked_by_caregiver_id`
44. **Escalation timer** — `src/services/notifications/escalate.ts` — setInterval check every 30s, if unacked 5min → re-broadcast + set `escalated=true` on event
45. **DANGER toast** — `src/modules/emergency/` — ringtone (`<audio>` auto-play on permission), "ฉันจัดการ" button, locked state for others, "โทร 1669" button if escalated
46. **Elder app 1669 button** — appears on home screen when event unacked > 5 min

### 8 — Food + points
47. **Menu list API** — `/api/menus` (returns static items) + `/api/menus/recommend` (takes elder_id → filtered by conditions)
48. **Order APIs** — `/api/orders` (POST from HUNGRY event), `/api/orders/:id/pay` (mock payment), `/api/orders/:id` (GET, lifecycle)
49. **Order lifecycle mock** — `setInterval` moves order through `preparing → delivering → delivered` (10s each for demo), triggers point award on `delivered`
50. **Points API** — `/api/points/me` (GET balance + history)
51. **Food module** — `src/modules/food/{controller,views}` — noti-triggered dialog, 3 menu options, pay button
52. **Points module** — `src/modules/points/` — wallet UI, history list
53. **Elder noti on `delivered`** — "หลานสั่ง ข้าวผัดกะเพรา ให้แล้วนะคะ" (TTS via browser `speechSynthesis` + text)

### 9 — Invite + Profile edit + Permissions
54. **Invite APIs** — `/api/invites` (POST, Primary only), `/api/invites/:token` (GET landing), `/api/invites/:token/accept` (POST phone+otp+profile → join as secondary)
55. **Invite module** — `src/modules/invite/{controller,views}` — Primary "add caregiver" dialog, invite landing page `/invite/[token]/page.tsx`
56. **Elder profile view page** — `/caregiver/elders/[id]/page.tsx` + `src/modules/elderProfile/` — collapsible sections (Basic/Health/Emergency/Optional), action bar conditional on permissions
57. **Elder profile edit page** — `/caregiver/elders/[id]/edit/page.tsx` — full-page form, sticky bottom bar, PATCH `/api/elders/:id`
58. **Permission toggle page** — `/caregiver/elders/[id]/permissions/page.tsx` — Primary-only, per-caregiver switches, PATCH `/api/pairings/:id/permissions`
59. **Address-change warning** — if elder has order in `preparing|delivering` → show warning on address edit (spec §3.10.3 Q3)

### 10 — PDPA + hardening
60. **PDPA pages** — privacy page at `/privacy`, consent log viewer at `/caregiver/settings/consents`
61. **Audio retention comment** — no persisted audio file (mock satisfies 24h rule trivially); TODO code comment documents where real deletion cron would live
62. **Data delete** — Primary can `DELETE /api/elders/:id` (soft-delete sets `deleted_at + hard_delete_after`)
63. **Security hygiene** — origin check on all mutating routes, SameSite=Lax + Secure + HttpOnly on all cookies, CSRF via origin check (spec §3.9.7)

### 11 — E2E + coverage polish
64. **E2E POMs** — `e2e/pages/{registerPage,elderPairPage,elderHomePage,dashboardPage,invitePage,profileEditPage}.ts`
65. **E2E specs** (see Tests section below)
66. **Coverage cleanup** — sweep any file < 80%, add tests; ensure `jest --coverage` PASSES the 80% threshold globally

---

## Tests

### Unit (Jest — co-located `__tests__/`)

**Target: ≥ 80% on branches/functions/lines/statements across all `src/**` per the Jest config threshold (same as workflow-service).**

Coverage highlights per area — happy + error paths for each:

- **atoms/molecules** — render snapshot + keyboard/click interactions (button disabled, otpInput paste 6 digits, qrScanner handles scan + permission denied)
- **auth** — send OTP rate-limit trip (lock after 3 fails), verify wrong OTP, verify expired, happy verify → cookie issued; refresh rotation; logout blacklist
- **register** — each screen validates Zod rejections (empty phone, short OTP, missing required consent); review screen shows all buffered data; submit persists elder + returns QR
- **pairing** — QR generation with exp + one-time consume; consume with wrong fingerprint rejected; consume after exp rejected
- **audio** — upload triggers Gemini adapter; mock keyword heuristics all branches (HUNGRY/PAIN/DANGER/SAD/LONELY/HAPPY/NORMAL); fan-out respects priority table
- **dashboard** — SSE hook connects + heartbeats + reconnects; events list pagination; mood summary aggregation
- **emergency** — first-click-wins CAS; second caregiver sees locked state; 5-min escalation flips flag
- **food** — recommender filters by conditions (elder with "เบาหวาน" never sees high-sugar menu); order lifecycle ticks; points auto-award on delivered
- **invite** — generate + landing fetch + accept happy path; token re-use rejected; expired rejected
- **permissions** — Primary can toggle all; Secondary cannot open toggle page (redirect); permission-gated actions respect toggles
- **profile** — edit PATCH per-section; address-change warning when order in-flight; soft-delete sets timestamps

### E2E (Playwright — `e2e/tests/*.spec.ts`)

Critical path only — each spec uses POMs and resets the in-memory repo via a test-only `/api/__test/reset` endpoint (gated by `NODE_ENV !== 'production'`).

1. **`register-primary.spec.ts`** — welcome → phone → OTP → caregiver profile → PDPA → elder basic → health → emergency → optional → review → QR displayed
2. **`pair-elder.spec.ts`** — prefilled QR token → elder pair page → inject scanned value → home screen shows big mic
3. **`voice-hungry.spec.ts`** — elder taps mic → fake-audio blob with keyword "หิว" → dashboard shows HUNGRY event → food dialog → pay → points appear in wallet
4. **`voice-danger.spec.ts`** — keyword "ล้ม" → all caregivers get toast + ringtone → Primary acks first → Secondary sees locked state
5. **`invite-secondary.spec.ts`** — Primary generates invite → opens invite URL in new context → phone+OTP → joins as Secondary → Secondary dashboard shows same elder (view_dashboard default on)
6. **`profile-edit.spec.ts`** — Primary edits elder allergies → `PATCH /api/elders/:id` persists → food recommender excludes allergenic menu
7. **`pdpa-consent.spec.ts`** — register blocks submit without required consents

E2E uses real Chromium + real `fetch` to the dev server, but the Gemini adapter resolves to `MockGeminiAdapter` via `NEXT_PUBLIC_AI_ADAPTER=mock`. Audio blobs are fake Uint8Arrays + keyword hints passed via a test header so the mock can route deterministically (documented in the test helper).

---

## Risks / Open questions

1. **Scope vs. coverage** — 60+ tasks + 7 E2E specs + 80% coverage is a LOT. Realistic risk: some modules land at 60–70% and need a second pass. Mitigation: `/verify` runs on every stop, early failure surfaces under-covered files.
2. **Thai wake-word** — out of scope per non-goals; if the user later wants it we swap `micButton` to also listen for a picovoice hotword.
3. **MediaRecorder on iOS Safari** — Safari only supports `audio/mp4`; we feature-detect and fallback. E2E test mocks the blob.
4. **SSE through Next.js Route Handlers on Node adapter** — confirmed supported via `ReadableStream` in Next 16; we keep connections in a module-scoped `Map<caregiverId, Set<WritableStream>>`.
5. **In-memory repo lost on server restart** — acceptable for hackathon demo; demo script notes this. Prisma swap is the documented Phase-2 task.
6. **Device fingerprint spoofing** — mitigated by HttpOnly cookie + bound fingerprint check; not a security hard-guarantee, matches spec §3.9.7 MVP posture.
7. **Browser Notification API requires HTTPS** — local dev uses `next dev` on `localhost` (allowed); Playwright runs against `localhost`.
8. **The 12 A-rules from workflow-service CLAUDE.md apply verbatim** — we will enforce no `biome-ignore`, types-first, Controller-View, no native HTML, `Pick<GlobalState, …>` for handler props, `ActionResult<T>` for server actions, etc. `/self-review` will catch violations.

### Confirmation needed before I start coding

- [ ] You'll run `git checkout -b feat/larnma-mvp` (or tell me a different branch name you want)
- [ ] Scope in the "Non-goals" section above is acceptable (pluggable mock for Gemini/DB/payment/food/SSE)
- [ ] The architectural decisions table (backend = route handlers, data = in-memory, push = SSE) is OK
- [ ] 60-task breakdown is the right granularity (I'll track these via TaskCreate and mark them off as I go)

If any of the above is wrong, tell me what to change and I'll edit this file before touching a single production file.
