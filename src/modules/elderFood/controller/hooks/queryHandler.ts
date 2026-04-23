import { useEffect } from 'react'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { useElderFoodGlobalState } from './globalState'

const menuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  conditionsExcluded: z.array(z.string()),
  allergensContained: z.array(z.string()),
  allergyMatch: z.array(z.string()),
  conditionMatch: z.array(z.string()),
  isSafe: z.boolean(),
  suggestedAlternative: z.string().nullable(),
})

const menusResponseSchema = z.object({ items: z.array(menuItemSchema) })

type GlobalStateSetter = ReturnType<typeof useElderFoodGlobalState>

export function useElderFoodQueryHandler(gs: GlobalStateSetter) {
  useEffect(() => {
    gs.setLoading(true)
    gs.setError(null)
    fetcher('/api/elder/food/menus', menusResponseSchema).then((result) => {
      if (result.success) {
        gs.setMenus(result.data.items)
      } else {
        gs.setError(result.error)
      }
      gs.setLoading(false)
    })
  }, [gs.setMenus, gs.setLoading, gs.setError])
}
