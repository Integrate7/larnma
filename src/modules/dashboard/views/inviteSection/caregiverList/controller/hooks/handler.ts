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
  const { setCaregivers, setLoading, setError } = gs

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetcher(
      `/api/pairings/elder?elderId=${encodeURIComponent(elderId)}`,
      listSchema,
    )
    setLoading(false)
    if (res.success) {
      setCaregivers(res.data.caregivers)
    } else {
      setError(res.error)
    }
  }, [setCaregivers, setLoading, setError, elderId])

  const revoke = useCallback(
    async (pairingId: string) => {
      setError(null)
      const res = await fetcher(
        `/api/pairings/${pairingId}`,
        z.object({ ok: z.boolean() }),
        { method: 'DELETE' },
      )
      if (res.success) {
        await load()
      } else {
        setError(res.error)
      }
    },
    [setError, load],
  )

  return { load, revoke }
}
