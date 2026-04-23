import { createRealGeminiAdapter } from './geminiAdapter'
import { createMockGeminiAdapter } from './mockGeminiAdapter'
import type { GeminiAdapter } from './types'

let instance: GeminiAdapter | null = null

function createDefault(): GeminiAdapter {
  const apiKey = process.env.GEMINI_API_KEY
  if (apiKey && apiKey.length > 0) return createRealGeminiAdapter(apiKey)
  return createMockGeminiAdapter()
}

export function getGeminiAdapter(): GeminiAdapter {
  if (!instance) instance = createDefault()
  return instance
}

export function __setGeminiAdapter(next: GeminiAdapter) {
  instance = next
}

export type { GeminiAdapter, GeminiAnalysis, GeminiInput } from './types'
export { createMockGeminiAdapter, createRealGeminiAdapter }
