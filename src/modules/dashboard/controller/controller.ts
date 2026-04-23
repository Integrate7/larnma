'use client'

import { useDashboardWebSocket } from './hooks/webSocket'
import { useDashboardGlobalState } from './hooks/globalState'
import { useDashboardHandler } from './hooks/handler'
import { useDashboardQueryHandler } from './hooks/queryHandler'

export function useDashboardController() {
  const gs = useDashboardGlobalState()
  const { reload } = useDashboardQueryHandler(gs)
  const handler = useDashboardHandler({ gs, reload })
  useDashboardWebSocket(gs)
  return { state: gs.state, handler }
}
