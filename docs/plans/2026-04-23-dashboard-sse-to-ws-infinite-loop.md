# Fix Dashboard Infinite Loop — SSE → WebSocket

**Type:** `fix`
**Branch:** `fix/dashboard-sse-to-ws-infinite-loop`
**Date:** 2026-04-23

## Goal

แก้ infinite loop บน dashboard ที่เกิดจาก `useEffect(..., [gs])` ใน `eventStream.ts` โดยย้ายจาก SSE มาใช้ WebSocket พร้อม `useRef` pattern เพื่อให้ effect รันครั้งเดียว

## Non-goals

- ไม่ลบ SSE route เดิม (`/api/events/stream`) — เผื่อ backward compat
- ไม่เปลี่ยน eventBus, handler, queryHandler, หรือ view components
- ไม่เพิ่ม feature ใหม่นอกเหนือจาก WS transport

## Context

**Root cause:** `useEffect(..., [gs])` ใน `src/modules/dashboard/controller/hooks/eventStream.ts:46`

```
gs = useDashboardGlobalState()   ← object ใหม่ทุก render
useEffect(() => {
  es.setConnecting(true)         ← trigger state change
}, [gs])                         ← gs เปลี่ยน → effect รันซ้ำ → infinite loop
```

**Current SSE stack:**
- Client: `src/modules/dashboard/controller/hooks/eventStream.ts` — `EventSource` + `useEffect([gs])`
- Server: `src/app/api/events/stream/route.ts` — Next.js route handler, SSE via `ReadableStream`
- Controller: `src/modules/dashboard/controller/controller.ts` — calls `useDashboardEventStream(gs)`

**No existing WebSocket setup in the project.**

## Approach

1. Install `ws` + `@types/ws`
2. Create `server.ts` at project root — custom HTTP server wrapping Next.js ที่จัดการ WS upgrade บน path `/api/events/ws`, validate JWT จาก cookie, subscribe to `eventBus`
3. Create `src/modules/dashboard/controller/hooks/webSocket.ts` — WS hook ใช้ `useRef(gs)` + `[]` deps (fixes infinite loop), signature เหมือน `eventStream.ts` เดิม
4. Update `src/modules/dashboard/controller/controller.ts` — swap `useDashboardEventStream` → `useDashboardWebSocket`
5. Update `package.json` scripts — `dev` ใช้ `npx tsx watch server.ts` แทน `next dev --turbo`
6. เขียน unit test สำหรับ `webSocket.ts` (mock `globalThis.WebSocket`)

## Tasks

1. **Install dependencies** — `package.json` — `npm install ws && npm install -D @types/ws`
2. **Create server.ts** — `server.ts` (root) — HTTP + WebSocketServer, handles `/api/events/ws` upgrade, JWT cookie auth, eventBus subscribe, 15s heartbeat
3. **Create webSocket.ts hook** — `src/modules/dashboard/controller/hooks/webSocket.ts` — `useDashboardWebSocket(gs)` ใช้ `useRef` + `[]` deps
4. **Update controller** — `src/modules/dashboard/controller/controller.ts` — swap import/call
5. **Update package.json scripts** — `"dev": "npx tsx watch server.ts"` (start script ปล่อยไว้ก่อน ต้อง build ก่อน deploy)
6. **Write tests** — `src/modules/dashboard/controller/hooks/__tests__/webSocket.test.ts` — mock `globalThis.WebSocket`, ทดสอบ happy path + error + unmount cleanup

## Tests

- Unit: `webSocket.test.ts` — scenarios: connecting state, onopen sets connecting=false, onerror sets error, onmessage audio/notification/order, malformed JSON ignored, cleanup on unmount, effect runs only ONCE (ไม่ infinite loop)
- E2E: ไม่จำเป็น — behavior เดิม แค่เปลี่ยน transport

## Risks / Open questions

1. **`--turbo` หายไป** — `npx tsx watch server.ts` รัน Next.js ผ่าน custom server ทำให้ใช้ turbopack dev ไม่ได้ โค้ดทำงานเหมือนกัน แค่ HMR อาจช้าลงนิดหน่อย
2. **Path aliases ใน server.ts** — `server.ts` ต้อง import จาก `src/` ด้วย relative path (ไม่ใช้ `@/`) เพราะรันนอก Next.js build pipeline
3. **Production `start` script** — ยังใช้ `next start` อยู่ ถ้า production ต้องการ WS ต้องปรับ `start` ด้วย (นอก scope งานนี้ — ถามก่อน)
