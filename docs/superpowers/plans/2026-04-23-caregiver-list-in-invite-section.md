# Caregiver List in Invite Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a list of paired caregivers (name + phone) inside the InviteSection card, with a revoke button for each non-primary caregiver.

**Architecture:** New `CaregiverList` Level-2 sub-component lives under `inviteSection/caregiverList/` with its own controller hooks. Two new API routes handle listing and soft-deleting pairings. InviteSection renders CaregiverList below the existing invite button.

**Tech Stack:** Next.js 15 App Router, React hooks, Zod, Jest + @testing-library/react, next-intl

---

## File Map

| Action | Path |
|--------|------|
| Modify | `messages/th.json` |
| Modify | `messages/en.json` |
| Create | `src/app/api/pairings/elder/route.ts` |
| Create | `src/app/api/pairings/elder/__tests__/route.test.ts` |
| Create | `src/app/api/pairings/[id]/route.ts` |
| Create | `src/app/api/pairings/[id]/__tests__/route.test.ts` |
| Create | `src/modules/dashboard/views/inviteSection/caregiverList/types.ts` |
| Create | `src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/globalState.ts` |
| Create | `src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/handler.ts` |
| Create | `src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/__tests__/handler.test.ts` |
| Create | `src/modules/dashboard/views/inviteSection/caregiverList/controller/controller.ts` |
| Create | `src/modules/dashboard/views/inviteSection/caregiverList/views/CaregiverListView.tsx` |
| Create | `src/modules/dashboard/views/inviteSection/caregiverList/caregiverList.tsx` |
| Modify | `src/modules/dashboard/views/inviteSection/inviteSection.tsx` |

---

### Task 1: i18n keys

**Files:**
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add keys to th.json**

In `messages/th.json`, inside the `"caregiver"` object, add after `"manageCaregivers"`:

```json
    "caregiverList": {
      "primary": "หลัก",
      "revoke": "ลบ",
      "empty": "ยังไม่มีคนดูแลอื่น"
    }
```

The `"caregiver"` block should end like:

```json
  "caregiver": {
    ...
    "addCaregiver": "เพิ่มคนดูแล",
    "manageCaregivers": "จัดการผู้ดูแล",
    "caregiverList": {
      "primary": "หลัก",
      "revoke": "ลบ",
      "empty": "ยังไม่มีคนดูแลอื่น"
    }
  },
```

- [ ] **Step 2: Add keys to en.json**

In `messages/en.json`, add a `"caregiver"` section (it doesn't exist yet):

```json
  "caregiver": {
    "caregiverList": {
      "primary": "Primary",
      "revoke": "Remove",
      "empty": "No other caregivers"
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add messages/th.json messages/en.json
git commit -m "feat(i18n): add caregiver list keys"
```

---

### Task 2: GET /api/pairings/elder

**Files:**
- Create: `src/app/api/pairings/elder/__tests__/route.test.ts`
- Create: `src/app/api/pairings/elder/route.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/pairings/elder/__tests__/route.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { GET } from '../route'

function req(cookie?: string, elderId?: string) {
  const url = elderId
    ? `http://localhost:3000/api/pairings/elder?elderId=${elderId}`
    : 'http://localhost:3000/api/pairings/elder'
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
  })
}

async function bootCtx() {
  const repo = getRepository()
  const cg = repo.createUser({ role: 'caregiver', phone: '0811', name: 'หลาน' })
  const cg2 = repo.createUser({ role: 'caregiver', phone: '0812', name: 'ลูก' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ยาย' })
  const pairing1 = repo.createPairing({
    elderId: elder.id,
    caregiverId: cg.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const pairing2 = repo.createPairing({
    elderId: elder.id,
    caregiverId: cg2.id,
    isPrimary: false,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const s = await issueCaregiverSession({ userId: cg.id })
  return {
    cookie: `${COOKIES.access}=${s.accessToken}`,
    elderId: elder.id,
    cgId: cg.id,
    cg2Id: cg2.id,
    pairing1Id: pairing1.id,
    pairing2Id: pairing2.id,
  }
}

describe('GET /api/pairings/elder', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('returns 401 without auth', async () => {
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns 400 when elderId missing', async () => {
    const { cookie } = await bootCtx()
    const res = await GET(req(cookie))
    expect(res.status).toBe(400)
  })

  it('returns 403 when caller is not paired with elder', async () => {
    const repo = getRepository()
    const outsider = repo.createUser({ role: 'caregiver', phone: '0899', name: 'คนนอก' })
    const elder = repo.createUser({ role: 'elder', phone: '0833', name: 'ปู่' })
    const s = await issueCaregiverSession({ userId: outsider.id })
    const cookie = `${COOKIES.access}=${s.accessToken}`
    const res = await GET(req(cookie, elder.id))
    expect(res.status).toBe(403)
  })

  it('returns caregiver list with isCurrentUser flag', async () => {
    const { cookie, elderId, cgId, cg2Id, pairing1Id, pairing2Id } = await bootCtx()
    const res = await GET(req(cookie, elderId))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.caregivers).toHaveLength(2)
    const me = body.caregivers.find((c: { pairingId: string }) => c.pairingId === pairing1Id)
    const other = body.caregivers.find((c: { pairingId: string }) => c.pairingId === pairing2Id)
    expect(me).toMatchObject({ name: 'หลาน', phone: '0811', isPrimary: true, isCurrentUser: true })
    expect(other).toMatchObject({ name: 'ลูก', phone: '0812', isPrimary: false, isCurrentUser: false })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /path/to/project && npx jest src/app/api/pairings/elder/__tests__/route.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/pairings/elder/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'caregiver')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const elderId = req.nextUrl.searchParams.get('elderId')
  if (!elderId) return NextResponse.json({ error: 'INVALID_PARAMS' }, { status: 400 })

  const repo = getRepository()
  const callerPairing = repo.getPairingByPair(elderId, auth.userId)
  if (!callerPairing) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const pairings = repo.listPairingsByElder(elderId)
  const caregivers = pairings
    .map((p) => {
      const user = repo.getUserById(p.caregiverId)
      if (!user) return null
      return {
        pairingId: p.id,
        name: user.name,
        phone: user.phone,
        isPrimary: p.isPrimary,
        isCurrentUser: p.caregiverId === auth.userId,
      }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)

  return NextResponse.json({ caregivers })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/app/api/pairings/elder/__tests__/route.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/pairings/elder/route.ts src/app/api/pairings/elder/__tests__/route.test.ts
git commit -m "feat(api): GET /api/pairings/elder — list caregivers for elder"
```

---

### Task 3: DELETE /api/pairings/[id]

**Files:**
- Create: `src/app/api/pairings/[id]/__tests__/route.test.ts`
- Create: `src/app/api/pairings/[id]/route.ts`

Note: the `[id]` directory already exists (contains `permissions/route.ts`).

- [ ] **Step 1: Write the failing tests**

Create `src/app/api/pairings/[id]/__tests__/route.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { issueCaregiverSession } from '@/services/auth'
import { COOKIES } from '@/services/jwt'
import { DEFAULT_PRIMARY_PERMISSIONS } from '@/shared/types'
import { DELETE } from '../route'

function req(cookie?: string, pairingId = 'p1') {
  return new NextRequest(`http://localhost:3000/api/pairings/${pairingId}`, {
    method: 'DELETE',
    headers: {
      host: 'localhost:3000',
      ...(cookie ? { cookie } : {}),
    },
  })
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

async function bootCtx() {
  const repo = getRepository()
  const primary = repo.createUser({ role: 'caregiver', phone: '0811', name: 'หลาน' })
  const secondary = repo.createUser({ role: 'caregiver', phone: '0812', name: 'ลูก' })
  const elder = repo.createUser({ role: 'elder', phone: '0822', name: 'ยาย' })
  const primaryPairing = repo.createPairing({
    elderId: elder.id,
    caregiverId: primary.id,
    isPrimary: true,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const secondaryPairing = repo.createPairing({
    elderId: elder.id,
    caregiverId: secondary.id,
    isPrimary: false,
    permissions: DEFAULT_PRIMARY_PERMISSIONS,
  })
  const primarySession = await issueCaregiverSession({ userId: primary.id })
  const secondarySession = await issueCaregiverSession({ userId: secondary.id })
  return {
    primaryCookie: `${COOKIES.access}=${primarySession.accessToken}`,
    secondaryCookie: `${COOKIES.access}=${secondarySession.accessToken}`,
    primaryPairingId: primaryPairing.id,
    secondaryPairingId: secondaryPairing.id,
    elderId: elder.id,
  }
}

describe('DELETE /api/pairings/[id]', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('returns 401 without auth', async () => {
    const res = await DELETE(req(), params('any'))
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent pairing', async () => {
    const { primaryCookie } = await bootCtx()
    const res = await DELETE(req(primaryCookie, 'ghost'), params('ghost'))
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not primary caregiver', async () => {
    const { secondaryCookie, secondaryPairingId } = await bootCtx()
    const res = await DELETE(req(secondaryCookie, secondaryPairingId), params(secondaryPairingId))
    expect(res.status).toBe(403)
  })

  it('returns 400 when primary tries to revoke themselves', async () => {
    const { primaryCookie, primaryPairingId } = await bootCtx()
    const res = await DELETE(req(primaryCookie, primaryPairingId), params(primaryPairingId))
    expect(res.status).toBe(400)
  })

  it('soft-deletes secondary pairing and returns ok', async () => {
    const { primaryCookie, secondaryPairingId } = await bootCtx()
    const res = await DELETE(req(primaryCookie, secondaryPairingId), params(secondaryPairingId))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    const repo = getRepository()
    const pairing = repo.getPairing(secondaryPairingId)
    expect(pairing?.revokedAt).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/app/api/pairings/\\[id\\]/__tests__/route.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/pairings/[id]/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
  if (auth.role !== 'caregiver')
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  const { id } = await params
  const repo = getRepository()
  const pairing = repo.getPairing(id)
  if (!pairing) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

  const callerPairing = repo.getPairingByPair(pairing.elderId, auth.userId)
  if (!callerPairing?.isPrimary)
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  if (pairing.caregiverId === auth.userId)
    return NextResponse.json({ error: 'CANNOT_REVOKE_SELF' }, { status: 400 })

  repo.updatePairing(id, { revokedAt: new Date().toISOString() })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/app/api/pairings/\\[id\\]/__tests__/route.test.ts --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/pairings/[id]/route.ts" "src/app/api/pairings/[id]/__tests__/route.test.ts"
git commit -m "feat(api): DELETE /api/pairings/[id] — revoke pairing"
```

---

### Task 4: CaregiverList types

**Files:**
- Create: `src/modules/dashboard/views/inviteSection/caregiverList/types.ts`

- [ ] **Step 1: Create types.ts**

```ts
export type CaregiverItem = {
  pairingId: string
  name: string
  phone: string
  isPrimary: boolean
  isCurrentUser: boolean
}

export type CaregiverListGlobalState = {
  caregivers: CaregiverItem[]
  loading: boolean
  error: string | null
}

export type CaregiverListHandler = {
  load: () => Promise<void>
  revoke: (pairingId: string) => Promise<void>
}

export type CaregiverListProps = {
  elderId: string
}

export type CaregiverListViewProps = {
  caregivers: CaregiverItem[]
  loading: boolean
  error: string | null
  onRevoke: (pairingId: string) => void
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/dashboard/views/inviteSection/caregiverList/types.ts
git commit -m "feat(caregiverList): add types"
```

---

### Task 5: CaregiverList globalState

**Files:**
- Create: `src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/globalState.ts`

- [ ] **Step 1: Create globalState.ts**

```ts
'use client'
import { useState } from 'react'
import type { CaregiverItem, CaregiverListGlobalState } from '../../types'

export function useCaregiverListGlobalState() {
  const [caregivers, setCaregivers] = useState<CaregiverItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const state: CaregiverListGlobalState = { caregivers, loading, error }

  return { state, setCaregivers, setLoading, setError }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/globalState.ts
git commit -m "feat(caregiverList): add globalState hook"
```

---

### Task 6: CaregiverList handler (TDD)

**Files:**
- Create: `src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/__tests__/handler.test.ts`
- Create: `src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/handler.ts`

- [ ] **Step 1: Write failing tests**

Create `src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/__tests__/handler.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { useCaregiverListGlobalState } from '../globalState'
import { useCaregiverListHandler } from '../handler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

function renderAll(elderId = 'EL1') {
  return renderHook(() => {
    const gs = useCaregiverListGlobalState()
    const handler = useCaregiverListHandler({ gs, elderId })
    return { gs, handler }
  })
}

describe('useCaregiverListHandler', () => {
  afterEach(() => jest.restoreAllMocks())

  describe('load', () => {
    it('happy path: sets caregivers from API response', async () => {
      const caregivers = [
        { pairingId: 'p1', name: 'หลาน', phone: '0811', isPrimary: true, isCurrentUser: true },
        { pairingId: 'p2', name: 'ลูก', phone: '0812', isPrimary: false, isCurrentUser: false },
      ]
      mockFetch(200, { caregivers })
      const { result } = renderAll()

      await act(async () => {
        await result.current.handler.load()
      })

      expect(result.current.gs.state.caregivers).toEqual(caregivers)
      expect(result.current.gs.state.loading).toBe(false)
      expect(result.current.gs.state.error).toBeNull()
    })

    it('error path: sets error on API failure', async () => {
      mockFetch(403, { error: 'FORBIDDEN' })
      const { result } = renderAll()

      await act(async () => {
        await result.current.handler.load()
      })

      expect(result.current.gs.state.error).toBe('FORBIDDEN')
      expect(result.current.gs.state.caregivers).toEqual([])
    })
  })

  describe('revoke', () => {
    it('happy path: calls DELETE and reloads', async () => {
      const caregivers = [
        { pairingId: 'p1', name: 'หลาน', phone: '0811', isPrimary: true, isCurrentUser: true },
      ]
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ caregivers }),
        })
      global.fetch = fetchMock as unknown as typeof fetch

      const { result } = renderAll('EL1')

      await act(async () => {
        await result.current.handler.revoke('p2')
      })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      const [deleteCall] = fetchMock.mock.calls
      expect(deleteCall[0]).toBe('/api/pairings/p2')
      expect((deleteCall[1] as RequestInit).method).toBe('DELETE')
    })

    it('error path: sets error on revoke failure, does not reload', async () => {
      mockFetch(403, { error: 'FORBIDDEN' })
      const { result } = renderAll()

      await act(async () => {
        await result.current.handler.revoke('p2')
      })

      expect(result.current.gs.state.error).toBe('FORBIDDEN')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/__tests__/handler.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../handler'`

- [ ] **Step 3: Implement handler.ts**

Create `src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/handler.ts`:

```ts
'use client'
import { useCallback } from 'react'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { CaregiverItem, CaregiverListHandler } from '../../types'
import type { useCaregiverListGlobalState } from './globalState'

const caregiverItemSchema = z.object({
  pairingId: z.string(),
  name: z.string(),
  phone: z.string(),
  isPrimary: z.boolean(),
  isCurrentUser: z.boolean(),
})

const listSchema = z.object({
  caregivers: z.array(caregiverItemSchema),
})

type GS = ReturnType<typeof useCaregiverListGlobalState>

export function useCaregiverListHandler(args: { gs: GS; elderId: string }): CaregiverListHandler {
  const { gs, elderId } = args

  const load = useCallback(async () => {
    gs.setLoading(true)
    gs.setError(null)
    const res = await fetcher(
      `/api/pairings/elder?elderId=${encodeURIComponent(elderId)}`,
      listSchema,
    )
    gs.setLoading(false)
    if (res.success) {
      gs.setCaregivers(res.data.caregivers)
    } else {
      gs.setError(res.error)
    }
  }, [gs, elderId])

  const revoke = useCallback(
    async (pairingId: string) => {
      gs.setError(null)
      const res = await fetcher(
        `/api/pairings/${pairingId}`,
        z.object({ ok: z.boolean() }),
        { method: 'DELETE' },
      )
      if (res.success) {
        await load()
      } else {
        gs.setError(res.error)
      }
    },
    [gs, load],
  )

  return { load, revoke }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/__tests__/handler.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add \
  src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/handler.ts \
  src/modules/dashboard/views/inviteSection/caregiverList/controller/hooks/__tests__/handler.test.ts
git commit -m "feat(caregiverList): add handler hook with load and revoke"
```

---

### Task 7: CaregiverListView

**Files:**
- Create: `src/modules/dashboard/views/inviteSection/caregiverList/views/CaregiverListView.tsx`

- [ ] **Step 1: Create CaregiverListView.tsx**

```tsx
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import type { CaregiverListViewProps } from '../types'

export function CaregiverListView({
  caregivers,
  loading,
  error,
  onRevoke,
}: CaregiverListViewProps) {
  const t = useTranslations()

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div className="mt-4 flex flex-col gap-1" data-testid="caregiver-list">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {caregivers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('caregiver.caregiverList.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {caregivers.map((cg) => {
            const itemKey = cg.pairingId
            return (
              <li key={itemKey} className="flex items-center gap-3 py-2">
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{cg.name}</span>
                  <span className="text-xs text-muted-foreground">{cg.phone}</span>
                </div>
                {cg.isCurrentUser || cg.isPrimary ? (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    {t('caregiver.caregiverList.primary')}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRevoke(cg.pairingId)}
                    data-testid={`revoke-${cg.pairingId}`}
                  >
                    {t('caregiver.caregiverList.revoke')}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/dashboard/views/inviteSection/caregiverList/views/CaregiverListView.tsx
git commit -m "feat(caregiverList): add CaregiverListView"
```

---

### Task 8: CaregiverList controller + wiring + wire into InviteSection

**Files:**
- Create: `src/modules/dashboard/views/inviteSection/caregiverList/controller/controller.ts`
- Create: `src/modules/dashboard/views/inviteSection/caregiverList/caregiverList.tsx`
- Modify: `src/modules/dashboard/views/inviteSection/inviteSection.tsx`

- [ ] **Step 1: Create controller.ts**

Create `src/modules/dashboard/views/inviteSection/caregiverList/controller/controller.ts`:

```ts
'use client'
import { useEffect } from 'react'
import { useCaregiverListGlobalState } from './hooks/globalState'
import { useCaregiverListHandler } from './hooks/handler'

export function useCaregiverListController(elderId: string) {
  const gs = useCaregiverListGlobalState()
  const handler = useCaregiverListHandler({ gs, elderId })

  useEffect(() => {
    void handler.load()
  }, [handler.load])

  return { state: gs.state, handler }
}
```

- [ ] **Step 2: Create caregiverList.tsx**

Create `src/modules/dashboard/views/inviteSection/caregiverList/caregiverList.tsx`:

```tsx
'use client'
import { useCaregiverListController } from './controller/controller'
import { CaregiverListView } from './views/CaregiverListView'
import type { CaregiverListProps } from './types'

export function CaregiverList({ elderId }: CaregiverListProps) {
  const { state, handler } = useCaregiverListController(elderId)

  return (
    <CaregiverListView
      caregivers={state.caregivers}
      loading={state.loading}
      error={state.error}
      onRevoke={(pairingId) => void handler.revoke(pairingId)}
    />
  )
}
```

- [ ] **Step 3: Wire CaregiverList into InviteSection**

Modify `src/modules/dashboard/views/inviteSection/inviteSection.tsx`.

Add the import after the existing imports:

```ts
import { CaregiverList } from './caregiverList/caregiverList'
```

Add `<CaregiverList elderId={elderId} />` inside `<CardContent>`, after the closing `</Dialog>` tag:

The `<CardContent>` block should look like this after the change:

```tsx
      <CardContent>
        {state.error ? (
          <p role="alert" className="text-destructive text-sm">{state.error}</p>
        ) : null}
        <Button
          onClick={() => void handler.openDialog()}
          disabled={state.loading}
          data-testid="invite-open-btn"
        >
          {state.loading ? '...' : t('caregiver.addCaregiver')}
        </Button>

        <Dialog open={state.open} onOpenChange={(o) => { if (!o) handler.close() }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('invite.dialogTitle')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t('invite.linkLabel')}</p>
            <p
              className="break-all rounded bg-muted px-3 py-2 text-sm font-mono"
              data-testid="invite-url"
            >
              {state.inviteUrl}
            </p>
            <p className="text-xs text-muted-foreground">{t('invite.expiresNote')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void handler.copyLink()}
                data-testid="invite-copy-btn"
              >
                {state.copied ? t('invite.copied') : t('invite.copyLink')}
              </Button>
              <Button
                variant="outline"
                onClick={handler.shareViaLine}
                data-testid="invite-line-btn"
              >
                {t('invite.shareViaLine')}
              </Button>
              <Button
                variant="outline"
                onClick={handler.shareViaSms}
                data-testid="invite-sms-btn"
              >
                {t('invite.shareViaSms')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <CaregiverList elderId={elderId} />
      </CardContent>
```

- [ ] **Step 4: Run all new tests**

```bash
npx jest src/modules/dashboard/views/inviteSection/caregiverList --no-coverage
npx jest src/app/api/pairings --no-coverage
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add \
  src/modules/dashboard/views/inviteSection/caregiverList/controller/controller.ts \
  src/modules/dashboard/views/inviteSection/caregiverList/caregiverList.tsx \
  src/modules/dashboard/views/inviteSection/inviteSection.tsx
git commit -m "feat(caregiverList): wire controller, view, and mount in InviteSection"
```
