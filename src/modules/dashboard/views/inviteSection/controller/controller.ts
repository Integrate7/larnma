'use client'
import { useInviteGlobalState } from './hooks/globalState'
import { useInviteHandler } from './hooks/handler'

export function useInviteController(elderId: string) {
  const gs = useInviteGlobalState()
  const handler = useInviteHandler({ gs, elderId })
  return { state: gs.state, handler }
}
