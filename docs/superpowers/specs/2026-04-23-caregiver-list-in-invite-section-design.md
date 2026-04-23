# Caregiver List in Invite Section

**Date:** 2026-04-23
**Branch:** `feat/larnma-mvp`
**Type:** feat

## Goal

Primary caregiver สามารถดูรายชื่อ caregiver ทั้งหมดที่ paired กับ elder และ revoke pairing ของ caregiver รายอื่นได้ โดยแสดงอยู่ใน InviteSection Card เดียวกัน

## Non-goals

- ไม่รองรับการ revoke ตัวเอง (primary caregiver)
- ไม่มีการแก้ไข permissions ของ caregiver ในหน้านี้
- ไม่แสดง caregiver list แก่ non-primary caregiver

## Architecture

```
InviteSection (Card)
├── invite button + dialog        ← ของเดิม ไม่เปลี่ยน
└── CaregiverList (Level 2 sub-component)
    ├── controller/
    │   ├── hooks/globalState.ts  — caregivers[], loading, error
    │   └── hooks/handler.ts      — load(elderId), revoke(pairingId)
    └── views/CaregiverListView.tsx — flat props, รายชื่อ + revoke button
```

## API

### GET /api/pairings/elder

- Auth: require caregiver session
- Query param: `elderId` (string, required)
- Guard: caregiver must have an active pairing with the given elder
- Logic: `listPairingsByElder(elderId)` + `getUserById(caregiverId)` for each
- Response: `{ caregivers: CaregiverItem[] }`

```ts
type CaregiverItem = {
  pairingId: string
  name: string
  phone: string
  isPrimary: boolean
  isCurrentUser: boolean  // true ถ้า caregiver นี้คือ caller เอง
}
```

### DELETE /api/pairings/[id]

- Auth: require caregiver session
- Guard: caller must be the primary caregiver of the elder in that pairing
- Guard: caller cannot revoke their own pairing
- Logic: `updatePairing(id, { revokedAt: new Date().toISOString() })` (soft delete)
- Response: `{ ok: true }`

## Data Flow

1. `CaregiverList` mounts → `handler.load(elderId)` → `GET /api/pairings/elder`
2. State: `caregivers[]`, `loading`, `error`
3. User กด revoke → `handler.revoke(pairingId)` → `DELETE /api/pairings/[id]` → `handler.load()` reload
4. Primary caregiver: ปุ่ม revoke ซ่อน, แสดง badge "หลัก" แทน

## UI

```
InviteSection Card
────────────────────────────────────
[+ เพิ่ม Caregiver]

────────────────────────────────────
ทดสอบ หลาน   080-000-0001   [หลัก]
สมชาย ลูก    080-000-0002   [ลบ]
สมหญิง หลาน  080-000-0003   [ลบ]
```

- Badge "หลัก" แสดงเฉพาะ primary caregiver (ตัวเอง)
- ปุ่ม "ลบ" = `Button variant="destructive" size="sm"`
- Loading: skeleton rows แทนรายชื่อ
- Error: inline `<p role="alert">` ใต้รายชื่อ

## Types (types.ts)

```ts
type CaregiverItem = {
  pairingId: string
  name: string
  phone: string
  isPrimary: boolean
  isCurrentUser: boolean  // API sets based on session
}

type CaregiverListGlobalState = {
  caregivers: CaregiverItem[]
  loading: boolean
  error: string | null
}

type CaregiverListHandler = {
  load: (elderId: string) => Promise<void>
  revoke: (pairingId: string) => Promise<void>
}

type CaregiverListProps = {
  elderId: string
}
```

## Tests

- Unit `handler.ts`: load populates caregivers, revoke calls DELETE then reloads, error sets error state
- Unit `GET /api/pairings/elder`: returns 401 without auth, 403 if caller not paired with elder, returns list correctly
- Unit `DELETE /api/pairings/[id]`: returns 401, 403 if not primary, 403 if self-revoke, soft-deletes correctly

## Risks / Open Questions

- หลังจาก revoke แล้ว caregiver ที่ถูก revoke จะยัง active session อยู่ใน in-memory repo — ใน MVP ยอมรับ behavior นี้ได้
- `isCurrentUser` ถูก set โดย API (`auth.userId === pairing.caregiverId`) ไม่ต้องส่ง caregiverId จาก client
