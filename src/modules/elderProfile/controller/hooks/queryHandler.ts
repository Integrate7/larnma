import { useCallback, useEffect, useRef } from 'react'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { ElderProfileData } from '../../types'
import type { useElderProfileGlobalState } from './globalState'

type GS = ReturnType<typeof useElderProfileGlobalState>

const schema: z.ZodType<ElderProfileData> = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  profilePicUrl: z.string().optional(),
  birthdate: z.string().optional(),
  addressLine: z.string(),
  district: z.string(),
  province: z.string(),
  postalCode: z.string(),
  conditions: z.array(z.string()),
  medications: z.array(
    z.object({ name: z.string(), dosage: z.string(), time: z.string() }),
  ),
  allergies: z.array(z.string()),
  primaryCaregiver: z
    .object({ id: z.string(), name: z.string(), phone: z.string() })
    .optional(),
})

export function useElderProfileQueryHandler(gs: GS) {
  const elderId = gs.state.elderId
  const gsRef = useRef(gs)
  gsRef.current = gs

  const load = useCallback(async () => {
    const current = gsRef.current
    current.setLoading(true)
    const res = await fetcher(`/api/elders/${elderId}`, schema)
    if (res.success) {
      current.setData(res.data)
      current.setError(null)
    } else {
      current.setError(res.error)
    }
    current.setLoading(false)
  }, [elderId])

  useEffect(() => {
    void load()
  }, [load])

  return { reload: load }
}
