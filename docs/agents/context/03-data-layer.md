# Data Layer (Agent Reference)

Larnma has two sides to the data layer: **client-side** (modules call the API) and **server-side** (API route handlers and server components touch the repository directly). Both sides are always mediated — you never call `fetch()` or touch a DB driver directly.

## Two Golden Rules

- **Client code** uses `fetcher()` from `src/services/adapter/fetcher.ts` (rule A4). No raw `fetch`, no axios, no libraries.
- **Server code** reads/writes via `getRepository()` from `src/services/repository`. No inline state, no module-level maps.

---

## Request Flow

```
Client component  ── useXController()
   │
   ▼
controller/hooks/queryHandler.ts   ─ fetcher(url, zodSchema)
   │                                        │
   │   (JSON over HTTP, cookies sent)       │
   ▼                                        ▼
src/app/api/**/route.ts   ────► guards (requireCaregiver / requireDevice / checkPermission)
   │
   ▼
src/services/repository   ────► in-memory store (default) or future Postgres
   │
   ▼
src/services/eventBus      ────► publishes DashboardEvent / ElderEvent to SSE subscribers
   │
   ▼
Response JSON ─────► Zod-parsed by fetcher ─────► ActionResult<T> returned to controller
```

All responses — success or failure — should be shaped so the client can narrow on `ActionResult<T>` (see §5 below).

---

## 1. Client Side — `fetcher()`

Located at `src/services/adapter/fetcher.ts`. Thin wrapper around `fetch` that:

1. Sends cookies (`credentials: 'include'`)
2. JSON-encodes the body
3. Validates the response with a `zod` schema
4. Returns `ActionResult<T>` — never throws

### Signature

```ts
type FetcherOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  body?: unknown
  headers?: Record<string, string>
  signal?: AbortSignal
}

async function fetcher<T>(
  url: string,
  schema: z.ZodType<T>,
  opts?: FetcherOptions,
): Promise<ActionResult<T>>
```

### Usage

```ts
// GET
const res = await fetcher('/api/events', eventsSchema)
if (res.success) gs.replaceAll(res.data.events, res.data.notifications)
else gs.setError(res.error)

// POST
const res = await fetcher(
  '/api/orders',
  z.object({ id: z.string(), status: z.string(), total: z.number() }),
  { method: 'POST', body: { elderId, eventId, menu: [{ name, price, qty: 1 }] } },
)
```

### Error codes you'll see in `res.errorCode`

| `errorCode` | When |
|---|---|
| `NETWORK` | `fetch` threw (offline, aborted, DNS, …) |
| `SCHEMA_MISMATCH` | Response body didn't match the Zod schema — the **server is lying or drifted** |
| (from server) | API returned `{ error, errorCode }` with a non-2xx status |

---

## 2. Server Side — API Route Handlers

Every route handler under `src/app/api/**/route.ts` follows this shape:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  // 1. parse + validate body with zod
  const body = await req.json()
  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })

  // 2. authorise (permissions)
  if (!checkPermission({ caregiverId: auth.userId, elderId: parsed.data.elderId, required: 'pay_food_orders' }))
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  // 3. do the work via services / repository
  const repo = getRepository()
  const order = repo.createOrder({ /* … */ })

  // 4. publish to eventBus if other clients care
  publishTo(auth.userId, { kind: 'order', orderId: order.id, status: order.status })

  // 5. respond in a shape the client's Zod schema accepts
  return NextResponse.json({ id: order.id, status: order.status, total: order.total })
}
```

Key conventions:
- `export const runtime = 'nodejs'` — everywhere; we use `node:crypto`, `jose`, and mutable module state
- Always validate the body with a Zod schema from `src/services/adapter/schemas/`
- Non-2xx responses: `NextResponse.json({ error: 'CODE', errorCode?: 'OPTIONAL' }, { status })`
- 2xx responses: the exact shape declared in the client's Zod schema — **always add your field to both sides** when extending

---

## 3. The Repository (`src/services/repository/`)

```ts
import { getRepository } from '@/services/repository'
const repo = getRepository()
```

### Interface (`IRepository`) — one method per entity operation

`createUser`, `getUserById`, `getUserByPhone`, `getUserByEmail`, `getUserByGoogleId`, `updateUser`,
`createElderProfile`, `getElderProfile`, `updateElderProfile`,
`createOtpChallenge`, `getOtpChallengeByRef`, `latestOtpChallengeByPhone`, `updateOtpChallenge`, `otpAttemptsInWindow`,
`createSession`, `getSessionById`, `revokeSession`,
`createDeviceSession`, `getDeviceSessionById`, `revokeDeviceSession`,
`createPairing`, `getPairing`, `listPairingsByElder`, `listPairingsByCaregiver`, `getPairingByPair`, `updatePairing`,
`createInvite`, `getInviteByTokenHash`, `updateInvite`,
`createAudioEvent`, `listAudioEventsByElder`,
`createNotification`, `getNotificationById`, `listNotificationsByCaregiver`, `updateNotification`, `lockNotification`,
`createOrder`, `getOrderById`, `updateOrder`, … (+ `Consent`, `ElderLocation`, `PointEntry`).

### Default implementation — `createInMemoryRepository()`

In-memory maps, zero persistence. Resets on server restart. Good enough for the MVP; reset programmatically via `__setRepository(createInMemoryRepository())` (used in `api/test-reset`, `api/test-seed`, and Jest tests).

### Swapping the backing store later

Implement `IRepository` against Postgres (or anything), then call `__setRepository(realRepo)` once at boot (e.g. in `instrumentation.ts`). No route handler or module needs to change.

See `06-integrations.md` §Repository for the full contract.

---

## 4. Adding a New API Endpoint (Step-by-Step)

Concrete example: add `GET /api/elders/:id/medications`.

### Step 1 — Add the repository method (if missing)

```ts
// src/services/repository/types.ts
listMedicationsByElder: (elderId: string) => Medication[]

// src/services/repository/inMemoryRepository.ts
listMedicationsByElder: (elderId) => profilesByUserId.get(elderId)?.medications ?? [],
```

### Step 2 — Define the request/response Zod schema

```ts
// src/services/adapter/schemas/elder.ts (append)
export const medicationSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  time: z.string(),
})
export const listMedicationsResponseSchema = z.object({
  medications: z.array(medicationSchema),
})
```

### Step 3 — Create the route handler

```ts
// src/app/api/elders/[id]/medications/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver, checkPermission } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (!checkPermission({ caregiverId: auth.userId, elderId: id, required: 'view_dashboard' }))
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const repo = getRepository()
  const medications = repo.listMedicationsByElder(id)
  return NextResponse.json({ medications })
}
```

### Step 4 — Call it from a module (client)

```ts
// modules/elderProfile/controller/hooks/queryHandler.ts
const res = await fetcher(`/api/elders/${elderId}/medications`, listMedicationsResponseSchema)
if (res.success) gs.setMedications(res.data.medications)
```

### Step 5 — Tests

- Unit: test the route handler directly by calling `GET(request)` (see `src/app/api/**/__tests__/` for examples)
- Optionally E2E: add to an existing spec under `e2e/tests/` if a user journey changes

---

## 5. `ActionResult<T>` — the Error Shape (rule A9)

All client-observable success/failure flows use:

```ts
type ActionResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string; errorCode?: string }
```

- `fetcher()` returns this shape natively
- Any Server Action you add must also return this shape
- Use `errorCode` for machine-readable cases (`SCHEMA_MISMATCH`, `NETWORK`, `INVALID_BODY`, `FORBIDDEN`, `PAIRING_NOT_FOUND`, …)
- `error` is a human-readable string — safe to surface directly into a toast or inline error

---

## 6. SSE Push (`eventBus` + `text/event-stream`)

Push is not part of the normal request/response flow — it's a persistent HTTP stream. See `06-integrations.md §eventBus` for the publisher side. On the consumer side, modules use a thin hook:

```ts
// modules/dashboard/controller/hooks/eventStream.ts (shape)
const es = new EventSource('/api/events/stream')
es.onmessage = (ev) => {
  const event = JSON.parse(ev.data) as DashboardEvent
  switch (event.kind) {
    case 'audio':         gs.prependEvent(event.event); break
    case 'notification':  gs.prependNotification(event.notification); break
    case 'order':         gs.updateOrderStatus(event.orderId, event.status); break
    case 'heartbeat':     break
  }
}
return () => es.close()
```

Cookies travel automatically — the server-side handler runs `requireCaregiver` / `requireDevice` before `ReadableStream.start()`.

---

## 7. Directory Reference

```
src/services/adapter/
├── config.ts            # ADAPTER_CONFIG — cookie names, TTLs, orderLifecycleStepMs, etc.
├── fetcher.ts           # fetcher<T>(url, schema, opts) → ActionResult<T>
├── queryClient.ts       # createQueryClient() — sensible TanStack Query defaults
├── schemas/             # Zod schemas shared between client and route handlers
│   ├── auth.ts, caregiver.ts, consent.ts, elder.ts, order.ts, pairing.ts
└── __tests__/           # tests for the fetcher

src/services/repository/
├── types.ts             # IRepository interface
├── inMemoryRepository.ts# default in-memory implementation
├── index.ts             # getRepository() / __setRepository() + export createInMemoryRepository
└── __tests__/
```

---

## Key Rules

- [ ] Client code calls `fetcher()` only — never `fetch`/axios directly (A4)
- [ ] Every `fetcher()` call passes a Zod schema
- [ ] Responses are `ActionResult<T>` — narrow on `res.success` (A9)
- [ ] Server handlers run `requireCaregiver` / `requireDevice` before anything else
- [ ] Server handlers use `getRepository()` — never a module-level `Map`
- [ ] Route handlers validate request bodies with Zod before touching the repo
- [ ] Use `:param` via App Router folder segments (`[id]`, `[token]`)
- [ ] `runtime = 'nodejs'` on every API route
