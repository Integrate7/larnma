import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { ElderMe, ElderMeState } from '../../types'

const schema = z.object({
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
    z.object({
      name: z.string(),
      dosage: z.string(),
      time: z.string(),
    }),
  ),
  allergies: z.array(z.string()),
  primaryCaregiver: z
    .object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
    })
    .optional(),
})

export function useElderMeQueryHandler() {
  const [state, setState] = useState<ElderMeState>({
    data: null,
    loading: true,
    error: null,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    const res = await fetcher<ElderMe>('/api/elder/me', schema)
    if (res.success) {
      setState({ data: res.data, loading: false, error: null })
    } else {
      setState({ data: null, loading: false, error: res.error })
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { state, reload: load }
}
