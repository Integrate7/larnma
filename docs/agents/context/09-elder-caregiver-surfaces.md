# Elder ↔ Caregiver Surfaces (Agent Reference)

Larnma ships **two UI surfaces in one Next.js app**. They share atoms, molecules, tokens, and i18n infrastructure, but they render very differently because the users are different.

- **Elder** — one person, one shared device (tablet / phone by the bed). No login screen. Voice is primary; big buttons are a fallback. Device-bound session lasts a year.
- **Caregiver** — multiple people, their own phones. OTP-or-Google login. Lists, maps, notifications, money actions. Access token rotates every 15 min.

This doc explains the split, the routing layout, the design tokens, and the rules for working in either surface.

---

## 1. Route map

No parenthesised route groups — everything is plain folders under `src/app/`:

```
src/app/
├── page.tsx                    # Root — getServerAuth(); redirects to /dashboard or /elder
├── layout.tsx                  # Root layout — fonts + NextIntlClientProvider + Providers
│
├── elder/                      # ELDER surface
│   ├── layout.tsx              # adds `className="elder-mode"` wrapper
│   ├── page.tsx                # → <ElderHomePage />
│   ├── food/page.tsx           # → <ElderFoodPage />
│   ├── me/page.tsx             # → <ElderMePage />
│   └── pair/page.tsx           # → <PairPage />   ← also reachable unauthenticated (consumes token)
│
├── dashboard/page.tsx          # CAREGIVER main screen — <DashboardPage />
├── caregiver/                  # CAREGIVER nested surfaces
│   └── elders/[id]/
│       ├── page.tsx            # <ElderProfilePage /> — view mode
│       └── edit/page.tsx       # <ElderProfilePage mode="edit" /> — edit mode
│
├── register/page.tsx           # Caregiver onboarding
├── invite/[token]/page.tsx     # Secondary caregiver accept
├── auth/callback/page.tsx      # Google OAuth return
├── privacy/page.tsx            # Static legal page
│
└── api/**                      # Route handlers — see 01-codebase-overview.md
```

### Elder layout (`src/app/elder/layout.tsx`)

```tsx
export default function ElderLayout({ children }: { children: ReactNode }) {
  return <div className="elder-mode min-h-screen">{children}</div>
}
```

That single `elder-mode` class is the hook for elder-specific CSS tokens (larger spacing, warmer surface colors). Everything else uses the same globals.

There is no caregiver layout — the caregiver surface inherits the root layout directly. If you need to add caregiver-only chrome (sidebars, nav), create `src/app/caregiver/layout.tsx` and a matching `src/app/dashboard/layout.tsx`.

---

## 2. Who reaches what

### Elder surface (`/elder/*`, except `/elder/pair`)

- Requires a `larnma_device` cookie (device session)
- `getServerAuth()` returns `{ role: 'elder', elderId }` on hit
- First-time access is always through `/elder/pair?token=…`, which consumes the token and sets the cookie
- No sign-out UI in the MVP — the cookie TTL is 365 d

### Caregiver surface (`/dashboard`, `/caregiver/*`)

- Requires a `larnma_access` cookie (caregiver session)
- `getServerAuth()` returns `{ role: 'caregiver', userId }`
- If access token expires mid-session, the client fetches `/api/auth/refresh` and retries; if refresh fails, redirect to `/register`

### Public

- `/`, `/register`, `/invite/[token]`, `/auth/callback`, `/privacy`, `/elder/pair` (pair consumes a token — no prior session required)

See `05-auth-and-sessions.md` §6 for the full matrix.

---

## 3. Design rules per surface

### Elder surface

- **Minimum tap target: 56 px.** Use atom `Button` with `size="xl"`.
- **Body text ≥ 18 px** (`text-lg` or larger). Captions `text-base` — never `text-sm` in elder copy.
- **Voice first.** The home page features one giant `MicButton`; all other actions are fallbacks.
- **One action per screen** whenever possible. Reduce decision load.
- **No modals in-flow.** If you must confirm, go to a new route — modals disappear for elders with low vision.
- **No dense lists.** Max 5 rows per screen. If you have more, page them or split.
- **No top nav.** No hamburger. No tabs. Back is only `router.back()` from a secondary screen.
- **Copy** — short verbs, warm register. See `08-i18n-thai-first.md` §4.
- **Don't surface errors technically.** `เกิดข้อผิดพลาด ลองใหม่` beats `NETWORK_ERROR`.
- **State feedback via waveform + label.** `MicButton` has four explicit visual states — use them rather than spinners.

### Caregiver surface

- **Information density is OK** — caregivers are scanning many signals.
- **Keep icons honest.** Lucide icons only, no custom emoji unless the product copy uses them.
- **Use the mood palette** (`MoodChip`) — never invent colors for priority/severity.
- **Notifications are actionable.** Each notification has either an `ack` button or a primary next-action (`Order food`, `Call elder`, `Locate`).
- **Maps are read-mostly.** Don't let a caregiver drag a pin to relocate — that's a data leak into trust they shouldn't have.
- **Money actions require confirmation.** Ordering food → show totals → confirm → submit. Never one-click.

---

## 4. Shared infrastructure

Both surfaces live in the same app, which means **shared**:

- Components (`src/components/atom/*`, `src/components/molecule/*`) — style via tokens, not surface-specific overrides
- Shared types (`src/shared/types/*`)
- Services (`src/services/*`) — but pay attention to which guard runs per route
- Fonts (`IBM Plex Sans Thai`, `IBM Plex Serif`, `JetBrains Mono`)
- i18n — same `messages/th.json`, different key namespaces (`elder.*`, `dashboard.*`, `profile.*`, …)

### When to create a surface-specific component

- If it's pure presentation that doesn't appear on the other surface: put it in the module (`modules/elderHome/views/*`).
- If it's a reusable atom or molecule: put it in `src/components/molecule/*` and let the caller size/tune it via variants.
- Do **not** create `components/elder/*` or `components/caregiver/*` — the split fragments reuse.

### Elder-specific tweaks via tokens

The `.elder-mode` class on the elder layout gives you a scoped place to override CSS variables:

```css
.elder-mode {
  /* in styles/globals.css — illustrative */
  --ink: #1a1a1a;
  --cta-size: 56px;
  --body: 18px;
}
```

Use the token, not an override. That keeps the molecule API surface-agnostic.

---

## 5. Module ↔ route mapping

| Module | Surface | Mounted at |
|---|---|---|
| `dashboard` | caregiver | `/dashboard` |
| `register` | caregiver | `/register` |
| `inviteLanding` | caregiver | `/invite/[token]` |
| `elderProfile` | caregiver | `/caregiver/elders/[id]` (view), `/caregiver/elders/[id]/edit` (edit) |
| `elderHome` | elder | `/elder` |
| `elderFood` | elder | `/elder/food` |
| `elderMe` | elder | `/elder/me` |
| `pair` | elder (public on first run) | `/elder/pair` |

### Conventional module entry

Each module exposes a single client-rendered page component via `index.ts`:

```ts
// modules/dashboard/index.ts
export { DashboardPage } from './dashboardPage'
```

And `app/dashboard/page.tsx` is a one-liner:

```tsx
import { DashboardPage } from '@/modules/dashboard'
export default function Page() { return <DashboardPage /> }
```

If a page needs server-only work (auth redirect, RSC data fetch), put it in the `page.tsx` — **not** in the module. Modules stay client-rendered and testable.

---

## 6. Auth-aware redirects

The root route `/` is the single point where surface assignment happens:

```tsx
// src/app/page.tsx (abridged)
const auth = await getServerAuth()
if (auth?.role === 'caregiver') redirect('/dashboard')
if (auth?.role === 'elder')     redirect('/elder')
// else: show welcome + primary CTAs for both flows
```

Follow the same pattern if you add more gateway routes. Never decide surface from the client — you'd flash the wrong UI during hydration.

---

## 7. Cross-surface data flow

The two surfaces communicate exclusively through the server. Typical flows:

```
Elder                          Server                           Caregiver
─────                          ──────                           ─────────
mic button  ───────────► POST /api/audio ─────► eventBus ─────► /api/events/stream (SSE)
                         creates AudioEvent                     dashboardPage re-renders
                         + Notifications

                         POST /api/orders  ◄──── Order food button on dashboard
                         creates Order
                              │
                              ▼
                         orderLifecycle ticker advances status
                              │
                              ├─► publishTo(caregiverId) → caregiver sees status
                              └─► publishToElder(elderId) → elder sees "order_delivered" banner
```

No elder-side write goes directly to a caregiver-side state. All of it flows through the eventBus and is consumed via SSE on both ends.

---

## 8. Common pitfalls

- **Don't put a nav bar in the elder layout.** One CTA per screen; `router.back()` from sub-screens is all you need.
- **Don't surface caregiver-only features to elders** (deleting an order, disputing a charge, etc.). The elder's elderMe page is intentionally read-only.
- **Don't fetch elder data into the caregiver surface by elder cookie** — you'll confuse both sessions. Caregiver reads go through `/api/elders/...` with their own cookie; `checkPermission` enforces scope.
- **Don't split shared types per surface.** `Notification` is the same type whether you look at it from dashboard or from an elder event feed — keep it in `src/shared/types/entities.ts`.
- **Don't ship caregiver-only debug UI into the elder bundle.** Any dev-only panel should be gated by `process.env.NODE_ENV !== 'production'` AND route-split so it doesn't balloon the elder bundle.
- **Don't rename `/elder` to `/elder-surface` or move caregivers to `/c/*`.** Those paths are referenced in E2E tests, pairing QRs, and deep links. Changing them is a migration, not a rename.

---

## 9. Adding a new screen — decision tree

```
Is it for elders or caregivers?
├── Elder
│   ├── New top-level screen?    → new route under src/app/elder/<slug>/page.tsx
│   └── Inside an existing flow? → new view under src/modules/elderXxx/views/
│   ... and make it pass `size="xl"`, `text-lg`+
│
└── Caregiver
    ├── New top-level screen?    → src/app/caregiver/<slug>/page.tsx (or /dashboard if extending the feed)
    └── Inside the dashboard?    → new view under src/modules/dashboard/views/
    ... and add the permission key if it does money / profile edits
```

Whichever you pick, follow the Controller-View pattern (`02-controller-view-pattern.md`) and add tests per `07-testing.md`.
