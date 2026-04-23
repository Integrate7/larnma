import { useEffect, useState } from 'react'
import type {
  AudioUploadResult,
  ElderHomeGlobalState,
  MicButtonState,
  OrderNotification,
} from '../../types'

export function useElderHomeGlobalState() {
  const [micState, setMicState] = useState<MicButtonState>('idle')
  const [lastResult, setLastResult] = useState<AudioUploadResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [orderNotification, setOrderNotification] = useState<OrderNotification | null>(null)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const gs: ElderHomeGlobalState = {
    micState,
    lastResult,
    errorMessage,
    isOnline,
    orderNotification,
  }

  return {
    gs,
    setMicState,
    setLastResult,
    setErrorMessage,
    setIsOnline,
    setOrderNotification,
  }
}
