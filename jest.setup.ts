import '@testing-library/jest-dom'

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-jest-only'

if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('node:util')
  global.TextEncoder = TextEncoder
  global.TextDecoder = TextDecoder
}

if (typeof (global as any).ResizeObserver === 'undefined') {
  (global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}

if (typeof window !== 'undefined') {
  window.matchMedia =
    window.matchMedia ||
    (() => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {},
    }))
}

jest.mock('uuid', () => {
  let n = 0
  return {
    v4: jest.fn(() => `test-uuid-${++n}`),
  }
})

jest.mock('next-intl', () => ({
  useTranslations: jest.fn(() => (key: string) => key),
  useFormatter: jest.fn(() => ({})),
  NextIntlClientProvider: ({ children }: any) => children,
  useLocale: jest.fn(() => 'th'),
  useMessages: jest.fn(() => ({})),
  useNow: jest.fn(() => new Date()),
  useTimeZone: jest.fn(() => 'Asia/Bangkok'),
}))

jest.mock('next-intl/server', () => ({
  getTranslations: jest.fn(() => (key: string) => key),
  getMessages: jest.fn().mockResolvedValue({}),
  getLocale: jest.fn().mockResolvedValue('th'),
}))

if (typeof global.Request === 'undefined') {
  (global as any).Request = class Request {
    url: string
    constructor(url: string, _init?: RequestInit) {
      this.url = url
    }
  }
}
