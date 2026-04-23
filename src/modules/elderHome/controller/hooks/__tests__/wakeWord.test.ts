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

  it('fires onWake when transcript contains "หลาน รัก" with space', () => {
    installSR()
    const onWake = jest.fn()
    renderWake(onWake)
    act(() => {
      MockSR.instances[0].fireResult('หลาน รัก ช่วยด้วย')
    })
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('stopImmediate clears srRef and stops recognition', () => {
    installSR()
    const { result } = renderWake(() => {})
    const rec = MockSR.instances[0]
    act(() => {
      result.current.wake.stopImmediate()
    })
    expect(rec.stopped).toBe(true)
  })

  it('restarts recognition on end event when still in shouldListen state', () => {
    installSR()
    renderWake(() => {})
    const rec = MockSR.instances[0]
    act(() => {
      rec.handlers.onend?.()
    })
    expect(rec.started).toBe(true)
  })

  it('does not restart on end when srRef was cleared externally', () => {
    installSR()
    const { result } = renderWake(() => {})
    act(() => {
      result.current.wake.stopImmediate()
    })
    const startCount = 1
    const rec = MockSR.instances[0]
    act(() => {
      rec.handlers.onend?.()
    })
    expect(rec.started).toBe(startCount > 0)
  })

  it('calls onerror handler without throwing', () => {
    installSR()
    renderWake(() => {})
    const rec = MockSR.instances[0]
    expect(() => {
      act(() => { rec.handlers.onerror?.() })
    }).not.toThrow()
  })

  it('uses webkitSpeechRecognition as fallback', () => {
    ;(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = undefined
    ;(window as unknown as { webkitSpeechRecognition: typeof MockSR }).webkitSpeechRecognition = MockSR
    MockSR.instances = []
    const { result } = renderWake(() => {})
    expect(result.current.wake.supported).toBe(true)
    expect(MockSR.instances.length).toBe(1)
  })

  it('cleans up recognition on unmount', () => {
    installSR()
    const { unmount } = renderWake(() => {})
    const rec = MockSR.instances[0]
    unmount()
    expect(rec.stopped).toBe(true)
  })

  it('handles start() throwing gracefully', () => {
    class ThrowSR extends MockSR {
      start() { throw new Error('mic not available') }
    }
    ;(window as unknown as { SpeechRecognition: typeof ThrowSR }).SpeechRecognition = ThrowSR
    MockSR.instances = []
    expect(() => renderWake(() => {})).not.toThrow()
  })

  it('handles onend restart throwing gracefully', () => {
    let callCount = 0
    class ThrowOnSecondStart extends MockSR {
      start() {
        callCount++
        if (callCount > 1) throw new Error('already started')
        super.start()
      }
    }
    ;(window as unknown as { SpeechRecognition: typeof ThrowOnSecondStart }).SpeechRecognition = ThrowOnSecondStart
    MockSR.instances = []
    renderWake(() => {})
    const rec = MockSR.instances[0]
    expect(() => act(() => { rec.handlers.onend?.() })).not.toThrow()
  })
})
