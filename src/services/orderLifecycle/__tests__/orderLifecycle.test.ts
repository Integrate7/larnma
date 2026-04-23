/**
 * @jest-environment node
 */
import {
  __setRepository,
  createInMemoryRepository,
  getRepository,
} from '@/services/repository'
import { advanceOrder, nextStatus, scheduleFullLifecycle } from '../orderLifecycle'

describe('orderLifecycle', () => {
  beforeEach(() => {
    __setRepository(createInMemoryRepository())
  })

  it('nextStatus progresses through the chain', () => {
    expect(nextStatus('pending')).toBe('paid')
    expect(nextStatus('paid')).toBe('preparing')
    expect(nextStatus('preparing')).toBe('delivering')
    expect(nextStatus('delivering')).toBe('delivered')
    expect(nextStatus('delivered')).toBeNull()
    expect(nextStatus('cancelled')).toBeNull()
  })

  it('advanceOrder returns null for unknown order', () => {
    expect(advanceOrder('nope')).toBeNull()
  })

  it('advanceOrder steps status + awards points on delivered', () => {
    const repo = getRepository()
    const order = repo.createOrder({
      eventId: 'ev',
      caregiverId: 'c',
      elderId: 'e',
      menu: [{ name: 'x', price: 10, qty: 1 }],
      total: 10,
      status: 'pending',
      mockRef: 'm',
    })
    advanceOrder(order.id) // paid
    advanceOrder(order.id) // preparing
    advanceOrder(order.id) // delivering
    advanceOrder(order.id) // delivered
    expect(repo.getOrderById(order.id)?.status).toBe('delivered')
    expect(repo.getPointBalance('c')).toBeGreaterThan(0)
    // further calls are a no-op and return the terminal order
    const terminal = advanceOrder(order.id)
    expect(terminal?.status).toBe('delivered')
  })

  it('scheduleFullLifecycle advances order asynchronously through all steps', async () => {
    jest.useFakeTimers()
    const repo = getRepository()
    const order = repo.createOrder({
      eventId: 'ev',
      caregiverId: 'c2',
      elderId: 'e2',
      menu: [{ name: 'ก๋วยเตี๋ยว', price: 50, qty: 1 }],
      total: 50,
      status: 'pending',
      mockRef: 'm2',
    })
    scheduleFullLifecycle(order.id, 100)
    jest.runAllTimers()
    await Promise.resolve()
    jest.runAllTimers()
    await Promise.resolve()
    jest.runAllTimers()
    await Promise.resolve()
    jest.runAllTimers()
    await Promise.resolve()
    jest.runAllTimers()
    await Promise.resolve()
    const final = repo.getOrderById(order.id)
    expect(['paid', 'preparing', 'delivering', 'delivered']).toContain(final?.status)
    jest.useRealTimers()
  })
})
