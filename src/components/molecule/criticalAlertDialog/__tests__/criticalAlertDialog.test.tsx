/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CriticalAlertDialog } from '../criticalAlertDialog'
import type { CriticalAlertCase } from '@/modules/dashboard/types'

const aCase = (over: Partial<CriticalAlertCase> = {}): CriticalAlertCase => ({
  id: over.id ?? 'N1',
  eventId: over.eventId ?? 'E1',
  priority: over.priority ?? 'critical',
  transcript: over.transcript ?? 'ตกบันได',
  summary: over.summary ?? 'คุณยายตกบันได',
  createdAt: over.createdAt ?? '2026-04-24T05:00:00.000Z',
})

const noopHandlers = {
  onCallElder: jest.fn(),
  onCall1669: jest.fn(),
  onClose: jest.fn(),
}

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof CriticalAlertDialog>> = {},
) {
  const props = {
    open: true,
    cases: [aCase()],
    tone: 'critical' as const,
    elderName: 'ย่า',
    elderPhone: '0812345678',
    ...noopHandlers,
    ...overrides,
  }
  return render(<CriticalAlertDialog {...props} />)
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('CriticalAlertDialog — rendering', () => {
  it('renders the critical title when tone=critical', () => {
    renderDialog({ tone: 'critical' })
    expect(screen.getByText(/titleCritical/)).toBeInTheDocument()
  })

  it('renders the high title when tone=high', () => {
    renderDialog({ tone: 'high', cases: [aCase({ priority: 'high' })] })
    expect(screen.getByText(/titleHigh/)).toBeInTheDocument()
  })

  it('renders the 1669 button as primary (destructive) when tone=critical', () => {
    renderDialog({ tone: 'critical' })
    const btn = screen.getByRole('button', { name: /call1669/ })
    expect(btn.dataset.variant).toBe('destructive')
  })

  it('renders the elder call button as primary when tone=high', () => {
    renderDialog({ tone: 'high', cases: [aCase({ priority: 'high' })] })
    const btn = screen.getByRole('button', { name: /callElder/ })
    expect(btn.dataset.variant).toBe('default')
  })

  it('renders each case with its priority badge, transcript and summary', () => {
    renderDialog({
      cases: [
        aCase({
          id: 'N1',
          priority: 'critical',
          transcript: 'ตกบันได',
          summary: 'คุณยายตกบันได',
        }),
        aCase({
          id: 'N2',
          priority: 'high',
          transcript: 'ปวดหัว',
          summary: 'คุณยายปวดหัว',
        }),
      ],
    })
    expect(screen.getAllByText(/ตกบันได/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/คุณยายตกบันได/)).toBeInTheDocument()
    expect(screen.getAllByText(/ปวดหัว/).length).toBeGreaterThanOrEqual(1)
    const priorityBadges =
      document.querySelectorAll('[data-slot="priority-badge"]')
    expect(priorityBadges).toHaveLength(2)
  })

  it('falls back to em-dash when transcript and summary are empty', () => {
    renderDialog({
      cases: [aCase({ transcript: '', summary: '' })],
    })
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('disables the elder call button and shows a hint when elderPhone is null', () => {
    renderDialog({ elderPhone: null })
    const btn = screen.getByRole('button', { name: /callElder/ })
    expect(btn).toBeDisabled()
    expect(screen.getByText(/noElderPhone/)).toBeInTheDocument()
  })
})

describe('CriticalAlertDialog — interaction', () => {
  it('invokes onCall1669 when the 1669 button is clicked', async () => {
    const onCall1669 = jest.fn()
    renderDialog({ onCall1669 })
    await userEvent.click(screen.getByRole('button', { name: /call1669/ }))
    expect(onCall1669).toHaveBeenCalledTimes(1)
  })

  it('invokes onCallElder when the elder-call button is clicked', async () => {
    const onCallElder = jest.fn()
    renderDialog({ onCallElder })
    await userEvent.click(screen.getByRole('button', { name: /callElder/ }))
    expect(onCallElder).toHaveBeenCalledTimes(1)
  })

  it('invokes onClose when the close button is clicked', async () => {
    const onClose = jest.fn()
    renderDialog({ onClose })
    await userEvent.click(screen.getByRole('button', { name: /close/ }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not render when open=false', () => {
    renderDialog({ open: false })
    expect(screen.queryByText(/titleCritical/)).not.toBeInTheDocument()
  })

  it('invokes onClose when Escape triggers the dialog onOpenChange', async () => {
    const onClose = jest.fn()
    renderDialog({ onClose })
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
