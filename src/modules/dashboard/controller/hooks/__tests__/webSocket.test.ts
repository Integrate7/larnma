import { act, renderHook } from '@testing-library/react'
import { useDashboardGlobalState } from '../globalState'
import { useDashboardWebSocket } from '../webSocket'

type MockWSHandlers = {
  onopen?: () => void
  onerror?: () => void
  onmessage?: (e: { data: string }) => void
}

class MockWebSocket {
  static instances: MockWebSocket[] = []
  handlers: MockWSHandlers = {}
  closed = false
  readyState = 1 // OPEN

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  set onopen(fn: () => void) { this.handlers.onopen = fn }
  set onerror(fn: () => void) { this.handlers.onerror = fn }
  set onmessage(fn: (e: { data: string }) => void) { this.handlers.onmessage = fn }
  close() { this.closed = true }
}

function installWS() {
  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
  MockWebSocket.instances = []
}

function renderStream() {
  return renderHook(() => {
    const gs = useDashboardGlobalState()
    useDashboardWebSocket(gs)
    return gs
  })
}

describe('useDashboardWebSocket', () => {
  beforeEach(() => { installWS() })
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).WebSocket
  })

  it('creates a WebSocket on mount with correct url', () => {
    renderStream()
    expect(MockWebSocket.instances.length).toBe(1)
    expect(MockWebSocket.instances[0].url).toContain('/api/events/ws')
  })

  it('sets connecting=true immediately on mount', () => {
    const { result } = renderStream()
    expect(result.current.state.connecting).toBe(true)
  })

  it('sets connecting=false on open', () => {
    const { result } = renderStream()
    act(() => { MockWebSocket.instances[0].handlers.onopen?.() })
    expect(result.current.state.connecting).toBe(false)
  })

  it('sets error on onerror', () => {
    const { result } = renderStream()
    act(() => { MockWebSocket.instances[0].handlers.onerror?.() })
    expect(result.current.state.error).toBe('ขาดการเชื่อมต่อ')
  })

  it('prepends audio event on audio message', () => {
    const { result } = renderStream()
    act(() => {
      MockWebSocket.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'audio', event: { id: 'ev1', mood: 'HUNGRY' } }),
      })
    })
    expect(result.current.state.events).toHaveLength(1)
  })

  it('prepends notification on notification message', () => {
    const { result } = renderStream()
    act(() => {
      MockWebSocket.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'notification', notification: { id: 'n1', priority: 'critical' } }),
      })
    })
    expect(result.current.state.notifications).toHaveLength(1)
  })

  it('updates order status on order message', () => {
    const { result } = renderStream()
    act(() => {
      MockWebSocket.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'order', orderId: 'o1', status: 'delivered' }),
      })
    })
    expect(result.current.state.orderStatuses['o1']).toBe('delivered')
  })

  it('ignores malformed JSON messages', () => {
    const { result } = renderStream()
    act(() => {
      MockWebSocket.instances[0].handlers.onmessage?.({ data: 'not json' })
    })
    expect(result.current.state.events).toHaveLength(0)
  })

  it('closes WebSocket on unmount', () => {
    const { unmount } = renderStream()
    const ws = MockWebSocket.instances[0]
    unmount()
    expect(ws.closed).toBe(true)
  })

  it('creates exactly one WebSocket instance (no infinite loop)', () => {
    const { result } = renderStream()
    // trigger multiple state changes that would cause re-renders
    act(() => { MockWebSocket.instances[0].handlers.onopen?.() })
    act(() => {
      MockWebSocket.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'audio', event: { id: 'ev1', mood: 'HAPPY' } }),
      })
    })
    act(() => {
      MockWebSocket.instances[0].handlers.onmessage?.({
        data: JSON.stringify({ kind: 'notification', notification: { id: 'n1', priority: 'critical' } }),
      })
    })
    expect(MockWebSocket.instances.length).toBe(1)
    expect(result.current.state.events).toHaveLength(1)
    expect(result.current.state.notifications).toHaveLength(1)
  })
})
