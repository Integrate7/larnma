import { useEffect, useRef, useState } from 'react'
import type { useElderHomeGlobalState } from './globalState'

type GS = ReturnType<typeof useElderHomeGlobalState>

const KEYWORD_RE = /หลาน\s*ม่า|หลานมา|หลานม้า/

type SRResult = { 0: { transcript: string }; isFinal: boolean }
type SREvent = { resultIndex: number; results: ArrayLike<SRResult> }
type SRErrorEvent = { error?: string; message?: string }
type SRLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives?: number
  onresult: ((e: SREvent) => void) | null
  onerror: ((e: SRErrorEvent) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  onaudiostart: (() => void) | null
  onsoundstart: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  onnomatch: (() => void) | null
  start: () => void
  stop: () => void
}
type SRCtor = new () => SRLike

type WindowWithSR = Window & {
  SpeechRecognition?: SRCtor
  webkitSpeechRecognition?: SRCtor
}

function getSRCtor(): SRCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as WindowWithSR
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function useWakeWord(gs: GS, onWake: () => void) {
  const onWakeRef = useRef(onWake)
  onWakeRef.current = onWake
  const [supported] = useState<boolean>(() => {
    const ok = !!getSRCtor()
    if (typeof window !== 'undefined') {
      console.log(
        '[WakeWord] SpeechRecognition supported:',
        ok,
        ok ? '' : '(Firefox/iOS may not support, fallback to tap)',
      )
    }
    return ok
  })
  const { setMicState } = gs
  const { micState } = gs.gs

  const shouldListen =
    supported && (micState === 'idle' || micState === 'wakeListening')

  useEffect(() => {
    if (!shouldListen) return
    const Ctor = getSRCtor()
    if (!Ctor) return
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'th-TH'
    rec.maxAlternatives = 1

    let stopped = false

    rec.onstart = () => {
      console.log('[WakeWord] onstart (th-TH)')
    }
    rec.onaudiostart = () => {
      console.log('[WakeWord] onaudiostart (mic capturing)')
    }
    rec.onsoundstart = () => {
      console.log('[WakeWord] onsoundstart (sound detected)')
    }
    rec.onspeechstart = () => {
      console.log('[WakeWord] onspeechstart (speech detected)')
    }
    rec.onspeechend = () => {
      console.log('[WakeWord] onspeechend')
    }
    rec.onnomatch = () => {
      console.log('[WakeWord] onnomatch (could not transcribe)')
    }
    rec.onresult = (e: SREvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript
        const isFinal = e.results[i].isFinal
        console.log(
          '[WakeWord] heard:',
          JSON.stringify(text),
          isFinal ? '(final)' : '(interim)',
        )
        if (KEYWORD_RE.test(text)) {
          console.log('[WakeWord] ✓ keyword matched → triggering onWake')
          onWakeRef.current()
          break
        }
      }
    }
    rec.onerror = (e: SRErrorEvent) => {
      console.warn('[WakeWord] error:', e?.error ?? e?.message ?? e)
    }
    rec.onend = () => {
      console.log('[WakeWord] onend — stopped?', stopped)
      if (stopped) return
      try {
        rec.start()
      } catch (err) {
        console.warn('[WakeWord] restart failed:', err)
      }
    }

    try {
      rec.start()
      setMicState('wakeListening')
    } catch (err) {
      console.warn('[WakeWord] start() threw:', err)
    }

    return () => {
      stopped = true
      try {
        rec.stop()
      } catch {
        // ignore
      }
    }
  }, [shouldListen, setMicState])

  return { supported }
}
