'use client'

import { useCriticalAlerts } from './hooks/criticalAlerts'
import { useDashboardEventStream } from './hooks/eventStream'
import { useDashboardGlobalState } from './hooks/globalState'
import { useDashboardHandler } from './hooks/handler'
import { useDashboardQueryHandler } from './hooks/queryHandler'

export function useDashboardController() {
  const gs = useDashboardGlobalState()
  const { reload } = useDashboardQueryHandler(gs)
  const handler = useDashboardHandler({ gs, reload })
  useDashboardEventStream(gs)

  const primaryPairing = gs.state.pairings.find((p) => p.isPrimary) ?? null
  const primaryElder = primaryPairing
    ? { name: primaryPairing.elderName, phone: primaryPairing.elderPhone }
    : null

  const alerts = useCriticalAlerts(
    gs.state.notifications,
    gs.state.events,
    primaryElder,
    handler.ack,
  )

  return { state: gs.state, handler, alerts }
}
