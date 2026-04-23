'use client'
import { useCallback } from 'react'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { CaregiverListHandler } from '../../types'
import type { useCaregiverListGlobalState } from './globalState'

const caregiverItemSchema = z.object({
  pairingId: z.string(),
  name: z.string(),
  phone: z.string(),
  isPrimary: z.boolean(),
  isCurrentUser: z.boolean(),
})

const listSchema = z.object({
  caregivers: z.array(caregiverItemSchema),
})

type GS = ReturnType<typeof useCaregiverListGlobalState>

export function useCaregiverListHandler(args: { gs: GS; elderId: string }): CaregiverListHandler {
  const { gs, elderId } = args

  const load = useCallback(async () => {
    gs.setLoading(true)
    gs.setError(null)
    const res = await fetcher(
      `/api/pairings/elder?elderId=${encodeURIComponent(elderId)}`,
      listSchema,
    )
    gs.setLoading(false)
    if (res.success) {
      gs.setCaregivers(res.data.caregivers)
    } else {
      gs.setError(res.error)
    }
  }, [gs, elderId])

  const revoke = useCallback(
    async (pairingId: string) => {
      gs.setError(null)
      const res = await fetcher(
        `/api/pairings/${pairingId}`,
        z.object({ ok: z.boolean() }),
        { method: 'DELETE' },
      )
      if (res.success) {
        await load()
      } else {
        gs.setError(res.error)
      }
    },
    [gs, load],
  )

  return { load, revoke }
}
