# Integrations (Agent Reference)

Every external dependency in Larnma sits behind a narrow TypeScript interface with a mock default. The MVP runs with **zero real infrastructure**: no real SMS, no real Gemini, no real DB, no real payment. This is by design so any contributor can clone the repo, `npm run dev`, and have a working demo in < 30 s.

This doc lists every integration boundary, its contract, its current implementation, and how to swap in a real one.

---

## 1. Gemini Adapter — `src/services/gemini/`

**Purpose.** Take audio (or a hint keyword) from the elder and return a structured analysis: transcript, mood, intent, confidence, summary, advice, and intent-specific entities (e.g. `menuSuggestions`).

### Interface

```ts
// src/services/gemini/types.ts
export type GeminiInput = { audio?: Blob; hintKeyword?: string; locale?: string }

export type GeminiAnalysis = {
  transcript: string
  intent: Intent       // 'HUNGRY' | 'PAIN' | 'DANGER' | 'LONELY' | 'CHAT' | 'UNKNOWN'
  mood: Mood           // 'DANGER' | 'PAIN' | 'HUNGRY' | 'LONELY' | 'SAD' | 'HAPPY' | 'NORMAL'
  confidence: number
  summary: string
  advice?: string
  entities: Record<string, unknown>
}

export type GeminiAdapter = {
  analyze: (input: GeminiInput) => Promise<GeminiAnalysis>
}
```

### Resolution

```ts
import { getGeminiAdapter } from '@/services/gemini'
const adapter = getGeminiAdapter()
const result = await adapter.analyze({ hintKeyword })
```

`getGeminiAdapter()` lazily instantiates:
- **real** (`createRealGeminiAdapter(apiKey)` wrapping `@google/generative-ai`) if `process.env.GEMINI_API_KEY` is set
- **mock** (`createMockGeminiAdapter()`) otherwise

### Mock behaviour

`mockGeminiAdapter.ts` applies a keyword-rule table over the `hintKeyword` or transcript. Examples:

| Keyword (TH) | Intent | Mood |
|---|---|---|
| ช่วย / ล้ม / ลื่น / ไฟไหม้ | `DANGER` | `DANGER` |
| เจ็บ / ปวด | `PAIN` | `PAIN` |
| หิว / กินข้าว | `HUNGRY` | `HUNGRY` |
| เหงา / คิดถึง | `LONELY` | `LONELY` |
| เศร้า / หดหู่ | `CHAT` | `SAD` |
| fallback | `UNKNOWN` | `NORMAL` |

For `HUNGRY` the adapter additionally attaches `entities.menuSuggestions` by calling `recommendMenus(...)` on the elder's profile (see §3 Menu service).

### Swapping in the real adapter for a single test

```ts
import { __setGeminiAdapter, createMockGeminiAdapter } from '@/services/gemini'
__setGeminiAdapter(createMockGeminiAdapter())         // reset to mock
__setGeminiAdapter({ analyze: async () => ({...}) })  // full custom stub
```

`api/test-reset` and `api/test-seed` call `__setGeminiAdapter(createMockGeminiAdapter())` to guarantee a clean slate for E2E tests.

---

## 2. Repository — `src/services/repository/`

**Purpose.** Single source of truth for every domain entity.

### Interface (full method list)

See `src/services/repository/types.ts`. Grouped:

- **Users** — `createUser`, `getUserById`, `getUserByPhone`, `getUserByEmail`, `getUserByGoogleId`, `updateUser`
- **Elder profiles** — `createElderProfile`, `getElderProfile`, `updateElderProfile`
- **OTP** — `createOtpChallenge`, `getOtpChallengeByRef`, `latestOtpChallengeByPhone`, `updateOtpChallenge`, `otpAttemptsInWindow`
- **Caregiver sessions** — `createSession`, `getSessionById`, `revokeSession`
- **Device (elder) sessions** — `createDeviceSession`, `getDeviceSessionById`, `revokeDeviceSession`
- **Pairings** — `createPairing`, `getPairing`, `listPairingsByElder`, `listPairingsByCaregiver`, `getPairingByPair`, `updatePairing`
- **Invites** — `createInvite`, `getInviteByTokenHash`, `updateInvite`
- **Audio events** — `createAudioEvent`, `listAudioEventsByElder`
- **Notifications** — `createNotification`, `getNotificationById`, `listNotificationsByCaregiver`, `updateNotification`, `lockNotification` (returns `{ locked, notification? }`)
- **Orders, Consents, ElderLocation, PointEntry** — CRUD analogues

### Resolution

```ts
import { getRepository } from '@/services/repository'
const repo = getRepository()
```

### Default implementation

`createInMemoryRepository()` backs everything with `Map`s and in-memory arrays. Resets on process restart.

### Swapping for real persistence later

Implement the interface (e.g. a PostgresRepository) and register it:

```ts
// e.g. in instrumentation.ts at boot
import { __setRepository } from '@/services/repository'
__setRepository(createPostgresRepository({ connectionString: process.env.DATABASE_URL! }))
```

No route handler or module needs to change.

---

## 3. Menu Service — `src/services/menu/`

**Purpose.** Static catalog of 30 Thai dishes + an allergy/condition-aware recommender.

```ts
import { MENU_CATALOG, recommendMenus } from '@/services/menu'

// MENU_CATALOG: MenuItem[] — { id, name, price, conditionsExcluded, allergensContained }
const suggestions = recommendMenus({
  profile: elderProfile,             // includes allergies, conditions, foodDislikes, foodPreferences
  limit: 5,
})
// → MenuItem[] ranked by safety (allergy/condition filter first) then preference score
```

Used by:
- `GET /api/elder/food/menus` (direct call — elder surface)
- `POST /api/audio` mock analyser — attaches `entities.menuSuggestions` for `HUNGRY` intents

### Swapping in a real menu service

Reimplement `recommendMenus`. Keep `MenuItem` stable; many callers read `id / name / price` directly.

---

## 4. Event Bus — `src/services/eventBus/`

**Purpose.** In-process pub/sub for pushing updates to SSE listeners. Not meant for cross-process messaging — a single Node process owns all state for the MVP.

### API

```ts
// publishers
publishTo(caregiverId, event: DashboardEvent)
publishToAll(caregiverIds: Iterable<string>, event: DashboardEvent)
publishToElder(elderId, event: ElderEvent)

// subscribers (used only by the SSE route handlers)
subscribe(caregiverId, (event) => …)    → unsubscribe()
subscribeElder(elderId, (event) => …)   → unsubscribe()

// test helpers
listenerCount(caregiverId): number
resetEventBus(): void
```

### Event shapes

```ts
type DashboardEvent =
  | { kind: 'audio'; event: AudioEvent }
  | { kind: 'notification'; notification: Notification }
  | { kind: 'ack'; notificationId: string; caregiverId: string }
  | { kind: 'order'; orderId: string; status: string }
  | { kind: 'point'; caregiverId: string; delta: number; balance: number }
  | { kind: 'heartbeat' }

type ElderEvent =
  | { kind: 'order_delivered'; orderId: string; menuName: string; caregiverName: string }
  | { kind: 'heartbeat' }
```

### Producers (grep for `publishTo` / `publishToElder`)

- `POST /api/audio` → `{ kind: 'audio' | 'notification' }` per paired caregiver
- `POST /api/orders` → `{ kind: 'order' }` as status advances
- `POST /api/notifications/:id/ack` → `{ kind: 'ack' }` to fellow caregivers
- `orderLifecycle` ticker → `{ kind: 'order' }` + `{ kind: 'order_delivered' }` to the elder

### Scaling out

For a multi-process deployment, replace the internal maps with Redis pub/sub or similar. Keep the exported function shapes stable.

---

## 5. Notifications Service — `src/services/notifications/`

**Purpose.** Given an `AudioEvent`, create `Notification` rows for the right caregivers at the right priority, and handle escalation if no one acks in time.

### API

```ts
// after creating an AudioEvent:
import { fanOutEvent, priorityForEvent } from '@/services/notifications'
const notifications = fanOutEvent(audioEvent)  // returns created Notifications
for (const n of notifications) publishTo(n.caregiverId, { kind: 'notification', notification: n })

// periodic escalation (can be invoked from a timer or the audio route):
import { findAndFlagEscalations } from '@/services/notifications'
const escalatedEventIds = findAndFlagEscalations()
```

### Priority mapping

Derived from `MOOD_PRIORITY` (in `src/shared/types/mood.ts`):

| Mood | Priority |
|---|---|
| DANGER | `critical` |
| PAIN, SAD | `high` |
| HUNGRY, LONELY | `normal` |
| HAPPY, NORMAL | `log` (no active notification) |

Escalation: after `ADAPTER_CONFIG.escalationSec` without ack, `findAndFlagEscalations` marks the event and its notifications as escalated and bumps priority.

---

## 6. Order Lifecycle — `src/services/orderLifecycle/`

**Purpose.** Simulate a food-delivery provider by auto-advancing an order's status every `ADAPTER_CONFIG.orderLifecycleStepMs` (10 s in dev).

### API

```ts
import { nextStatus, advanceOrder, scheduleFullLifecycle, ORDER_LIFECYCLE, POINTS_PER_ORDER } from '@/services/orderLifecycle'

// one-off step
const next = nextStatus('pending') // → 'paid'

// advance in the repo + publish to eventBus
await advanceOrder(orderId)

// kick off the automatic ticker from POST /api/orders
scheduleFullLifecycle(orderId, stepMs)   // pending → paid → preparing → delivering → delivered
```

On `delivered`:
- order row updated
- `publishTo(caregiverId, { kind: 'order', status: 'delivered' })`
- `publishToElder(elderId, { kind: 'order_delivered', menuName, caregiverName })`
- `POINTS_PER_ORDER` (defaults to 10) are credited to the caregiver via `publishTo({ kind: 'point', … })`

### Swapping in a real provider

Replace `scheduleFullLifecycle` with a webhook-driven flow. Keep the publish payload identical so caregivers / elders don't notice the transport change.

---

## 7. OTP Service — `src/services/otp/`

**Purpose.** Send and verify SMS OTP codes to a Thai phone number.

### API

```ts
import { sendOtp, verifyOtp } from '@/services/otp'
const { ref, expiresAt } = await sendOtp(phone)
const { valid } = await verifyOtp(phone, code, ref)
```

### Mock behaviour

- Generates a 6-digit code
- Hashes it (`sha256`) and persists the challenge via `repo.createOtpChallenge`
- **Logs the plaintext code to the server console** in dev
- Enforces 3 attempts / 5 minute expiry / 30 minute lockout via `ADAPTER_CONFIG.otpMaxAttempts | otpExpireSec | otpLockSec`

### Swapping in a real SMS gateway

Replace `sendOtp` with a call to Twilio / Vonage / AWS SNS. Keep the return shape `{ ref, expiresAt }`.

---

## 8. Payment Provider (planned)

Currently there is no `services/payment/`; the MVP treats `POST /api/orders` as "paid" via the orderLifecycle step. When a real provider is wired in:

- Introduce `services/payment/` with a `PaymentAdapter` interface (intent → `{ paymentUrl, referenceId }` / `verify(referenceId)`)
- `POST /api/orders` creates the order in `status: 'pending'` and returns a `paymentUrl`
- A webhook handler under `/api/payments/webhook` calls `advanceOrder(orderId)` on confirmation

Design the interface the same shape as the other mocks — one small surface, one `getPaymentAdapter()` factory, one `__setPaymentAdapter()` escape hatch for tests.

---

## 9. Summary: where to look

| Concern | Service |
|---|---|
| AI analysis of elder speech | `services/gemini/` |
| Any read/write of domain data | `services/repository/` |
| Signing or verifying JWTs | `services/jwt/` |
| Issuing caregiver / elder sessions | `services/auth/` |
| Auth checks in routes | `services/guards/` |
| SMS OTP | `services/otp/` |
| Food catalog + recommendations | `services/menu/` |
| Creating notifications from an event | `services/notifications/` |
| Order status automation | `services/orderLifecycle/` |
| Real-time push to SSE clients | `services/eventBus/` |
| HTTP client + response validation | `services/adapter/fetcher.ts` |

**Rule of thumb:** if a route handler is about to do something stateful and non-trivial, check whether a service already exists for it. If it doesn't, add the service first, call it from the route handler second. Route handlers should read like glue.
