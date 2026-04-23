'use client'

import { useElderFoodController } from './controller/controller'
import { ElderFoodView } from './views/ElderFoodView'

export function ElderFoodPage() {
  const { state, handler } = useElderFoodController()
  return <ElderFoodView state={state} handler={handler} />
}
