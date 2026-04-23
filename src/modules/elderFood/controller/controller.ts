'use client'

import { useElderFoodGlobalState } from './hooks/globalState'
import { useElderFoodQueryHandler } from './hooks/queryHandler'
import { useElderFoodHandler } from './hooks/handler'

export function useElderFoodController() {
  const gs = useElderFoodGlobalState()
  useElderFoodQueryHandler(gs)
  const handler = useElderFoodHandler(gs)
  return { state: gs.gs, handler }
}
