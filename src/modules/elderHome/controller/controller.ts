'use client'

import { useElderHomeGlobalState } from './hooks/globalState'
import { useElderHomeHandler } from './hooks/handler'
import { useWakeWord } from './hooks/wakeWord'

export function useElderHomeController() {
  const gs = useElderHomeGlobalState()
  const handler = useElderHomeHandler(gs)
  useWakeWord(gs, () => {
    void handler.startRecording()
  })
  return { state: gs.gs, handler }
}
