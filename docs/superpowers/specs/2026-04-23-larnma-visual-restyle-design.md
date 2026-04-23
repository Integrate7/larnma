# Larnma Visual Restyle — match printable prototype

**Date:** 2026-04-23
**Scope:** B — Theme + restyle existing pages (no new features)
**Reference mockup:** `/Users/roj.wilai/Downloads/larnma/Larnma Prototype-print.html`

## Goal

Restyle the existing Larnma app so it visually matches the printable prototype. Adopt its fonts, palette, and component patterns (mic circle with wake-word banner, event cards with left accent border, mono uppercase labels, serif italic captions, QR frames). Do **not** add new features — we only restyle pages and components that already exist today.

## Non-goals

- No Order tab (menu cards) — not in current app.
- No Wallet tab (purple gradient card) — not in current app.
- No dedicated DANGER fallback home — emergency button stays inline on `/elder`.
- No voice reply bubble sent by caregiver — no API/feature for it yet.
- No changes to controllers, API routes, adapter layer, or tests (beyond fixing selectors if any break).

## Fidelity target

Per user choice (option B from brainstorm): **match prototype sizing exactly** including on the elder surface. The existing `.elder-mode` font-size boost is removed. This is a demo-fidelity decision — in a production app we would revisit this for accessibility.

---

## 1. Theme layer

### 1.1 Fonts (`src/app/layout.tsx`)

Replace Geist with three families loaded via `next/font/google`:

- `IBM_Plex_Sans_Thai` — weights 300, 400, 500, 600, 700 — CSS var `--font-sans`
- `IBM_Plex_Serif` — weights 400, 500 + italic — CSS var `--font-serif`
- `JetBrains_Mono` — weights 400, 500, 600 — CSS var `--font-mono`

All three applied to `<body>` via `className={[sans, serif, mono].join(' ')}`. Keep `display: 'swap'` and `subsets: ['latin']` (IBM Plex Sans Thai also needs `'thai'`).

### 1.2 CSS variables (`src/styles/globals.css`)

Replace the `:root` block's semantic-color variables with prototype values:

```css
:root {
  --radius: 0.75rem;

  /* Prototype palette — source of truth; use via var(--NAME) in CSS or bg-[var(--NAME)] in JSX. */
  --ink:           oklch(0.22 0.03 300);
  --ink-2:         oklch(0.38 0.025 300);
  --ink-3:         oklch(0.55 0.02 300);
  --rule:          oklch(0.9 0.012 300);
  --rule-2:        oklch(0.84 0.018 300);
  --brand:         oklch(0.42 0.18 300);   /* purple primary — was "--accent" in prototype */
  --brand-ink:     oklch(0.34 0.18 300);
  --brand-wash:    oklch(0.96 0.025 300);
  --danger:        oklch(0.55 0.18 28);
  --danger-wash:   oklch(0.96 0.03 28);
  --ok:            oklch(0.52 0.12 160);
  --warn:          oklch(0.48 0.14 300);

  /* Tailwind/shadcn semantic tokens — mapped onto the prototype palette.
     Note: we rename the prototype's "--accent" to "--brand" to avoid a collision
     with Tailwind's own "--accent" token (which conventionally means a subtle wash). */
  --background: #fff;
  --foreground: var(--ink);
  --card: #fff;
  --card-foreground: var(--ink);
  --popover: #fff;
  --popover-foreground: var(--ink);
  --primary: var(--brand);
  --primary-foreground: #fff;
  --secondary: var(--brand-wash);
  --secondary-foreground: var(--brand-ink);
  --muted: var(--brand-wash);
  --muted-foreground: var(--ink-3);
  --accent: var(--brand-wash);             /* Tailwind "accent" = subtle wash, not primary */
  --accent-foreground: var(--brand-ink);
  --destructive: var(--danger);
  --border: var(--rule);
  --input: var(--rule);
  --ring: var(--brand);
}
```

Downstream consequence: anywhere in this spec or code we said "accent" in the prototype sense (purple), we mean `var(--brand)` / `var(--brand-ink)` / `var(--brand-wash)`. Tailwind classes like `bg-primary` continue to produce the purple; `bg-accent` produces the wash (both correct for shadcn components).

Keep mood-palette variables (`--mood-*`) mapped to the new scheme where sensible:
- `--mood-danger` = `var(--danger)`
- `--mood-happy` = `var(--ok)`
- `--mood-lonely`, `--mood-sad` = purple variants
- `--mood-normal` = `var(--ink-3)`
- `--mood-hungry`, `--mood-pain` = warm variants (keep current values or map to `--warn`)

Delete `.dark` block — prototype is light-only; we don't support dark today.

### 1.3 Elder-mode class

Remove the body of `.elder-mode` (font-size, button min-height). Keep the class so existing `<ElderLayout>` still compiles, but make it a no-op. Reason: per option B we want the prototype's exact sizes, and button sizing is already controlled by our Button variants.

---

## 2. Shared utility classes

Add to `globals.css` under `@layer components` (or plain CSS — tailwind v4 handles both):

```css
.mono-label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.mono-label b { color: var(--ink); font-weight: 600; letter-spacing: 0.04em; }

.serif-caption {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 11px;
  color: var(--ink-2);
  line-height: 1.5;
}

.brand-mark {
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--ink); color: #fff;
  display: grid; place-items: center;
  font-family: var(--font-serif); font-style: italic; font-size: 14px;
}
```

These utilities keep markup clean without reinventing per-page.

---

## 3. Component (atom/molecule) restyle

Only restyle components; keep props identical so callers don't change. Follows CLAUDE.md rule A1 (use `@/components/*`, no native HTML) and A2 (wrap Radix).

### 3.1 `components/atom/card`

Extend to support an `accent` variant via prop:

```ts
type CardProps = { accent?: 'log' | 'normal' | 'crit' } & HTMLAttributes<HTMLDivElement>
```

Rendering rules:
- `accent='log'` → `border-l-[3px] border-l-[var(--ok)]`
- `accent='normal'` → `border-l-[3px] border-l-[var(--brand)]`
- `accent='crit'` → `bg-[var(--danger-wash)] border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))]`

Default stays unchanged. All three use the existing Card radius/border/padding.

### 3.2 `components/molecule/micButton`

Restyle to match prototype's `.mic-circle`:
- 130 × 130 px circle
- Background: radial-gradient from `oklch(0.52 0.2 300)` (40% 35%) to `oklch(0.32 0.2 300)`
- Double outer shadow ring: `0 0 0 6px color-mix(in oklch, var(--brand) 14%, transparent), 0 0 0 14px color-mix(in oklch, var(--brand) 6%, transparent)`
- States (driven by existing `state` prop):
  - `idle` → mic SVG icon, white stroke 2px
  - `listening` → 5 animated bars (heights oscillate: 50/90/30/80/60%), white, 4px wide, 2px radius
  - `sending` → spinner (keep current implementation, just recoloured)
  - `error` → red variant (swap gradient to `--danger` hues)

Keep state prop shape; no controller changes.

### 3.3 `components/molecule/moodChip`

Swap from pill/badge to inline mono-label text:
- Render as `<span class="mono-label">MOOD · {timestamp?}</span>`
- The mood word itself coloured by `--mood-*`

Keep `mood` prop.

### 3.4 `components/molecule/priorityBadge`

- `priority='critical'` → red text in mono-label style, solid red dot ● prefix
- `priority='normal'` → purple mono-label
- `priority='log'` → green mono-label

### 3.5 `components/molecule/qrScanner`

Viewfinder: 140×140 black rounded box with four corner brackets in `--brand` (22×22px, 3px stroke) + a horizontal scan line at 50% with brand glow.

### 3.6 `components/molecule/qrDisplay`

Below the QR grid, add a 6-digit mono code (letter-spacing 0.2em, `--brand-ink`, weight 600) and an expiry line (`mono-label`: "หมดอายุใน MM:SS").

---

## 4. Page-level restyle

For each page, list the visual changes only. No controller/state changes.

### 4.1 `/` (`src/app/page.tsx`)

- Wrap in centered column. Add `<div class="brand-mark">ล</div>` + "Larnma · หลานม่า" top-left.
- Title 28–32px weight 600 letter-spacing -0.015em.
- Subtitle in serif italic.
- Keep the two existing Buttons (primary "เริ่มใช้งาน" + outline "สแกน QR").
- Small serif italic hint below (existing `welcome.elderHint`).

### 4.2 `/elder` (`src/modules/elderHome/elderHomePage.tsx`)

Layout (top → bottom, centered):
1. Top-left: existing `<User>` icon link (keep).
2. Center: `<MicButton>` — now renders prototype mic-circle.
3. Below mic: mic-label "แตะเพื่อพูด" (16px weight 600) + mic-sub "หรือเรียก 'หลานม่า'" (11px muted).
4. If `state.lastResult`: render a serif italic transcript bubble with `--brand-wash` bg + brand-coloured border, showing `summary` and optional `advice`.
5. Bottom banner (absolute positioned): serif italic wake-word hint `Wake word "หลานม่า" เปิดอยู่` with `--brand-ink` on the wake word.
6. Emergency button: restyled danger-btn — full-width, 22×18px padding, 19px weight 600, `--danger` bg, radius 16px. Keep existing `href="tel:..."`.

### 4.3 `/elder/pair`

- mono-label header "หลานม่า / จับคู่เครื่อง"
- Serif caption body text "วางกล้องให้ตรงกับ QR บนเครื่องของลูกหลาน"
- `<QrScanner>` with new viewfinder style
- mono-label status "กำลังหา QR…"

### 4.4 `/elder/me`

- Serif italic sub, mono-label stat keys, stat-grid (2 cols) with elder name + phone + pairing status. No structural change.

### 4.5 `/register` (11 steps)

The stepper molecule + each step view:
- Header block: mono-label "Step X/11" then bold 13–14px title with letter-spacing -0.01em.
- Form fields (`formField`): border `--rule` radius 7px padding 7×9, mono-label for field label, 11px body input text.
- Emergency-contact and optional-tags pages use `chips` style (accent wash bg, accent-ink text, rounded-full, 9.5px).
- Step 11/11 (QR handoff): `<QrDisplay>` with new style + 6-digit mono code + expiry timer.
- Big-button (submit/continue): bottom pinned, `--ink` bg, white text, 12px weight 500, radius 9px.

### 4.6 `/invite/[token]`

- Serif italic welcome ("คุณ X เชิญคุณเข้าร่วมดูแลคุณ Y")
- mono-label role pill
- Accept button (primary) + decline (outline)

### 4.7 `/dashboard` (`src/modules/dashboard/dashboardPage.tsx`)

Replace each `<Card>` with prototype `cg-view` layout:
- Top row: title "คุณแม่วันนี้" 17px weight 600 + avatar circle right (22px, `--brand` bg, initial letter)
- Stat grid (2 cols): `Mood` and `Events` stats — mono-label key, 12px weight 600 value
- Event feed: each event as a `<Card accent={...}>`:
  - Header row: `mono-label` "HH:mm · MOOD" left, small `mono-label` right ("log" / "normal" / "RINGING")
  - Body: 10.5px `--ink` text, line-height 1.35
  - Subtitle: 9px serif italic `--ink-3`
  - Critical cards include btn-row (`โทร 1669` red + `ฉันจัดการเอง` outline) and `timer` mono red
- Weekly mood section stays but uses mono-label counts

### 4.8 `/caregiver/elders/[id]` + `/edit`

- Stat grid at top + grouped field cards. Uses the same `.mono-label` + `.serif-caption` utilities. No structural change.

### 4.9 `/privacy`

- Serif body text with line-height 1.55
- mono-label section headings

---

## 5. Implementation order

1. `layout.tsx` fonts + `globals.css` variables + utility classes + elder-mode stubbed (nothing else depends on fonts/variables so do first).
2. Atom/molecule restyle (Card `accent` prop, MicButton, MoodChip, PriorityBadge, QrScanner, QrDisplay).
3. Page restyles in order: `/elder` → `/dashboard` → `/` → `/register` flow → `/elder/pair` → `/elder/me` → `/invite` → `/caregiver/elders/*` → `/privacy`.
4. Visual QA: `pnpm dev`, walk each page, check Thai text renders with Plex Thai (not fallback), check tests still pass.

## 6. Verification

- `pnpm biome check` — lint clean (no A1/A2 violations introduced).
- `pnpm test` — unit tests untouched (no logic changes).
- `pnpm playwright test` — E2E selectors use `data-testid`, so restyling should not break them. Run to confirm.
- Manual visual pass through each page in `pnpm dev`, comparing against the printable prototype side-by-side.

## 7. Open decisions (recorded here rather than re-asked)

- **Font loading via `next/font`** (not Google Fonts `<link>`) — chosen for performance, no CLS, and zero external requests in production.
- **Tailwind `--color-accent` token now means the wash, not the purple** — because Tailwind's `accent` is meant for subtle highlights; primary-purple goes on `--color-primary`. Any component using `bg-accent` today already means the wash, so this is consistent.
- **Dark mode removed** — prototype has no dark variant and it's not used. Delete the `.dark {}` block rather than keep stale tokens.
- **`.elder-mode` kept as a no-op class** — rather than remove it everywhere, keep the class selector empty so layout files don't need editing.
