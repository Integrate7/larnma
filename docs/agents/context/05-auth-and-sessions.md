# Auth & Sessions (Agent Reference)

Larnma has **two separate auth flows** because the two surfaces have fundamentally different trust models:

- **Caregiver** — a real person on a real account. Access + refresh JWT cookies, 15-minute rotation, revocable sessions.
- **Elder** — a shared device, no password. A long-lived device JWT bound to a `deviceFingerprint`. Issued only via **QR pairing** initiated by a caregiver.

No project-root `middleware.ts`. Guards are enforced **per route** via `src/services/guards/`.

---

## 1. Cookies (canonical names)

From `src/services/adapter/config.ts`:

| Cookie | TTL | Used by |
|---|---|---|
| `larnma_access`  | 15 min (`accessTtlSec`) | Caregiver API + RSC access |
| `larnma_refresh` | 30 d (`refreshTtlSec`) | `POST /api/auth/refresh` only |
| `larnma_device`  | 365 d (`deviceTtlSec`) | Elder API + RSC access |

All cookies are `httpOnly`, `secure` in production, `sameSite: 'lax'`. See `src/services/jwt/cookieSession.ts` for the helpers (`setSessionCookie`, `clearSessionCookie`, `readCookie`, `COOKIES`).

### JWT payloads

```ts
// caregiver access
{ sub: userId, role: 'caregiver', kind: 'access',  sid: sessionId }

// caregiver refresh
{ sub: userId, role: 'caregiver', kind: 'refresh' }

// elder device
{ sub: sessionId, role: 'elder', kind: 'device', elderId, fingerprint }
```

All JWTs are signed with HS256 via `jose`, `iss = 'larnma'` (from `ADAPTER_CONFIG.jwtIssuer`). See `src/services/jwt/jwtService.ts`.

---

## 2. Caregiver Flow

### 2a. Phone + OTP

```
POST /api/auth/otp/send       → { ref, expiresAt }        (guards: checkOriginAllowed)
POST /api/auth/otp/verify     → 200 + Set-Cookie: larnma_access + larnma_refresh
```

- OTP lives in the repository as an `OtpChallenge` row. Hashed code, max 3 attempts, 5-minute expiry, 30-minute lock on too many wrong attempts (`otpMaxAttempts`, `otpExpireSec`, `otpLockSec`).
- On `verify`, the service layer calls `issueCaregiverSession({ userId })` → creates a `Session` row + signs both tokens → `setSessionCookie(res, 'larnma_access', …)` etc.

### 2b. Google OAuth

```
GET  /api/auth/google           → 302 to Google consent
GET  /api/auth/google/callback  → exchange code → upsert User by googleId → issueCaregiverSession → redirect to /dashboard
```

### 2c. Refresh

```
POST /api/auth/refresh          → rotateCaregiverSession(refreshToken) → new access + refresh pair
```

- Call this when the client hits `errorCode: UNAUTHENTICATED` on a normal request — silent retry, then fail.
- `rotateCaregiverSession` currently re-uses `issueCaregiverSession`. If you add rotation-on-use / replay detection, mutate the `Session` row rather than its JWT payload.

### 2d. Logout

```
POST /api/auth/logout           → clearSessionCookie × 2 + repo.revokeSession(sessionId)
```

---

## 3. Elder Device Flow

Elders never enter credentials. A pairing session is bootstrapped by the caregiver:

```
Caregiver on /dashboard
   └── POST /api/pairings/qr         (requireCaregiver)
         └── returns { token, qrUrl: /elder/pair?token=… , expiresAt }
         └── token lives as an Invite row (hashed), TTL = pairingQrTtlSec (15 min)

Elder device on /elder/pair
   └── scans (or pastes) qrUrl
   └── POST /api/pairings/consume     (no guard — body carries token + deviceFingerprint)
         └── validates invite, creates Pairing, issueDeviceSession({ elderId, fingerprint })
         └── Set-Cookie: larnma_device
         └── redirect client to /elder
```

`deviceFingerprint()` lives in `src/shared/helpers/deviceFingerprint.ts` — a stable localStorage UUID + UA hash. Not a security boundary; it just helps the caregiver spot an unexpected device.

---

## 4. Guards (the enforcement layer)

All guards live in `src/services/guards/`.

### 4a. `requireCaregiver(req) → AuthContext`

```ts
const auth = await requireCaregiver(req)
if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })
// auth: { ok: true, role: 'caregiver', userId, sessionId? }
```

- Reads `larnma_access` cookie
- Verifies JWT, checks `role === 'caregiver'` and `kind === 'access'`
- Returns `{ ok: false, error: 'UNAUTHENTICATED' | 'FORBIDDEN' }` otherwise

### 4b. `requireDevice(req) → AuthContext`

Same shape but reads `larnma_device`, returns `{ role: 'elder', elderId, sessionId }`.

### 4c. `checkPermission({ caregiverId, elderId, required }) → boolean`

- Looks up the `Pairing` between `caregiverId` and `elderId`
- Returns `pairing.permissions[required]`
- Use inside a handler after `requireCaregiver`, BEFORE touching the repo

### 4d. `requirePermission(req, elderId, permission)`

Convenience wrapper that composes `requireCaregiver` + `checkPermission` and returns `{ ok: true, caregiverId } | { ok: false, status: 401|403, error }`.

### 4e. `requirePrimary(caregiverId, elderId) → boolean`

`true` only if that caregiver is the **primary** on the pairing. Used by:
- `PATCH /api/pairings/:id` (permission edits)
- (Future) transfer-primary endpoint

### 4f. `checkOriginAllowed(req) → boolean`

Blocks CSRF on the public OTP endpoints (`send`, `verify`). Checks `Origin.host === Host` — allows same-origin navigations that have no `Origin`.

### 4g. `getServerAuth() → ServerAuth | null` (RSC-only)

Uses `cookies()` from `next/headers` (server components / layouts). Used by `src/app/page.tsx` to redirect based on session:

```ts
// src/app/page.tsx
const auth = await getServerAuth()
if (auth?.role === 'caregiver') redirect('/dashboard')
if (auth?.role === 'elder')     redirect('/elder')
```

---

## 5. Permissions Model

Defined in `src/shared/types/permission.ts`:

```ts
PERMISSION_KEYS = [
  'view_dashboard',    'receive_noti',   'reply_to_elder',
  'edit_elder_profile','pay_food_orders','decide_emergency',
  'redeem_points',     'invite_caregivers','transfer_primary',
]
```

- **Primary caregiver** receives `DEFAULT_PRIMARY_PERMISSIONS` — all `true`.
- **Secondary caregiver** (joined via invite) receives `DEFAULT_SECONDARY_PERMISSIONS` — only read + reply permissions; money, profile edits, and the ability to invite others are off by default.
- A caregiver can be primary on one elder and secondary on another — permissions live on the `Pairing`, not the `User`.

Any endpoint that performs a sensitive action MUST `checkPermission` with the relevant key. Grep for `checkPermission(` to see the current coverage.

---

## 6. Route Protection Matrix (who can hit what)

| Route prefix | Caregiver session? | Device session? | Additional permission check? |
|---|:-:|:-:|---|
| `/api/auth/*` | — | — | `checkOriginAllowed` on OTP |
| `/api/caregivers/*` | ✓ | ✗ | — |
| `/api/elder/*` | ✗ | ✓ | — |
| `/api/elders` | ✓ | ✗ | — |
| `/api/elders/[id]` | ✓ | ✗ | `edit_elder_profile` on PATCH |
| `/api/events`, `/api/events/stream` | ✓ | ✗ | — |
| `/api/elder/events/stream` | ✗ | ✓ | — |
| `/api/orders` (POST) | ✓ | ✗ | `pay_food_orders` |
| `/api/orders/[id]` (PATCH) | ✓ | ✗ | (implicit — own elder only) |
| `/api/pairings/qr` | ✓ | ✗ | — |
| `/api/pairings/consume` | — | — | token + fingerprint in body |
| `/api/pairings/[id]` | ✓ | ✗ | `requirePrimary` |
| `/api/invites` (POST) | ✓ | ✗ | `invite_caregivers` |
| `/api/invites/[token]` | — | — | token in path |
| `/api/invites/[token]/accept` | ✓ | ✗ | — |
| `/api/notifications/[id]/ack` | ✓ | ✗ | — (only notified caregivers see the id) |
| `/api/consents` | ✓ OR ✓ | ✗ OR ✓ | either session is fine |
| `/api/test-seed`, `/api/test-reset` | — | — | `NODE_ENV !== 'production'` |

Frontend pages:

| Path | Protected by | Redirects to |
|---|---|---|
| `/` | `getServerAuth()` | `/dashboard` (caregiver) or `/elder` (elder) |
| `/dashboard` | `getServerAuth()` expects caregiver | `/` otherwise |
| `/caregiver/elders/[id]` | `getServerAuth()` expects caregiver | `/` otherwise |
| `/elder/*` | `getServerAuth()` expects elder (except `/elder/pair` which consumes a token) | `/` otherwise |
| `/register`, `/auth/callback`, `/invite/[token]`, `/privacy` | public | — |

---

## 7. Common Pitfalls

- **Do not read cookies inside `src/services/`.** Services are pure. The route handler reads cookies via the guard and passes `auth.userId` into the service.
- **`requireCaregiver` returns a union** — always narrow via `if (!auth.ok) return …`. Compiler won't let you skip it.
- **Never log the JWT.** Log `sid` / `sessionId` instead. `larnma_refresh` never leaves the cookie jar.
- **Invite tokens are compared via `sha256` hash.** Store the hash, accept the plaintext token. Don't round-trip the plaintext in logs.
- **Elder device session is not revocable by the elder.** Revoke via `repo.revokeDeviceSession(sessionId)` from a caregiver endpoint (primary-only) — MVP doesn't expose a UI for this yet, but the plumbing exists.
- **`requireOrigin` is only on OTP endpoints.** Other routes rely on `sameSite: 'lax'` + `credentials: 'include'` — which is fine because cookies don't leak cross-site under lax.

---

## 8. Adding a new protected endpoint

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { requireCaregiver, checkPermission } from '@/services/guards'
import { getRepository } from '@/services/repository'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const auth = await requireCaregiver(req)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 })

  if (!checkPermission({ caregiverId: auth.userId, elderId: id, required: 'pay_food_orders' }))
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })

  // … rest of the work …
}
```

If the endpoint is elder-facing, swap `requireCaregiver` for `requireDevice` and read `auth.elderId`.
