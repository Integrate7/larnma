import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { ElderProfileData } from '../../types'
import type { useElderProfileGlobalState } from './globalState'

type GS = ReturnType<typeof useElderProfileGlobalState>

export function useElderProfileHandler(args: {
  gs: GS
  reload: () => Promise<void>
}) {
  const { gs, reload } = args

  const save = async (
    section: 'basic' | 'health' | 'emergency' | 'optional',
    fields: Record<string, unknown>,
  ) => {
    gs.setSaving(true)
    gs.setError(null)
    gs.setSaved(false)
    const res = await fetcher<ElderProfileData>(
      `/api/elders/${gs.state.elderId}`,
      z.custom<ElderProfileData>(),
      { method: 'PATCH', body: { section, fields } },
    )
    gs.setSaving(false)
    if (!res.success) {
      gs.setError(res.error)
      return
    }
    gs.setSaved(true)
    await reload()
  }

  return { save }
}
