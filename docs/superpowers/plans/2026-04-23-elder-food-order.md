# Elder Food Order Page

**Type:** feat
**Branch:** `feat/larnma-mvp`
**Date:** 2026-04-23

## Goal

Elder กดปุ่ม "สั่งอาหาร" ที่หน้าหลัก → เห็นเมนูแนะนำ 3 รายการ → เลือกเมนู → ระบบแจ้ง caregiver ให้ยืนยัน/จ่ายเงิน → Elder เห็นสถานะ "รอหลานยืนยัน"

## Non-goals

- ไม่ทำ payment flow (caregiver ทำแยกในหน้า dashboard)
- ไม่ทำ order tracking / delivery status (integrate ทีหลัง)
- ไม่แก้ `/api/orders` (caregiver-side) ที่มีอยู่แล้ว

## Context

- `src/services/menu/` มี catalog + `recommendMenus()` อยู่แล้ว
- `GET /api/menus` และ `POST /api/orders` ล็อก caregiver auth ไว้ ใช้โดยตรงไม่ได้
- `requireDevice` guard มีอยู่แล้ว ใช้ elder device cookie ได้
- Controller-View pattern เป็น standard ของ project

## Approach

1. สร้าง `GET /api/elder/food/menus` — ใช้ `requireDevice`, ดึง elderId จาก token, call `recommendMenus()`
2. สร้าง `POST /api/elder/food/request` — ใช้ `requireDevice`, บันทึก food request + ส่ง notification ไปหา caregiver
3. สร้าง module `src/modules/elderFood/` ตาม Controller-View pattern
4. สร้าง route `src/app/elder/food/page.tsx`
5. เพิ่มปุ่ม "สั่งอาหาร" ที่ `elderHomePage.tsx` → link ไป `/elder/food`
6. เพิ่ม i18n key ที่ขาด

## Tasks

1. **API menus endpoint** — file: `src/app/api/elder/food/menus/route.ts` — GET, requireDevice, return recommendMenus filtered by elder profile
2. **API food request endpoint** — file: `src/app/api/elder/food/request/route.ts` — POST `{ menuId }`, requireDevice, notify caregiver via notification fan-out
3. **types.ts** — file: `src/modules/elderFood/types.ts` — `ElderFoodState`, `FoodRequestStatus`
4. **globalState hook** — file: `src/modules/elderFood/controller/hooks/globalState.ts`
5. **queryHandler hook** — file: `src/modules/elderFood/controller/hooks/queryHandler.ts` — fetch menus via `/api/elder/food/menus`
6. **handler hook** — file: `src/modules/elderFood/controller/hooks/handler.ts` — handleSelect, handleConfirm (POST request)
7. **controller** — file: `src/modules/elderFood/controller/controller.ts`
8. **view** — file: `src/modules/elderFood/views/ElderFoodView.tsx` — แสดงรายการเมนู + สถานะ
9. **page component** — file: `src/modules/elderFood/elderFoodPage.tsx`
10. **route** — file: `src/app/elder/food/page.tsx`
11. **home button** — file: `src/modules/elderHome/elderHomePage.tsx` — เพิ่มปุ่ม `food.orderFood` link `/elder/food`
12. **i18n** — file: `messages/th.json` — เพิ่ม `food.orderFood`, `food.waiting`, `food.requested`

## Tests

- Unit: `queryHandler`, `handler` (happy path + error เมื่อ API ล้มเหลว)
- E2E: ข้ามสำหรับ iteration นี้ (integrate กับ full flow ทีหลัง)

## Risks / Open questions

- Notification fan-out ไปหา caregiver ต้องการ pairing อยู่ — ถ้า elder ยังไม่ได้ pair จะ graceful fail (show "กรุณา pair device ก่อน")
- Repository ใช้ in-memory — food request จะหายหลัง server restart (acceptable สำหรับ MVP)
