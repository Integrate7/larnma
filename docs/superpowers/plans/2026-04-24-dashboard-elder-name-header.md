# Dashboard Elder Name Header — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hard-coded `"คุณแม่วันนี้"` dashboard header with `"คุณ<elderName>วันนี้"` of the primary elder, falling back to `"วันนี้"` when no primary pairing or name is available.

**Architecture:** Extend the existing `/api/pairings/me` contract so each pairing carries the elder's display name (server-side join via `IRepository.getUserById`). The dashboard controller's existing `state.pairings` flow propagates the new field; the header renders it directly.

**Tech Stack:** Next.js 15 App Router, React, Zod, Jest, Playwright, Biome, in-memory repository (`IRepository` interface).

**Spec:** `docs/superpowers/specs/2026-04-24-dashboard-elder-name-header-design.md`

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/app/api/pairings/me/route.ts` | GET handler — list caregiver's pairings | Add `elderName` to response items |
| `src/app/api/pairings/me/__tests__/route.test.ts` | Unit tests for the route | Add assertion for `elderName` field + missing-user fallback |
| `src/modules/dashboard/types.ts` | Single source of truth for dashboard types (A6) | Extend `PairingInfo` with `elderName: string` |
| `src/modules/dashboard/controller/hooks/queryHandler.ts` | Loads dashboard data through `fetcher` | Add `elderName` to `pairingsSchema` |
| `src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts` | Unit tests for the loader | Update fixture so pairings include `elderName` |
| `src/modules/dashboard/dashboardPage.tsx` | Caregiver dashboard view | Render `"คุณ<elderName>วันนี้"` in the `<h1>` |
| `e2e/tests/invite.spec.ts` | E2E test for invite flow | Update header assertion to `"คุณย่าสมรวันนี้"` (matches seed) |

Each change is small and isolated. Total surface: 7 files, no new files.

---

## Task 0: Branch off

**Files:** _(no source changes)_

- [ ] **Step 1: Verify clean working tree on the spec-holding branch**

Run: `git status`
Expected: `On branch fix/dashboard-sse-infinite-loop` and `nothing to commit, working tree clean`. The spec commit (`3da0f9c`) is already in place.

- [ ] **Step 2: Create the implementation branch**

Run: `git checkout -b feat/dashboard-elder-name-header`
Expected: `Switched to a new branch 'feat/dashboard-elder-name-header'`.

> **Why a new branch:** the spec was parked on `fix/dashboard-sse-infinite-loop` for convenience, but the implementation is a feature change and needs a `feat/` branch so the eventual commits' `<type>` matches the branch prefix (per `docs/agents/skills/commit.md`).

---

## Task 1: Server — add `elderName` to `/api/pairings/me`

**Files:**
- Modify: `src/app/api/pairings/me/route.ts`
- Test: `src/app/api/pairings/me/__tests__/route.test.ts`

- [ ] **Step 1: Update existing positive test + add missing-user fallback test**

Replace the `'returns pairings for caregiver'` test in `src/app/api/pairings/me/__tests__/route.test.ts` and add a new test below it. After this step the relevant block should look like this:

```ts
  it('returns pairings for caregiver, including elderName', async () => {
    const { cookie, elderId } = await bootCaregiver()
    const r = await GET(req(cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      elderId,
      isPrimary: true,
      elderName: 'ย่า',
    })
    expect(typeof body[0].id).toBe('string')
  })

  it('falls back to empty elderName when the elder user record is missing', async () => {
    const repo = getRepository()
    const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'CG' })
    repo.createPairing({
      elderId: 'ghost-elder-id',
      caregiverId: cg.id,
      isPrimary: true,
      permissions: DEFAULT_PRIMARY_PERMISSIONS,
    })
    const s = await issueCaregiverSession({ userId: cg.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const r = await GET(req(cookie))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body).toHaveLength(1)
    expect(body[0].elderName).toBe('')
  })
```

> **Why two tests:** the first proves the join works for a normal caregiver+elder pair (the seed creates the elder with `name: 'ย่า'`). The second proves the route degrades safely if a pairing references a deleted/missing user — the spec requires an empty-string fallback so the header collapses to `"วันนี้"`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/app/api/pairings/me/__tests__/route.test.ts`
Expected: both new tests FAIL — the existing handler does not return `elderName`, so `body[0].elderName` is `undefined`.

- [ ] **Step 3: Update the route handler**

Replace `src/app/api/pairings/me/route.ts` with:

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
  return NextResponse.json(
    pairings.map((p) => ({
      id: p.id,
      elderId: p.elderId,
      isPrimary: p.isPrimary,
      elderName: repo.getUserById(p.elderId)?.name ?? '',
    })),
  )
}
```

> **Why `?? ''` not `?? null`:** the client-side schema we'll add in Task 2 uses `z.string()` so the field is always typed as `string`. Empty string is the documented fallback (spec §Edge cases), and `primary.elderName ? … : 'วันนี้'` in Task 4 treats `''` as falsy → the same render branch as "no primary".

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/app/api/pairings/me/__tests__/route.test.ts`
Expected: ALL tests PASS (the unauth/empty/multiple tests still pass; both new tests now pass).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/pairings/me/route.ts src/app/api/pairings/me/__tests__/route.test.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): include elderName in /api/pairings/me response

- Server-side join via IRepository.getUserById so the dashboard header
  can show the primary elder's name.
- Falls back to empty string when the user record is missing — the
  client renders the neutral "วันนี้" header in that case.
EOF
)"
```

---

## Task 2: Dashboard types — extend `PairingInfo`

**Files:**
- Modify: `src/modules/dashboard/types.ts`

- [ ] **Step 1: Update the type**

Replace the `PairingInfo` line in `src/modules/dashboard/types.ts` with:

```ts
export type PairingInfo = Pick<Pairing, 'id' | 'elderId' | 'isPrimary'> & {
  elderName: string
}
```

> **Why intersect rather than add to `Pairing`:** `User.name` is the source of `elderName`, not `Pairing` itself — the field is a join-time projection. Keeping it as a `& { elderName: string }` next to the `Pick` makes that boundary obvious.

- [ ] **Step 2: Verify the type compiles**

Run: `npx tsc --noEmit`
Expected: PASS. (The schema in Task 3 still infers `elderName: string`, so no consumer breaks yet — the schema will only emit `elderName` once both this type and the schema are updated. We update the schema next.)

- [ ] **Step 3: Commit**

```bash
git add src/modules/dashboard/types.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): add elderName to PairingInfo

Required so the dashboard header can render the primary elder's name
(see /api/pairings/me change in previous commit).
EOF
)"
```

---

## Task 3: Client schema — add `elderName` to `pairingsSchema`

**Files:**
- Modify: `src/modules/dashboard/controller/hooks/queryHandler.ts`
- Test: `src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts`

- [ ] **Step 1: Update the existing fixture in the loader test**

In `src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts`, replace the line:

```ts
    const pairingsBody = [{ id: 'p1', elderId: 'e1', isPrimary: true }]
```

with:

```ts
    const pairingsBody = [{ id: 'p1', elderId: 'e1', isPrimary: true, elderName: 'ย่าสมร' }]
```

And extend the `waitFor` block in the same test to assert the field round-trips:

```ts
    await waitFor(() => {
      expect(result.current.gs.state.locations).toHaveLength(1)
      expect(result.current.gs.state.pairings).toHaveLength(1)
      expect(result.current.gs.state.pairings[0].elderName).toBe('ย่าสมร')
    })
```

> **Why update the fixture before changing the schema:** the schema change in Step 3 will reject the old fixture (it'd be missing the new required `elderName` field), causing the test to fall into the silent-failure branch (`pairings stays []`) — which would mask the bug. Updating the fixture first means the test still represents a successful load.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts`
Expected: the `'sets locations and pairings when all APIs succeed'` test FAILS on `expect(...elderName).toBe('ย่าสมร')` — the schema currently strips unknown keys.

- [ ] **Step 3: Update the schema**

In `src/modules/dashboard/controller/hooks/queryHandler.ts`, replace:

```ts
const pairingsSchema = z.array(
  z.object({
    id: z.string(),
    elderId: z.string(),
    isPrimary: z.boolean(),
  }),
)
```

with:

```ts
const pairingsSchema = z.array(
  z.object({
    id: z.string(),
    elderId: z.string(),
    isPrimary: z.boolean(),
    elderName: z.string(),
  }),
)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts`
Expected: ALL tests PASS, including the new `elderName` assertion.

- [ ] **Step 5: Commit**

```bash
git add src/modules/dashboard/controller/hooks/queryHandler.ts src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): parse elderName in pairings schema

Mirrors the new field on /api/pairings/me so PairingInfo carries the
elder's display name through the controller.
EOF
)"
```

---

## Task 4: View — render the elder name in the header

**Files:**
- Modify: `src/modules/dashboard/dashboardPage.tsx`

- [ ] **Step 1: Replace the hard-coded header text**

In `src/modules/dashboard/dashboardPage.tsx`, replace lines 73-76 (currently):

```tsx
          <div className="mono-label">{t('caregiver.dashboard.title')}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            คุณแม่วันนี้
          </h1>
```

with:

```tsx
          <div className="mono-label">{t('caregiver.dashboard.title')}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {primary?.elderName ? `คุณ${primary.elderName}วันนี้` : 'วันนี้'}
          </h1>
```

> **Why this exact ternary:** `primary` may be `undefined` (no pairing yet, or none flagged primary), and `elderName` may be `''` (server fallback when the user record is missing). Both should render `"วันนี้"`. The `?.` + truthy check covers both in one expression.

> **Why no new `data-testid`:** the header is identifiable as `<h1>` inside `<header>` — Playwright's `getByRole('heading')` already targets it. We don't need a stable hook for unit tests because there are none for this view.

- [ ] **Step 2: Lint + typecheck**

Run: `npm run lint`
Expected: PASS — no Biome warnings, no TypeScript errors. (`primary` is already destructured at line 44 as `state.pairings.find((p) => p.isPrimary)` and now has `elderName: string`.)

- [ ] **Step 3: Commit**

```bash
git add src/modules/dashboard/dashboardPage.tsx
git commit -m "$(cat <<'EOF'
feat(dashboard): show elder's name in header instead of "คุณแม่"

Renders "คุณ<elderName>วันนี้" using the primary pairing's elderName.
Falls back to "วันนี้" when no primary pairing exists or the name
is unavailable.
EOF
)"
```

---

## Task 5: E2E — update the invite spec's header assertion

**Files:**
- Modify: `e2e/tests/invite.spec.ts`

- [ ] **Step 1: Update the heading expectation**

In `e2e/tests/invite.spec.ts`, replace lines 42-44:

```ts
    await expect(
      sPage.getByRole('heading', { name: 'คุณแม่วันนี้' }),
    ).toBeVisible()
```

with:

```ts
    await expect(
      sPage.getByRole('heading', { name: 'คุณย่าสมรวันนี้' }),
    ).toBeVisible()
```

> **Why `'คุณย่าสมรวันนี้'`:** `e2e/helpers/seed.ts` line 184 seeds the elder with `name: overrides.name ?? 'ย่าสมร'`, and this test calls `seedPrimaryAndElder(base)` without overrides. The new header template is `` `คุณ${elderName}วันนี้` ``, so the rendered heading is `'คุณย่าสมรวันนี้'`.

- [ ] **Step 2: Commit**

```bash
git add e2e/tests/invite.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): update invite spec header to match new elder-name format

Dashboard header now renders "คุณ<elderName>วันนี้" using the seeded
elder name (ย่าสมร) instead of the hard-coded "คุณแม่".
EOF
)"
```

---

## Task 6: Pre-PR verification

**Files:** _(no source changes)_

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: ALL tests pass. Pay specific attention to:
- `src/app/api/pairings/me/__tests__/route.test.ts`
- `src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts`

- [ ] **Step 2: Lint + typecheck**

Run: `npm run lint`
Expected: clean — no Biome diagnostics, no `tsc` errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds (no runtime imports broke).

- [ ] **Step 4: E2E (invite spec only — fast feedback)**

Run: `npx playwright test e2e/tests/invite.spec.ts`
Expected: PASS. If it fails on the heading, double-check the seed name is still `ย่าสมร` and the template in `dashboardPage.tsx` matches.

- [ ] **Step 5: Hand off to `/ship` (do NOT push from inside this plan)**

Once all verification steps pass, stop and tell the user the plan is complete. The user will run `/ship` themselves so the full pre-PR pipeline (verify → e2e → self-review → security-review → commit/push/PR) runs against `dev` per project workflow.

---

## Done criteria

- [ ] `/api/pairings/me` returns `[{id, elderId, isPrimary, elderName}]` for an authenticated caregiver.
- [ ] Dashboard header renders `"คุณ<elderName>วันนี้"` for the primary elder, `"วันนี้"` otherwise.
- [ ] Unit tests cover both the populated and missing-user code paths on the server.
- [ ] Loader test asserts `elderName` propagates through to `state.pairings`.
- [ ] Invite E2E asserts the new header text.
- [ ] `npm test`, `npm run lint`, `npm run build` all green.
- [ ] All changes committed on `feat/dashboard-elder-name-header`; nothing pushed.
