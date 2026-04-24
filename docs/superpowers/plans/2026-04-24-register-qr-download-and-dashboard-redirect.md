# Register QR step — Download button + Go-to-Dashboard action

**Type:** feat
**Branch:** `feat/register-qr-download-and-dashboard-redirect`
**Date:** 2026-04-24

## Goal
After the caregiver finishes registration, the `'qr'` step currently displays the pairing QR code but is a dead end. Add two explicit actions so the caregiver can (a) download the QR as a PNG for later use, and (b) navigate to the dashboard when they're ready.

## Non-goals
- Do **not** add auto-redirect, timers, or SSE-based "navigate when pairing consumed" — plain manual button (user answered Q1 = a).
- Do **not** change the QR generation API or pairing token lifecycle.
- Do **not** add a "regenerate QR" button (user picked Q3 = b; expiry display is already handled — see Context below).
- Do **not** change the pre-`qr` steps of the wizard — scope is strictly the `QrStep` view and the two new handler methods.
- Do **not** add a printable-sheet layout — simple PNG download via the existing `qrDataUrl` (user answered Q2 = a).

## Context
- **What exists today**
  - `src/modules/register/registerPage.tsx:80–86` — `QrStep` is rendered when `state.step === 'qr'`. `useEffect` auto-generates the QR on entry (`registerPage.tsx:26–30`).
  - `src/modules/register/views/stepViews.tsx:636–682` — `QrStep` shows `<QrDisplay />` when `qrDataUrl` exists, else a "สร้าง QR" button. No next action, no download.
  - `src/modules/register/controller/hooks/handler.ts:199–216` — `generateQr()` calls `POST /api/pairings/qr` and stores `qrDataUrl` + `pairingToken` in globalState.
  - `src/modules/register/controller/hooks/handler.ts:222–247` — `next()` has no case for `step === 'qr'` (terminal).
  - `src/modules/register/types.ts:48–58` — `RegisterHandler` shape.
  - `src/components/molecule/qrDisplay/qrDisplay.tsx:69–88` — already renders a live "หมดอายุใน mm:ss" countdown via `QrExpiry` when `expiresAt` is passed. **Q3(b) is therefore already satisfied by existing code** — no change needed.
  - `messages/th.json:106–107` — existing keys `register.qrTitle`, `register.qrSubtitle`. No `qrDownload` / `qrGoToDashboard` yet.
  - Dashboard target: `src/app/dashboard/page.tsx` — navigation target is `/dashboard`.
  - Handler already accepts a `navigate` injection (`handler.ts:11–13`) for testability — we reuse it.

- **What is missing**
  - No "Download QR" button on `QrStep`.
  - No "ไปหน้าแดชบอร์ด" button on `QrStep`.
  - `RegisterHandler` has no `downloadQr` or `goToDashboard`.

- **Related**: MVP doc `docs/mvp/mvp.md §3.9.1` requires QR generation at end of register flow; does not specify post-QR navigation — this feature formalizes the unspecified exit.

## Approach
1. Extend `RegisterHandler` type with two new methods: `downloadQr()` and `goToDashboard()`.
2. Implement both in `useRegisterHandler`:
   - `downloadQr`: if `qrDataUrl` is set, create an in-memory `<a href={qrDataUrl} download={filename}>` and click it. Filename pattern: `larnma-pairing-<elderId>.png` (fallback `larnma-pairing-qr.png` when elderId missing).
   - `goToDashboard`: call the injected `navigate('/dashboard')`.
3. Update `QrStep` view in `stepViews.tsx` to accept two new props `onDownload` and `onGoToDashboard`. Render both as `@/components/atom/button` below the `QrDisplay`, only when `qrDataUrl` is present. Download = `variant="outline"`, Go-to-dashboard = primary. Layout: vertical stack on mobile.
4. Pass the new handlers from `RegisterPage` to `<QrStep>`.
5. Add copy keys `register.qrDownload` and `register.qrGoToDashboard` to `messages/th.json` and `messages/en.json` (keep parity).
6. Tests: unit-test the two new handler methods; unit-test the two new buttons wire to callbacks and only render when `qrDataUrl` is set.

Order of execution: types → handler → tests for handler → view → tests for view → registerPage wiring → i18n keys → run `/verify`.

## Tasks
1. **Types** — `src/modules/register/types.ts` — add `downloadQr: () => void` and `goToDashboard: () => void` to `RegisterHandler`.
2. **Handler** — `src/modules/register/controller/hooks/handler.ts` — implement `downloadQr` (createElement anchor, set href/download, click; no-op when `qrDataUrl` null) and `goToDashboard` (calls injected `navigate('/dashboard')`). Include both in the returned handler object.
3. **Handler tests** — `src/modules/register/controller/hooks/__tests__/handler.test.ts` — add:
   - `downloadQr` creates anchor with correct href (qrDataUrl) and filename `larnma-pairing-<elderId>.png`, triggers click.
   - `downloadQr` is a no-op when `qrDataUrl` is null.
   - `downloadQr` filename falls back to `larnma-pairing-qr.png` when `elderId` is null.
   - `goToDashboard` calls `navigate` with `'/dashboard'`.
4. **View** — `src/modules/register/views/stepViews.tsx` — extend `QrStep` props with `onDownload: () => void` and `onGoToDashboard: () => void`. Render both buttons (only when `qrDataUrl` is set) using `@/components/atom/button`. Add `data-testid="qr-download"` and `data-testid="qr-go-dashboard"` for E2E.
5. **registerPage wiring** — `src/modules/register/registerPage.tsx` — pass `onDownload={handler.downloadQr}` and `onGoToDashboard={handler.goToDashboard}` to `<QrStep>`.
6. **i18n** — `messages/th.json`: add `register.qrDownload: "ดาวน์โหลด QR Code"`, `register.qrGoToDashboard: "ไปหน้าแดชบอร์ด"`. Mirror to `messages/en.json` with English equivalents.
7. **View tests** — if `src/modules/register/views/__tests__/stepViews.test.tsx` exists, extend it; otherwise add a small test just for `QrStep` rendering + callback wiring. Confirm buttons only render when `qrDataUrl` is set.

## Tests
- **Unit (Jest)**
  - `handler.test.ts`: 4 new test cases (as listed in Task 3).
  - `stepViews.test.tsx` (new or extended): QrStep shows both buttons when `qrDataUrl` is set; buttons hidden when `qrDataUrl` is null; clicking each calls the correct prop.
- **E2E (Playwright)**: none for this PR. The register flow is long; the two buttons are simple wiring of existing data. Unit coverage is sufficient. If `/ship` finds a gap in coverage (< 80% on the changed files), I'll add targeted tests rather than a full E2E.

## Risks / Open questions
- **Filename safety**: `<elderId>` comes from our own API (string). No injection risk, but confirm filename doesn't need sanitization — current proposal uses the ID verbatim. Acceptable because our IDs are `[a-zA-Z0-9-]`.
- **Download UX on mobile Safari**: `<a download>` works on iOS Safari 13+ but may open the image inline rather than forcing download. Acceptable for v1 — caregiver can long-press → save. Document in PR body.
- **Token already embedded in `qrDataUrl`**: the downloaded PNG contains a JWT valid for 15 min. If the caregiver shares the PNG publicly, anyone could bind. This matches the existing QR display behavior — not a regression. Flag in the PR body as a known product consideration.
- **A1 (no native HTML)**: download is triggered via an in-memory anchor in the handler, not rendered JSX. The view uses `@/components/atom/button` only. No rule violation.
