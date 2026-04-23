import { useCallback, useEffect, useRef, useState } from 'react'
import type { useElderHomeGlobalState } from './globalState'

type GS = ReturnType<typeof useElderHomeGlobalState>

const KEYWORD_RE = /หลาน\s*รัก|ลานรัก/

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
  const srRef = useRef<SRLike | null>(null)
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

  // Call this before getUserMedia to release the mic immediately
  const stopImmediate = useCallback(() => {
    const r = srRef.current
    if (!r) return
    srRef.current = null
    try { r.stop() } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!shouldListen) return
    const Ctor = getSRCtor()
    if (!Ctor) return
    const rec = new Ctor()
    srRef.current = rec
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'th-TH'
    rec.maxAlternatives = 1

    rec.onstart = () => { console.log('[WakeWord] onstart (th-TH)') }
    rec.onaudiostart = () => { console.log('[WakeWord] onaudiostart (mic capturing)') }
    rec.onsoundstart = () => { console.log('[WakeWord] onsoundstart') }
    rec.onspeechstart = () => { console.log('[WakeWord] onspeechstart') }
    rec.onspeechend = () => { console.log('[WakeWord] onspeechend') }
    rec.onnomatch = () => { console.log('[WakeWord] onnomatch') }
    rec.onresult = (e: SREvent) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript
        const isFinal = e.results[i].isFinal
        console.log('[WakeWord] heard:', JSON.stringify(text), isFinal ? '(final)' : '(interim)')
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
      // If stopped externally (srRef cleared) or by cleanup, don't restart
      if (srRef.current !== rec) return
      console.log('[WakeWord] onend — restarting')
      try { rec.start() } catch (err) { console.warn('[WakeWord] restart failed:', err) }
    }

    try {
      rec.start()
      setMicState('wakeListening')
    } catch (err) {
      console.warn('[WakeWord] start() threw:', err)
    }

    return () => {
      srRef.current = null
      try { rec.stop() } catch { /* ignore */ }
    }
  }, [shouldListen, setMicState])

  return { supported, stopImmediate }
}
