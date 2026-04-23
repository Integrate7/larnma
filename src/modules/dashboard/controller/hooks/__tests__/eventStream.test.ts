import { act, renderHook } from '@testing-library/react'
import { useDashboardGlobalState } from '../globalState'
import { useDashboardEventStream } from '../eventStream'

type MockESHandlers = {
  onopen?: () => void
  onerror?: () => void
  onmessage?: (e: { data: string }) => void
}

class MockEventSource {
  static instances: MockEventSource[] = []
  handlers: MockESHandlers = {}
  closed = false
  constructor(public url: string, _opts?: unknown) {
    MockEventSource.instances.push(this)
  }
  set onopen(fn: () => void) { this.handlers.onopen = fn }
  set onerror(fn: () => void) { this.handlers.onerror = fn }
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
    const gs = useDashboardGlobalState()
    useDashboardEventStream(gs)
    return gs
  })
}

describe('useDashboardEventStream', () => {
  afterEach(() => { uninstallES() })

  it('sets connecting=false when EventSource not available', () => {
    uninstallES()
    const { result } = renderStream()
    expect(result.current.state.connecting).toBe(false)
  })

  it('opens EventSource and sets connecting=true', () => {
    installES()
    const { result } = renderStream()
    expect(MockEventSource.instances.length).toBe(1)
    expect(result.current.state.connecting).toBe(true)
  })

  it('registers onopen handler on the EventSource', () => {
    installES()
    renderStream()
    expect(typeof MockEventSource.instances[0].handlers.onopen).toBe('function')
  })

  it('registers onerror handler on the EventSource', () => {
    installES()
    renderStream()
    expect(typeof MockEventSource.instances[0].handlers.onerror).toBe('function')
  })

  it('prepends audio event on audio message', () => {
    installES()
    const { result } = renderStream()
    act(() => {
      MockEventSource.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'audio', event: { id: 'ev1', mood: 'HUNGRY' } }),
      })
    })
    expect(result.current.state.events).toHaveLength(1)
  })

  it('prepends notification on notification message', () => {
    installES()
    const { result } = renderStream()
    act(() => {
      MockEventSource.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'notification', notification: { id: 'n1', priority: 'critical' } }),
      })
    })
    expect(result.current.state.notifications).toHaveLength(1)
  })

  it('updates order status on order message', () => {
    installES()
    const { result } = renderStream()
    act(() => {
      MockEventSource.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'order', orderId: 'o1', status: 'delivered' }),
      })
    })
    expect(result.current.state.orderStatuses['o1']).toBe('delivered')
  })

  it('ignores malformed JSON messages', () => {
    installES()
    const { result } = renderStream()
    act(() => {
      MockEventSource.instances[0].handlers.onmessage?.({ data: 'not json' })
    })
    expect(result.current.state.events).toHaveLength(0)
  })

  it('closes EventSource on unmount', () => {
    installES()
    const { unmount } = renderStream()
    const es = MockEventSource.instances[0]
    unmount()
    expect(es.closed).toBe(true)
  })
})
