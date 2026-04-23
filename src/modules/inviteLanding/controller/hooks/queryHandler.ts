import { useEffect, useRef } from 'react'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { useInviteLandingGlobalState } from './globalState'

type GS = ReturnType<typeof useInviteLandingGlobalState>

const schema = z.object({
  elderId: z.string(),
  elderName: z.string().optional(),
  inviterName: z.string().optional(),
  exp: z.string(),
})

export function useInviteLandingQueryHandler(gs: GS) {
  const token = gs.state.token
  const gsRef = useRef(gs)
  gsRef.current = gs

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const current = gsRef.current
      current.setLoading(true)
      const res = await fetcher(`/api/invites/${token}`, schema)
      if (cancelled) return
      if (res.success) {
        current.setInfo(res.data)
        current.setError(null)
      } else {
        current.setError(res.error)
      }
      current.setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [token])
}
