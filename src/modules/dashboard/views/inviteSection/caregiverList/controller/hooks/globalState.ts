'use client'
import { useState } from 'react'
import type { CaregiverItem, CaregiverListGlobalState } from '../../types'

export function useCaregiverListGlobalState() {
  const [caregivers, setCaregivers] = useState<CaregiverItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const state: CaregiverListGlobalState = { caregivers, loading, error }

  return { state, setCaregivers, setLoading, setError }
}
