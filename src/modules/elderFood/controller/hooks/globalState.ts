import { useState } from 'react'
import type {
  AnnotatedMenuItem,
  ElderFoodState,
  FoodRequestStatus,
} from '../../types'

export function useElderFoodGlobalState() {
  const [menus, setMenus] = useState<AnnotatedMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [requestStatus, setRequestStatus] = useState<FoodRequestStatus>('idle')

  const gs: ElderFoodState = {
    menus,
    loading,
    error,
    selectedMenuId,
    requestStatus,
  }

  return {
    gs,
    setMenus,
    setLoading,
    setError,
    setSelectedMenuId,
    setRequestStatus,
  }
}
