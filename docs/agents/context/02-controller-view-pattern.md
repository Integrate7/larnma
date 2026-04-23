# Controller-View Pattern (Agent Reference)

The **primary design pattern** for every feature module under `src/modules/*`. `/self-review` rule A3 blocks anything that doesn't follow it.

## Quick Decision

```
Does it render a page or a dialog with real UI / data / side effects?
├── YES → Level 1 (page-level)
│        ├── Form with Zod validation?            → Level 1 + formHandler
│        ├── Fetches server data?                 → + queryHandler
│        └── SSE / interval subscriptions?        → + a subscription hook (e.g. eventStream)
└── NO (pure presentation, props in → JSX out)  → no controller; just a view
```

## File Layout (canonical)

```
src/modules/<moduleName>/
├── index.ts                    # re-exports <ModuleName>Page
├── <moduleName>Page.tsx        # pure wiring: const { state, handler } = useController(); <View ... />
├── types.ts                    # ALL types — GlobalState, Handler, view props — live here
├── schema.ts                   # (optional) Zod schemas for form validation
├── controller/
│   ├── controller.ts           # composes hooks in dependency order; returns { state, handler }
│   └── hooks/
│       ├── __tests__/          # unit tests for each hook
│       ├── globalState.ts      # useState + derived selectors — returns { state, set… }
│       ├── formHandler.ts      # useForm + zodResolver — owns form state
│       ├── queryHandler.ts     # fetcher() calls; reads/writes via gs.setX
│       ├── eventStream.ts      # (or similar) EventSource subscription
│       └── handler.ts          # user-action event handlers — always last
└── views/                      # optional — sub-views with flat props
    └── <viewName>/
```

### Hook dependency chain (one direction, never circular)

```
formHandler ─→ globalState ─→ queryHandler ─→ (subscriptions) ─→ handler
```

- `globalState` is the local store for the module — returns `{ state, setX, mutateY }`
- `queryHandler` fetches and pushes into `globalState` setters; returns `{ reload }` only
- `handler` is the only hook that mutates state via user actions; may call `queryHandler.reload` after a mutation

## Real Example — `modules/dashboard/`

```ts
// src/modules/dashboard/controller/controller.ts
'use client'
import { useDashboardEventStream } from './hooks/eventStream'
import { useDashboardGlobalState } from './hooks/globalState'
import { useDashboardHandler } from './hooks/handler'
import { useDashboardQueryHandler } from './hooks/queryHandler'

export function useDashboardController() {
  const gs = useDashboardGlobalState()
  const { reload } = useDashboardQueryHandler(gs)
  const handler = useDashboardHandler({ gs, reload })
  useDashboardEventStream(gs)
  return { state: gs.state, handler }
}
```

```ts
// src/modules/dashboard/dashboardPage.tsx
'use client'
export function DashboardPage() {
  const { state, handler } = useDashboardController()
  return <DashboardView state={state} handler={handler} />
}
```

Note the exposed shape: `{ state, handler }`. Views receive **flat props** only (rule A7) — never the controller object itself, never `gs`, never `useXxxStore()`.

## `globalState.ts` Pattern

```ts
// src/modules/dashboard/controller/hooks/globalState.ts
export function useDashboardGlobalState() {
  const [events, setEvents] = useState<AudioEvent[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  // … more useState slots …

  const moodCounts = useMemo<Record<Mood, number>>(/* derived */, [events])

  const state: DashboardGlobalState = { events, notifications, moodCounts, /* … */ }

  // mutators returned alongside `state`
  const prependEvent = (e: AudioEvent) =>
    setEvents((prev) => (prev.some((x) => x.id === e.id) ? prev : [e, ...prev].slice(0, 50)))

  return { state, prependEvent, /* … */ }
}
```

Rules:
- **`state` is a flat object** — that's what eventually reaches the view
- **Mutator names describe intent** (`prependEvent`, `updateNotification`) — not setter names (`setEvents`)
- **Derived values live in `useMemo`** — never recomputed in the view
- **Types live in `types.ts`** (rule A6) — import them here, don't define inline

## `queryHandler.ts` Pattern

```ts
// src/modules/dashboard/controller/hooks/queryHandler.ts
export function useDashboardQueryHandler(gs: ReturnType<typeof useDashboardGlobalState>) {
  const load = useCallback(async () => {
    const [eventsRes, locationsRes, pairingsRes] = await Promise.all([
      fetcher('/api/events', listSchema),
      fetcher('/api/elders/location', locationsSchema),
      fetcher('/api/pairings/me', pairingsSchema),
    ])
    if (eventsRes.success) gs.replaceAll(eventsRes.data.events, eventsRes.data.notifications)
    else gs.setError(eventsRes.error)
    if (locationsRes.success) gs.setLocations(locationsRes.data.locations)
    if (pairingsRes.success) gs.setPairings(pairingsRes.data)
  }, [gs])

  useEffect(() => { void load() }, [load])
  return { reload: load }
}
```

Rules:
- **Always use `fetcher()` from `src/services/adapter/fetcher.ts`** (rule A4) — never `fetch()` directly
- **Always pass a Zod schema** — the fetcher validates the response and returns `ActionResult<T>`
- **Return only `{ reload }`** — the data lives in `globalState`, not in this hook
- **Kick off the initial load in a `useEffect`** with `void load()`

## `handler.ts` Pattern

```ts
// src/modules/dashboard/controller/hooks/handler.ts
export function useDashboardHandler(args: {
  gs: ReturnType<typeof useDashboardGlobalState>
  reload: () => Promise<void>
}): DashboardHandler {
  const ack = async (notificationId: string) => {
    const res = await fetcher(
      `/api/notifications/${notificationId}/ack`,
      z.object({ locked: z.boolean(), lockedByCaregiverId: z.string().optional() }),
      { method: 'POST', body: {} },
    )
    if (res.success) args.gs.updateNotification(notificationId, { ackAt: new Date().toISOString(), lockedByCaregiverId: res.data.lockedByCaregiverId })
    else args.gs.setError(res.error)
  }

  return { ack, order, reload: args.reload }
}
```

Rules:
- **Accept `Pick<>` of the dependencies you need** (rule A8) — keeps the handler trivially testable
- **Handler functions are `async` and void-returning** — don't bubble `ActionResult`s up to the view
- **Return type is declared in `types.ts`** as `ModuleHandler` — import it here

## Level 1 + `formHandler.ts` (Forms with Zod)

Real example: `src/modules/register/` (multi-step OTP + profile flow).

```ts
// src/modules/register/controller/hooks/formHandler.ts
export const registerSchema = z.object({
  phone: z.string().min(9, 'required'),
  code: z.string().length(6, '6 digits'),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
})
export type RegisterFormValues = z.infer<typeof registerSchema>

export function useRegisterFormHandler() {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone: '', code: '', name: '', email: '' },
  })
  return { form }
}
```

Chain:
```
formHandler → globalState (step, loading, error) → queryHandler (lookup) → handler (sendOtp, verify, submit)
```

Handlers read form values via `form.getValues()` and trigger validation with `form.trigger('fieldName')`. The handler never owns form state.

## Level 2 (Sub-Component with Local State)

When a view needs its own UI state but no API calls, nest a smaller controller **inside the view** — same shape, no `queryHandler`, no `actions`:

```
views/<subView>/
├── controller/
│   ├── controller.ts
│   └── hooks/
│       ├── globalState.ts
│       └── handler.ts
├── <subView>.tsx
└── types.ts
```

## Server Actions

Larnma currently favours API routes + `fetcher()` over Next Server Actions, but where you use a server action keep it under `controller/actions.ts` and return `ActionResult<T>` (rule A9):

```ts
'use server'
import type { ActionResult } from '@/shared/types'

export async function submitInvite(token: string): Promise<ActionResult<{ elderId: string }>> {
  try {
    // call service code — repository, notifications, etc.
    return { success: true, data: { elderId }, error: null }
  } catch (e) {
    return { success: false, data: null, error: String(e) }
  }
}
```

## Key Rules Checklist (self-review will flag any miss)

- [ ] `types.ts` is the single source of truth (A6) — no types defined inline in hooks
- [ ] Main page is pure wiring — no logic beyond destructuring the controller and passing props to the view
- [ ] Views receive flat props only (A7) — no `gs`, no `useStore()`, no controller object
- [ ] Handler props declared via `Pick<GlobalState, …>` or a small typed struct (A8)
- [ ] `fetcher()` for every client-side call (A4)
- [ ] `'use client'` on the main page and controller where needed — server pages should only glue the client page in
- [ ] Handlers catch errors and push them to `gs.setError(...)` (or equivalent) — never let exceptions surface to the view
- [ ] Hooks are named `use…` and each lives in its own file under `controller/hooks/`

## When to Use What

| Situation | Pattern | `formHandler` | `queryHandler` | `actions.ts` | Subscriptions |
|---|---|:-:|:-:|:-:|:-:|
| Page that fetches + mutates | Level 1 | — | Yes | Optional | — |
| Page with live SSE feed | Level 1 | — | Yes | — | Yes (`eventStream.ts`) |
| Form / dialog with Zod | Level 1 + formHandler | Yes | Sometimes | Rare | — |
| Sub-component with local UI state only | Level 2 | — | — | — | — |
| Pure presentational | no controller | — | — | — | — |

## Reference Modules

| Module | Shape | Reason |
|---|---|---|
| `dashboard/` | Level 1 + `eventStream` | Live SSE + fetch + multiple mutations |
| `elderHome/` | Level 1 + `wakeWord` + `elderEventStream` | Voice capture + push + upload handler |
| `register/` | Level 1 + `formHandler` | Multi-step OTP + profile with Zod |
| `inviteLanding/` | Level 1 + `formHandler` | Token fetch + accept action |
| `elderProfile/` | Level 1 + `formHandler` | View mode + edit mode + PATCH |
| `elderMe/` | Level 1 (no handler, read-only) | Fetch-only |
| `elderFood/` | Level 1 | Fetch menus + create food request |
| `pair/` | Level 1 (no `queryHandler`) | Device-side consume POST only |
