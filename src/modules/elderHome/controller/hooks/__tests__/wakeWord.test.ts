import { act, renderHook } from '@testing-library/react'
import { useElderHomeGlobalState } from '../globalState'
import { useWakeWord } from '../wakeWord'

type Handlers = {
  onresult?: (e: unknown) => void
  onerror?: () => void
  onend?: () => void
}

class MockSR {
  static instances: MockSR[] = []
  continuous = false
  interimResults = false
  lang = ''
  handlers: Handlers = {}
  started = false
  stopped = false
  constructor() {
    MockSR.instances.push(this)
  }
  set onresult(fn: (e: unknown) => void) {
    this.handlers.onresult = fn
  }
  set onerror(fn: () => void) {
    this.handlers.onerror = fn
  }
  set onend(fn: () => void) {
    this.handlers.onend = fn
  }
  start() {
    this.started = true
  }
  stop() {
    this.stopped = true
  }
  fireResult(transcript: string) {
    this.handlers.onresult?.({
      resultIndex: 0,
      results: [{ 0: { transcript }, isFinal: true }],
    })
  }
}

function installSR() {
  ;(
    window as unknown as { SpeechRecognition: typeof MockSR }
  ).SpeechRecognition = MockSR
  MockSR.instances = []
}

function uninstallSR() {
  ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition =
    undefined
  ;(
    window as unknown as { webkitSpeechRecognition?: unknown }
  ).webkitSpeechRecognition = undefined
}

function renderWake(onWake: () => void) {
  return renderHook(() => {
    const gs = useElderHomeGlobalState()
    const wake = useWakeWord(gs, onWake)
    return { gs, wake }
  })
}

describe('useWakeWord', () => {
  afterEach(() => {
    uninstallSR()
  })

  it('unsupported when SpeechRecognition missing', () => {
    uninstallSR()
    const { result } = renderWake(() => {})
    expect(result.current.wake.supported).toBe(false)
    expect(result.current.gs.gs.micState).toBe('idle')
  })

  it('sets state to wakeListening and starts recognition when supported', () => {
    installSR()
    const { result } = renderWake(() => {})
    expect(result.current.wake.supported).toBe(true)
    expect(MockSR.instances.length).toBe(1)
    expect(MockSR.instances[0].started).toBe(true)
    expect(result.current.gs.gs.micState).toBe('wakeListening')
  })

  it('fires onWake when transcript contains "หลานรัก"', () => {
    installSR()
    const onWake = jest.fn()
    renderWake(onWake)
    act(() => {
      MockSR.instances[0].fireResult('หลานรัก ช่วยหน่อย')
    })
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('ignores transcripts without keyword', () => {
    installSR()
    const onWake = jest.fn()
    renderWake(onWake)
    act(() => {
      MockSR.instances[0].fireResult('สวัสดีครับ')
    })
    expect(onWake).not.toHaveBeenCalled()
  })

  it('stops recognition when micState leaves idle/wakeListening', () => {
    installSR()
    const { result } = renderWake(() => {})
    const rec = MockSR.instances[0]
    act(() => {
      result.current.gs.setMicState('listening')
    })
    expect(rec.stopped).toBe(true)
  })
})
