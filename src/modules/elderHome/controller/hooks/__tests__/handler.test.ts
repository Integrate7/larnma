import { act, renderHook, waitFor } from '@testing-library/react'
import { useElderHomeGlobalState } from '../globalState'
import { useElderHomeHandler } from '../handler'

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response)
}

function setupMediaMocks() {
  const stopTrack = jest.fn()
  const track = { stop: stopTrack }
  const stream: MediaStream = {
    getTracks: () => [track],
  } as unknown as MediaStream
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue(stream),
    },
  })
  class MockRecorder {
    static lastInstance: MockRecorder | null = null
    ondataavailable: ((e: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    constructor() {
      MockRecorder.lastInstance = this
    }
    start() {}
    stop() {
      this.ondataavailable?.({ data: new Blob(['d'], { type: 'audio/webm' }) })
      this.onstop?.()
    }
  }
  ;(global as unknown as { MediaRecorder: typeof MockRecorder }).MediaRecorder =
    MockRecorder
  return { track, stopTrack, MockRecorder }
}

function renderAll() {
  return renderHook(() => {
    const gs = useElderHomeGlobalState()
    const handler = useElderHomeHandler(gs, { current: () => {} })
    return { gs, handler }
  })
}

type AudioCtxState = {
  closed: boolean
  tick?: () => void
  rms: number
}

function installAudioCtx(): AudioCtxState {
  const state: AudioCtxState = { closed: false, rms: 0 }
  class MockAudioContext {
    close() {
      state.closed = true
      return Promise.resolve()
    }
    createMediaStreamSource() {
      return { connect: () => {} }
    }
    createAnalyser() {
      return {
        fftSize: 2048,
        getByteTimeDomainData: (buf: Uint8Array) => {
          const amp = Math.round(state.rms * 128)
          for (let i = 0; i < buf.length; i++) {
            buf[i] = 128 + (i % 2 === 0 ? amp : -amp)
          }
        },
      }
    }
  }
  ;(
    window as unknown as { AudioContext: typeof MockAudioContext }
  ).AudioContext = MockAudioContext
  ;(
    window as unknown as { requestAnimationFrame: (cb: () => void) => number }
  ).requestAnimationFrame = (cb: () => void) => {
    state.tick = cb
    return 1
  }
  ;(
    window as unknown as { cancelAnimationFrame: (id: number) => void }
  ).cancelAnimationFrame = () => {}
  return state
}

function uninstallAudioCtx() {
  ;(window as unknown as { AudioContext?: unknown }).AudioContext = undefined
}

describe('useElderHomeHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    uninstallAudioCtx()
  })

  it('startRecording → listening state', async () => {
    setupMediaMocks()
    const { result } = renderAll()
    await act(async () => {
      await result.current.handler.startRecording()
    })
    expect(result.current.gs.gs.micState).toBe('listening')
  })

  it('startRecording surfaces error on permission denied', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: jest
          .fn()
          .mockRejectedValue(new Error('permission denied')),
      },
    })
    const { result } = renderAll()
    await act(async () => {
      await result.current.handler.startRecording()
    })
    expect(result.current.gs.gs.micState).toBe('error')
    expect(result.current.gs.gs.errorMessage).toBe('permission denied')
  })

  it('stopRecording triggers upload which sets done', async () => {
    setupMediaMocks()
    mockFetch(200, {
      eventId: 'E',
      transcript: 'หิว',
      mood: 'HUNGRY',
      intent: 'HUNGRY',
      summary: 'ผู้สูงอายุหิว',
    })
    const { result } = renderAll()
    await act(async () => {
      await result.current.handler.startRecording()
    })
    act(() => result.current.handler.stopRecording())
    await waitFor(() => {
      expect(result.current.gs.gs.micState).toBe('done')
    })
    expect(result.current.gs.gs.lastResult?.mood).toBe('HUNGRY')
  })

  it('upload error sets error state', async () => {
    mockFetch(500, { error: 'x' })
    const { result } = renderAll()
    await act(async () => {
      await result.current.handler.uploadMockBlob('หิว')
    })
    expect(result.current.gs.gs.micState).toBe('error')
    expect(result.current.gs.gs.errorMessage).toContain('500')
  })

  it('VAD auto-stops after sustained silence', async () => {
    setupMediaMocks()
    const audio = installAudioCtx()
    mockFetch(200, {
      eventId: 'E',
      transcript: 'หิว',
      mood: 'HUNGRY',
      intent: 'HUNGRY',
      summary: 'ผู้สูงอายุหิว',
    })
    let now = 1_000_000
    const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now)
    const { result } = renderAll()
    await act(async () => {
      await result.current.handler.startRecording()
    })
    expect(result.current.gs.gs.micState).toBe('listening')

    await act(async () => {
      audio.rms = 0.1
      audio.tick?.()
      audio.rms = 0
      now += 2000
      audio.tick?.()
    })
    await waitFor(() => {
      expect(result.current.gs.gs.micState).toBe('done')
    })
    expect(audio.closed).toBe(true)
    dateSpy.mockRestore()
  })

  it('onPress toggles start/stop lifecycle', async () => {
    setupMediaMocks()
    mockFetch(200, {
      eventId: 'E',
      transcript: '',
      mood: 'NORMAL',
      intent: 'CHAT',
      summary: '',
    })
    const { result } = renderAll()
    await act(async () => {
      result.current.handler.onPress()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(result.current.gs.gs.micState).toBe('listening')
    act(() => result.current.handler.onPress())
    await waitFor(() => {
      expect(result.current.gs.gs.micState).toBe('done')
    })
  })
})
