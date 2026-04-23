# Dashboard Critical Alert Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface an active modal dialog with "โทรหายาย" / "โทร 1669" actions when a `critical` or `high` priority notification hits the caregiver dashboard (real-time via SSE, or still-unacknowledged on page mount).

**Architecture:** Add a pure `useCriticalAlerts` hook inside `src/modules/dashboard/controller/hooks/` that derives pending alert cases from existing dashboard state, tracks dismissed case IDs in a ref (in-memory, per-session), and exposes a `batch-ack + navigate to tel:` handler set. Render via a new `src/components/molecule/criticalAlertDialog/` which consumes only flat props. Extend `/api/pairings/me` once to carry the elder's `name` + `phone`; all other data flows through existing state.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Zod, next-intl, Jest + `@testing-library/react`, Radix-backed atom `<Dialog>`.

**Spec:** [`docs/superpowers/specs/2026-04-24-dashboard-critical-alert-dialog-design.md`](../specs/2026-04-24-dashboard-critical-alert-dialog-design.md)

---

## Task 0: Prepare a feature branch

**Files:** none (git only)

- [ ] **Step 0.1: Confirm clean working tree for this feature**

```bash
git status --short
```

Expected: may have **unrelated** modified files left over from previous work (`src/services/eventBus/eventBus.ts`, `src/app/api/orders/route.ts`, etc.). Do NOT stage or revert them — they belong to another in-flight change. Only our newly-created files may be touched in this plan.

- [ ] **Step 0.2: Create and switch to the feature branch**

```bash
git checkout -b feat/dashboard-critical-alert-dialog
```

Expected: `Switched to a new branch 'feat/dashboard-critical-alert-dialog'`

> Rationale: commit rule requires `<type>` to match branch prefix. Tasks below use `feat:` and `test:` messages, which need a `feat/*` branch.

---

## Task 1: Extend `/api/pairings/me` response with `elderName` + `elderPhone`

**Files:**
- Modify: `src/app/api/pairings/me/route.ts`
- Modify: `src/app/api/pairings/me/__tests__/route.test.ts`

- [ ] **Step 1.1: Add a failing test that asserts the new fields**

Append these two tests to the existing `describe('GET /api/pairings/me', …)` block in `src/app/api/pairings/me/__tests__/route.test.ts` (just before the closing `})`):

```ts
it('includes elderName and elderPhone joined from the elder user', async () => {
  const { cookie, elderId } = await bootCaregiver()
  const r = await GET(req(cookie))
  expect(r.status).toBe(200)
  const body = await r.json()
  expect(body[0]).toMatchObject({
    elderId,
    elderName: 'ย่า',
    elderPhone: '0822',
  })
})

it('returns null elderName/elderPhone when the elder user is missing', async () => {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
  // pairing references an elderId that was never created as a user
  repo.createPairing({
    elderId: 'missing-elder-id',
    caregiverId: cg.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const s = await issueCaregiverSession({ userId: cg.id })
  const cookie = `${COOKIES.access}=${s.accessToken}`
  const r = await GET(req(cookie))
  const body = await r.json()
  expect(body[0].elderName).toBeNull()
  expect(body[0].elderPhone).toBeNull()
})
```

- [ ] **Step 1.2: Run the test and verify it fails**

```bash
npx jest src/app/api/pairings/me/__tests__/route.test.ts --no-coverage
```

Expected: the two new tests fail (missing `elderName` / `elderPhone` on response).

- [ ] **Step 1.3: Modify the route to join elder user data**

Replace the contents of `src/app/api/pairings/me/route.ts` with:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  const repo = getRepository()
  const pairings = repo.listPairingsByCaregiver(auth.userId)

  const body = pairings.map((p) => {
    const elder = repo.getUserById(p.elderId)
    const elderName = elder?.name ?? null
    const elderPhone = elder?.phone && elder.phone.length > 0 ? elder.phone : null
    return {
      id: p.id,
      elderId: p.elderId,
      isPrimary: p.isPrimary,
      elderName,
      elderPhone,
    }
  })

  return NextResponse.json(body)
}
```

- [ ] **Step 1.4: Re-run the test and verify it passes**

```bash
npx jest src/app/api/pairings/me/__tests__/route.test.ts --no-coverage
```

Expected: all tests in the file pass (including the two new ones).

- [ ] **Step 1.5: Commit**

```bash
git add src/app/api/pairings/me/route.ts \
        src/app/api/pairings/me/__tests__/route.test.ts
git commit -m "$(cat <<'EOF'
feat(pairings): expose elderName and elderPhone on /api/pairings/me

- caregiver dashboard needs the primary elder's name and phone to render
  the critical-alert dialog's "โทรหายาย" action
- joins repo.getUserById(elderId) on top of the existing pairing list
- null-safe: returns null for both fields when the elder user cannot be
  resolved (data-integrity edge case)
EOF
)"
```

---

## Task 2: Extend `PairingInfo` type + `queryHandler` schema to carry new fields

**Files:**
- Modify: `src/modules/dashboard/types.ts`
- Modify: `src/modules/dashboard/controller/hooks/queryHandler.ts`
- Modify: `src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts`

- [ ] **Step 2.1: Update `PairingInfo` in `src/modules/dashboard/types.ts`**

Find the existing line (near the top of the file):

```ts
export type PairingInfo = Pick<Pairing, 'id' | 'elderId' | 'isPrimary'>
```

Replace it with:

```ts
export type PairingInfo = Pick<Pairing, 'id' | 'elderId' | 'isPrimary'> & {
  elderName: string | null
  elderPhone: string | null
}
```

- [ ] **Step 2.2: Update the zod schema in `queryHandler.ts`**

Find:

```ts
const pairingsSchema = z.array(
  z.object({
    id: z.string(),
    elderId: z.string(),
    isPrimary: z.boolean(),
  }),
)
```

Replace with:

```ts
const pairingsSchema = z.array(
  z.object({
    id: z.string(),
    elderId: z.string(),
    isPrimary: z.boolean(),
    elderName: z.string().nullable(),
    elderPhone: z.string().nullable(),
  }),
)
```

- [ ] **Step 2.3: Add a failing test for the schema extension**

Open `src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts`. Locate any existing test that asserts pairings get populated into state after `load()` resolves; directly after it, add a new `it(...)` that seeds a fetch response including `elderName` / `elderPhone` and asserts they surface on `gs.state.pairings[0]`.

If no suitable test exists in that file, add:

```ts
it('populates elderName and elderPhone from pairings response', async () => {
  // Arrange: mock global.fetch for the three load() endpoints in order.
  // load() fires /api/events, /api/elders/location, /api/pairings/me.
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ events: [], notifications: [] }),
    } as unknown as Response)
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ locations: [] }),
    } as unknown as Response)
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve([
          {
            id: 'P1',
            elderId: 'E1',
            isPrimary: true,
            elderName: 'ย่า',
            elderPhone: '0812345678',
          },
        ]),
    } as unknown as Response)

  const { result } = renderHook(() => {
    const gs = useDashboardGlobalState()
    const q = useDashboardQueryHandler(gs)
    return { gs, q }
  })

  // useEffect triggers load() on mount; wait one microtask chain
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })

  expect(result.current.gs.state.pairings[0]).toEqual({
    id: 'P1',
    elderId: 'E1',
    isPrimary: true,
    elderName: 'ย่า',
    elderPhone: '0812345678',
  })

  fetchMock.mockRestore()
})
```

At the top of the file (if not already present), ensure these imports exist:

```ts
import { act, renderHook } from '@testing-library/react'
import { useDashboardGlobalState } from '../globalState'
import { useDashboardQueryHandler } from '../queryHandler'
```

- [ ] **Step 2.4: Run tests**

```bash
npx jest src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts --no-coverage
```

Expected: the new test passes. Other existing tests in the file should continue to pass — if any of them stub a pairings response, you may need to add `elderName: null, elderPhone: null` to their mocked object to satisfy the tightened schema.

- [ ] **Step 2.5: Typecheck the whole project to catch any knock-on type errors**

```bash
npx tsc --noEmit
```

Expected: no errors. If anything else was destructuring `PairingInfo` with strict property expectations, fix by supplying `elderName: null, elderPhone: null` in that spot.

- [ ] **Step 2.6: Commit**

```bash
git add src/modules/dashboard/types.ts \
        src/modules/dashboard/controller/hooks/queryHandler.ts \
        src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): carry elderName and elderPhone through PairingInfo

- widens PairingInfo so the dashboard state has the primary elder's
  contact info available to the upcoming critical-alert dialog
- tightens the queryHandler zod schema so drift between API and
  client is caught at parse time, not at runtime render
EOF
)"
```

---

## Task 3: Add critical-alert types to `src/modules/dashboard/types.ts`

**Files:**
- Modify: `src/modules/dashboard/types.ts`

- [ ] **Step 3.1: Append the new types to `src/modules/dashboard/types.ts`**

Add at the end of the file:

```ts
export type CriticalAlertCase = Readonly<{
  id: string // notification id
  eventId: string
  priority: 'critical' | 'high'
  transcript: string // '' when the matching AudioEvent hasn't arrived yet
  summary: string // '' when the matching AudioEvent hasn't arrived yet
  createdAt: string
}>

export type CriticalAlertTone = 'critical' | 'high'

export type CriticalAlertState = Readonly<{
  open: boolean
  cases: ReadonlyArray<CriticalAlertCase>
  tone: CriticalAlertTone
  elderName: string | null
  elderPhone: string | null
}>

export type CriticalAlertHandler = Readonly<{
  onCallElder: () => void
  onCall1669: () => void
  onClose: () => void
}>

export type CriticalAlertDialogProps = CriticalAlertState & CriticalAlertHandler
```

- [ ] **Step 3.2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors (these types are new and not yet referenced).

- [ ] **Step 3.3: Commit**

```bash
git add src/modules/dashboard/types.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): add critical-alert state/handler/props types

Prep for the upcoming useCriticalAlerts hook and CriticalAlertDialog
molecule. Types live on the module's types.ts per rule A6 (single
source of truth, no inline types in hooks/views).
EOF
)"
```

---

## Task 4: Add a `tel:` navigation helper (injection seam for tests)

**Files:**
- Create: `src/modules/dashboard/controller/hooks/telNavigation.ts`
- Create: `src/modules/dashboard/controller/hooks/__tests__/telNavigation.test.ts`

- [ ] **Step 4.1: Write the failing test**

Create `src/modules/dashboard/controller/hooks/__tests__/telNavigation.test.ts`:

```ts
/**
 * @jest-environment jsdom
 */
import { navigateToTel } from '../telNavigation'

describe('navigateToTel', () => {
  it('sets window.location.href to the tel: url', () => {
    const hrefSetter = jest.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: new Proxy(
        { href: '' },
        {
          set(target, prop, value) {
            if (prop === 'href') hrefSetter(value)
            ;(target as Record<string | symbol, unknown>)[prop] = value
            return true
          },
        },
      ),
    })

    navigateToTel('0812345678')

    expect(hrefSetter).toHaveBeenCalledWith('tel:0812345678')
  })

  it('is a no-op when window is undefined (SSR guard)', () => {
    const originalWindow = global.window
    // @ts-expect-error - deliberately unset for SSR guard
    delete global.window
    expect(() => navigateToTel('0812345678')).not.toThrow()
    global.window = originalWindow
  })
})
```

- [ ] **Step 4.2: Run test and verify it fails**

```bash
npx jest src/modules/dashboard/controller/hooks/__tests__/telNavigation.test.ts --no-coverage
```

Expected: fail — `telNavigation.ts` does not exist.

- [ ] **Step 4.3: Implement the helper**

Create `src/modules/dashboard/controller/hooks/telNavigation.ts`:

```ts
export function navigateToTel(phoneOrNumber: string): void {
  if (typeof window === 'undefined') return
  window.location.href = `tel:${phoneOrNumber}`
}
```

- [ ] **Step 4.4: Re-run the test**

```bash
npx jest src/modules/dashboard/controller/hooks/__tests__/telNavigation.test.ts --no-coverage
```

Expected: both tests pass.

- [ ] **Step 4.5: Commit**

```bash
git add src/modules/dashboard/controller/hooks/telNavigation.ts \
        src/modules/dashboard/controller/hooks/__tests__/telNavigation.test.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): add navigateToTel helper for native dialer launch

Wrapped so the upcoming useCriticalAlerts hook can be unit-tested by
jest.mock'ing this module, instead of needing to monkey-patch
window.location inside every test of the hook itself.
EOF
)"
```

---

## Task 5: `useCriticalAlerts` hook — derivation (open / cases / tone)

**Files:**
- Create: `src/modules/dashboard/controller/hooks/criticalAlerts.ts`
- Create: `src/modules/dashboard/controller/hooks/__tests__/criticalAlerts.test.ts`

- [ ] **Step 5.1: Write the failing derivation tests**

Create `src/modules/dashboard/controller/hooks/__tests__/criticalAlerts.test.ts`:

```ts
/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react'
import type { AudioEvent, Notification } from '@/shared/types'
import { useCriticalAlerts } from '../criticalAlerts'

jest.mock('../telNavigation', () => ({
  navigateToTel: jest.fn(),
}))

function makeNoti(overrides: Partial<Notification> = {}): Notification {
  return {
    id: overrides.id ?? 'N1',
    eventId: overrides.eventId ?? 'E1',
    caregiverId: overrides.caregiverId ?? 'CG1',
    priority: overrides.priority ?? 'critical',
    createdAt: overrides.createdAt ?? '2026-04-24T12:00:00.000Z',
    ...overrides,
  }
}

function makeEvent(overrides: Partial<AudioEvent> = {}): AudioEvent {
  return {
    id: overrides.id ?? 'E1',
    elderId: overrides.elderId ?? 'EL1',
    transcript: overrides.transcript ?? 'ตกบันได',
    mood: overrides.mood ?? 'DANGER',
    intent: overrides.intent ?? 'DANGER',
    confidence: overrides.confidence ?? 0.95,
    summary: overrides.summary ?? 'คุณยายตกบันได',
    entities: overrides.entities ?? {},
    createdAt: overrides.createdAt ?? '2026-04-24T12:00:00.000Z',
  }
}

const NO_ELDER = null
const ELDER = { name: 'ย่า', phone: '0812345678' }
const noopAck = async () => {}

describe('useCriticalAlerts — derivation', () => {
  it('returns open=false when there are no notifications', () => {
    const { result } = renderHook(() =>
      useCriticalAlerts([], [], ELDER, noopAck),
    )
    expect(result.current.open).toBe(false)
    expect(result.current.cases).toEqual([])
  })

  it('returns open=false when all notifications are normal/log', () => {
    const notis = [
      makeNoti({ id: 'N1', priority: 'normal' }),
      makeNoti({ id: 'N2', priority: 'log' }),
    ]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, [], ELDER, noopAck),
    )
    expect(result.current.open).toBe(false)
  })

  it('returns open=true when an unacked critical notification is present', () => {
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const events = [makeEvent({ id: 'E1' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, noopAck),
    )
    expect(result.current.open).toBe(true)
    expect(result.current.cases).toHaveLength(1)
    expect(result.current.cases[0]).toMatchObject({
      id: 'N1',
      priority: 'critical',
      transcript: 'ตกบันได',
      summary: 'คุณยายตกบันได',
    })
  })

  it('returns open=true when an unacked high notification is present', () => {
    const notis = [makeNoti({ id: 'N2', priority: 'high', eventId: 'E2' })]
    const events = [
      makeEvent({ id: 'E2', transcript: 'ปวดหัว', summary: 'คุณยายปวดหัว' }),
    ]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, noopAck),
    )
    expect(result.current.open).toBe(true)
    expect(result.current.tone).toBe('high')
  })

  it('filters out acknowledged notifications', () => {
    const notis = [
      makeNoti({
        id: 'N1',
        priority: 'critical',
        ackAt: '2026-04-24T12:05:00.000Z',
      }),
    ]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, [], ELDER, noopAck),
    )
    expect(result.current.open).toBe(false)
  })

  it('tone is critical when any case is critical', () => {
    const notis = [
      makeNoti({ id: 'N1', priority: 'high', eventId: 'E1' }),
      makeNoti({ id: 'N2', priority: 'critical', eventId: 'E2' }),
    ]
    const events = [makeEvent({ id: 'E1' }), makeEvent({ id: 'E2' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, noopAck),
    )
    expect(result.current.tone).toBe('critical')
    expect(result.current.cases).toHaveLength(2)
  })

  it('tone is high when all cases are high-only', () => {
    const notis = [
      makeNoti({ id: 'N1', priority: 'high', eventId: 'E1' }),
      makeNoti({ id: 'N2', priority: 'high', eventId: 'E2' }),
    ]
    const events = [makeEvent({ id: 'E1' }), makeEvent({ id: 'E2' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, noopAck),
    )
    expect(result.current.tone).toBe('high')
  })

  it('falls back to empty strings when the matching event is missing', () => {
    const notis = [makeNoti({ id: 'N1', priority: 'critical', eventId: 'MISS' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, [], ELDER, noopAck),
    )
    expect(result.current.cases[0]).toMatchObject({
      id: 'N1',
      transcript: '',
      summary: '',
    })
  })

  it('passes through elderName and elderPhone from primaryElder', () => {
    const { result } = renderHook(() =>
      useCriticalAlerts([], [], ELDER, noopAck),
    )
    expect(result.current.elderName).toBe('ย่า')
    expect(result.current.elderPhone).toBe('0812345678')
  })

  it('sets elderName and elderPhone to null when no primaryElder', () => {
    const { result } = renderHook(() =>
      useCriticalAlerts([], [], NO_ELDER, noopAck),
    )
    expect(result.current.elderName).toBeNull()
    expect(result.current.elderPhone).toBeNull()
  })
})
```

- [ ] **Step 5.2: Run test and verify it fails**

```bash
npx jest src/modules/dashboard/controller/hooks/__tests__/criticalAlerts.test.ts --no-coverage
```

Expected: all new tests fail — `criticalAlerts.ts` does not exist yet.

- [ ] **Step 5.3: Implement the derivation portion of the hook**

Create `src/modules/dashboard/controller/hooks/criticalAlerts.ts`:

```ts
import { useCallback, useMemo, useRef, useState } from 'react'
import type { AudioEvent, Notification } from '@/shared/types'
import type {
  CriticalAlertCase,
  CriticalAlertHandler,
  CriticalAlertState,
} from '../../types'
import { navigateToTel } from './telNavigation'

type PrimaryElder = { name: string | null; phone: string | null } | null

export function useCriticalAlerts(
  notifications: ReadonlyArray<Notification>,
  events: ReadonlyArray<AudioEvent>,
  primaryElder: PrimaryElder,
  ackFn: (notificationId: string) => Promise<void>,
): CriticalAlertState & CriticalAlertHandler {
  const shownCaseIdsRef = useRef<Set<string>>(new Set())
  const [shownVersion, bumpShownVersion] = useState(0)

  const cases = useMemo<CriticalAlertCase[]>(() => {
    const out: CriticalAlertCase[] = []
    for (const n of notifications) {
      if (n.priority !== 'critical' && n.priority !== 'high') continue
      if (n.ackAt) continue
      if (shownCaseIdsRef.current.has(n.id)) continue
      const ev = events.find((e) => e.id === n.eventId)
      out.push({
        id: n.id,
        eventId: n.eventId,
        priority: n.priority,
        transcript: ev?.transcript ?? '',
        summary: ev?.summary ?? '',
        createdAt: n.createdAt,
      })
    }
    return out
    // shownVersion is bumped by markCurrentAsShown to invalidate this memo
    // whenever shownCaseIdsRef mutates (refs alone don't retrigger memos).
  }, [notifications, events, shownVersion])

  const tone: CriticalAlertState['tone'] = cases.some(
    (c) => c.priority === 'critical',
  )
    ? 'critical'
    : 'high'

  const elderName = primaryElder?.name ?? null
  const elderPhone = primaryElder?.phone ?? null

  const markCurrentAsShown = useCallback(() => {
    for (const c of cases) shownCaseIdsRef.current.add(c.id)
    bumpShownVersion((v) => v + 1)
  }, [cases])

  const onClose = useCallback(() => {
    markCurrentAsShown()
  }, [markCurrentAsShown])

  const onCallElder = useCallback(() => {
    if (!elderPhone) return
    void Promise.allSettled(cases.map((c) => ackFn(c.id))).then((results) => {
      for (const r of results) {
        if (r.status === 'rejected') console.error('ack failed', r.reason)
      }
    })
    markCurrentAsShown()
    navigateToTel(elderPhone)
  }, [ackFn, cases, elderPhone, markCurrentAsShown])

  const onCall1669 = useCallback(() => {
    void Promise.allSettled(cases.map((c) => ackFn(c.id))).then((results) => {
      for (const r of results) {
        if (r.status === 'rejected') console.error('ack failed', r.reason)
      }
    })
    markCurrentAsShown()
    navigateToTel('1669')
  }, [ackFn, cases, markCurrentAsShown])

  return {
    open: cases.length > 0,
    cases,
    tone,
    elderName,
    elderPhone,
    onCallElder,
    onCall1669,
    onClose,
  }
}
```

> Note: `useMemo`'s dependency array excludes `shownCaseIdsRef` on purpose — the ref is paired with `bumpShownVersion` to trigger re-render, and React re-invokes `useMemo` on every render anyway because the version changed in state. `notifications` and `events` deps guard against unnecessary re-evaluations when only unrelated state changes.

- [ ] **Step 5.4: Re-run the test**

```bash
npx jest src/modules/dashboard/controller/hooks/__tests__/criticalAlerts.test.ts --no-coverage
```

Expected: all derivation tests (step 5.1) pass. Action-related tests do not exist yet.

- [ ] **Step 5.5: Commit**

```bash
git add src/modules/dashboard/controller/hooks/criticalAlerts.ts \
        src/modules/dashboard/controller/hooks/__tests__/criticalAlerts.test.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): add useCriticalAlerts hook (derivation)

Derives the set of unacknowledged critical/high cases from the
dashboard state and picks the dialog's tone. Dismissed case IDs are
tracked in a ref so the same case does not re-prompt within the
current session (spec Q1(c) + Q6(a)).
EOF
)"
```

---

## Task 6: `useCriticalAlerts` hook — action handlers (close / call / batch-ack)

**Files:**
- Modify: `src/modules/dashboard/controller/hooks/__tests__/criticalAlerts.test.ts`

- [ ] **Step 6.1: Append the action-handler tests**

Add a new `describe` block at the bottom of `src/modules/dashboard/controller/hooks/__tests__/criticalAlerts.test.ts` (after the derivation `describe`):

```ts
describe('useCriticalAlerts — handlers', () => {
  const { navigateToTel } = jest.requireMock('../telNavigation') as {
    navigateToTel: jest.Mock
  }

  beforeEach(() => {
    navigateToTel.mockClear()
  })

  it('onClose marks all current cases as shown and closes', () => {
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const { result, rerender } = renderHook(
      ({ n }: { n: Notification[] }) =>
        useCriticalAlerts(n, [], ELDER, noopAck),
      { initialProps: { n: notis } },
    )
    expect(result.current.open).toBe(true)

    result.current.onClose()
    rerender({ n: notis }) // same data — but shownCaseIds now contains N1

    expect(result.current.open).toBe(false)
  })

  it('onCallElder fires ackFn once per displayed case and navigates', async () => {
    const ack = jest.fn().mockResolvedValue(undefined)
    const notis = [
      makeNoti({ id: 'N1', priority: 'critical', eventId: 'E1' }),
      makeNoti({ id: 'N2', priority: 'high', eventId: 'E2' }),
    ]
    const events = [makeEvent({ id: 'E1' }), makeEvent({ id: 'E2' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, ack),
    )

    result.current.onCallElder()

    // Promises were fired synchronously; let them settle
    await new Promise((r) => setTimeout(r, 0))

    expect(ack).toHaveBeenCalledTimes(2)
    expect(ack).toHaveBeenCalledWith('N1')
    expect(ack).toHaveBeenCalledWith('N2')
    expect(navigateToTel).toHaveBeenCalledWith('0812345678')
  })

  it('onCall1669 fires ackFn for each case and navigates to tel:1669', async () => {
    const ack = jest.fn().mockResolvedValue(undefined)
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const events = [makeEvent({ id: 'E1' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, ELDER, ack),
    )

    result.current.onCall1669()
    await new Promise((r) => setTimeout(r, 0))

    expect(ack).toHaveBeenCalledWith('N1')
    expect(navigateToTel).toHaveBeenCalledWith('1669')
  })

  it('onCallElder is a no-op when elderPhone is null', () => {
    const ack = jest.fn().mockResolvedValue(undefined)
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const events = [makeEvent({ id: 'E1' })]
    const { result } = renderHook(() =>
      useCriticalAlerts(notis, events, { name: 'ย่า', phone: null }, ack),
    )

    result.current.onCallElder()

    expect(ack).not.toHaveBeenCalled()
    expect(navigateToTel).not.toHaveBeenCalled()
  })

  it('does not crash when ackFn rejects; dialog still closes', async () => {
    const ack = jest.fn().mockRejectedValue(new Error('500'))
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const notis = [makeNoti({ id: 'N1', priority: 'critical' })]
    const events = [makeEvent({ id: 'E1' })]
    const { result, rerender } = renderHook(
      ({ n }: { n: Notification[] }) =>
        useCriticalAlerts(n, events, ELDER, ack),
      { initialProps: { n: notis } },
    )

    result.current.onCall1669()
    await new Promise((r) => setTimeout(r, 0))
    rerender({ n: notis })

    expect(result.current.open).toBe(false)
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('SSE appending a critical to a high-only dialog upgrades tone', () => {
    const initial: Notification[] = [
      makeNoti({ id: 'N1', priority: 'high', eventId: 'E1' }),
    ]
    const added: Notification[] = [
      makeNoti({ id: 'N2', priority: 'critical', eventId: 'E2' }),
      ...initial,
    ]
    const events = [makeEvent({ id: 'E1' }), makeEvent({ id: 'E2' })]
    const { result, rerender } = renderHook(
      ({ n }: { n: Notification[] }) =>
        useCriticalAlerts(n, events, ELDER, noopAck),
      { initialProps: { n: initial } },
    )

    expect(result.current.tone).toBe('high')

    rerender({ n: added })

    expect(result.current.tone).toBe('critical')
    expect(result.current.cases).toHaveLength(2)
  })
})
```

- [ ] **Step 6.2: Run the full hook test file**

```bash
npx jest src/modules/dashboard/controller/hooks/__tests__/criticalAlerts.test.ts --no-coverage
```

Expected: all tests — both the old derivation tests and the new handler tests — pass. The hook implementation from Task 5 already covers these behaviors; this task exists to pin them down with tests so future refactors cannot regress.

If any test fails, the most likely issues are:
- `navigateToTel` mock not invoked → check that the mock is declared at the TOP of the test file (Task 5, Step 5.1)
- The "onClose" test fails with `open=true` still → verify `bumpShownVersion` is called inside `markCurrentAsShown`

- [ ] **Step 6.3: Commit**

```bash
git add src/modules/dashboard/controller/hooks/__tests__/criticalAlerts.test.ts
git commit -m "$(cat <<'EOF'
test(dashboard): cover useCriticalAlerts action handlers

Pins the close/call/batch-ack behaviors described in the spec so
future hook refactors cannot regress. Covers ack rejection, phone
absent, and SSE-driven tone upgrade.
EOF
)"
```

---

## Task 7: Add i18n keys for the critical-alert dialog

**Files:**
- Modify: `messages/th.json`

- [ ] **Step 7.1: Locate the `"emergency"` section in `messages/th.json`**

Open the file. Find the existing `"emergency": { … }` object. It contains keys like `"handleIt": "ฉันจัดการ"` already.

- [ ] **Step 7.2: Add the new keys**

Inside the `"emergency"` object, add a new nested `"alert"` object. The final shape of the `emergency` block should include (alongside whatever is already there):

```jsonc
"emergency": {
  // …existing keys like "handleIt"…
  "alert": {
    "titleCritical": "🚨 เหตุฉุกเฉิน",
    "titleHigh": "⚠️ แจ้งเตือนด่วน",
    "summary": "{count} เหตุการณ์ต้องจัดการ",
    "callElder": "โทรหายาย",
    "call1669": "โทร 1669",
    "close": "ปิด",
    "noElderPhone": "ยังไม่ได้บันทึกเบอร์ยาย"
  }
}
```

Make sure JSON remains valid (trailing commas are not allowed in JSON).

- [ ] **Step 7.3: Typecheck / lint**

```bash
npx biome lint messages/th.json
```

Expected: no errors.

- [ ] **Step 7.4: Commit**

```bash
git add messages/th.json
git commit -m "$(cat <<'EOF'
feat(i18n): add emergency.alert.* keys for critical-alert dialog

Titles differ by tone (critical vs high), and copy covers both call
actions plus the "elder phone missing" hint. All strings are keyed
per project convention — no hard-coded Thai in components.
EOF
)"
```

---

## Task 8: `CriticalAlertDialog` molecule — structure + content

**Files:**
- Create: `src/components/molecule/criticalAlertDialog/criticalAlertDialog.tsx`
- Create: `src/components/molecule/criticalAlertDialog/index.ts`
- Create: `src/components/molecule/criticalAlertDialog/__tests__/criticalAlertDialog.test.tsx`

- [ ] **Step 8.1: Write the failing view tests**

Create `src/components/molecule/criticalAlertDialog/__tests__/criticalAlertDialog.test.tsx`:

```tsx
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CriticalAlertDialog } from '../criticalAlertDialog'
import type { CriticalAlertCase } from '@/modules/dashboard/types'

const aCase = (over: Partial<CriticalAlertCase> = {}): CriticalAlertCase => ({
  id: over.id ?? 'N1',
  eventId: over.eventId ?? 'E1',
  priority: over.priority ?? 'critical',
  transcript: over.transcript ?? 'ตกบันได',
  summary: over.summary ?? 'คุณยายตกบันได',
  createdAt: over.createdAt ?? '2026-04-24T05:00:00.000Z',
})

const noopHandlers = {
  onCallElder: jest.fn(),
  onCall1669: jest.fn(),
  onClose: jest.fn(),
}

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof CriticalAlertDialog>> = {},
) {
  const props = {
    open: true,
    cases: [aCase()],
    tone: 'critical' as const,
    elderName: 'ย่า',
    elderPhone: '0812345678',
    ...noopHandlers,
    ...overrides,
  }
  return render(<CriticalAlertDialog {...props} />)
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('CriticalAlertDialog — rendering', () => {
  it('renders the critical title when tone=critical', () => {
    renderDialog({ tone: 'critical' })
    expect(screen.getByText(/เหตุฉุกเฉิน/)).toBeInTheDocument()
  })

  it('renders the high title when tone=high', () => {
    renderDialog({ tone: 'high', cases: [aCase({ priority: 'high' })] })
    expect(screen.getByText(/แจ้งเตือนด่วน/)).toBeInTheDocument()
  })

  it('renders the 1669 button as primary (destructive) when tone=critical', () => {
    renderDialog({ tone: 'critical' })
    const btn = screen.getByRole('button', { name: /1669/ })
    expect(btn.dataset.variant).toBe('destructive')
  })

  it('renders the elder call button as primary when tone=high', () => {
    renderDialog({ tone: 'high', cases: [aCase({ priority: 'high' })] })
    const btn = screen.getByRole('button', { name: /โทรหายาย/ })
    expect(btn.dataset.variant).toBe('default')
  })

  it('renders each case with its priority badge, transcript and summary', () => {
    renderDialog({
      cases: [
        aCase({
          id: 'N1',
          priority: 'critical',
          transcript: 'ตกบันได',
          summary: 'คุณยายตกบันได',
        }),
        aCase({
          id: 'N2',
          priority: 'high',
          transcript: 'ปวดหัว',
          summary: 'คุณยายปวดหัว',
        }),
      ],
    })
    expect(screen.getByText(/ตกบันได/)).toBeInTheDocument()
    expect(screen.getByText(/คุณยายตกบันได/)).toBeInTheDocument()
    expect(screen.getByText(/ปวดหัว/)).toBeInTheDocument()
    const badges = screen.getAllByRole('presentation', { hidden: true })
    // PriorityBadge renders as a <span>; look for 2 priority data-slots
    const priorityBadges =
      document.querySelectorAll('[data-slot="priority-badge"]')
    expect(priorityBadges).toHaveLength(2)
    void badges // suppress unused
  })

  it('falls back to em-dash when transcript and summary are empty', () => {
    renderDialog({
      cases: [aCase({ transcript: '', summary: '' })],
    })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('disables the elder call button and shows a hint when elderPhone is null', () => {
    renderDialog({ elderPhone: null })
    const btn = screen.getByRole('button', { name: /โทรหายาย/ })
    expect(btn).toBeDisabled()
    expect(screen.getByText(/ยังไม่ได้บันทึกเบอร์ยาย/)).toBeInTheDocument()
  })
})

describe('CriticalAlertDialog — interaction', () => {
  it('invokes onCall1669 when the 1669 button is clicked', async () => {
    const onCall1669 = jest.fn()
    renderDialog({ onCall1669 })
    await userEvent.click(screen.getByRole('button', { name: /1669/ }))
    expect(onCall1669).toHaveBeenCalledTimes(1)
  })

  it('invokes onCallElder when the elder-call button is clicked', async () => {
    const onCallElder = jest.fn()
    renderDialog({ onCallElder })
    await userEvent.click(screen.getByRole('button', { name: /โทรหายาย/ }))
    expect(onCallElder).toHaveBeenCalledTimes(1)
  })

  it('invokes onClose when the close button is clicked', async () => {
    const onClose = jest.fn()
    renderDialog({ onClose })
    await userEvent.click(screen.getByRole('button', { name: /ปิด/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not render when open=false', () => {
    renderDialog({ open: false })
    expect(screen.queryByText(/เหตุฉุกเฉิน/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 8.2: Run the test — expect fail**

```bash
npx jest src/components/molecule/criticalAlertDialog/__tests__/criticalAlertDialog.test.tsx --no-coverage
```

Expected: all tests fail — component does not exist.

- [ ] **Step 8.3: Implement the component**

Create `src/components/molecule/criticalAlertDialog/criticalAlertDialog.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atom/dialog'
import { PriorityBadge } from '@/components/molecule/priorityBadge'
import type { CriticalAlertDialogProps } from '@/modules/dashboard/types'

export function CriticalAlertDialog({
  open,
  cases,
  tone,
  elderName: _elderName,
  elderPhone,
  onCallElder,
  onCall1669,
  onClose,
}: CriticalAlertDialogProps) {
  const t = useTranslations('emergency.alert')

  const elderCallVariant = tone === 'critical' ? 'outline' : 'default'
  const e1669Variant = tone === 'critical' ? 'destructive' : 'outline'
  const elderCallSize = tone === 'critical' ? 'default' : 'lg'
  const e1669Size = tone === 'critical' ? 'lg' : 'default'

  const elderDisabled = elderPhone == null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle
            className={
              tone === 'critical'
                ? 'flex items-center gap-2 text-destructive'
                : 'flex items-center gap-2'
            }
          >
            {tone === 'critical' ? t('titleCritical') : t('titleHigh')}
          </DialogTitle>
          <DialogDescription>
            {t('summary', { count: cases.length })}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-3">
          {cases.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-1"
              data-testid={`critical-alert-case-${c.id}`}
            >
              <div className="flex items-center gap-2">
                <PriorityBadge priority={c.priority} />
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleTimeString('th-TH')}
                </span>
              </div>
              {c.transcript.length === 0 && c.summary.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <>
                  {c.transcript.length > 0 && (
                    <p className="text-sm font-medium">"{c.transcript}"</p>
                  )}
                  {c.summary.length > 0 && (
                    <p className="text-sm text-muted-foreground">{c.summary}</p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {elderDisabled && (
          <p className="text-xs text-muted-foreground">{t('noElderPhone')}</p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('close')}
          </Button>
          <Button
            variant={elderCallVariant}
            size={elderCallSize}
            disabled={elderDisabled}
            onClick={onCallElder}
          >
            {t('callElder')}
          </Button>
          <Button
            variant={e1669Variant}
            size={e1669Size}
            onClick={onCall1669}
            data-testid="critical-alert-call-1669"
          >
            {t('call1669')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Create `src/components/molecule/criticalAlertDialog/index.ts`:

```ts
export { CriticalAlertDialog } from './criticalAlertDialog'
```

- [ ] **Step 8.4: Add `data-variant` to the atom button (required for the test selector)**

The atom button already exposes `data-slot="button"` but not `data-variant`. Add it so the dialog tests (and future design-system tests) can assert variants without coupling to Tailwind class strings.

Open `src/components/atom/button/button.tsx`. In BOTH `<Comp>` branches (the `asChild` branch around line 54 and the default branch around line 65), add the `data-variant` and `data-size` attributes next to the existing `data-slot`:

```tsx
// asChild branch:
<Comp
  data-slot="button"
  data-variant={variant ?? 'default'}
  data-size={size ?? 'default'}
  className={cn(buttonVariants({ variant, size, className }))}
  {...props}
>
  {children}
</Comp>
```

```tsx
// default branch:
<Comp
  data-slot="button"
  data-variant={variant ?? 'default'}
  data-size={size ?? 'default'}
  className={cn(buttonVariants({ variant, size, className }))}
  disabled={isDisabled}
  {...props}
>
  {loading ? <Loader2 className="animate-spin" /> : null}
  {children}
</Comp>
```

- [ ] **Step 8.5: Run the atom button's existing tests to confirm no regression**

```bash
npx jest src/components/atom/button/__tests__/ --no-coverage
```

Expected: all tests still pass. The new `data-*` attributes are additive.

- [ ] **Step 8.6: Commit the atom button change on its own**

```bash
git add src/components/atom/button/button.tsx
git commit -m "$(cat <<'EOF'
enhance(ui): expose data-variant and data-size on atom Button

Lets tests and tools assert a button's visual role without coupling to
the generated Tailwind class names. Purely additive — defaults to
'default' when the variant/size prop is omitted.
EOF
)"
```

> Commit type: current branch is `feat/*`; `enhance:` is in the allowed type list (see `commit.md`) and matches the change, which incrementally improves an existing atom.

- [ ] **Step 8.7: Run the dialog test — expect pass**

```bash
npx jest src/components/molecule/criticalAlertDialog/__tests__/criticalAlertDialog.test.tsx --no-coverage
```

Expected: all tests pass.

- [ ] **Step 8.8: Commit the dialog**

```bash
git add src/components/molecule/criticalAlertDialog/criticalAlertDialog.tsx \
        src/components/molecule/criticalAlertDialog/index.ts \
        src/components/molecule/criticalAlertDialog/__tests__/criticalAlertDialog.test.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add CriticalAlertDialog molecule

Renders a list of unacknowledged critical/high cases with two call
actions (โทรหายาย / โทร 1669) and a close button. Tone drives which
button is primary (destructive 1669 for critical, default elder-call
for high). Disabled elder-call + caption when no phone is on file.

- consumes flat props only (rule A7)
- reuses the existing PriorityBadge molecule and Dialog atom (A1/A11)
- all copy keyed via next-intl (emergency.alert.*)
EOF
)"
```

---

## Task 9: Wire `useCriticalAlerts` + `<CriticalAlertDialog />` into the dashboard

**Files:**
- Modify: `src/modules/dashboard/controller/controller.ts`
- Modify: `src/modules/dashboard/dashboardPage.tsx`

- [ ] **Step 9.1: Update the controller to call the new hook**

Replace the contents of `src/modules/dashboard/controller/controller.ts` with:

```ts
'use client'

import { useCriticalAlerts } from './hooks/criticalAlerts'
import { useDashboardEventStream } from './hooks/eventStream'
import { useDashboardGlobalState } from './hooks/globalState'
import { useDashboardHandler } from './hooks/handler'
import { useDashboardQueryHandler } from './hooks/queryHandler'

export function useDashboardController() {
  const gs = useDashboardGlobalState()
  const { reload } = useDashboardQueryHandler(gs)
  const handler = useDashboardHandler({ gs, reload })
  useDashboardEventStream(gs)

  const primaryPairing = gs.state.pairings.find((p) => p.isPrimary) ?? null
  const primaryElder = primaryPairing
    ? { name: primaryPairing.elderName, phone: primaryPairing.elderPhone }
    : null

  const alerts = useCriticalAlerts(
    gs.state.notifications,
    gs.state.events,
    primaryElder,
    handler.ack,
  )

  return { state: gs.state, handler, alerts }
}
```

- [ ] **Step 9.2: Render the dialog from `DashboardPage`**

Open `src/modules/dashboard/dashboardPage.tsx`.

Add an import at the top, alongside the other `@/components/molecule/*` imports:

```ts
import { CriticalAlertDialog } from '@/components/molecule/criticalAlertDialog'
```

Update the `useDashboardController()` destructure near the top of the component:

```ts
const { state, handler, alerts } = useDashboardController()
```

Then, just above the existing `<Dialog open={!!pendingOrder}` allergy dialog (around line 290), add:

```tsx
<CriticalAlertDialog {...alerts} />
```

- [ ] **Step 9.3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9.4: Run the full test suite**

```bash
npm test -- --silent
```

Expected: every suite green, no regressions. Coverage thresholds (≥80%) still met. If `dashboardPage.tsx` has an integration test that asserts a specific render structure, it may need to be updated to accept the extra dialog in the tree.

- [ ] **Step 9.5: Commit**

```bash
git add src/modules/dashboard/controller/controller.ts \
        src/modules/dashboard/dashboardPage.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): surface CriticalAlertDialog on the caregiver home

Wires the new useCriticalAlerts hook through the dashboard controller
and renders the dialog beside the existing allergy-warning one.

- dialog auto-opens on mount if there are unacked critical/high cases
- dialog appends new cases that arrive via SSE and upgrades tone to
  critical if any incoming case is critical (spec lifecycle §2)
EOF
)"
```

---

## Task 10: Final verification + manual smoke

**Files:** none (verification only)

- [ ] **Step 10.1: Run `/verify` (project pre-PR gate — lint + unit + coverage + build + sonar)**

If the skill is installed, invoke it; otherwise run each command manually:

```bash
npm run lint
npm test -- --silent
npm run build
```

Expected: all green. No coverage regressions (≥80% per file). If `sonar` is configured locally, run it; otherwise note it runs in CI.

- [ ] **Step 10.2: Start the dev server and smoke-test the dialog in a browser**

```bash
npm run dev
```

In a second shell, drive the elder audio endpoint to produce a critical case:

```bash
# 1. Sign in as a caregiver in the browser at http://localhost:3000
# 2. Open devtools → Application → Cookies; copy the device cookie from
#    an elder session (or use the seed script if one exists under scripts/).
# 3. Fire a critical audio event:
curl -X POST http://localhost:3000/api/audio \
  -H "content-type: application/json" \
  -H "cookie: <device-session-cookie>" \
  -d '{"hintKeyword":"ล้ม"}'
```

**Manual checklist (tick each):**
- [ ] Dashboard shows the critical-alert dialog within ~1 second of the POST
- [ ] Title reads `🚨 เหตุฉุกเฉิน`; "โทร 1669" is the destructive primary button
- [ ] Clicking "ปิด" closes the dialog and the same case does not reappear within the same page load
- [ ] Reloading the page re-opens the dialog (case still unacked server-side)
- [ ] Clicking "ฉันจัดการ" on the matching notification card acks it; dialog does NOT reopen on reload
- [ ] Fire a "ปวดหัว" hint (`high`) instead → dialog uses `⚠️ แจ้งเตือนด่วน` title and "โทรหายาย" is primary
- [ ] On a phone or devtools device emulation, clicking "โทรหายาย" opens the native dialer with the elder's phone prefilled; "โทร 1669" opens it with 1669
- [ ] Set the elder user's phone to an empty string in the in-memory seed → "โทรหายาย" disabled with caption "ยังไม่ได้บันทึกเบอร์ยาย"; "โทร 1669" still works

- [ ] **Step 10.3: If all checks pass, this plan is complete**

No commit needed unless a bug was fixed during smoke. If a fix was required, commit it with a `fix(dashboard): …` message on the same branch.

---

## Self-review trace (not a task — completed by author)

**Spec coverage:**
- Q1 trigger on-mount + SSE, once per session → Task 5 (derivation + shownCaseIdsRef)
- Q2 differentiated UX per severity → Task 8 (`elderCallVariant` / `e1669Variant`)
- Q3 call = ack + close; dismiss = close only → Task 5 `onCallElder/onCall1669` + Task 6 tests
- Q4 combined dialog + `i` tie-breaker (any critical → critical tone) → Task 5 `tone` computation
- Q5 batch ack, optimistic close → Task 5 `Promise.allSettled` + `markCurrentAsShown`
- Q6 in-memory per session → Task 5 `shownCaseIdsRef`
- Q7 disabled + hint when no phone → Task 8 `elderDisabled` + `noElderPhone` copy

**Placeholder scan:** no TBDs; every step lists exact file paths and full code.

**Type consistency:** `CriticalAlertCase.priority` type matches `'critical' | 'high'` throughout; hook and dialog both import from `@/modules/dashboard/types`.
