'use client'

import { useElderFoodGlobalState } from './hooks/globalState'
import { useElderFoodHandler } from './hooks/handler'
import { useElderFoodQueryHandler } from './hooks/queryHandler'

export function useElderFoodController() {
  const gs = useElderFoodGlobalState()
  useElderFoodQueryHandler(gs)
  const handler = useElderFoodHandler(gs)
  return { state: gs.gs, handler }
}
