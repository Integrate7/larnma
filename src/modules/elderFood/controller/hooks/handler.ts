import { useCallback } from 'react'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { ElderFoodState } from '../../types'
import type { useElderFoodGlobalState } from './globalState'

type GlobalStateSetter = ReturnType<typeof useElderFoodGlobalState>

const requestResponseSchema = z.object({ eventId: z.string() })

export function useElderFoodHandler(gs: GlobalStateSetter) {
  const onSelect = useCallback(
    (menuId: string) => {
      gs.setSelectedMenuId(menuId)
    },
    [gs.setSelectedMenuId],
  )

  const onConfirm = useCallback(async () => {
    if (!gs.gs.selectedMenuId) return
    gs.setRequestStatus('requesting')
    const result = await fetcher(
      '/api/elder/food/request',
      requestResponseSchema,
      {
        method: 'POST',
        body: { menuId: gs.gs.selectedMenuId },
      },
    )
    if (result.success) {
      gs.setRequestStatus('requested')
    } else {
      gs.setRequestStatus('error')
    }
  }, [gs.gs.selectedMenuId, gs.setRequestStatus])

  return { onSelect, onConfirm }
}

export type ElderFoodHandler = ReturnType<typeof useElderFoodHandler>
export type ElderFoodHandlerProps = Pick<ElderFoodState, 'selectedMenuId'>
