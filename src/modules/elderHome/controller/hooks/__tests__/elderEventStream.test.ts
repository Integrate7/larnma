import { act, renderHook } from '@testing-library/react'
import { useElderHomeGlobalState } from '../globalState'
import { useElderEventStream } from '../elderEventStream'

type MockESHandlers = {
  onmessage?: (e: { data: string }) => void
}

class MockEventSource {
  static instances: MockEventSource[] = []
  handlers: MockESHandlers = {}
  closed = false
  constructor(public url: string, _opts?: unknown) {
    MockEventSource.instances.push(this)
  }
  set onmessage(fn: (e: { data: string }) => void) { this.handlers.onmessage = fn }
  close() { this.closed = true }
}

function installES() {
  ;(window as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource
  MockEventSource.instances = []
}

function uninstallES() {
  ;(window as unknown as { EventSource?: unknown }).EventSource = undefined
}

function renderStream() {
  return renderHook(() => {
    const gs = useElderHomeGlobalState()
    useElderEventStream(gs)
    return gs
  })
}

describe('useElderEventStream', () => {
  afterEach(() => { uninstallES() })

  it('does not start when EventSource not available', () => {
    uninstallES()
    renderStream()
    expect(MockEventSource.instances).toHaveLength(0)
  })

  it('opens EventSource to elder events stream', () => {
    installES()
    renderStream()
    expect(MockEventSource.instances).toHaveLength(1)
    expect(MockEventSource.instances[0].url).toBe('/api/elder/events/stream')
  })

  it('sets order notification on order_delivered message', () => {
    installES()
    const { result } = renderStream()
    act(() => {
      MockEventSource.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'order_delivered', menuName: 'ข้าวผัด', caregiverName: 'หลาน' }),
      })
    })
    expect(result.current.gs.orderNotification).toEqual({ menuName: 'ข้าวผัด', caregiverName: 'หลาน' })
  })

  it('ignores non-order_delivered messages', () => {
    installES()
    const { result } = renderStream()
    act(() => {
      MockEventSource.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'heartbeat' }),
      })
    })
    expect(result.current.gs.orderNotification).toBeNull()
  })

  it('ignores order_delivered without menuName', () => {
    installES()
    const { result } = renderStream()
    act(() => {
      MockEventSource.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'order_delivered' }),
      })
    })
    expect(result.current.gs.orderNotification).toBeNull()
  })

  it('ignores malformed JSON', () => {
    installES()
    const { result } = renderStream()
    act(() => {
      MockEventSource.instances[0].handlers.onmessage?.({ data: 'not-json' })
    })
    expect(result.current.gs.orderNotification).toBeNull()
  })

  it('uses default caregiverName หลาน when not provided', () => {
    installES()
    const { result } = renderStream()
    act(() => {
      MockEventSource.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'order_delivered', menuName: 'ต้มยำ' }),
      })
    })
    expect(result.current.gs.orderNotification?.caregiverName).toBe('หลาน')
  })

  it('closes EventSource on unmount', () => {
    installES()
    const { unmount } = renderStream()
    const es = MockEventSource.instances[0]
    unmount()
    expect(es.closed).toBe(true)
  })
})
