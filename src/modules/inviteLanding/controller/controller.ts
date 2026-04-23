'use client'

import { useInviteAcceptFormHandler } from './hooks/formHandler'
import { useInviteLandingGlobalState } from './hooks/globalState'
import { useInviteLandingHandler } from './hooks/handler'
import { useInviteLandingQueryHandler } from './hooks/queryHandler'

export function useInviteLandingController(token: string) {
  const { form } = useInviteAcceptFormHandler()
  const gs = useInviteLandingGlobalState(token)
  useInviteLandingQueryHandler(gs)
  const handler = useInviteLandingHandler({ form, gs })
  return { form, state: gs.state, handler }
}
