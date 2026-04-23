'use client'

import { useDashboardEventStream } from './hooks/eventStream'
import { useDashboardGlobalState } from './hooks/globalState'
import { useDashboardHandler } from './hooks/handler'
import { useDashboardQueryHandler } from './hooks/queryHandler'

export function useDashboardController() {
  const gs = useDashboardGlobalState()
  const { reload } = useDashboardQueryHandler(gs)
  const handler = useDashboardHandler({ gs, reload })
  useDashboardEventStream(gs)
  return { state: gs.state, handler }
}
