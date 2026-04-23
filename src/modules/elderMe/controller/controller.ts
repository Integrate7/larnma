'use client'

import { useElderMeQueryHandler } from './hooks/queryHandler'

export function useElderMeController() {
  const q = useElderMeQueryHandler()
  return { ...q }
}
