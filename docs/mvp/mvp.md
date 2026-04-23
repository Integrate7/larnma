# หลานม่า (Larnma) — MVP Specification

> **Hackathon:** SCB Tech X — Social Impact (1 วัน)
> **Goal:** ลดช่องว่างระหว่างผู้สูงอายุที่อยู่บ้านลำพัง กับบุตรหลานที่ต้องออกไปทำงาน ด้วยเสียง + AI

---

## 1. Concept

แอปพลิเคชัน 2 ฝั่งที่ใช้ **เสียง** เป็น interface หลักสำหรับผู้สูงอายุ และใช้ **Gemini AI** วิเคราะห์ทั้ง "น้ำเสียง (tone)" และ "ใจความ (intent)" เพื่อแจ้งเตือนบุตรหลานแบบเข้าใจบริบท โดยผู้สูงอายุ**ไม่ต้องเรียนรู้เทคโนโลยี**

**Tagline:** "กดปุ่มเดียว พูดธรรมดา หลานอยู่ข้างคุณเสมอ"

---

## 2. User Roles

| Role | อุปกรณ์ | หน้าที่ |
|---|---|---|
| **ผู้สูงอายุ (Elder)** | Smartphone | พูดคุยผ่าน wake word / ปุ่มไมค์ใหญ่ |
| **บุตรหลาน (Caregiver)** | Smartphone | ตั้งค่า, ดู dashboard, รับ noti, จ่ายค่าอาหาร |
| **Primary Caregiver** | Smartphone | Caregiver คนแรกที่ได้ noti ก่อน และตัดสินใจติดต่อ รพ. |

> **Relationship:** 1 Elder ↔ N Caregivers (หลายคนดูแลคนเดียว) โดยมี **1 Primary** เสมอ
> **Permissions:** Secondary caregivers มี default permission (view + reply + รับ noti). Primary toggle per-caregiver ได้ (edit profile, pay orders, decide emergency) — ดู section 3.9.5

---

## 3. Core Features (MVP Scope)

### 3.1 Elder App (ฝั่งผู้สูงอายุ)

- **หน้าจอเดียว** — ปุ่มไมโครโฟนวงกลมใหญ่กลางจอ + แสดงสถานะ (ฟัง / กำลังส่ง / เสร็จ)
- **Wake word activation** — พูด "หลานม่า" → เปิดไมค์อัตโนมัติ (fallback: แตะปุ่ม)
- **แสดง noti ตอบกลับจากบุตรหลาน** — ข้อความ/เสียงลูกหลาน
- **ภาษา** — ไทยกลาง + ภาษาถิ่น (อีสาน/เหนือ/ใต้) ผ่าน Gemini multimodal

### 3.2 Caregiver App (ฝั่งบุตรหลาน)

- **Onboarding & Setup** — กรอกข้อมูลสุขภาพผู้สูงอายุ (โรคประจำตัว, ยา, ที่อยู่)
- **QR Pairing** — สแกน QR Code 1 ครั้งเพื่อเชื่อมต่อกับ Elder device
- **Dashboard**
  - สถานะผู้สูงอายุ real-time (ล่าสุดพูดอะไร, อารมณ์อะไร)
  - Timeline เหตุการณ์วันนี้
  - Weekly mood summary
- **Notification Center** — รับแจ้งเตือนทุกเหตุการณ์ + ระดับความสำคัญ
- **Two-way reply** — ตอบกลับผู้สูงอายุด้วยเสียง/ข้อความ

### 3.3 AI Mood & Intent Analysis (Gemini)

Input: audio file (เสียงผู้สูงอายุ)
Output (JSON):
```json
{
  "transcript": "หิวข้าว อยากกินข้าวผัด",
  "intent": "HUNGRY",
  "mood": "NORMAL",
  "confidence": 0.87,
  "summary": "ผู้สูงอายุหิวและอยากกินข้าวผัด",
  "entities": { "food": "ข้าวผัด" }
}
```

**Mood categories (6):**

| Category | ความหมาย | Notification Priority |
|---|---|---|
| `DANGER` | ฉุกเฉิน — ล้ม, เจ็บหนัก, ตกใจ, เสียงดังผิดปกติ | 🚨 Critical (ping Primary + escalate) |
| `PAIN` | ปวด / ไม่สบาย ไม่ฉุกเฉิน | ⚠️ High |
| `HUNGRY` | อยากกินอาหาร | ℹ️ Normal (trigger food flow) |
| `LONELY` | เหงา อยากคุย | ℹ️ Normal |
| `SAD` | เศร้า หดหู่ | ⚠️ High (mental health watch) |
| `HAPPY` | อารมณ์ดี | 📊 Log only |
| `NORMAL` | baseline / ทั่วไป | 📊 Log only |

### 3.4 Emergency Escalation Flow (DANGER case)

```
DANGER detected
  → Noti ส่งถึง "ทุก Caregiver" (Primary + Secondary) ทันที + ringtone เฉพาะ
  → เฉพาะ caregiver ที่มี permission `decide_emergency` = true เห็นปุ่ม "โทรเรียก รพ."
    (default: Primary = true, Secondary = false — Primary toggle ได้)
  → First-click wins: คนแรกที่กด "ฉันจัดการ" → lock event
    → caregiver คนอื่นเห็น status "[ชื่อ] กำลังดูแลอยู่"
  → ถ้าไม่มีใคร ack ใน 5 นาที → auto-escalate:
    → ping ซ้ำทุก caregiver + แสดงปุ่มโทร 1669 เด่นใน Elder app
```

### 3.5 Health-Food Ecosystem (Mock)

- ฝั่ง Elder พูด "หิว" → ระบบวิเคราะห์ HUNGRY + แนะนำเมนูจาก **โรคประจำตัว**
- ฝั่ง Caregiver ได้ noti พร้อม 2-3 เมนูแนะนำ → **กดยืนยัน + จ่ายเงิน**
- **Mock food delivery API** — simulate GrabFood/LineMan response
- **ที่อยู่จัดส่ง** = ที่อยู่ผู้สูงอายุ (กรอกตอน setup)

### 3.6 Point System (Mock)

- Auto-confirm redemption: ทุก order สำเร็จ → point เข้าบัญชี Caregiver อัตโนมัติ (ไม่ต้องกดยืนยัน)
- **Mock point wallet** — แสดงยอด + ประวัติ + สินค้าแลกได้ (ไม่ต้อง integrate จริง)

### 3.7 Offline Fallback

- **Primary fallback (เน็ตล่ม):** ปุ่มในแอป Elder → โทร/ส่งข้อความตรงถึง Primary Caregiver (ใช้ Phone app OS)
- **Stretch:** Gemma LLM on-device ทำ basic intent classification ต่อได้ → sync event หลังเน็ตกลับมา

### 3.8 PDPA Compliance

- **Consent screen** ตอน onboarding ทั้ง 2 ฝั่ง
- **Data retention** — เสียงดิบเก็บ 24 ชม. แล้ว delete, transcript + mood เก็บ 90 วัน
- **User control** — Caregiver ลบข้อมูล Elder ได้ทั้งหมด (right to be forgotten)
- **Encryption** — audio transit TLS, at-rest AES-256
- **DPA (Data Processing Agreement)** กับ Gemini API (Google Cloud)

### 3.9 Onboarding & Register Flow

#### 3.9.1 Principles

- **Primary Caregiver** register ก่อน → เป็นคนกรอก Elder profile → สร้าง pairing QR
- **Secondary Caregiver** join ทีหลังผ่าน **invite link** (ไม่ต้องมี QR)
- **Elder** ไม่ register เลย — แค่สแกน QR ครั้งเดียว → device-bound cookie (refresh 365 วัน)
- **Verification** — Phone + **OTP** (mock `123456` ในช่วง hackathon)

#### 3.9.2 Flow A — Primary Caregiver Register + Elder Setup (11 screens)

| # | Screen | Action | API |
|---|---|---|---|
| 1 | Welcome | [เริ่มใช้งาน] | — |
| 2 | Phone Input | ใส่เบอร์โทร → รับ OTP | `POST /auth/otp/send` |
| 3 | OTP Verify | กรอก 6 หลัก (mock `123456`) | `POST /auth/otp/verify` → set HttpOnly cookies |
| 4 | Caregiver Profile | ชื่อ, ความสัมพันธ์, รูป (optional) | `POST /caregivers` |
| 5 | PDPA Consent | 3 toggles (2 required, 1 optional) | `POST /consents` |
| 6 | Elder Basic | ชื่อ, วันเกิด, เบอร์, ที่อยู่, รูป | buffered client-side |
| 7 | Elder Health | โรคประจำตัว (multi-select), symptoms, ยา+เวลา, แพ้อาหาร/ยา | buffered |
| 8 | Elder Emergency | เบอร์ รพ., หมอประจำ, ญาติสำรอง | buffered |
| 9 | Elder Optional | กรุ๊ปเลือด, ส่วนสูง/นน., อาหารที่ชอบ/ไม่ชอบ (skippable) | buffered |
| 10 | Review Summary | ตรวจสอบทั้งหมด → [ยืนยัน] | `POST /elders` |
| 11 | QR Display | แสดง QR + คำแนะนำ (TTL 15 นาที, refresh ได้) | `POST /pairings/qr` |

#### 3.9.3 Flow B — Elder Device Pairing (No Login)

| # | Screen | Action | API |
|---|---|---|---|
| 1 | Splash | auto detect ยังไม่ pair → "ให้ลูกหลานช่วยสแกน QR" | — |
| 2 | Camera | เปิดกล้อง → scan QR | `POST /pairings/consume { token, device_id }` |
| 3 | Home | ปุ่มไมค์ใหญ่พร้อมใช้งาน | device cookie set (refresh 365d) |

#### 3.9.4 Flow C — Secondary Caregiver Join via Invite

| # | Side | Action |
|---|---|---|
| 1 | Primary | Dashboard → [เพิ่มคนดูแล] → `POST /invites { elder_id }` → `https://larnma.app/invite/<token>` (exp 24h) |
| 2 | Primary | Share via LINE / SMS / Copy |
| 3 | Secondary | เปิด link → Landing: "[Primary] เชิญคุณดูแล [Elder]" → [ยอมรับ] |
| 4 | Secondary | Phone + OTP → Profile (name, relationship) → `POST /invites/:token/accept` |
| 5 | Secondary | Auto-link เป็น `role=caregiver, is_primary=false` → Dashboard |

#### 3.9.5 Permission Model (Q5: Primary toggle per-caregiver)

| Permission | Primary | Secondary (default) | Toggle by Primary? |
|---|---|---|---|
| `view_dashboard` | ✅ | ✅ | ❌ (always on) |
| `receive_noti` (incl. DANGER) | ✅ | ✅ | ❌ (Q6: all caregivers always get DANGER) |
| `reply_to_elder` | ✅ | ✅ | ✅ |
| `edit_elder_profile` | ✅ | ❌ | ✅ |
| `pay_food_orders` | ✅ | ❌ | ✅ |
| `decide_emergency` (โทร รพ.) | ✅ | ❌ | ✅ |
| `redeem_points` | ✅ | ❌ | ✅ |
| `invite_caregivers` | ✅ | ❌ | ❌ (Primary only) |
| `transfer_primary` | ✅ | ❌ | ❌ (Primary only) |

Stored as JSONB `permissions` on `pairings` row.

#### 3.9.6 New API Endpoints

```
# Auth
POST   /auth/otp/send         { phone }                      → { ref, exp }
POST   /auth/otp/verify       { phone, code, ref }           → set cookie (access+refresh)
POST   /auth/refresh                                          → rotate cookie
POST   /auth/logout                                           → clear + blacklist jti

# Caregiver
POST   /caregivers            { name, relationship, pic? }
GET    /caregivers/me

# Elder (caregiver-authorized)
POST   /elders                { basic, health, emergency, optional? }  → { elder_id }
GET    /elders/:id
PATCH  /elders/:id                                            (permission: edit_elder_profile)

# Pairing (Elder device)
POST   /pairings/qr           { elder_id }                    → { qr_png_base64, token, exp }
POST   /pairings/consume      { token, device_fingerprint }   → set device cookie

# Invite (secondary caregiver)
POST   /invites               { elder_id }                    → { url, token, exp }
GET    /invites/:token                                         → { elder_name, inviter_name, exp }
POST   /invites/:token/accept { phone, otp, profile }          → join

# Permissions (Primary only)
PATCH  /pairings/:id/permissions   { permissions: {...} }

# Consent
POST   /consents              { items: [{type, granted}] }
```

#### 3.9.7 Security Requirements

- **OTP rate limit** — 3 ครั้ง / เบอร์ / 10 นาที, ถ้าเกิน lock 30 นาที
- **OTP expiry** — 5 นาที, one-time use
- **Pairing QR** — token JWT exp 15 นาที, one-time use (consume → revoke)
- **Invite token** — JWT exp 24 ชม., one-time use, embed `elder_id` + `inviter_id`
- **Device fingerprint** — client-generated (UA + hash) ใส่ใน elder cookie เพื่อกัน cookie replay
- **Refresh rotation** — ทุก refresh ออก token ใหม่ + revoke เก่า (detect theft)
- **Origin check** — บน mutating requests (state-changing POST/PATCH/DELETE)

### 3.10 Elder Profile Management

#### 3.10.1 Principles

- **Caregiver app** — ดูและแก้ไข profile ได้ (gate ด้วย permission `edit_elder_profile`)
- **Elder app** — มีหน้า "ข้อมูลของฉัน" (read-only, ฟอนต์ใหญ่, ปุ่มโทรลูกหลานตรง one-tap)
- **No audit log** ใน MVP (Q4) — decisions track ผ่าน `pairings.permissions` + timestamps เฉพาะ critical actions
- **Soft-delete (PDPA)** — ลบ Elder = mark deleted, hard-delete หลัง 7 วัน (คืนได้ก่อนครบ)

#### 3.10.2 Caregiver App — View Page

**Route:** `/caregiver/elders/:id`

```
Header: รูป + ชื่อ + อายุ + ความสัมพันธ์

Sections (collapsible):
├─ Basic       (ชื่อ, วันเกิด, เบอร์, ที่อยู่, รูป)
├─ Health      (โรคประจำตัว chips, symptoms, medications+time, allergies)
├─ Emergency   (hospital_contact, doctor_contact, backup_relative)
└─ Optional    (blood_type, height/weight → BMI, food_preferences, food_dislikes)

Action bar (conditional):
├─ [แก้ไขข้อมูล]    → ถ้า pairing.permissions.edit_elder_profile
├─ [จัดการผู้ดูแล]  → Primary only (ไปหน้า permission toggle)
├─ [โอน Primary]    → Primary only (confirm 2x, irrevocable 24 ชม.)
└─ [ลบ Elder]       → Primary only (soft-delete + lock 7 วัน)
```

#### 3.10.3 Caregiver App — Edit Page (Full Page, Q2: B)

**Route:** `/caregiver/elders/:id/edit`

- Form เดียวยาว scroll ได้, แยก 4 sections ตาม register wizard
- Sticky bottom bar: `[บันทึก]` `[ยกเลิก]`
- Client-side validation → submit `PATCH /elders/:id` ทั้ง payload หรือ per-section

**Field-level rules (Q3):**

| Field | Rule |
|---|---|
| Phone (Elder) | แก้ได้ไม่ต้อง OTP (Elder ไม่ login — phone ใช้เฉพาะ emergency fallback call) |
| Address | ถ้ามี order status ∈ `{preparing, delivering}` → warn "ที่อยู่ใหม่จะมีผลกับ order ถัดไปเท่านั้น" |
| Conditions / Medications / Allergies | แก้ได้อิสระ (สำคัญต่อ AI food recommendation) |
| Transfer Primary | ต้อง confirm 2 ขั้น, set `primary_transferred_at = now()`, block การโอนซ้ำ 24 ชม. |
| Delete Elder | confirm + `deleted_at = now()`, `hard_delete_after = now() + 7d`, Primary กู้คืนได้ก่อนครบ |

#### 3.10.4 Elder App — "ข้อมูลของฉัน" (Read-only)

**Access:** ปุ่มไอคอน 👤 มุมบนซ้ายของ home screen (ขนาดใหญ่, contrast สูง)

**Route:** `/elder/me`

```
ฟอนต์ 24-28px, high contrast, ปุ่มขนาดใหญ่
├─ รูป + ชื่อ + อายุ
├─ โรคประจำตัว (chips ใหญ่)
├─ ยาที่ทาน + เวลา (list)
├─ แพ้อะไร (list)
├─ ที่อยู่ (ไว้ยืนยันเวลาสั่งอาหาร)
└─ เบอร์ลูกหลาน (one-tap call ผ่าน `tel:` link)

ปุ่ม [← กลับหน้าหลัก] ใหญ่ล่างสุด
```

#### 3.10.5 New API Endpoints

```
# Profile CRUD
GET    /elders/:id                                    (caregiver-authorized)
PATCH  /elders/:id                { section, fields }  (permission: edit_elder_profile)

# Primary transfer
POST   /elders/:id/transfer-primary  { to_caregiver_id }  (Primary only, 24h cooldown)

# Soft delete / restore (PDPA)
DELETE /elders/:id                                         (Primary only → soft delete)
POST   /elders/:id/restore                                (Primary only, within 7 days)

# Elder-side (device cookie)
GET    /elder/me                                          (read-only, uses device_session)
```

#### 3.10.6 Data Model Additions

```sql
-- elder_profiles: add soft-delete columns
elder_profiles  ADD COLUMN deleted_at         TIMESTAMP NULL;
elder_profiles  ADD COLUMN hard_delete_after  TIMESTAMP NULL;
-- cron: DELETE FROM users WHERE hard_delete_after < NOW()  (runs daily)

-- pairings: add transfer cooldown tracker
pairings        ADD COLUMN primary_transferred_at  TIMESTAMP NULL;
-- guard: reject transfer if primary_transferred_at > NOW() - 24h
```

---

## 4. Out of Scope (MVP)

- ❌ จ่ายเงินจริงผ่าน payment gateway (ใช้ mock)
- ❌ Integration จริงกับ GrabFood / LineMan / Foodpanda
- ❌ แลก point ได้ของจริง
- ❌ Video call (ใช้แค่เสียง + ข้อความ)
- ❌ Voice biometric verification
- ❌ Medication reminder (Phase 2)
- ❌ Fall detection ด้วย sensor (Phase 2)

---

## 5. Tech Stack

| Layer | Technology | เหตุผล |
|---|---|---|
| Frontend + Backend | **Next.js 16** (App Router, Route Handlers) | Single runtime — ทั้ง UI และ API อยู่ใน project เดียว |
| Styling | **Tailwind CSS 4** | CSS-first config, Oxide engine, faster build |
| UI Kit | **shadcn/ui** (Radix + Tailwind) | Copy-paste components, accessible, รวดเร็ว |
| Mobile | **PWA** (installable, manifest + SW) | ประหยัดเวลา — ไม่ต้อง build native |
| Database | **In-memory repository** (`IRepository` interface) | Hermetic tests + zero infra; swap Prisma/PostgreSQL ใน Phase 2 |
| Real-time | **Server-Sent Events (SSE)** via `ReadableStream` | Simpler than Socket.IO, works natively with cookie auth |
| AI | **Gemini 2.0 Flash** (multimodal audio) via `GeminiAdapter` interface | Mock ใช้ keyword heuristics; real Gemini = one config flip |
| Offline | **Gemma 2B** via Transformers.js (stretch) | On-device inference |
| Auth | **HTTP-only cookie + JWT (access + refresh)** | XSS-safe, no localStorage, CSRF via SameSite=Lax |
| Storage | Audio ประมวลผล in-memory แล้วทิ้ง | ตรงตาม PDPA 24h auto-delete โดยธรรมชาติ |

> **Phase 2 swaps (plug-in, no rewrite):** In-memory → Prisma + PostgreSQL, MockGeminiAdapter → real Gemini, SSE → Socket.IO หากต้องการ bi-directional.

### 5.1 Auth Flow (HTTP-only Cookie)

```
Login (Caregiver, Phone + OTP):
  POST /api/auth/otp/send    { phone }                → { ref, exp }
  POST /api/auth/otp/verify  { phone, code, ref }
    → Route Handler verify → issue:
        • access_token  (JWT, exp 15min) → Set-Cookie (HttpOnly, Secure, SameSite=Lax)
        • refresh_token (JWT, exp 30d)   → Set-Cookie (HttpOnly, Secure, SameSite=Lax, path=/api/auth)

Pairing (Elder, no login):
  POST /api/pairings/consume { token, device_fingerprint }
    → device_session cookie (HttpOnly, Secure, SameSite=Lax, exp 365d)

API call (Next.js Route Handler)
  → Browser auto-attaches cookie
  → Guard (requireCaregiver / requireDevice) verifies JWT
  → ถ้า expired → frontend fetches /api/auth/refresh → rotate tokens

Logout → POST /api/auth/logout → Set-Cookie with Max-Age=0 + blacklist jti in-memory
```

**Rules:**
- ❌ ห้ามเก็บ token ใน `localStorage` / `sessionStorage` (XSS risk)
- ✅ Cookie flags: `HttpOnly; Secure; SameSite=Lax`
- ✅ CSRF: Lax cookie + server-side origin check บน mutating requests
- ✅ Refresh token rotation ทุกครั้งที่ใช้ (detect theft)
- ✅ SSE stream ใช้ cookie เดียวกัน (no token-in-URL)

---

## 6. High-Level Architecture

```
┌────────────────┐         ┌────────────────┐
│  Elder PWA     │         │ Caregiver PWA  │
│  (Next.js)     │         │   (Next.js)    │
│  - Mic button  │         │  - Dashboard   │
│  - QR scan     │         │  - Noti        │
└───────┬────────┘         └────────┬───────┘
        │ audio upload              │ SSE (EventSource)
        │ fetch (cookie auth)       │ fetch (cookie auth)
        ▼                           ▼
┌─────────────────────────────────────────┐
│     Next.js Route Handlers (same app)   │
│  /api/audio  /api/elder/events/stream   │
│  /api/pairings  /api/orders  /api/auth  │
└──┬──────────┬────────┬──────────┬───────┘
   │          │        │          │
   ▼          ▼        ▼          ▼
┌──────────┐ ┌──────────────┐ ┌──────┐ ┌──────────┐
│GeminiAda-│ │In-memory     │ │Mock  │ │Mock Point│
│pter      │ │Repository    │ │Food  │ │ Service  │
│(mock/real)│ │(IRepository) │ │      │ │          │
└──────────┘ └──────────────┘ └──────┘ └──────────┘
```

---

## 7. Data Model (Core Entities)

```sql
-- Identity
users              (id, role ENUM['elder','caregiver'], phone UNIQUE,
                    name, profile_pic_url, created_at)

-- Auth
otp_challenges     (id, phone, code_hash, ref, attempts, expires_at,
                    consumed_at, locked_until)
sessions           (id, user_id, refresh_hash, user_agent, ip,
                    last_seen, revoked_at, created_at)           -- caregivers
device_sessions    (id, elder_id, device_fingerprint, refresh_hash,
                    last_seen, revoked_at, created_at)           -- elders (no login)

-- Elder profile (extended per Q3 — all fields + soft delete per 3.10)
elder_profiles     (user_id PK, birthdate, address_line, district,
                    province, postal_code, blood_type,
                    height_cm, weight_kg,
                    conditions TEXT[],        -- เบาหวาน, ความดัน, ...
                    symptoms TEXT[],          -- ปวดเข่า, ตามัว, ...
                    medications JSONB,        -- [{name, dosage, time}]
                    allergies TEXT[],
                    food_preferences TEXT[],
                    food_dislikes TEXT[],
                    hospital_contact JSONB,   -- {name, phone}
                    doctor_contact JSONB,     -- {name, phone, specialty}
                    backup_relative JSONB,    -- {name, phone, relation}
                    deleted_at TIMESTAMP NULL,
                    hard_delete_after TIMESTAMP NULL)   -- PDPA 7-day lock

-- Pairing with per-caregiver permissions (Q5) + transfer cooldown (3.10)
pairings           (id, elder_id, caregiver_id, is_primary BOOL,
                    permissions JSONB,        -- {view_dashboard, reply_to_elder,
                                               --  edit_elder_profile, pay_food_orders,
                                               --  decide_emergency, redeem_points}
                    primary_transferred_at TIMESTAMP NULL,   -- 24h cooldown guard
                    created_at, revoked_at,
                    UNIQUE(elder_id, caregiver_id))

-- Invites (secondary caregiver)
invites            (id, elder_id, created_by_caregiver_id, token_hash,
                    expires_at, accepted_by_caregiver_id, accepted_at)

-- Core domain
audio_events       (id, elder_id, audio_url, transcript, mood, intent,
                    confidence, entities JSONB, created_at)
notifications      (id, event_id, caregiver_id, priority, read_at, ack_at,
                    locked_by_caregiver_id)   -- first-click wins for DANGER
orders             (id, event_id, caregiver_id, menu JSONB, total, status,
                    mock_ref, created_at)
points             (id, caregiver_id, delta, reason, balance_after, created_at)

-- Compliance
consents           (id, user_id, type ENUM['audio_ai','health_data','marketing'],
                    granted_at, revoked_at)
```

---

## 8. Key Flows

### 8.1 Pairing Flow

```
Caregiver app → Tap "Add Elder" → Show QR (contains pairing_token)
Elder device → Open app (first time) → Camera → Scan QR
Server → Validate token → Create pairing → Mark first caregiver as Primary
Both apps → WebSocket subscription active
```

### 8.2 Voice Flow (Happy Path)

```
1. Elder: "หลานม่า" (wake word) / tap button
2. Elder app: record audio (max 30s, auto-stop on silence)
3. Upload to /audio endpoint
4. Server → Gemini → get {mood, intent, transcript, summary}
5. Save audio_event
6. If mood in [DANGER, PAIN, SAD] → push noti immediately
   Else log + dashboard update
7. If intent == HUNGRY → trigger food recommendation flow
8. WebSocket broadcast to all paired caregivers
```

### 8.3 Food Order Flow

```
HUNGRY detected → Gemini generates 3 menu suggestions
                  (filtered by elder's conditions)
→ Push to Primary Caregiver with "[Order now]" button
→ Caregiver picks menu → mock payment → order confirmed
→ Mock delivery status ticks (preparing → delivering → delivered)
→ Auto-add points to Caregiver wallet on 'delivered'
→ Noti to Elder: "หลานสั่ง ข้าวผัดกะเพรา ให้แล้วนะคะ ถึงใน 30 นาที"
```

---

## 9. 1-Day Implementation Plan

### Hour 0-1: Setup (parallel)
- Repo scaffold: Next.js 16 monorepo (`apps/caregiver`, `apps/elder`) + NestJS
- Tailwind 4 + shadcn/ui init
- Postgres + Prisma schema + migration (all tables in section 7)
- Gemini API key + smoke test

### Hour 1-3: Auth + Onboarding (Flow A)
- `/auth/otp/send` + `/auth/otp/verify` (mock `123456`) + HttpOnly cookie
- Caregiver register wizard (11 screens) with shadcn Stepper
- PDPA consent screen
- Elder profile form (Basic / Health / Emergency / Optional)
- `POST /elders` → persist

### Hour 3-5: Pairing + Core Voice Loop
- `POST /pairings/qr` + `POST /pairings/consume` (device cookie)
- Elder app: scan QR → device-bound session
- Elder app: big mic button → record → upload `POST /audio`
- NestJS: Gemini classification → save `audio_events`
- Caregiver dashboard: live feed via WebSocket

### Hour 5-6: Notifications + Mock Services
- Push noti (WebSocket toast + browser Notification API)
- Mock food API (static menu filtered by `conditions`) + fake order lifecycle
- Mock point wallet (auto-add on order `delivered`)

### Hour 6-7: Emergency Escalation + Invite Flow + Profile
- DANGER flow (all caregivers noti, first-click wins, 5-min escalate)
- `POST /invites` + accept flow (Flow C)
- Permission toggle screen (Primary only)
- Elder Profile: View page + Full Edit page (Caregiver) — section 3.10

### Hour 7-8: Polish + Demo
- Elder app "ข้อมูลของฉัน" page (read-only, high contrast) — section 3.10.4
- Seed demo data (1 elder + 1 primary + 1 secondary caregiver)
- Demo script (elder says 3 things: HUNGRY, LONELY, DANGER)
- UI polish + final PDPA check + loom recording

### Stretch (if time remains)
- Wake word (picovoice Porcupine or similar)
- Primary transfer + Soft-delete/restore flows (section 3.10)
- Gemma on-device
- Weekly mood chart

---

## 10. Success Criteria (Demo)

**Must demo:**
1. ✅ QR pairing ใช้งานได้จริง
2. ✅ ผู้สูงอายุพูด → เห็น mood + transcript ใน caregiver dashboard ภายใน 5 วินาที
3. ✅ DANGER → noti ไปถึง caregiver พร้อม ringtone เฉพาะ
4. ✅ HUNGRY → recommend เมนู → caregiver กดสั่ง → mock order → point เพิ่ม
5. ✅ PDPA consent screen

**Social impact pitch:**
- ผู้สูงอายุไทย 13 ล้านคน, >1 ล้านอยู่บ้านลำพัง
- อัตราโรคซึมเศร้าในผู้สูงอายุเพิ่มขึ้น 2 เท่าในช่วง 5 ปี
- เทคโนโลยีช่วยลดภาระลูกหลาน + จับสัญญาณอันตราย/ซึมเศร้าได้เร็ว

---

## 11. Open Questions / Risks

| # | Question | Impact |
|---|---|---|
| 1 | Wake word library ตัวไหนรองรับไทย? | ถ้าไม่มี ใช้ปุ่มใหญ่แทน |
| 2 | Gemini latency สำหรับเสียงไทยภาษาถิ่น? | ต้องทดสอบ < 3s |
| 3 | PWA iOS มีข้อจำกัด background audio | demo ใช้ Android |
| 4 | Mock food partner ใช้ logo จริงได้ไหม? | ใช้ fake brand "FoodyMock" |
| 5 | PDPA consent ต้องมีทนายดูไหม? | MVP ใช้ draft, Phase 2 consult legal |

---

## 12. Future Roadmap (Post-Hackathon)

- 🎙️ Wake word ภาษาไทยแท้
- 💊 Medication reminder ด้วยเสียง
- 📞 Voice call สองทาง (WebRTC)
- 🧠 AI memory — จำบทสนทนาเก่า, ถามไถ่ต่อเนื่อง
- 📹 Fall detection ด้วย camera / IMU
- 🏥 Integration จริงกับโรงพยาบาล + 1669 + GrabFood
- 🗣️ Voice biometric — ยืนยันตัวผู้สูงอายุ
- 📊 AI doctor summary รายเดือน ส่งให้หมอประจำตัว
