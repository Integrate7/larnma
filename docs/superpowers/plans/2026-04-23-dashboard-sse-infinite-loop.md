# Fix Dashboard SSE Infinite Loop

**Type:** `fix`
**Branch:** `fix/dashboard-sse-infinite-loop`
**Date:** 2026-04-23

## Goal

Caregiver dashboard หยุด reconnect ลูปไม่จบ — `EventSource` ต้องถูกสร้างครั้งเดียวตอน mount และปิดตอน unmount เท่านั้น state updates ที่เกิดจาก SSE messages ต้องไม่ trigger การ reconnect

## Non-goals

- ไม่เปลี่ยน transport (คง SSE ตามที่ `docs/mvp/mvp.md` Tech Stack table และ `CLAUDE.md` ระบุไว้)
- ไม่แตะ `/api/events/stream/route.ts` (server ฝั่งไม่มีบั๊ก)
- ไม่แตะ `elderHome/elderEventStream.ts` — deps `[gs.setOrderNotification]` เป็น `useState` setter, stable per React guarantee, ไม่มีบั๊กเดียวกัน
- ไม่ refactor controller / queryHandler / handler / views
- ไม่ migration ไป WebSocket / NATS / Socket.IO (ดู `docs/mvp/mvp.md` Phase-2 swap — ทำเมื่อถึงเวลา)
- ไม่ cherry-pick อะไรจาก `origin/fix/dashboard-sse-to-ws-infinite-loop`

## Context

**Root cause** — `src/modules/dashboard/controller/hooks/eventStream.ts:46`

```ts
export function useDashboardEventStream(gs: GS) {
  useEffect(() => {
    // ...
    gs.setConnecting(true)
    // ...
  }, [gs])   // ← gs เป็น literal object ใหม่ทุก render → deps เปลี่ยนทุก render
}
```

`useDashboardGlobalState()` return `{ state, setConnecting, prependEvent, ... }` เป็น object literal สร้างใหม่ทุก render → effect deps `[gs]` ไม่เสถียร → effect cleanup+rerun ทุก render → `new EventSource()` + `setConnecting(true)` trigger re-render → infinite loop

**วิธีแก้ที่ใช้** — `useRef` pattern:
1. เก็บ `gs` ล่าสุดไว้ใน ref (update ทุก render)
2. `useEffect` deps `[]` → run ครั้งเดียวตอน mount
3. ใน effect เรียก `gsRef.current.xxx(...)` — ได้ `gs` ล่าสุดเสมอโดยไม่ทำให้ deps เปลี่ยน

**Related code อ่านแล้ว:**
- `src/modules/dashboard/controller/hooks/eventStream.ts` — ไฟล์ที่จะแก้
- `src/modules/dashboard/controller/hooks/globalState.ts` — รู้ว่า `gs` เป็น object literal
- `src/modules/dashboard/controller/controller.ts` — ทุกอย่างยังเหมือนเดิม (call site ไม่เปลี่ยน)
- `src/modules/dashboard/controller/hooks/__tests__/eventStream.test.ts` — test เดิม ต้องไม่ break + เพิ่ม regression test
- `src/app/api/events/stream/route.ts` — server SSE ไม่แตะ
- `src/modules/elderHome/controller/hooks/elderEventStream.ts` — ใช้ `[gs.setOrderNotification]` (stable setter), ไม่มีบั๊ก ไม่แตะ

## Approach

แก้ไฟล์เดียว + เพิ่ม regression test 1 case เพิ่มใน test file เดิม ไม่สร้างไฟล์ใหม่ รักษา public signature ของ hook ไว้ (ยังเป็น `useDashboardEventStream(gs: GS)`) เพื่อไม่กระทบ `controller.ts`

## Tasks

1. **Refactor `eventStream.ts` ใช้ `useRef` + `[]` deps**
   files: `src/modules/dashboard/controller/hooks/eventStream.ts`
   - `const gsRef = useRef(gs); gsRef.current = gs` ด้านบน `useEffect`
   - เปลี่ยน `gs.xxx(...)` ทุกจุดใน effect เป็น `gsRef.current.xxx(...)`
   - เปลี่ยน deps จาก `[gs]` → `[]`
   - คง behavior เดิมทั้งหมด: onopen/onerror/onmessage, หัวข้อ audio/notification/order, cleanup `es.close()`
   - คง browser guard (`globalThis.window === undefined`), EventSource-absent guard (ทำงานใน Jest + SSR)

2. **Regression test — effect สร้าง EventSource ครั้งเดียวแม้ rerender**
   files: `src/modules/dashboard/controller/hooks/__tests__/eventStream.test.ts`
   - เพิ่ม test case `'creates exactly one EventSource across renders (no infinite loop)'`
   - ใช้ `renderHook` → trigger หลาย state changes ผ่าน onmessage (audio, notification, order) → assert `MockEventSource.instances.length === 1`
   - Test case เดิมทั้ง 9 cases ต้องยัง pass โดยไม่แก้

2b. **Second instance of same bug — `queryHandler.ts` loops REST fetches**
    files: `src/modules/dashboard/controller/hooks/queryHandler.ts`, `src/modules/dashboard/controller/hooks/__tests__/queryHandler.test.ts`
    - อาการ: E2E webServer log ยิง `GET /api/events`, `/api/elders/location`, `/api/pairings/me` รัวๆ ทุก ~40ms
    - Root cause เดียวกัน: `useCallback(load, [gs])` → load ref เปลี่ยนทุก render → `useEffect([load])` fire ทุก render → setState → loop
    - Fix: `useRef(gs)` + `useCallback(load, [])` → load stable, effect mount-only
    - Regression test: assert fetch called **เพียง 3 ครั้ง** หลัง initial load settle + 100ms idle (ก่อน fix: 36+ calls)

3. **(scope add, chore) E2E env bootstrap — ทำให้ `npm run test:e2e` ไม่ต้อง export env เอง**
   files: `.env.test` (new), `e2e/playwright.config.ts`, `e2e/README.md`
   - ปัจจุบัน Playwright webServer รัน `npx next dev` โดยไม่มี `JWT_SECRET` → ทุก OTP verify route ตอบ 500 → 14/16 specs fail (ปัญหาเดิมบน main ไม่เกี่ยวกับ fix นี้)
   - สร้าง `.env.test` ที่ repo root ใส่ dummy value: `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` (ไม่ใส่ `GEMINI_API_KEY` ให้ fallback mock)
   - อัปเดต `e2e/playwright.config.ts` — ESM-safe inline loader (fs + path/url), set เฉพาะ key ที่ shell ยังไม่มี → shell override ได้เสมอ
   - อัปเดต `e2e/README.md` — เอา step "แยก dev server shell" ออก (Playwright spawn เอง), อธิบาย env override

## Tests

- Unit:
  - `eventStream.test.ts` — 9 cases เดิม + 1 regression case (สร้าง ES ครั้งเดียว)
  - ไม่ต้องแก้ `globalState.test.ts`, `queryHandler.test.ts`, `handler.test.ts`
- E2E: ไม่จำเป็น — SSE reconnect loop เป็น client-side bug, unit test ครอบคลุม behavior ได้เต็ม และไม่มี user-visible behavior change ให้ E2E verify (ถ้าจะเช็คก็ต้องวัด CPU/network ซึ่งไม่ใช่ E2E scope)
- Coverage: ไฟล์เดียวที่แก้ `eventStream.ts` มี test ครอบคลุม >80% อยู่แล้ว ไม่ลดลง

## Risks / Open questions

1. **Closure-captured `gs.setError`** — เดิม `gs.setError('ขาดการเชื่อมต่อ')` ใช้ gs ที่ถูก capture ใน closure ซึ่งก็คือ gs ของ render แรก หลังแก้จะเป็น `gsRef.current.setError(...)` = gs ล่าสุด behavior แทบเหมือนเดิม (setter จาก `useState` stable อยู่แล้ว) ไม่มี user-visible diff
2. **React Strict Mode double-mount (dev)** — `useEffect` `[]` จะ mount → cleanup → mount ใน dev Strict Mode แปลว่าจะเห็น 2 connection ใน dev เดิมก็เป็นแบบนี้ ไม่ใช่ regression, และ prod ไม่มี double-mount
3. **เปิด Dashboard 2 tab** — แต่ละ tab มี 1 EventSource อยู่แล้ว ปกติ
4. การ `eventBus` ฝั่ง server `publishTo(caregiverId, ...)` → broadcast ไปทุก listener ไม่ถูก duplicate — server subscribe ต่อ connection ไม่ใช่ต่อ user session (ดู `route.ts:20`) OK ไม่มี interaction กับ fix นี้
