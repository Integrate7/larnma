'use client'

import { usePairGlobalState } from './hooks/globalState'
import { usePairHandler } from './hooks/handler'

export function usePairController() {
  const gs = usePairGlobalState()
  const handler = usePairHandler(gs)
  return { state: gs.gs, handler }
}
