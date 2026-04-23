'use client'

import { useRef } from 'react'
import { useElderHomeGlobalState } from './hooks/globalState'
import { useElderHomeHandler } from './hooks/handler'
import { useWakeWord } from './hooks/wakeWord'
import { useElderEventStream } from './hooks/elderEventStream'

export function useElderHomeController() {
  const gs = useElderHomeGlobalState()
  const stopSRRef = useRef<() => void>(() => {})
  const handler = useElderHomeHandler(gs, stopSRRef)
  const { stopImmediate } = useWakeWord(gs, () => {
    void handler.startRecording()
  })
  stopSRRef.current = stopImmediate
  useElderEventStream(gs)
  return { state: gs.gs, handler }
}
