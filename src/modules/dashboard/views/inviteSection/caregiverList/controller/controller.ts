'use client'
import { useEffect } from 'react'
import { useCaregiverListGlobalState } from './hooks/globalState'
import { useCaregiverListHandler } from './hooks/handler'

export function useCaregiverListController(elderId: string) {
  const gs = useCaregiverListGlobalState()
  const handler = useCaregiverListHandler({ gs, elderId })

  useEffect(() => {
    void handler.load()
  }, [handler.load])

  return { state: gs.state, handler }
}
