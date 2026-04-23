import { useState } from 'react'
import type { ElderProfileData, ElderProfileState } from '../../types'

export function useElderProfileGlobalState(elderId: string) {
  const [data, setData] = useState<ElderProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const state: ElderProfileState = {
    elderId,
    data,
    loading,
    error,
    saving,
    saved,
  }
  return { state, setData, setLoading, setError, setSaving, setSaved }
}
