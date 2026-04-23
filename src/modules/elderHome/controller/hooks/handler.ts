import { useRef } from 'react'
import type { AudioUploadResult } from '../../types'
import type { useElderHomeGlobalState } from './globalState'

type GS = ReturnType<typeof useElderHomeGlobalState>

const MAX_DURATION_MS = 30_000
const SILENCE_THRESHOLD = 0.02
const SILENCE_DURATION_MS = 1500

type WindowWithWebkitAudio = Window & {
  webkitAudioContext?: typeof AudioContext
}

export function useElderHomeHandler(gs: GS) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const vadRafRef = useRef<number | null>(null)

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

  const stopVAD = () => {
    if (vadRafRef.current !== null) {
      cancelAnimationFrame(vadRafRef.current)
      vadRafRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
  }

  const startVAD = (stream: MediaStream) => {
    const w = window as WindowWithWebkitAudio
    const AC = window.AudioContext ?? w.webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    audioCtxRef.current = ctx
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    src.connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)
    let silenceStart = Date.now()
    let hasSpoken = false

    const tick = () => {
      if (!audioCtxRef.current) return
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128
        sum += v * v
      }
      const rms = Math.sqrt(sum / buf.length)
      const now = Date.now()
      if (rms > SILENCE_THRESHOLD) {
        silenceStart = now
        hasSpoken = true
      }
      if (hasSpoken && now - silenceStart > SILENCE_DURATION_MS) {
        stopRecording()
        return
      }
      vadRafRef.current = requestAnimationFrame(tick)
    }
    vadRafRef.current = requestAnimationFrame(tick)
  }

  const stopRecording = () => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current)
      stopTimerRef.current = null
    }
    stopVAD()
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
      startVAD(streamRef.current)
    } catch (e) {
      gs.setErrorMessage(e instanceof Error ? e.message : String(e))
      gs.setMicState('error')
    }
  }

  const onPress = () => {
    const s = gs.gs.micState
    if (s === 'idle' || s === 'wakeListening' || s === 'error') {
      void startRecording()
    } else if (s === 'listening') {
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
