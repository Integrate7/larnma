# Dashboard Critical Alert Dialog — Design

- **Date:** 2026-04-24
- **Surface:** Caregiver dashboard (`/dashboard`)
- **Branch:** `fix/dashboard-sse-infinite-loop` (current) → will continue on new branch during implementation
- **Spec owner:** Roj (SCB Tech X)

## Problem

When an elder's voice event produces a `critical` (e.g. fall, can't breathe) or `high` (e.g. pain, headache) priority notification, the caregiver may miss it — today it only shows as a row in the "การแจ้งเตือน" list with a "ฉันจัดการ" button. There is no active prompt pulling the caregiver's attention, and no immediate path to call the elder or the 1669 emergency hotline.

## Goal

When a `critical` or `high` notification arrives on the dashboard (real-time via SSE, or present unacknowledged on page mount), surface a modal dialog that:

1. Names the case(s) and severity.
2. Offers two call actions — "โทรหายาย" (elder's phone) and "โทร 1669" (Thai emergency hotline) — with the primary action determined by severity.
3. Acknowledges the underlying notification(s) when a call action is taken (batch).
4. Does not repeatedly interrupt the caregiver for a case they already chose to dismiss within the current session.

## Non-Goals

- Push notifications to the OS / background tab.
- SMS or Line fallback if the call can't be placed.
- Multi-elder support in one dialog (primary elder only — matches current dashboard scope).
- Redesigning the existing allergy-confirmation dialog (out of scope; stay focused).
- Server-side persistence of "has this user seen the dialog" state (in-memory per Q6).

## User decisions (from brainstorming)

| ID | Decision |
|---|---|
| Q1 | Trigger on both SSE push AND on-mount unacknowledged scan; each case shows at most once per session. |
| Q2 | Both `critical` and `high` priorities trigger, with **differentiated UX per severity** (see §UX). |
| Q3 | Clicking a call button = batch-ack all cases in the dialog + close. Clicking "ปิด" = close only (user must still ack each card separately). |
| Q4 | **Combined** — multiple cases render in one dialog; if any case is `critical`, the whole dialog takes the critical tone. |
| Q5 | Call action batch-acks all displayed cases, optimistic close (errors logged, not blocking). |
| Q6 | "Per session" = in-memory only (React ref). Refresh the page → any still-unacked case may re-prompt. |
| Q7 | No elder phone on file → "โทรหายาย" button is `disabled` with caption "ยังไม่ได้บันทึกเบอร์ยาย". |

Chosen approach: **Approach A** — new hook in `controller/hooks/` + new molecule component + minimal type/API extension. Respects Controller-View pattern (A3) and atomic component rules (A1, A7, A11).

## Architecture

### New files

```
src/modules/dashboard/controller/hooks/
  criticalAlerts.ts                       # derive + track + batch-ack
  __tests__/criticalAlerts.test.ts

src/components/molecule/criticalAlertDialog/
  criticalAlertDialog.tsx                 # pure view; flat props (A7)
  index.ts                                # barrel re-export
  __tests__/criticalAlertDialog.test.tsx
```

### Modified files

```
src/modules/dashboard/types.ts
  - PairingInfo: add elderPhone: string | null, elderName: string | null
  - new types: CriticalAlertCase, CriticalAlertTone, CriticalAlertState, CriticalAlertHandler

src/modules/dashboard/controller/hooks/queryHandler.ts
  - pairingsSchema extended with elderPhone (string | null), elderName (string | null)

src/modules/dashboard/controller/controller.ts
  - call useCriticalAlerts(...) and merge its state/handler into the controller return

src/modules/dashboard/dashboardPage.tsx
  - add <CriticalAlertDialog {...alertState} on*={alertHandler.*} /> at bottom

src/app/api/pairings/me/route.ts
  - join repo.getUser(elderId) to include elderName + elderPhone in response

messages/th.json
  - new keys under "emergency.alert.*"
```

### Responsibility boundaries

- **Hook (`criticalAlerts.ts`)**: pure logic — derive pending cases, tone selection, shown-id tracking, batch-ack orchestration, navigate to `tel:`. No rendering.
- **View (`criticalAlertDialog.tsx`)**: pure render — no fetch, no `window.*`, no controller awareness. Receives flat props.
- **Controller**: wires hook + state + existing ack handler together.
- **API / queryHandler**: expand payload to include elder phone/name; no new endpoint.

## Data flow

### Types

```ts
export type CriticalAlertCase = {
  id: string          // notification id
  eventId: string
  priority: 'critical' | 'high'
  transcript: string  // from matching AudioEvent; '' if missing
  summary: string     // from matching AudioEvent; '' if missing
  createdAt: string   // notification.createdAt
}

export type CriticalAlertTone = 'critical' | 'high'

export type CriticalAlertState = {
  open: boolean
  cases: CriticalAlertCase[]
  tone: CriticalAlertTone
  elderName: string | null
  elderPhone: string | null
}

export type CriticalAlertHandler = {
  onCallElder: () => void
  onCall1669: () => void
  onClose: () => void
}
```

### Hook signature

```ts
export function useCriticalAlerts(
  notifications: Notification[],
  events: AudioEvent[],
  primaryElder: { name: string | null; phone: string | null } | null,
  ackFn: (notificationId: string) => Promise<void>,
): CriticalAlertState & CriticalAlertHandler
```

### Derivation (inside hook, `useMemo` on `[notifications, events, primaryElder, shownVersion]`)

```
pending = notifications.filter(n =>
  (n.priority === 'critical' || n.priority === 'high')
  && !n.ackAt
  && !shownCaseIdsRef.current.has(n.id)
)
cases = pending.map(n => toCase(n, events))
tone = cases.some(c => c.priority === 'critical') ? 'critical' : 'high'
open = cases.length > 0
```

`shownCaseIdsRef` is a `useRef<Set<string>>`. A companion `shownVersion` number in `useState` is bumped whenever the set changes so memoized derivations recompute.

### Lifecycle

1. **On mount / reload** — `queryHandler` populates `notifications`; hook derives → dialog opens if any case passes the filter.
2. **On SSE push** — `eventStream` appends notification; hook re-derives. If a new case passes the filter, it is added to the open dialog's list (or opens the dialog if closed). If the new case is `critical` while existing cases were all `high`, tone upgrades to `critical`.
3. **On `onClose`** — every currently-displayed `case.id` is added to `shownCaseIdsRef`; `shownVersion` bumps; `open` flips to `false`.
4. **On `onCallElder`**:
   1. Guard: if `elderPhone == null`, no-op.
   2. `Promise.allSettled(cases.map(c => ackFn(c.id)))` — fire and don't await; errors logged via `console.error`.
   3. Mark all cases as shown (same as `onClose`).
   4. `window.location.href = \`tel:${elderPhone}\`` (native dialer).
5. **On `onCall1669`** — same as `onCallElder` but navigates to `tel:1669` and never guards.

### "Shown once per session" semantics

- `shownCaseIdsRef` (in-memory) prevents re-prompting a case the user already dismissed or called in the current tab load.
- `ackAt` (server-side) separately hides acked cases from all caregivers' dashboards.
- Refresh / new tab → ref resets; cases still unacked on the server can re-prompt. Documented behavior.

## Dialog UX

### Layout (reuses `@/components/atom/dialog`)

```
┌─────────────────────────────────────────┐
│ [icon] <title>                          │  ← tone-dependent color & copy
├─────────────────────────────────────────┤
│ <n> เหตุการณ์ต้องจัดการ                  │
│                                         │
│ • [CRITICAL] "ตกบันได เหมือนแขนหัก"     │
│   คุณยายตกบันได สงสัยว่าแขนอาจจะหัก      │
│   12:03                                 │
│                                         │
│ • [HIGH] "ปวดหัว"                       │
│   คุณยายปวดหัว                          │
│   12:05                                 │
├─────────────────────────────────────────┤
│  [โทรหายาย]   [โทร 1669]   [ปิด]        │
└─────────────────────────────────────────┘
```

### Tone = `'critical'` (at least one case is `critical`)

- Title: `🚨 เหตุฉุกเฉิน`, colored with `var(--danger)` (matches existing destructive tone).
- Primary action (rightmost): **โทร 1669** — `variant="destructive"`, `size="lg"`.
- Secondary action: **โทรหายาย** — `variant="outline"`, `size="default"`.
- Tertiary action: **ปิด** — `variant="ghost"`.

### Tone = `'high'` (no critical, at least one high)

- Title: `⚠️ แจ้งเตือนด่วน`, default foreground color.
- Primary action (rightmost): **โทรหายาย** — `variant="default"`, `size="lg"`.
- Secondary action: **โทร 1669** — `variant="outline"`, `size="default"`.
- Tertiary action: **ปิด** — `variant="ghost"`.

### `elderPhone == null`

- "โทรหายาย" becomes `disabled`.
- Caption under the button row: `"ยังไม่ได้บันทึกเบอร์ยาย"`.
- "โทร 1669" stays enabled regardless.

### Case rows

- Reuse `<PriorityBadge priority={case.priority} />` (existing molecule — `critical` and `high` labels already supported).
- Show `transcript` in quotes, `summary` in muted text, `createdAt` time-only (`toLocaleTimeString('th-TH')`) — mirrors the timeline styling in `dashboardPage.tsx:131-144`.
- If the matching event is missing (SSE race), render a single `—` placeholder under the transcript slot (matches the existing fallback at `dashboardPage.tsx:216`).

### Accessibility

- `<Dialog>` atom supplies `role="alertdialog"` via Radix.
- `DialogTitle` + `DialogDescription` are mandatory for Radix and are always provided.
- Overlay click / Escape key → `onClose` (never a call action).

### i18n (new keys in `messages/th.json`)

```jsonc
"emergency.alert.titleCritical": "🚨 เหตุฉุกเฉิน",
"emergency.alert.titleHigh":     "⚠️ แจ้งเตือนด่วน",
"emergency.alert.summary":       "{count} เหตุการณ์ต้องจัดการ",
"emergency.alert.callElder":     "โทรหายาย",
"emergency.alert.call1669":      "โทร 1669",
"emergency.alert.close":         "ปิด",
"emergency.alert.noElderPhone":  "ยังไม่ได้บันทึกเบอร์ยาย"
```

All copy keyed — no hard-coded Thai strings in components (matches project convention).

## Error handling

| Scenario | Behavior |
|---|---|
| `ackFn` rejects (network, 500) | `Promise.allSettled` swallows; `console.error` each failure; dialog still closes (optimistic). On next `queryHandler.reload()` the case re-appears in `notifications` but is in `shownCaseIdsRef` → does not re-prompt this session. User can still ack via the card's "ฉันจัดการ" button. |
| `tel:` unsupported (e.g. some desktop browsers) | Browser handles ("open with…" prompt or no-op); ack + shown-marking already fired, so no retry or reset. |
| `elderPhone == null` at click time | Impossible — button is `disabled`; hook guard `if (!phone) return` is a belt-and-braces. |
| SSE notification with priority `normal` / `log` | Filtered out; dialog not affected. |
| Event not yet loaded for a notification | Case still shows; `transcript` and `summary` render as `—` placeholder. |
| Duplicate notification id (SSE + REST race) | Handled upstream in `globalState` (deduplicates by id); hook sees one entry. |

## Testing strategy

### `criticalAlerts.test.ts` (hook — required coverage ≥80%)

- returns `open=false` when no `critical`/`high` notifications
- returns `open=true` when an unacked `critical` is present
- filters out acked notifications (`ackAt` set)
- filters out notifications already in `shownCaseIdsRef`
- `tone='critical'` when any case is `critical`
- `tone='high'` when all cases are `high`-only
- `onClose` moves all current cases into `shownCaseIdsRef` → `open=false`
- `onCallElder` fires `ackFn` once per case in parallel
- `onCall1669` fires `ackFn` once per case in parallel
- `onCallElder` is a no-op when `elderPhone` is null
- `ackFn` rejection does **not** crash; dialog still closes
- Adding a `critical` notification to an open `'high'` dialog upgrades `tone` to `'critical'`

### `criticalAlertDialog.test.tsx` (view — required coverage ≥80%)

- Renders title "🚨 เหตุฉุกเฉิน" when `tone='critical'`
- Renders title "⚠️ แจ้งเตือนด่วน" when `tone='high'`
- "โทร 1669" is the destructive/primary button when `tone='critical'`
- "โทรหายาย" is the primary button when `tone='high'`
- "โทรหายาย" is disabled with hint shown when `elderPhone == null`
- Clicking "โทรหายาย" fires `onCallElder` prop
- Clicking "โทร 1669" fires `onCall1669` prop
- Clicking close / overlay fires `onClose` (never `onCall*`)
- Renders all cases with `<PriorityBadge>` + transcript + summary
- Shows `—` placeholder when transcript/summary missing

### Extensions to existing tests

- `queryHandler.test.ts`: maps `elderPhone`/`elderName` from pairings response; null-tolerant when absent.
- `pairings/me/route.test.ts`: response includes `elderName` + `elderPhone` joined from `User`; `null` when missing.

### Not covered by jest

- `dashboardPage.tsx` integration — excluded by `jest.config.ts` `collectCoverageFrom` (views + `*Page.tsx` are excluded).
- Real `tel:` navigation — manual on-device verification.

### Manual / E2E checklist (not part of jest run)

- [ ] Open dashboard with a seeded unacked `critical` notification → dialog appears on mount.
- [ ] Trigger `/api/audio` with hint "ล้ม" while dashboard open → SSE push → dialog appears with `critical` tone.
- [ ] Close dialog → does not reopen for the same case within the session.
- [ ] Reload page → dialog reopens (still unacked).
- [ ] Call "โทรหายาย" on mobile → native dialer opens; case's "ฉันจัดการ" on the card shows as acknowledged.
- [ ] Elder profile without phone → "โทรหายาย" disabled with caption; "โทร 1669" still works.
- [ ] Two notifications arriving back-to-back (one critical, one high) → dialog shows both; tone = critical.

## Implementation order (for the plan step)

1. Extend `PairingInfo` type + `/api/pairings/me` + `queryHandler` schema.
2. Add types (`CriticalAlertCase`, etc.) to `src/modules/dashboard/types.ts`.
3. Implement `useCriticalAlerts` hook with unit tests first (TDD per project convention).
4. Implement `<CriticalAlertDialog>` molecule with tests.
5. Add i18n keys to `messages/th.json`.
6. Wire into `controller.ts` and `dashboardPage.tsx`.
7. Run `/verify` + manual smoke on mobile (`tel:` behavior).

## Open questions / risks

- **Desktop `tel:` behavior**: we choose not to gate the call button; browser handles. If this is annoying for caregiver-on-desktop, a follow-up can add a "copy number" fallback.
- **Elder name absent**: label stays "โทรหายาย" (generic). If we want "โทรหาคุณแม่" per user's own naming, that's a personalization follow-up, not in scope here.
- **Flaky test hook incident on 2026-04-23**: the earlier Stop-hook reported timeouts were not reproducible on a clean re-run (583/583 passed in 34s). Not blocking, but noted.
- **`.env.test` key `GEMINI_API_KEY=AIzaSy...`**: committed value matches Google API key format. Marked as "dummy" in comments but should be verified/rotated out of scope of this feature.
