'use client'

import { useRegisterFormHandler } from './hooks/formHandler'
import { useRegisterGlobalState } from './hooks/globalState'
import { useRegisterHandler } from './hooks/handler'

export function useRegisterController() {
  const { form } = useRegisterFormHandler()
  const gs = useRegisterGlobalState()
  const handler = useRegisterHandler({ form, gs })
  return { form, state: gs.state, handler }
}
