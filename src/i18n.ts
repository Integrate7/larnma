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
