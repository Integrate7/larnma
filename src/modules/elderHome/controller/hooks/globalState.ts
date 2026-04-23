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
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    globalThis.window.addEventListener('online', on)
    globalThis.window.addEventListener('offline', off)
    return () => {
      globalThis.window.removeEventListener('online', on)
      globalThis.window.removeEventListener('offline', off)
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
