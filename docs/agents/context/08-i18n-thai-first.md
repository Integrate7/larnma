# Thai-First i18n (Agent Reference)

Larnma is a **Thai-first** product. The defaults across the app — copy, formatting, timezone — are Thai. English exists as a parity translation for development and future export, not as the primary locale.

> **Rule.** Never hard-code Thai strings in components. Use `next-intl` keys from `messages/th.json`.
> The only exception is brand wordmarks (`หลานม่า`, `Larnma`) that render inside a logo mark.

---

## 1. Configuration

### `src/i18n.ts`

```ts
import { getRequestConfig } from 'next-intl/server'

export const LOCALES = ['th', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'th'

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'Asia/Bangkok',
  }
})
```

### `src/app/layout.tsx`

Pulls the locale and messages on the server, passes them through `NextIntlClientProvider`:

```tsx
const locale = await getLocale()
const messages = await getMessages()

return (
  <html lang={locale}>
    <body>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Providers>{children}</Providers>
      </NextIntlClientProvider>
    </body>
  </html>
)
```

### Fonts (Thai-rendered by design)

`IBM_Plex_Sans_Thai` is the primary font family (weights 300–700) and loaded with both `latin` and `thai` subsets. `IBM_Plex_Serif` handles accents/captions; `JetBrains_Mono` is for small labels. CSS variables `--font-sans`, `--font-serif`, `--font-mono` are set in the root layout.

### Timezone

`Asia/Bangkok` is the default in `i18n.ts`. Any `useFormatter()` / `useNow()` call, and any server-rendered date, renders in Thailand time. When a server route computes expiry or timestamps, always use `new Date().toISOString()` (UTC on the wire) and let the client format it through `next-intl`.

---

## 2. Using translations in components

### Client component

```tsx
'use client'
import { useTranslations } from 'next-intl'

export function PairPage() {
  const t = useTranslations()
  return (
    <>
      <h1>{t('pair.title')}</h1>
      <p>{t('pair.subtitle')}</p>
      <button>{t('common.retry')}</button>
    </>
  )
}
```

### Server component

```tsx
import { getTranslations } from 'next-intl/server'

export default async function HomePage() {
  const t = await getTranslations()
  return <h1>{t('common.appName')}</h1>
}
```

### Interpolation

```json
{ "auth": { "otpSubtitle": "ส่งไปที่เบอร์ {phone}" } }
```

```tsx
<p>{t('auth.otpSubtitle', { phone })}</p>
```

### Dates / numbers

```tsx
import { useFormatter } from 'next-intl'
const format = useFormatter()
format.dateTime(new Date(createdAt), { dateStyle: 'short', timeStyle: 'short' })
```

---

## 3. The message files

Two siblings in `messages/`:

- `th.json` — primary, edited first
- `en.json` — parity, must keep the same key set

### Canonical top-level namespaces

Stay within these; create a new one only for a brand-new surface:

- `common` — cross-cutting strings (`next`, `back`, `retry`, `save`, `loading`, `error`, `edit`, `delete`, `yes`, `no`, `close`, `optional`, `required`)
- `tagline` — marketing one-liner on `/`
- `welcome` — `/` landing copy
- `auth` — OTP, Google, phone, lock/expire messages
- `register` — caregiver wizard (steps, fields, validation errors)
- `invite` — secondary caregiver accept flow
- `pair` — QR pair screens (elder side)
- `dashboard` — caregiver main screen
- `elder` — elder surface (home/food/me/pair)
- `profile` — elder profile CRUD (fields, sections, validation)
- `orders` / `food` — ordering, menu, delivery
- `notifications` — dashboard alerts
- `consent` — PDPA toggles + legal labels
- `errors` — shared error messages

### Naming conventions

- Keys are `camelCase`.
- Keep hierarchy flat — `register.elder.basic.addressLine`, not deeper than 4 levels.
- Error messages go under the namespace they belong to, e.g. `auth.invalidOtp` not `errors.invalidOtp`.
- Reuse `common.*` for the obvious buttons — don't add `register.next`, `invite.next`, …

### Adding a new string

1. Add the key to `messages/th.json` — real Thai copy, in context.
2. Add the same key to `messages/en.json` — acceptable translation.
3. Use `t('the.key')` at the call site.

**Never commit a key that exists only in `th.json` or only in `en.json`.** Keep them in lockstep; a small diff to keep parity is fine.

### Checking parity

There's no automatic parity check (yet), so do it manually in the PR:
```bash
node -e "const th=Object.keys(require('./messages/th.json')); const en=Object.keys(require('./messages/en.json')); console.log({thOnly:th.filter(k=>!en.includes(k)), enOnly:en.filter(k=>!th.includes(k))})"
```
If you add a new top-level namespace, mirror it.

---

## 4. Writing for the elder surface (copy guide)

- **Short verbs in imperative.** `เริ่ม`, `พูด`, `สแกน`. Three words max for CTAs.
- **Familiar, warm register** — use หลาน / ย่า / ม่า framing (`หลานอยู่ข้างคุณเสมอ`).
- **Avoid medical jargon.** Say `เจ็บ`, not `อาการปวดเฉียบพลัน`.
- **Numbers spoken in words** only when it helps clarity (OTP inputs stay numeric).
- **Avoid English loanwords** in body text except well-known product terms (OTP, QR, Wi-Fi) — use `รหัส OTP`, `สแกน QR`.
- **Tone in error states**: reassure, don't blame. `เบอร์โทรศัพท์ไม่ถูกต้อง` is fine; `คุณกรอกผิด` is not.

### Elder-facing font sizes

Use `size="xl"` on atom buttons. Body text ≥ 18 px (`text-lg` or larger). Line-height loose enough for elder reading — already set via the global CSS vars.

---

## 5. Writing for the caregiver surface

- Slightly more formal, shorter sentences, data-first.
- Abbreviations OK (`จำนวน`, `รายการ`).
- Tables / lists — keep column headers under 2 words.
- Toast copy (sonner): 1 sentence, no trailing period, action verb up front.

---

## 6. Dates, times, and numbers

Always format via `useFormatter()` / `format.dateTime` / `format.number` — the `th` locale from next-intl produces the right Thai-Buddhist-calendar-style output when needed, plus `Asia/Bangkok` offsets correctly.

Don't `new Date().toLocaleString()` anywhere — it reads the browser locale, not the app locale, and produces inconsistent output across devices.

---

## 7. Testing under i18n

In Jest, `next-intl` is mocked so `useTranslations()` returns `(key) => key` — assertions see the **key** (`'pair.title'`), not the Thai string. That means:

- Don't assert on `screen.getByText('สแกน QR')`. Use `screen.getByText('pair.scanQr')` instead.
- Or target with `data-testid` for stability.

In Playwright the real messages are loaded, so assertions against Thai copy are fine — just prefer `data-testid` for flake resistance.

---

## 8. Common pitfalls

- **Hard-coded Thai in JSX.** `<p>สวัสดี</p>` will survive lint but violate the rule. Use `t(...)`.
- **Inline ternaries for copy.** Move the copy into the message file and interpolate the variable.
- **Forgetting the `en.json` update** when adding a key. The diff is obvious but easy to miss in hurry.
- **`Intl.DateTimeFormat` directly.** Use `useFormatter()` — it's wired to the locale + TZ.
- **Brand marks.** It's fine to render the literal `หลานม่า` inside the wordmark component (`<span className="brand-mark">`), but prose copy around it must still come from the message file.
- **Accept that `en.json` has gaps.** MVP is Thai-first — if a section only has partial English translations, copy stays Thai under the English locale. File an issue but don't block the PR on it.

---

## 9. Adding a new locale

Not currently planned (MVP is `th`/`en` only), but if needed:

1. Add the locale code to `LOCALES` in `src/i18n.ts`
2. Add `messages/<code>.json`
3. Decide whether to change `DEFAULT_LOCALE` (unlikely — Thai stays default)
4. Add a locale switcher UI (doesn't exist yet)
5. Mirror every key

Don't add locale-routing prefixes (`/th/...`, `/en/...`) unless a product requirement explicitly calls for it — the current setup keeps URLs clean.
