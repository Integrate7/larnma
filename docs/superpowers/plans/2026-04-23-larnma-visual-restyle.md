# Larnma Visual Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Larnma app to visually match the printable prototype at `/Users/roj.wilai/Downloads/larnma/Larnma Prototype-print.html` — fonts, palette, mic circle, event cards, mono labels, serif captions, QR frames — without adding new features.

**Architecture:** Two-layer change. (1) Replace fonts in `app/layout.tsx` and CSS variables in `styles/globals.css`. (2) Restyle the existing atoms/molecules (Card, MicButton, MoodChip, PriorityBadge, QrScanner, QrDisplay) and 9 pages that render them. All changes stay inside `src/components/` and `src/modules/` — no controller, API, adapter, or type changes.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (`@import 'tailwindcss'` + `@theme inline`), next-intl, shadcn-style atoms wrapping Radix, Jest + Testing Library for unit tests, Playwright for E2E.

**Spec:** `docs/superpowers/specs/2026-04-23-larnma-visual-restyle-design.md`

---

## File Structure

**Modified files (no new files created):**

| Path | Responsibility | Changes |
|---|---|---|
| `src/app/layout.tsx` | Root layout, font injection | Swap Geist for IBM Plex Sans Thai / Serif + JetBrains Mono via `next/font/google`, expose as CSS vars |
| `src/styles/globals.css` | Theme tokens + base + utilities | New `--ink*`, `--rule*`, `--brand*`, `--danger*`, `--ok` palette; remap Tailwind tokens; add `.mono-label`, `.serif-caption`, `.brand-mark`; empty `.elder-mode` and `.dark` |
| `src/components/atom/card/types.ts` | Card props | Add `accent?: 'log' \| 'normal' \| 'crit'` to `CardProps` |
| `src/components/atom/card/card.tsx` | Card render | Apply left-border / wash based on `accent`; add `data-accent` attr |
| `src/components/atom/card/__tests__/card.test.tsx` | Card tests | Add test for each `accent` value |
| `src/components/molecule/micButton/micButton.tsx` | Mic button render | Replace flat coloured circle with 130px radial-gradient circle; 5 animated bars for `listening`; double shadow ring |
| `src/components/molecule/moodChip/moodChip.tsx` | Mood chip render | Replace coloured pill with mono-label inline text; keep `data-mood` |
| `src/components/molecule/moodChip/__tests__/moodChip.test.tsx` | Mood chip tests | Update class assertions for new visual |
| `src/components/molecule/priorityBadge/priorityBadge.tsx` | Priority badge render | Replace coloured pill with mono-label text + dot prefix for critical |
| `src/components/molecule/priorityBadge/__tests__/priorityBadge.test.tsx` | Priority badge tests | Update assertions |
| `src/components/molecule/qrScanner/qrScanner.tsx` | QR scanner UI | Wrap video in viewfinder with 4 brand-coloured corner brackets + horizontal scan line |
| `src/components/molecule/qrDisplay/qrDisplay.tsx` | QR display + props | Add `code?: string`, `expiresAt?: Date` props; render mono 6-digit code + mono expiry line |
| `src/components/molecule/qrDisplay/types.ts` | QR display types | Add `code` and `expiresAt` to `QrDisplayProps` |
| `src/app/page.tsx` | Landing page | Add brand-mark header + serif sub |
| `src/modules/elderHome/elderHomePage.tsx` | Elder home view | Wake-word banner, transcript bubble, restyled emergency button |
| `src/modules/pair/pairPage.tsx` | Elder QR scan page | mono-label header, serif subtitle, new scanner visuals |
| `src/modules/elderMe/elderMePage.tsx` | Elder profile page | mono labels, serif caption, stat grid |
| `src/modules/dashboard/dashboardPage.tsx` | Caregiver feed | cg-view layout: title + avatar, stat grid, accent event cards |
| `src/modules/register/registerPage.tsx` | Register wrapper | Replace Stepper Card chrome with mono step label |
| `src/modules/register/views/stepViews.tsx` | 11 step views | Apply mono labels + serif subtitles + chip pattern throughout |
| `src/modules/inviteLanding/inviteLandingPage.tsx` | Invite accept page | Serif welcome + mono role pill |
| `src/modules/elderProfile/elderProfileView.tsx` | Caregiver-side elder view | Stat grid + mono field labels |
| `src/modules/elderProfile/elderProfileEdit.tsx` | Caregiver-side elder edit | Same treatment as view |
| `src/app/privacy/page.tsx` | Privacy policy | Serif body + mono headings |

**No files created.** All i18n strings that already exist are reused; any new string goes into both `messages/th.json` and `messages/en.json` under the existing key structure (noted per task).

---

## Task 1: Swap fonts to IBM Plex family

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/styles/globals.css:7-11`

- [ ] **Step 1: Verify tests pass before changes**

Run: `pnpm test -- --testPathPatterns="components/atom/card|components/molecule/micButton|components/molecule/moodChip|components/molecule/priorityBadge"`
Expected: all pass (baseline).

- [ ] **Step 2: Replace font loader in `src/app/layout.tsx`**

Replace the file with:

```tsx
import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Thai, IBM_Plex_Serif, JetBrains_Mono } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Providers } from '@/providers/Providers'
import '@/styles/globals.css'

const sans = IBM_Plex_Sans_Thai({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

const serif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Larnma — หลานม่า',
  description: 'เสียง + AI สำหรับผู้สูงอายุและบุตรหลาน',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#6b2fb3',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Update `@theme inline` in `src/styles/globals.css` to reference the new font vars**

In `src/styles/globals.css`, find lines 7-11 (the `@theme inline` block's font entries):

```css
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
```

Replace with:

```css
  --font-sans: var(--font-sans);
  --font-serif: var(--font-serif);
  --font-mono: var(--font-mono);
```

(The CSS variables `--font-sans`, `--font-serif`, `--font-mono` are set on `<html>` by `next/font` from Step 2.)

- [ ] **Step 4: Run dev server and visually verify Thai renders in IBM Plex Sans Thai**

Run in another terminal: `pnpm dev`
Open `http://localhost:3000`.
Expected: Thai text (e.g., "หลานม่า") renders in IBM Plex Sans Thai (slightly wider, rounder letterforms than system default). If it looks like system Thai, fonts didn't load — check `next/font` errors in console.

- [ ] **Step 5: Run unit tests to verify nothing broke**

Run: `pnpm test`
Expected: same pass count as Step 1.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/styles/globals.css
git commit -m "style(theme): swap geist for ibm plex sans thai + serif + jetbrains mono"
```

---

## Task 2: Replace CSS variables with prototype palette

**Files:**
- Modify: `src/styles/globals.css:43-92`

- [ ] **Step 1: Replace the `:root` and `.dark` blocks**

Open `src/styles/globals.css`. Find the `:root { ... }` block (starts around line 43) and the `.dark { ... }` block (starts around line 73). Replace both blocks with:

```css
:root {
  --radius: 0.75rem;

  /* Prototype palette — source of truth */
  --ink:          oklch(0.22 0.03 300);
  --ink-2:        oklch(0.38 0.025 300);
  --ink-3:        oklch(0.55 0.02 300);
  --rule:         oklch(0.9 0.012 300);
  --rule-2:       oklch(0.84 0.018 300);
  --brand:        oklch(0.42 0.18 300);
  --brand-ink:    oklch(0.34 0.18 300);
  --brand-wash:   oklch(0.96 0.025 300);
  --danger:       oklch(0.55 0.18 28);
  --danger-wash:  oklch(0.96 0.03 28);
  --ok:           oklch(0.52 0.12 160);
  --warn:         oklch(0.48 0.14 300);

  /* shadcn/tailwind semantic tokens mapped onto the palette */
  --background: #ffffff;
  --foreground: var(--ink);
  --card: #ffffff;
  --card-foreground: var(--ink);
  --popover: #ffffff;
  --popover-foreground: var(--ink);
  --primary: var(--brand);
  --primary-foreground: #ffffff;
  --secondary: var(--brand-wash);
  --secondary-foreground: var(--brand-ink);
  --muted: var(--brand-wash);
  --muted-foreground: var(--ink-3);
  --accent: var(--brand-wash);
  --accent-foreground: var(--brand-ink);
  --destructive: var(--danger);
  --border: var(--rule);
  --input: var(--rule);
  --ring: var(--brand);

  /* Mood palette */
  --mood-danger: var(--danger);
  --mood-pain:   oklch(0.62 0.2 50);
  --mood-sad:    oklch(0.55 0.15 260);
  --mood-lonely: var(--brand);
  --mood-hungry: oklch(0.7 0.16 80);
  --mood-happy:  var(--ok);
  --mood-normal: var(--ink-3);
}
```

**Delete the `.dark { ... }` block entirely.** The prototype is light-only.

- [ ] **Step 2: Run dev server and verify accent color is the prototype purple**

Run `pnpm dev` (or keep it running). Open `http://localhost:3000`.
Expected: primary buttons render in deep saturated purple (`oklch(0.42 0.18 300)`), not the previous lighter purple.

- [ ] **Step 3: Run unit tests**

Run: `pnpm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/styles/globals.css
git commit -m "style(theme): adopt prototype palette (ink/rule/brand/danger/ok variables)"
```

---

## Task 3: Add utility classes and no-op elder-mode

**Files:**
- Modify: `src/styles/globals.css` (append after the existing `@layer base` block, replace `.elder-mode`)

- [ ] **Step 1: Append utility classes and empty elder-mode**

At the end of `src/styles/globals.css` (after the `@layer base { ... }` block), **replace** the existing `.elder-mode` block (currently lines 104-112 that set font-size and button min-height) with:

```css
/* Utility classes used by restyled pages to match the printable prototype */

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
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 14px;
}

/* Kept for compat; no-op now (option B from design — match prototype sizes exactly). */
.elder-mode { /* intentionally empty */ }
```

- [ ] **Step 2: Verify utility classes compile**

Run: `pnpm dev` and open any page; open devtools → Elements → pick a `<body>`; check that `html.mono-label` rule appears in the stylesheet (search for `.mono-label` in the Sources panel).

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css
git commit -m "style(theme): add mono-label, serif-caption, brand-mark utilities"
```

---

## Task 4: Card — add `accent` variant

**Files:**
- Modify: `src/components/atom/card/types.ts`
- Modify: `src/components/atom/card/card.tsx:5-20`
- Modify: `src/components/atom/card/__tests__/card.test.tsx`

- [ ] **Step 1: Write the failing test**

In `src/components/atom/card/__tests__/card.test.tsx`, append after the existing `it('applies custom className', ...)`:

```tsx
  it('applies accent="log" with green left border', () => {
    const { container } = render(<Card accent="log">l</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.dataset.accent).toBe('log')
    expect(el.className).toContain('border-l-[3px]')
  })

  it('applies accent="normal" with brand left border', () => {
    const { container } = render(<Card accent="normal">n</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.dataset.accent).toBe('normal')
  })

  it('applies accent="crit" with danger wash background', () => {
    const { container } = render(<Card accent="crit">c</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.dataset.accent).toBe('crit')
  })
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test -- --testPathPatterns=card.test.tsx`
Expected: 3 new tests FAIL — property `accent` does not exist on type `CardProps` (TypeScript error) or `data-accent` attribute is missing.

- [ ] **Step 3: Update `types.ts`**

Replace `src/components/atom/card/types.ts` with:

```ts
import type { HTMLAttributes } from 'react'

export type CardAccent = 'log' | 'normal' | 'crit'

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  accent?: CardAccent
}
```

- [ ] **Step 4: Update `card.tsx` Card component**

In `src/components/atom/card/card.tsx`, replace the `Card` forwardRef (lines 5-20) with:

```tsx
const ACCENT_CLASS: Record<'log' | 'normal' | 'crit', string> = {
  log: 'border-l-[3px] border-l-[var(--ok)]',
  normal: 'border-l-[3px] border-l-[var(--brand)]',
  crit: 'bg-[var(--danger-wash)] border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))]',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, accent, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="card"
      data-accent={accent}
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-sm',
        accent ? ACCENT_CLASS[accent] : '',
        className,
      )}
      {...props}
    />
  )
})
```

- [ ] **Step 5: Run tests, verify all pass**

Run: `pnpm test -- --testPathPatterns=card.test.tsx`
Expected: all tests (old + new) PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/atom/card
git commit -m "feat(card): add accent variant (log/normal/crit) for event feed cards"
```

---

## Task 5: MicButton — restyle to prototype mic-circle

**Files:**
- Modify: `src/components/molecule/micButton/micButton.tsx`

**Note:** Prop API unchanged. Existing tests (label text) must still pass. Only the rendered visuals change.

- [ ] **Step 1: Replace `micButton.tsx`**

Replace `src/components/molecule/micButton/micButton.tsx` with:

```tsx
import { Loader2, Mic, MicOff } from 'lucide-react'
import { cn } from '@/shared/helpers/cn'
import type { MicButtonProps, MicButtonState } from './types'

const LABEL_DEFAULT: Record<MicButtonState, string> = {
  idle: 'แตะเพื่อพูด',
  wakeListening: 'พูด "หลานรัก" ได้เลย',
  listening: 'กำลังฟัง...',
  uploading: 'กำลังส่ง...',
  done: 'เรียบร้อย',
  error: 'ลองใหม่',
}

const BAR_HEIGHTS = ['50%', '90%', '30%', '80%', '60%']

function ListeningBars() {
  return (
    <div className="flex h-9 items-end gap-1">
      {BAR_HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-sm bg-white animate-pulse"
          style={{ height: h, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  )
}

export function MicButton({ state, onPress, disabled, label }: MicButtonProps) {
  const shownLabel = label ?? LABEL_DEFAULT[state]

  const circleBg =
    state === 'error'
      ? 'radial-gradient(circle at 40% 35%, oklch(0.58 0.2 28), oklch(0.4 0.2 28))'
      : state === 'done'
      ? 'radial-gradient(circle at 40% 35%, var(--ok), oklch(0.38 0.12 160))'
      : 'radial-gradient(circle at 40% 35%, oklch(0.52 0.2 300), oklch(0.32 0.2 300))'

  const ringShadow =
    '0 0 0 6px color-mix(in oklch, var(--brand) 14%, transparent), 0 0 0 14px color-mix(in oklch, var(--brand) 6%, transparent)'

  const Icon =
    state === 'uploading' ? Loader2 : state === 'error' ? MicOff : Mic

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={onPress}
        disabled={disabled}
        aria-label={shownLabel}
        data-slot="mic-button"
        data-testid="mic-button"
        data-state={state}
        className={cn(
          'grid place-items-center rounded-full text-white transition-transform focus:outline-none disabled:opacity-50 active:scale-[0.98]',
        )}
        style={{ width: 130, height: 130, background: circleBg, boxShadow: ringShadow }}
      >
        {state === 'listening' ? (
          <ListeningBars />
        ) : (
          <Icon
            className={cn('h-14 w-14', state === 'uploading' ? 'animate-spin' : '')}
            aria-hidden="true"
          />
        )}
      </button>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-base font-semibold text-[var(--ink)] tracking-tight">
          {shownLabel}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run existing unit tests**

Run: `pnpm test -- --testPathPatterns=micButton.test.tsx`
Expected: all 4 tests PASS (prop API unchanged; labels still show).

- [ ] **Step 3: Visual QA on `pnpm dev` at `/elder`**

Open `http://localhost:3000/elder`.
Expected: the mic is a 130px purple gradient circle with a double soft outer ring; the icon is white.

- [ ] **Step 4: Commit**

```bash
git add src/components/molecule/micButton/micButton.tsx
git commit -m "style(mic-button): 130px radial-gradient circle with double ring and listening bars"
```

---

## Task 6: MoodChip — restyle to mono-label

**Files:**
- Modify: `src/components/molecule/moodChip/moodChip.tsx`
- Modify: `src/components/molecule/moodChip/__tests__/moodChip.test.tsx`

- [ ] **Step 1: Update test**

Replace `src/components/molecule/moodChip/__tests__/moodChip.test.tsx` with (if it currently asserts background classes — read first, then preserve assertions that still apply):

```tsx
import { render, screen } from '@testing-library/react'
import { MoodChip } from '../moodChip'

describe('MoodChip', () => {
  it('renders the Thai label for the mood', () => {
    render(<MoodChip mood="HAPPY" />)
    expect(screen.getByText('มีความสุข')).toBeInTheDocument()
  })

  it('exposes data-mood attr', () => {
    const { container } = render(<MoodChip mood="LONELY" />)
    expect((container.firstChild as HTMLElement).dataset.mood).toBe('LONELY')
  })

  it('uses custom label when provided', () => {
    render(<MoodChip mood="NORMAL" label="ok" />)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })
})
```

(If `MOOD_LABEL_TH.HAPPY` in `src/shared/types` is not `'มีความสุข'`, adjust the string to match — read `src/shared/types.ts` to confirm before running.)

- [ ] **Step 2: Replace `moodChip.tsx`**

```tsx
import { MOOD_LABEL_TH, type Mood } from '@/shared/types'
import type { MoodChipProps } from './types'

const MOOD_COLOR: Record<Mood, string> = {
  DANGER: 'var(--mood-danger)',
  PAIN: 'var(--mood-pain)',
  SAD: 'var(--mood-sad)',
  LONELY: 'var(--mood-lonely)',
  HUNGRY: 'var(--mood-hungry)',
  HAPPY: 'var(--mood-happy)',
  NORMAL: 'var(--mood-normal)',
}

export function MoodChip({ mood, label }: MoodChipProps) {
  return (
    <span
      className="mono-label"
      style={{ color: MOOD_COLOR[mood] }}
      data-slot="mood-chip"
      data-mood={mood}
    >
      {label ?? MOOD_LABEL_TH[mood]}
    </span>
  )
}
```

- [ ] **Step 3: Run tests**

Run: `pnpm test -- --testPathPatterns=moodChip.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/molecule/moodChip
git commit -m "style(mood-chip): render as mono-label text coloured by mood"
```

---

## Task 7: PriorityBadge — restyle to mono-label

**Files:**
- Modify: `src/components/molecule/priorityBadge/priorityBadge.tsx`
- Modify: `src/components/molecule/priorityBadge/__tests__/priorityBadge.test.tsx`

- [ ] **Step 1: Read existing test to understand assertions**

Run: `cat src/components/molecule/priorityBadge/__tests__/priorityBadge.test.tsx`

- [ ] **Step 2: Replace `priorityBadge.tsx`**

```tsx
import type { Priority } from '@/shared/types'
import type { PriorityBadgeProps } from './types'

const LABEL: Record<Priority, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  normal: 'NORMAL',
  log: 'LOG',
}

const COLOR: Record<Priority, string> = {
  critical: 'var(--danger)',
  high: 'var(--mood-pain)',
  normal: 'var(--brand-ink)',
  log: 'var(--ok)',
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      className="mono-label"
      style={{ color: COLOR[priority] }}
      data-slot="priority-badge"
      data-priority={priority}
    >
      {priority === 'critical' ? '● ' : ''}
      {LABEL[priority]}
    </span>
  )
}
```

- [ ] **Step 3: Update the test's class-based assertions if present**

If the existing test asserts `bg-mood-danger` or similar, change the assertion to check `dataset.priority` and presence of the label text (e.g., `CRITICAL`). Preserve any test that checks `data-priority`.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- --testPathPatterns=priorityBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/molecule/priorityBadge
git commit -m "style(priority-badge): render as mono-label with dot prefix for critical"
```

---

## Task 8: QrScanner — viewfinder brackets + scan line

**Files:**
- Modify: `src/components/molecule/qrScanner/qrScanner.tsx:52-68`

- [ ] **Step 1: Replace the JSX return block**

In `src/components/molecule/qrScanner/qrScanner.tsx`, replace the `return (...)` block (lines 52-68) with:

```tsx
  return (
    <div className="relative w-full max-w-sm" data-slot="qr-scanner">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
        >
          <track kind="captions" />
        </video>
        {/* corner brackets */}
        <span className="pointer-events-none absolute left-2 top-2 h-6 w-6 rounded-tl border-l-[3px] border-t-[3px] border-[var(--brand)]" />
        <span className="pointer-events-none absolute right-2 top-2 h-6 w-6 rounded-tr border-r-[3px] border-t-[3px] border-[var(--brand)]" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-6 w-6 rounded-bl border-b-[3px] border-l-[3px] border-[var(--brand)]" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-6 w-6 rounded-br border-b-[3px] border-r-[3px] border-[var(--brand)]" />
        {/* scan line */}
        <span
          className="pointer-events-none absolute left-2 right-2 top-1/2 h-0.5 bg-[var(--brand)]"
          style={{ boxShadow: '0 0 8px var(--brand)' }}
        />
      </div>
      {error ? (
        <p className="mt-2 serif-caption" role="alert" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
```

- [ ] **Step 2: Run unit tests**

Run: `pnpm test -- --testPathPatterns=qrScanner`
Expected: existing tests PASS (if any — this component is behaviour-heavy so may have limited tests).

- [ ] **Step 3: Commit**

```bash
git add src/components/molecule/qrScanner/qrScanner.tsx
git commit -m "style(qr-scanner): add brand-coloured viewfinder brackets and scan line"
```

---

## Task 9: QrDisplay — add mono code + expiry

**Files:**
- Modify: `src/components/molecule/qrDisplay/types.ts`
- Modify: `src/components/molecule/qrDisplay/qrDisplay.tsx`

- [ ] **Step 1: Add `code` and `expiresAt` to props**

Read the current `src/components/molecule/qrDisplay/types.ts`, then add the two optional props:

```ts
// types.ts should include something like:
export type QrDisplayProps = {
  value: string
  size?: number
  alt?: string
  dataUrl?: string
  code?: string          // 6-digit pairing code shown below the QR
  expiresAt?: Date       // if provided, render a mono "หมดอายุใน MM:SS" timer
}
```

Replace the file content with the above (adjust if additional existing props are present — preserve them).

- [ ] **Step 2: Update `qrDisplay.tsx` to render the code + timer**

Replace the `return (...)` block (currently lines 35-52) with:

```tsx
  if (!src) {
    return (
      <Skeleton
        style={{ width: size, height: size }}
        data-testid="qr-skeleton"
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="rounded border border-[var(--rule)] bg-white p-2"
      />
      {code ? (
        <div
          className="font-mono text-lg font-semibold"
          style={{ color: 'var(--brand-ink)', letterSpacing: '0.2em' }}
          data-testid="qr-code"
        >
          {code}
        </div>
      ) : null}
      {expiresAt ? <QrExpiry expiresAt={expiresAt} /> : null}
    </div>
  )
}

function QrExpiry({ expiresAt }: { expiresAt: Date }) {
  const [remaining, setRemaining] = useState<number>(
    Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  )
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0))
    }, 1000)
    return () => clearInterval(t)
  }, [])
  const mm = Math.floor(remaining / 60).toString().padStart(2, '0')
  const ss = (remaining % 60).toString().padStart(2, '0')
  return (
    <span className="mono-label" data-testid="qr-expiry">
      หมดอายุใน {mm}:{ss}
    </span>
  )
}
```

You'll also need to destructure `code` and `expiresAt` in the `QrDisplay` function signature:

```tsx
export function QrDisplay({
  value,
  size = 240,
  alt = 'QR code',
  dataUrl,
  code,
  expiresAt,
}: QrDisplayProps) {
```

- [ ] **Step 3: Run tests**

Run: `pnpm test -- --testPathPatterns=qrDisplay`
Expected: PASS (existing tests don't pass `code`/`expiresAt`, so they render without the new elements).

- [ ] **Step 4: Commit**

```bash
git add src/components/molecule/qrDisplay
git commit -m "feat(qr-display): optional pairing code + expiry countdown below QR"
```

---

## Task 10: Landing page `/` restyle

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Button } from '@/components/atom/button'
import { getServerAuth } from '@/services/guards/serverAuth'

export default async function HomePage() {
  const auth = await getServerAuth()
  if (auth?.role === 'caregiver') redirect('/dashboard')
  if (auth?.role === 'elder') redirect('/elder')

  const t = await getTranslations()

  return (
    <main className="relative mx-auto flex min-h-screen max-w-xl flex-col justify-between px-6 py-10">
      <header className="flex items-center gap-2">
        <span className="brand-mark">ล</span>
        <span className="text-sm font-semibold tracking-tight">
          Larnma · หลานม่า
        </span>
      </header>

      <section className="flex flex-col items-start gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">
          {t('common.appName')}
        </h1>
        <p className="serif-caption text-base leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          {t('tagline')}
        </p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row">
          <Button asChild size="xl" className="flex-1">
            <Link href="/register">{t('welcome.startButton')}</Link>
          </Button>
          <Button asChild size="xl" variant="outline" className="flex-1">
            <Link href="/elder/pair">{t('welcome.scanQrButton')}</Link>
          </Button>
        </div>
        <p className="serif-caption mt-4 max-w-sm">
          {t('welcome.elderHint')}
        </p>
      </section>

      <footer className="mono-label">
        <b>Larnma</b> · v0.1 · MVP
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Visual QA**

Open `http://localhost:3000/` (in a private window so `getServerAuth` returns null).
Expected: Brand mark + wordmark top-left; large bold title; serif italic tagline; two full-width buttons; serif hint; mono footer.

- [ ] **Step 3: Run existing E2E that touches `/` (if any)**

Run: `pnpm playwright test --grep "landing|welcome|home"` (skip if no such test exists).
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "style(landing): editorial header + brand mark + serif hint"
```

---

## Task 11: Elder home `/elder` restyle

**Files:**
- Modify: `src/modules/elderHome/elderHomePage.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { User } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import { MicButton } from '@/components/molecule/micButton'
import { MoodChip } from '@/components/molecule/moodChip'
import { useElderHomeController } from './controller/controller'

export function ElderHomePage() {
  const t = useTranslations()
  const { state, handler } = useElderHomeController()

  return (
    <main className="elder-mode relative flex min-h-screen flex-col items-center justify-between bg-background px-6 pb-6 pt-16">
      <div className="absolute left-4 top-4">
        <Button
          asChild
          size="icon"
          variant="outline"
          aria-label={t('elder.myInfo')}
        >
          <Link href="/elder/me" data-testid="elder-me-link">
            <User className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <MicButton state={state.micState} onPress={handler.onPress} />

        {state.lastResult ? (
          <div
            className="flex max-w-sm flex-col items-center gap-2 rounded-xl border border-[color-mix(in_oklch,var(--brand)_22%,transparent)] bg-[var(--brand-wash)] px-4 py-3"
            data-testid="elder-last-result"
          >
            <MoodChip mood={state.lastResult.mood} />
            <p
              className="text-base font-medium text-[var(--ink)]"
              style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
            >
              {state.lastResult.summary}
            </p>
            {state.lastResult.advice ? (
              <p
                className="serif-caption text-center"
                data-testid="elder-advice"
              >
                {state.lastResult.advice}
              </p>
            ) : null}
          </div>
        ) : null}

        {state.errorMessage ? (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {state.errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-4">
        <p className="serif-caption text-center">
          Wake word <b style={{ fontStyle: 'normal', color: 'var(--brand-ink)' }}>"หลานม่า"</b> เปิดอยู่
        </p>
        <Button
          asChild
          size="xl"
          className="w-full bg-[var(--danger)] text-white hover:bg-[var(--danger)]/90"
        >
          <a href="tel:0863780740" data-testid="elder-emergency-call">
            {t('emergency.call1669')}
          </a>
        </Button>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Run existing elder-home tests**

Run: `pnpm test -- --testPathPatterns=elderHome`
Expected: PASS (no controller change; only markup changed; `data-testid` values preserved).

- [ ] **Step 3: Visual QA at `/elder`**

Expected: mic circle centered; wake-word line near bottom in serif italic; emergency button full-width in danger red.

- [ ] **Step 4: Commit**

```bash
git add src/modules/elderHome/elderHomePage.tsx
git commit -m "style(elder-home): wake-word banner + transcript bubble + restyled emergency button"
```

---

## Task 12: Elder pair `/elder/pair` restyle

**Files:**
- Modify: `src/modules/pair/pairPage.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/atom/button'
import { QrScanner, QrImageUpload } from '@/components/molecule/qrScanner'
import { useTranslations } from 'next-intl'
import { usePairController } from './controller/controller'

export function PairPage() {
  const t = useTranslations()
  const router = useRouter()
  const search = useSearchParams()
  const { state, handler } = usePairController()
  const autoConsumed = useRef(false)

  useEffect(() => {
    const tokenParam = search.get('token')
    if (!tokenParam || autoConsumed.current) return
    autoConsumed.current = true
    void handler.consume(tokenParam)
  }, [search, handler])

  useEffect(() => {
    if (state.state === 'success') {
      const tid = setTimeout(() => router.replace('/elder'), 500)
      return () => clearTimeout(tid)
    }
  }, [state.state, router])

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-6 py-8">
      <header className="border-b border-[var(--rule)] pb-3">
        <div className="mono-label">หลานม่า</div>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {t('pair.title')}
        </h1>
      </header>

      <section className="mt-6 flex flex-col items-center gap-4">
        <p className="serif-caption max-w-xs text-center">
          {t('pair.subtitle')}
        </p>

        {state.state === 'ready' ? (
          <div className="flex w-full flex-col gap-3">
            <Button onClick={handler.startScan} size="xl" data-testid="pair-start">
              เปิดกล้อง
            </Button>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-[var(--rule)]" />
              <span className="mono-label mx-4">หรือ</span>
              <div className="flex-grow border-t border-[var(--rule)]" />
            </div>
            <QrImageUpload onDecode={handler.onDecode} onError={handler.onError} />
          </div>
        ) : null}

        {state.state === 'scanning' ? (
          <div className="flex w-full flex-col items-center gap-4">
            <QrScanner onDecode={handler.onDecode} onError={handler.onError} />
            <span className="mono-label">กำลังหา QR…</span>
            <div className="w-full border-t border-[var(--rule)] pt-4">
              <QrImageUpload onDecode={handler.onDecode} onError={handler.onError} />
            </div>
          </div>
        ) : null}

        {state.state === 'pairing' ? (
          <p className="serif-caption" data-testid="pair-pairing">
            {t('common.loading')}
          </p>
        ) : null}

        {state.state === 'success' ? (
          <p className="text-base font-semibold text-[var(--brand-ink)]" data-testid="pair-success">
            {t('pair.success')}
          </p>
        ) : null}

        {state.state === 'error' && state.errorMessage ? (
          <div className="flex w-full flex-col items-center gap-3">
            <p role="alert" className="text-center text-sm text-[var(--danger)]">
              {state.errorMessage}
            </p>
            <Button onClick={handler.startScan} size="xl" className="w-full">
              {t('common.retry')}
            </Button>
            <div className="relative flex w-full items-center py-2">
              <div className="flex-grow border-t border-[var(--rule)]" />
              <span className="mono-label mx-4">หรือ</span>
              <div className="flex-grow border-t border-[var(--rule)]" />
            </div>
            <QrImageUpload onDecode={handler.onDecode} onError={handler.onError} />
          </div>
        ) : null}
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Run pair tests**

Run: `pnpm test -- --testPathPatterns=pair`
Expected: PASS (no controller change).

- [ ] **Step 3: Visual QA at `/elder/pair`**

- [ ] **Step 4: Commit**

```bash
git add src/modules/pair/pairPage.tsx
git commit -m "style(elder-pair): editorial header + serif caption + mono status"
```

---

## Task 13: Elder me `/elder/me` restyle

**Files:**
- Modify: `src/modules/elderMe/elderMePage.tsx`

- [ ] **Step 1: Read current page**

Run: `cat src/modules/elderMe/elderMePage.tsx`

- [ ] **Step 2: Restyle in place**

Apply these rules to the existing file — do not change controller imports or state usage:
- Wrap main in `className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 px-6 py-8"`
- Replace each `<CardTitle>` with a `mono-label` + bold subtitle pattern:
  ```tsx
  <div className="border-b border-[var(--rule)] pb-3">
    <div className="mono-label">ข้อมูลของฉัน</div>
    <h2 className="mt-1 text-xl font-semibold tracking-tight">{elder.name}</h2>
  </div>
  ```
- Each "field row" becomes a 2-column grid: mono-label key + value:
  ```tsx
  <dl className="grid grid-cols-[1fr_1fr] gap-y-2 text-sm">
    <dt className="mono-label">เบอร์โทร</dt>
    <dd className="text-[var(--ink)]">{elder.phone}</dd>
  </dl>
  ```
- Keep all `data-testid` attributes exactly.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- --testPathPatterns=elderMe`
Expected: PASS.

- [ ] **Step 4: Visual QA at `/elder/me`**

- [ ] **Step 5: Commit**

```bash
git add src/modules/elderMe/elderMePage.tsx
git commit -m "style(elder-me): mono labels and stat grid layout"
```

---

## Task 14: Dashboard `/dashboard` restyle

**Files:**
- Modify: `src/modules/dashboard/dashboardPage.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/atom/card'
import { MoodChip } from '@/components/molecule/moodChip'
import { PriorityBadge } from '@/components/molecule/priorityBadge'
import { Button } from '@/components/atom/button'
import { useDashboardController } from './controller/controller'
import type { Mood } from '@/shared/types'

const accentFor = (priority: string | undefined) =>
  priority === 'critical' ? ('crit' as const)
  : priority === 'log' ? ('log' as const)
  : ('normal' as const)

export function DashboardPage() {
  const t = useTranslations()
  const { state, handler } = useDashboardController()

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-5 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <div>
          <div className="mono-label">{t('caregiver.dashboard.title')}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            คุณแม่วันนี้
          </h1>
        </div>
        <div
          className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
          style={{ background: 'var(--brand)' }}
        >
          ห
        </div>
      </header>

      {state.error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {state.error}
        </p>
      ) : null}

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="mono-label">Mood</div>
          <div className="mt-1 text-base font-semibold tracking-tight">
            {state.events[0]?.mood ?? 'ปกติ'}
          </div>
        </Card>
        <Card className="p-3">
          <div className="mono-label">Events</div>
          <div className="mt-1 text-base font-semibold tracking-tight">
            {state.events.length} ครั้ง
          </div>
        </Card>
      </div>

      {/* Event timeline */}
      <section className="flex flex-col gap-2" data-testid="dashboard-timeline">
        {state.events.map((e) => (
          <Card key={e.id} accent="log" className="p-3">
            <div className="flex items-center justify-between">
              <div className="mono-label">
                {new Date(e.createdAt).toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {' · '}
                <MoodChip mood={e.mood as Mood} />
              </div>
              <span className="mono-label">log</span>
            </div>
            <p className="mt-2 text-sm leading-snug text-[var(--ink)]">
              "{e.transcript}"
            </p>
            <p className="mt-1 serif-caption">{e.summary}</p>
          </Card>
        ))}
      </section>

      {/* Notifications */}
      <section className="flex flex-col gap-2" data-testid="dashboard-notis">
        <div className="mono-label">การแจ้งเตือน</div>
        {state.notifications.map((n) => (
          <Card key={n.id} accent={accentFor(n.priority)} className="p-3">
            <div className="flex items-center justify-between">
              <PriorityBadge priority={n.priority} />
              {n.ackAt ? (
                <span className="mono-label">ackแล้ว</span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => void handler.ack(n.id)}
                  data-testid={`ack-${n.id}`}
                >
                  {t('emergency.handleIt')}
                </Button>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--ink)]">{n.eventId}</p>
          </Card>
        ))}
      </section>

      {/* Weekly mood */}
      <section className="flex flex-col gap-2">
        <div className="mono-label">{t('caregiver.dashboard.weeklyMood')}</div>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(state.moodCounts) as Mood[]).map((m) => (
            <div
              key={m}
              className="flex items-center gap-2 rounded-md border border-[var(--rule)] bg-white px-3 py-1.5"
            >
              <MoodChip mood={m} />
              <span className="font-mono text-sm">{state.moodCounts[m]}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Run dashboard tests**

Run: `pnpm test -- --testPathPatterns=dashboard`
Expected: PASS (no controller change; all `data-testid` preserved).

- [ ] **Step 3: Run any E2E that touches the dashboard**

Run: `pnpm playwright test --grep "dashboard|caregiver"`
Expected: PASS.

- [ ] **Step 4: Visual QA at `/dashboard`**

- [ ] **Step 5: Commit**

```bash
git add src/modules/dashboard/dashboardPage.tsx
git commit -m "style(dashboard): cg-view layout with stat grid and accent event cards"
```

---

## Task 15: Register flow `/register` restyle (wrapper + step views)

**Files:**
- Modify: `src/modules/register/registerPage.tsx`
- Modify: `src/modules/register/views/stepViews.tsx`

This is the largest single task because there are 11 step views. Keep it one task so the restyle is visually consistent; split commits per sub-step.

- [ ] **Step 1: Restyle `registerPage.tsx` wrapper**

Replace the `return (...)` in `src/modules/register/registerPage.tsx` (lines 39-72) with:

```tsx
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-4 px-5 py-6">
      <header className="border-b border-[var(--rule)] pb-3">
        <div className="mono-label">
          Step {stepIndex}/{REGISTER_STEPS.length}
        </div>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">
          {state.step === 'qr' ? 'QR pairing' : 'ลงทะเบียน'}
        </h1>
      </header>

      {state.errorMessage ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))] bg-[var(--danger-wash)] p-3 text-sm text-[var(--danger)]"
        >
          {state.errorMessage}
        </p>
      ) : null}

      {state.step === 'welcome' ? (
        <WelcomeStep onNext={() => handler.next()} />
      ) : null}
      {state.step === 'phone' ? <PhoneStep {...props} /> : null}
      {state.step === 'otp' ? (
        <OtpStep {...props} phone={form.getValues('phone')} />
      ) : null}
      {state.step === 'caregiver' ? <CaregiverStep {...props} /> : null}
      {state.step === 'consent' ? <ConsentStep {...props} /> : null}
      {state.step === 'elderBasic' ? <ElderBasicStep {...props} /> : null}
      {state.step === 'elderHealth' ? <ElderHealthStep {...props} /> : null}
      {state.step === 'elderEmergency' ? <ElderEmergencyStep {...props} /> : null}
      {state.step === 'elderOptional' ? <ElderOptionalStep {...props} /> : null}
      {state.step === 'review' ? <ReviewStep {...props} /> : null}
      {state.step === 'qr' ? (
        <QrStep
          qrDataUrl={state.qrDataUrl}
          pairingToken={state.pairingToken}
          onGenerate={handler.generateQr}
        />
      ) : null}
    </main>
  )
```

Remove the `<Stepper />` import — it's replaced by the mono-label step counter. Keep all other imports. (If `<Stepper>` is referenced elsewhere, leave its file alone — only remove the import and JSX usage in `registerPage.tsx`.)

- [ ] **Step 2: Restyle `stepViews.tsx` — apply consistent patterns**

This file has 11 step views. Read the whole file first (`cat src/modules/register/views/stepViews.tsx`), then apply these systematic changes to **each** step's rendering:

**A. Step title (top of each step).** Replace any `<h2>` / `<CardTitle>` at the top of a step with:

```tsx
<div>
  <div className="mono-label">{STEP_LABEL}</div>
  <h2 className="mt-1 text-xl font-semibold tracking-tight">{STEP_TITLE}</h2>
</div>
```

Where `STEP_LABEL` is a short uppercase label (e.g., `PHONE`, `OTP`, `CAREGIVER PROFILE`, `CONSENT`, `ELDER · BASIC`, `ELDER · HEALTH`, `ELDER · EMERGENCY`, `ELDER · OPTIONAL`, `REVIEW`, `QR PAIRING`), and `STEP_TITLE` is the existing Thai title for the step.

**B. Form fields.** Any `<FormField>` usage stays the same — the `formField` molecule already renders via `@/components/`. Just ensure the outer container is `className="flex flex-col gap-4"` so fields stack consistently.

**C. Chip-style selections.** For `ElderEmergencyStep` and `ElderOptionalStep` where multiple items are selected, wrap each chip with:

```tsx
<span className="rounded-full border border-[color-mix(in_oklch,var(--brand)_28%,var(--rule))] bg-[var(--brand-wash)] px-2.5 py-1 text-xs text-[var(--brand-ink)]">
  {label}
</span>
```

(Only wrap *display* chips. Don't touch the actual form inputs — those come from `@/components/molecule/formField` and already use the theme.)

**D. Primary action button.** Every step's "Next / Submit" button should use `<Button size="xl" className="w-full">`. Keep existing onClick/type props.

**E. QrStep specifically.** Update to pass the new props into `<QrDisplay>`:

```tsx
<QrDisplay
  value={pairingToken ?? ''}
  dataUrl={qrDataUrl ?? undefined}
  code={pairingToken?.slice(0, 6).toUpperCase()}
  expiresAt={pairingToken ? new Date(Date.now() + 15 * 60 * 1000) : undefined}
/>
```

(If the controller already computes expiry, use that instead — read the controller to confirm; otherwise the 15-min default is acceptable per the prototype.)

- [ ] **Step 3: Run register tests**

Run: `pnpm test -- --testPathPatterns=register`
Expected: PASS.

- [ ] **Step 4: Run register E2E**

Run: `pnpm playwright test --grep "register"`
Expected: PASS.

- [ ] **Step 5: Visual QA — walk all 11 steps**

Open `http://localhost:3000/register`, complete each step with OTP `123456`. Confirm:
- Header shows "Step X/11" mono label + title
- Fields render with correct border/radius
- Submit buttons full-width
- Step 11 shows QR + 6-char code + expiry timer

- [ ] **Step 6: Commit**

```bash
git add src/modules/register
git commit -m "style(register): editorial step header, chip display, qr code + expiry"
```

---

## Task 16: Invite landing `/invite/[token]` restyle

**Files:**
- Modify: `src/modules/inviteLanding/inviteLandingPage.tsx`

- [ ] **Step 1: Read current page**

Run: `cat src/modules/inviteLanding/inviteLandingPage.tsx`

- [ ] **Step 2: Restyle in place**

Apply:
- Wrap main in `className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 px-5 py-8"`
- Header block:
  ```tsx
  <div className="border-b border-[var(--rule)] pb-3">
    <div className="mono-label">คำเชิญ</div>
    <h1 className="mt-1 text-xl font-semibold tracking-tight">{invite.inviterName} เชิญคุณ</h1>
  </div>
  ```
- Body in serif italic:
  ```tsx
  <p className="serif-caption text-base leading-relaxed">
    เข้าร่วมเป็นผู้ดูแลคุณ {invite.elderName}
  </p>
  ```
- Role pill:
  ```tsx
  <span className="mono-label">
    บทบาท: <b>{invite.role}</b>
  </span>
  ```
- Accept button primary, decline outline, both `size="xl" className="w-full"`.
- Keep all `data-testid` attributes.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- --testPathPatterns=invite`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/inviteLanding
git commit -m "style(invite): editorial header + serif body + mono role pill"
```

---

## Task 17: Caregiver elder profile (view + edit) restyle

**Files:**
- Modify: `src/modules/elderProfile/elderProfileView.tsx`
- Modify: `src/modules/elderProfile/elderProfileEdit.tsx`

- [ ] **Step 1: Read both files**

Run: `cat src/modules/elderProfile/elderProfileView.tsx src/modules/elderProfile/elderProfileEdit.tsx`

- [ ] **Step 2: Apply pattern to both**

For each file:
- Main wrapper: `className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-5 py-6"`
- Header block (mono-label + title) — label is `ผู้สูงอายุ` for view, `แก้ไขข้อมูล` for edit
- Stat grid (2 cols): each field as `<dt class="mono-label">` + `<dd>`
- Keep `<Card>` for the main wrap if already present
- Edit form uses the same FormField molecule as register; no other input styling needed
- Primary action button `size="xl" className="w-full"`

- [ ] **Step 3: Run tests**

Run: `pnpm test -- --testPathPatterns=elderProfile`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/modules/elderProfile
git commit -m "style(elder-profile): editorial header + stat grid + consistent form layout"
```

---

## Task 18: Privacy `/privacy` restyle

**Files:**
- Modify: `src/app/privacy/page.tsx`

- [ ] **Step 1: Read current file**

Run: `cat src/app/privacy/page.tsx`

- [ ] **Step 2: Restyle**

Replace the file (only 26 lines) with:

```tsx
import { getTranslations } from 'next-intl/server'

export default async function PrivacyPage() {
  const t = await getTranslations()
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-5 py-10">
      <header className="border-b border-[var(--rule)] pb-3">
        <div className="mono-label">Legal</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {t('privacy.title')}
        </h1>
      </header>
      <article
        className="prose max-w-none"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: 1.55,
          color: 'var(--ink-2)',
        }}
      >
        {/* Preserve the existing body content; if the current file uses
            t() keys directly, leave them. Only the outer wrapper and heading
            change. */}
        <p>{t('privacy.body')}</p>
      </article>
    </main>
  )
}
```

**Important:** If the existing file renders specific paragraphs or translation keys other than `privacy.body`, preserve that content inside the `<article>`. Only change the wrapper, header, and article typography.

- [ ] **Step 3: Visual QA at `/privacy`**

- [ ] **Step 4: Commit**

```bash
git add src/app/privacy/page.tsx
git commit -m "style(privacy): editorial header + serif body"
```

---

## Task 19: Final verification pass

**Files:** none

- [ ] **Step 1: Run full unit test suite**

Run: `pnpm test`
Expected: all PASS. No regressions.

- [ ] **Step 2: Run lint + typecheck**

Run: `pnpm lint`
Expected: no errors. (If any `biome-ignore` was needed, per CLAUDE.md A12 ask the user first.)

- [ ] **Step 3: Run full E2E suite**

Run: `pnpm test:e2e`
Expected: all PASS. Playwright selectors use `data-testid`, so visual changes should not break them.

- [ ] **Step 4: Walk the app manually on `pnpm dev`**

Open each URL and compare side-by-side with `/Users/roj.wilai/Downloads/larnma/Larnma Prototype-print.html` (page 1-5):
- `/` → prototype p.1 left panel (overview narrative)
- `/elder` → prototype p.1 elder column (idle state)
- `/register` (walk all 11 steps) → prototype p.5 caregiver column
- `/elder/pair` → prototype p.5 elder column (QR scan)
- `/dashboard` → prototype p.1 and p.3 caregiver column (feed + LONELY event card)
- `/elder/me`, `/caregiver/elders/[id]`, `/invite/[token]`, `/privacy` — visual consistency with the rest (same fonts, palette, header pattern)

Confirm:
- IBM Plex Sans Thai loaded (Thai text has rounder letterforms)
- Primary buttons are `oklch(0.42 0.18 300)` purple
- Event cards have left accent border
- Mic circle is 130px with gradient + double ring
- QR scanner has corner brackets

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: success. Confirms `next/font` subsetting and Tailwind tokens compile for production.

- [ ] **Step 6: Final commit (if any outstanding fixes from Step 4 or Step 5)**

```bash
git status
# If any files modified in the manual pass:
git add -p
git commit -m "style: fix remaining visual regressions from restyle QA"
```

---

## Self-Review Notes

- **Spec coverage:**
  - §1 Theme layer (fonts + variables) → Tasks 1, 2
  - §2 Utility classes → Task 3
  - §3 Component restyle (Card / MicButton / MoodChip / PriorityBadge / QrScanner / QrDisplay) → Tasks 4–9
  - §4 Page restyles (9 pages) → Tasks 10–18
  - §5 Implementation order → Matches task order
  - §6 Verification → Task 19
  - §7 Open decisions → Encoded into code directly (no separate task)
- **Placeholders:** none — every step shows code or an exact command.
- **Type consistency:** `CardProps.accent` uses the same literal union `'log' | 'normal' | 'crit'` in types.ts, card.tsx, and dashboardPage.tsx. `QrDisplayProps.code` / `expiresAt` are referenced identically in the register qr step. `--brand` token is used consistently across `globals.css`, component inline styles, and page styles.
- **Known risk:** the `<Stepper>` import is removed from `registerPage.tsx` in Task 15; if the `Stepper` component file has no other consumer, it becomes dead code. Per CLAUDE.md the engineer should leave the file alone (no unrelated cleanup) — future cleanup is out of scope.
