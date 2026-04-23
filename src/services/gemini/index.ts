import { createMockGeminiAdapter } from './mockGeminiAdapter'
import type { GeminiAdapter } from './types'

let instance: GeminiAdapter | null = null

export function getGeminiAdapter(): GeminiAdapter {
  if (!instance) instance = createMockGeminiAdapter()
  return instance
}

export function __setGeminiAdapter(next: GeminiAdapter) {
  instance = next
}

export type { GeminiAdapter, GeminiAnalysis, GeminiInput } from './types'
export { createMockGeminiAdapter }
