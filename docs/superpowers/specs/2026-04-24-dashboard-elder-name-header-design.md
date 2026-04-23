# Dashboard Elder Name Header — Design

- **Date:** 2026-04-24
- **Surface:** Caregiver dashboard (`/dashboard`)
- **Branch:** `fix/dashboard-sse-infinite-loop` (current) → will continue on new branch during implementation
- **Spec owner:** Roj (SCB Tech X)

## Problem

The caregiver dashboard header is hard-coded to `"คุณแม่วันนี้"` (`src/modules/dashboard/dashboardPage.tsx:76`). The actual elder might not be the caregiver's mother (could be father, grandparent, in-law, etc.), and even when the relationship is "mother" the user expects to see the person's actual name.

## Goal

Render the primary elder's user name in the header as `"คุณ<elderName>วันนี้"`. Fall back to `"วันนี้"` when no primary pairing exists or the name is unavailable.

## Non-Goals

- Showing multiple elders in the header (primary only — matches current dashboard scope).
- Custom honorifics other than `"คุณ"` (e.g. ยาย/ตา/พ่อ) — out of scope; the elder's `User.name` field is treated as already containing whatever the caregiver chose.
- Adding an inline edit affordance on the header.
- Changing the avatar circle's content (still shows `ห`).

## User decisions (from brainstorming)

| ID | Decision |
|---|---|
| Q1 | Format = **B**: `"คุณ<elderName>วันนี้"` (with `"คุณ"` prefix). |
| Q2 | Loading / no-primary fallback = **B**: render plain `"วันนี้"` (no prefix, no name). |

## Architecture

Extend the `/api/pairings/me` contract so each pairing entry includes the elder's display name. The header renders directly from the existing `state.pairings` (already wired through the dashboard controller); no new query path is added.

Server-side join: `getRepository().getUserById(p.elderId)?.name ?? ''` — uses the existing `IRepository` interface (no new repo method).

## Changes

| # | File | Change |
|---|---|---|
| 1 | `src/app/api/pairings/me/route.ts` | Map each pairing → `{ id, elderId, elderName, isPrimary }`. `elderName` = `getRepository().getUserById(p.elderId)?.name ?? ''`. |
| 2 | `src/app/api/pairings/me/__tests__/route.test.ts` | Update expected payload to include `elderName`. |
| 3 | `src/modules/dashboard/types.ts` | `PairingInfo` becomes `Pick<Pairing, 'id' \| 'elderId' \| 'isPrimary'> & { elderName: string }`. |
| 4 | `src/modules/dashboard/controller/hooks/queryHandler.ts` | `pairingsSchema` adds `elderName: z.string()`. |
| 5 | `src/modules/dashboard/dashboardPage.tsx` | Replace literal `"คุณแม่วันนี้"` (line 76) with `{primary?.elderName ? \`คุณ${primary.elderName}วันนี้\` : 'วันนี้'}`. |

## Data flow

```
Repository.getUserById(elderId)
        │
        ▼
GET /api/pairings/me  →  [{ id, elderId, elderName, isPrimary }]
        │
        ▼
queryHandler.load() → gs.setPairings(...)
        │
        ▼
state.pairings.find(p => p.isPrimary)?.elderName
        │
        ▼
<h1>คุณ{elderName}วันนี้</h1>   (or "วันนี้" when null/empty)
```

## Edge cases

- **No primary pairing yet** (initial mount, before `load()` resolves): `primary` is `undefined` → render `"วันนี้"`.
- **Pairing exists but user record missing** (race / corrupted data): `elderName` arrives as `''` → falsy → render `"วันนี้"`.
- **Multiple pairings, none primary**: `primary` is `undefined` → render `"วันนี้"`. (Same as current behaviour for `InviteSection`.)

## Testing

- **Unit (route)** — `pairings/me` test asserts `elderName` is taken from the user repo for a known elder, and is `''` when the user record is absent.
- **Unit (controller hook)** — if `useDashboardQueryHandler` tests stub the fetch response, update fixtures to include `elderName`.
- **No new E2E** — existing dashboard E2Es should keep passing; if any asserts on the header text, update the assertion.

## Compliance with critical rules

- A4 — API call still goes through `src/services/adapter/fetcher` (no change to call path).
- A5 — Uses `type`, not `interface`.
- A6 — `PairingInfo` stays in `types.ts`; no inline type in the hook.
- A7 — Header reads from `state.pairings`; no controller awareness pushed into a view component (header is part of `DashboardPage` itself, same as today).
- Thai-first — fallback string `"วันนี้"` and prefix `"คุณ"` are inline today (matching the existing `"คุณแม่วันนี้"` pattern); this spec keeps parity. If the team wants to move the header copy to `messages/th.json`, that is a separate cleanup.

## Out-of-scope follow-ups

- Move header copy to `next-intl` keys (consistent with the rest of the dashboard which uses `t('caregiver.dashboard.title')`).
- Allow the caregiver to choose a custom honorific per elder (ยาย/ตา/พ่อ/แม่).
