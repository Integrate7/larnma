# Root page — session-aware redirect

**Type:** feat
**Branch:** `feat/larnma-mvp`
**Date:** 2026-04-23

## Goal
เมื่อผู้ใช้เข้า `/` ให้ระบบตรวจ session cookie แล้ว route ให้ถูกฝั่งอัตโนมัติ:
- Caregiver access token ถูกต้อง → `/dashboard`
- Elder device token ถูกต้อง → `/elder`
- ไม่มี session → แสดง landing สำหรับ caregiver (ปุ่ม "ลงทะเบียน") + คำอธิบายว่า elder ต้องเข้าผ่าน QR/ลิงก์ invite ที่ลูกหลานส่งให้ (ไม่มีปุ่ม "แตะเพื่อพูด" ที่ root อีกต่อไป)

## Non-goals
- ไม่แก้ middleware / guards ที่ใช้ใน API routes (ยังคงใช้ `NextRequest` เหมือนเดิม)
- ไม่แตะ onboarding / register / pair flow ภายในแต่ละ surface
- ไม่เปลี่ยน cookie schema / TTL / JWT payload
- ไม่เพิ่ม dev-mode "elder shortcut" — elder production flow ต้องผ่าน invite เท่านั้น

## Context
- `src/app/page.tsx` ปัจจุบันเป็น server component ที่ render landing ด้วยปุ่ม 2 ปุ่ม (`/register` + `/elder`) โดยไม่ดู session
- Caregiver session = `larnma_access` cookie (JWT, role `caregiver`, kind `access`) — landing home = `/dashboard`
- Elder session = `larnma_device` cookie (JWT, role `elder`, kind `device`) — landing home = `/elder`
- Guard functions ที่มีอยู่ (`requireCaregiver`, `requireDevice`) รับ `NextRequest` จาก middleware/API context — **ใช้ใน React Server Component ไม่ได้ตรง ๆ** เพราะ RSC ใช้ `cookies()` จาก `next/headers`
- `verifyJwt` / `COOKIES` / `ADAPTER_CONFIG` อยู่ที่ `src/services/jwt/` — ใช้ได้ทั้งสอง context
- i18n ใช้ `next-intl`, keys ใน `messages/th.json`

## Approach
1. เพิ่ม helper `getServerAuth()` ที่ `src/services/guards/serverAuth.ts` — รับ cookie value จาก `next/headers` แล้ว verify JWT ส่งคืน `{ role: 'caregiver' | 'elder' } | null` (ไม่ throw, ไม่ redirect — ให้ caller ตัดสินใจ)
2. ทำให้ `src/app/page.tsx` เป็น async server component:
   - เรียก `getServerAuth()`
   - `caregiver` → `redirect('/dashboard')`
   - `elder` → `redirect('/elder')`
   - `null` → render landing
3. Landing copy ใหม่:
   - H1: appName
   - Tagline
   - ปุ่มหลัก: "ลงทะเบียน" (caregiver) → `/register`
   - คำอธิบายใต้ปุ่ม: `welcome.elderHint` ("ผู้สูงอายุ: ขอให้ลูกหลานส่งลิงก์ QR เพื่อเริ่มใช้งาน")
   - **ตัด** ปุ่ม `/elder` ออก
4. เพิ่ม i18n keys ที่ `messages/th.json`:
   - `welcome.elderHint`
5. Unit test helper: กรณี no cookie / caregiver valid / elder valid / invalid token / wrong kind → ส่งค่าตรงกัน

## Tasks
1. **Add `getServerAuth` helper** — files: `src/services/guards/serverAuth.ts` — ใช้ `cookies()` อ่าน `larnma_access` และ `larnma_device`, verify ด้วย `verifyJwt`, return union type
2. **Update root page** — files: `src/app/page.tsx` — เรียก helper, redirect หรือ render landing ใหม่
3. **Add landing copy** — files: `messages/th.json` — เพิ่ม `welcome.elderHint`
4. **Unit test helper** — files: `src/services/guards/__tests__/serverAuth.test.ts` — mock `cookies()` + `verifyJwt` ครอบคลุม 5 กรณีข้างบน

## Tests
- Unit:
  - `serverAuth.test.ts` — 5 branches (no cookie / valid caregiver / valid elder / invalid JWT / valid JWT แต่ role/kind ผิด)
- E2E: skip — เปลี่ยน routing layer อย่างเดียว, e2e ที่เริ่มจาก `/register` หรือ `/elder` ตรง ๆ ยังใช้ได้เหมือนเดิม (ไม่มี test suite ปัจจุบันวิ่งจาก `/` โดยมี cookie แนบ)

## Risks / Open questions
- **Risk:** ถ้า caregiver cookie มีแต่ token หมดอายุ (verify fail) → ผู้ใช้จะถูกมองว่าเป็น anonymous + เห็น landing แทนที่จะไป `/dashboard` แล้วโดน refresh flow → **ยอมรับ** (ที่ root ไม่ต้องทำ refresh; `/dashboard` มี guard ของตัวเอง)
- **Open:** ตอนนี้ `/dashboard` ไม่มี path guard ฝั่ง RSC — ถ้า user anonymous เข้า `/dashboard` ตรง ๆ จะเจอ state อะไร? — **อยู่นอก scope นี้** (เป็น follow-up แยก)
- Landing page จะไม่มีปุ่ม elder อีกต่อไป — ถ้าต้องการ bypass สำหรับ demo/dev ให้ navigate ไป `/elder` ด้วย URL ตรง ๆ (device cookie จะยังต้องมีอยู่แล้วจาก pair flow)
