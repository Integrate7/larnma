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
  → Noti ส่งถึง Primary Caregiver ทันที + ring tone เฉพาะ
  → Primary ตัดสินใจ (In-app button: "โทรเรียก รพ." / "ฉันจัดการเอง")
  → ถ้า Primary ไม่ตอบใน 5 นาที → broadcast ไปทุก Caregiver
  → ถ้ายังไม่มีใครตอบใน 10 นาที → แสดงปุ่มโทร 1669 เด่นใน Elder app
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
| Frontend | **Next.js 14** (App Router) + Tailwind | Rapid prototyping, 1 codebase 2 routes (`/elder`, `/caregiver`) |
| Mobile | **PWA** (installable) | ประหยัดเวลา — ไม่ต้อง build native |
| Backend | **NestJS** + TypeScript | Structured, fast to scaffold |
| Database | **PostgreSQL** | Relational ชัดเจน + JSON field สำหรับ mood events |
| Real-time | **WebSocket (Socket.IO)** | Push noti + status update |
| AI | **Gemini 2.0 Flash** (multimodal audio) | รองรับเสียง + ไทย + ถิ่น |
| Offline | **Gemma 2B** via Transformers.js (stretch) | On-device inference |
| Auth | **Supabase Auth** / simple JWT | Speed over security (hackathon) |
| Storage | **Supabase Storage** / S3 mock | เก็บ audio file ชั่วคราว |

---

## 6. High-Level Architecture

```
┌────────────────┐         ┌────────────────┐
│  Elder PWA     │         │ Caregiver PWA  │
│  (Next.js)     │         │   (Next.js)    │
│  - Wake word   │         │  - Dashboard   │
│  - Mic button  │         │  - Noti        │
└───────┬────────┘         └────────┬───────┘
        │ audio upload              │ WebSocket
        │ WebSocket                 │
        ▼                           ▼
┌─────────────────────────────────────────┐
│          NestJS API Gateway             │
│  /pair  /audio  /events  /orders  /ws   │
└──┬──────────┬────────┬──────────┬───────┘
   │          │        │          │
   ▼          ▼        ▼          ▼
┌──────┐ ┌────────┐ ┌──────┐ ┌──────────┐
│Gemini│ │Postgres│ │Mock  │ │Mock Point│
│ API  │ │        │ │Food  │ │ Service  │
└──────┘ └────────┘ └──────┘ └──────────┘
```

---

## 7. Data Model (Core Entities)

```sql
users (id, role ENUM['elder','caregiver'], phone, name, ...)
elder_profiles (user_id, address, conditions[], medications[], allergies[])
pairings (elder_id, caregiver_id, is_primary BOOL, created_at)
audio_events (id, elder_id, audio_url, transcript, mood, intent,
              confidence, entities JSONB, created_at)
notifications (id, event_id, caregiver_id, priority, read_at, ack_at)
orders (id, event_id, caregiver_id, menu[], total, status, mock_ref)
points (id, caregiver_id, delta, reason, balance_after, created_at)
consents (user_id, type, granted_at, revoked_at)
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
- Repo scaffold (Next.js monorepo + NestJS)
- Postgres + migration
- Gemini API key + smoke test

### Hour 1-4: Core MVP
- Elder app: big button + record + upload
- NestJS: `/audio` endpoint → Gemini → save event
- Caregiver app: dashboard + WebSocket live feed
- Pairing flow (QR code)

### Hour 4-6: Notifications + Mock services
- Push noti (simple WebSocket toast + browser Notification API)
- Mock food API (static menu + fake order lifecycle)
- Mock point wallet

### Hour 6-7: Emergency Escalation
- DANGER flow + escalation timer
- Two-way reply (text only, stretch: voice)

### Hour 7-8: Polish + Demo
- Seed demo data
- Demo script (elder says 3 things: HUNGRY, LONELY, DANGER)
- UI polish + PDPA consent screen

### Stretch (if time remains)
- Wake word (picovoice Porcupine or similar)
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
