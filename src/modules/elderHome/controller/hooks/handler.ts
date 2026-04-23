import { useRef } from 'react'
import type { AudioUploadResult } from '../../types'
import type { useElderHomeGlobalState } from './globalState'

type GS = ReturnType<typeof useElderHomeGlobalState>

const MAX_DURATION_MS = 30_000

export function useElderHomeHandler(gs: GS) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const uploadBlob = async (blob: Blob) => {
    gs.setMicState('uploading')
    const form = new FormData()
    form.append('audio', blob, 'clip.webm')
    form.append(
      'fakeKeyword',
      (blob as Blob & { __keyword?: string }).__keyword ?? '',
    )
    try {
      const res = await fetch('/api/audio', {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as AudioUploadResult
      gs.setLastResult(json)
      gs.setMicState('done')
      setTimeout(() => gs.setMicState('idle'), 2000)
    } catch (e) {
      gs.setErrorMessage(e instanceof Error ? e.message : String(e))
      gs.setMicState('error')
    }
  }

  const stopRecording = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
    try {
      recorderRef.current?.stop()
    } catch {
      // ignore
    }
    streamRef.current?.getTracks().forEach((t) => {
      t.stop()
    })
    streamRef.current = null
  }

  const startRecording = async () => {
    gs.setErrorMessage(null)
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
      chunksRef.current = []
      recorderRef.current = new MediaRecorder(streamRef.current)
      recorderRef.current.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data)
      }
      recorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        void uploadBlob(blob)
      }
      recorderRef.current.start()
      gs.setMicState('listening')
      stopTimerRef.current = setTimeout(stopRecording, MAX_DURATION_MS)
    } catch (e) {
      gs.setErrorMessage(e instanceof Error ? e.message : String(e))
      gs.setMicState('error')
    }
  }

  const onPress = () => {
    if (gs.gs.micState === 'idle' || gs.gs.micState === 'error') {
      void startRecording()
    } else if (gs.gs.micState === 'listening') {
      stopRecording()
    }
  }

  const uploadMockBlob = (keyword: string) => {
    const blob = new Blob([keyword], { type: 'audio/webm' }) as Blob & {
      __keyword?: string
    }
    blob.__keyword = keyword
    return uploadBlob(blob)
  }

  return { onPress, startRecording, stopRecording, uploadMockBlob }
}
