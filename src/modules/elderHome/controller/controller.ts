'use client'

import { useElderHomeGlobalState } from './hooks/globalState'
import { useElderHomeHandler } from './hooks/handler'

export function useElderHomeController() {
  const gs = useElderHomeGlobalState()
  const handler = useElderHomeHandler(gs)
  return { state: gs.gs, handler }
}
