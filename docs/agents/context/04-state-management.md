# State Management (Agent Reference)

Larnma deliberately keeps state **local and explicit**. There is no global Redux / Zustand store — each module owns its state inside a `globalState.ts` hook, and cross-module communication happens through the server (`eventBus` + SSE). This doc tells you where each kind of state lives and how to evolve it.

## State categories

| Kind | Where it lives | Example |
|---|---|---|
| **Module UI state** | `modules/<mod>/controller/hooks/globalState.ts` (`useState`-based) | `events[]`, `notifications[]`, `micState`, `step`, `errorMessage` |
| **Form state** | `modules/<mod>/controller/hooks/formHandler.ts` (`react-hook-form` + Zod) | Register multi-step values, Elder profile edit values |
| **Server-side domain state** | `src/services/repository/` (`IRepository`) | `User`, `ElderProfile`, `Pairing`, `Notification`, `Order` |
| **Server-side pub/sub** | `src/services/eventBus/` (in-memory `Map<key, Set<listener>>`) | push to SSE subscribers |
| **Auth session** | HTTP-only cookies + JWT (`jose`) + `Session` / `DeviceSession` rows in repo | `larnma_access`, `larnma_refresh`, `larnma_device` |
| **Client cache** | TanStack Query client from `adapter/queryClient.ts` | Currently unused — room for growth |

No `src/stores/` directory exists. If you catch yourself reaching for Zustand, first check whether a `globalState.ts` in the relevant module is the right home.

---

## 1. Module `globalState.ts` — the primary pattern

Every module with UI state declares one hook that owns ALL `useState` slots for that module and returns a **flat `state` object** plus named mutators.

```ts
// src/modules/dashboard/controller/hooks/globalState.ts (abridged)
export function useDashboardGlobalState() {
  const [events, setEvents] = useState<AudioEvent[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [connecting, setConnecting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pairings, setPairings] = useState<PairingInfo[]>([])
  const [locations, setLocations] = useState<ElderLocation[]>([])
  const [orderedEventIds, setOrderedEventIds] = useState<string[]>([])
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({})

  const moodCounts = useMemo<Record<Mood, number>>(() => {
    const out = Object.fromEntries(MOODS.map((m) => [m, 0])) as Record<Mood, number>
    for (const e of events) out[e.mood] += 1
    return out
  }, [events])

  const state: DashboardGlobalState = {
    events, notifications, moodCounts, connecting, error,
    pairings, locations, orderedEventIds, orderStatuses,
  }

  // named mutators — intent-describing, not setter-like
  const prependEvent = (e: AudioEvent) => setEvents((prev) =>
    prev.some((x) => x.id === e.id) ? prev : [e, ...prev].slice(0, 50))

  const prependNotification = (n: Notification) => setNotifications((prev) =>
    prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 50))

  const updateNotification = (id: string, patch: Partial<Notification>) =>
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))

  return {
    state,
    setConnecting, setError, setPairings, setLocations,
    prependEvent, prependNotification, updateNotification,
    addOrderedEventId, updateOrderStatus, replaceAll,
  }
}
```

### Conventions (rule A6 + A7)

- **Types live in `types.ts`** (`DashboardGlobalState`, `DashboardHandler`, …). Import them; never define inline.
- **`state` is a single flat object** — that's what ends up in views.
- **Mutators are intent-named** (`prependEvent`, `addOrderedEventId`). Avoid exposing the raw setters unless the handler really does need a bulk `set`.
- **Derived values use `useMemo`.** Don't recompute in views.
- **Dedupe defensively** — e.g. `prependEvent` checks `id` before inserting because the same event can arrive via both initial load (`queryHandler`) and SSE push (`eventStream`).

---

## 2. `formHandler.ts` — react-hook-form + Zod

Used when a module has a real form. The `formHandler` hook owns the `useForm()` instance and the Zod schema; the `handler` reads from it with `getValues()` / `trigger()`.

```ts
// modules/register/schema.ts (abridged)
export const registerSchema = z.object({
  phone: z.string().min(9),
  code:  z.string().length(6),
  name:  z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
})
export type RegisterFormValues = z.infer<typeof registerSchema>
```

```ts
// modules/register/controller/hooks/formHandler.ts
export function useRegisterFormHandler() {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: '', code: '', name: '', email: '' },
    mode: 'onBlur',
  })
  return { form }
}
```

The handler reads the form when the user clicks "Next":

```ts
const ok = await form.trigger('phone')
if (!ok) return
const { phone } = form.getValues()
await fetcher('/api/auth/otp/send', sendOtpSchema, { method: 'POST', body: { phone } })
```

**Only one `formHandler` per controller.** If a screen has two independent forms, extract the second into a sub-view with its own controller.

---

## 3. SSE-driven state updates

Modules that need live data subscribe to an EventSource and push into `globalState` setters:

```ts
// modules/dashboard/controller/hooks/eventStream.ts (shape)
export function useDashboardEventStream(gs: ReturnType<typeof useDashboardGlobalState>) {
  useEffect(() => {
    const es = new EventSource('/api/events/stream')
    es.onopen = () => gs.setConnecting(false)
    es.onerror = () => gs.setError('Disconnected')
    es.onmessage = (msg) => {
      const e = JSON.parse(msg.data) as DashboardEvent
      if (e.kind === 'audio') gs.prependEvent(e.event)
      else if (e.kind === 'notification') gs.prependNotification(e.notification)
      else if (e.kind === 'order') gs.updateOrderStatus(e.orderId, e.status)
      // heartbeat → no-op
    }
    return () => es.close()
  }, [gs])
}
```

Golden pattern: **server publishes, client mutates local state**. The server is the source of truth; client state is a projection.

---

## 4. Server-side "state" (the repository)

All domain truth lives in `getRepository()`. Inside an API route or a server component you read/write there; nothing else needs to be synced manually because the **eventBus** fan-out re-projects changes to other caregivers' SSE streams.

```ts
const repo = getRepository()
const notification = repo.createNotification({ eventId, caregiverId, priority, ... })
publishTo(caregiverId, { kind: 'notification', notification })
```

See:
- `03-data-layer.md §3 The Repository` for the full `IRepository` interface
- `06-integrations.md §eventBus` for publisher patterns

---

## 5. Session state (cookies + JWT)

The three cookies are the entire session layer — there's no client-side `userStore`:

| Cookie | Set by | Contains | TTL |
|---|---|---|---|
| `larnma_access` | caregiver OTP/Google login | signed JWT `{ sub: userId, role: 'caregiver', kind: 'access', sid }` | 15 min |
| `larnma_refresh` | caregiver OTP/Google login | signed JWT `{ sub: userId, role: 'caregiver', kind: 'refresh' }` | 30 d |
| `larnma_device` | elder QR pairing consume | signed JWT `{ sub: sessionId, role: 'elder', kind: 'device', elderId, fingerprint }` | 365 d |

All are `httpOnly`, `secure` in prod, `sameSite: 'lax'`. In RSC / layouts, call `getServerAuth()` to decide routing. In API handlers, call `requireCaregiver(req)` / `requireDevice(req)`. See `05-auth-and-sessions.md`.

---

## 6. Zustand & TanStack Query

Both are installed (`zustand@5`, `@tanstack/react-query@5`) and wired (`Providers.tsx` creates the QueryClient), but **modules currently don't use them**. Use `useState` in `globalState.ts` unless:

- You have state that genuinely needs to be shared across unrelated modules (e.g. global toasts, which sonner already handles) → consider Zustand
- You need to dedupe identical fetches across tabs / re-mounts → consider TanStack Query

If you reach for either, note it in the module plan so `/self-review` doesn't flag it as drift.

---

## 7. Testing state

Unit tests for `globalState.ts` render the hook with `@testing-library/react` and assert the returned `state` after mutator calls. Real examples:

- `src/modules/dashboard/controller/hooks/__tests__/globalState.test.ts`
- `src/modules/register/controller/hooks/__tests__/globalState.test.ts`
- `src/modules/pair/controller/hooks/__tests__/globalState.test.ts`

For handlers, pass a minimal fake `gs` — the `Pick<>` prop pattern (rule A8) makes this one-line to construct.

---

## Key Rules

- [ ] Module state lives in `globalState.ts` inside the module — never a top-level store
- [ ] `state` returned is a flat object, typed by `types.ts` (A6)
- [ ] Views receive only flat props (A7) — no `gs`, no mutators, no controller object
- [ ] Mutators are named by intent (`prependEvent`), not by shape (`setEvents`)
- [ ] Derived values use `useMemo`, not inline computation
- [ ] SSE consumers push into `globalState` setters; they never fetch or keep their own cache
- [ ] Form state lives in `formHandler.ts` — handlers read with `getValues`/`trigger`, never own it
- [ ] Server state is the repository; client state is a projection and may be stale — reload on reconnect
