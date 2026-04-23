'use client'

import { useElderProfileGlobalState } from './hooks/globalState'
import { useElderProfileHandler } from './hooks/handler'
import { useElderProfileQueryHandler } from './hooks/queryHandler'

export function useElderProfileController(elderId: string) {
  const gs = useElderProfileGlobalState(elderId)
  const { reload } = useElderProfileQueryHandler(gs)
  const handler = useElderProfileHandler({ gs, reload })
  return { state: gs.state, handler }
}
