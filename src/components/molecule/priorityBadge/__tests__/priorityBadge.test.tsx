import { render, screen } from '@testing-library/react'
import { PriorityBadge } from '../priorityBadge'

describe('PriorityBadge', () => {
  it('renders critical label with dot prefix', () => {
    const { container } = render(<PriorityBadge priority="critical" />)
    expect(screen.getByText(/CRITICAL/)).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).dataset.priority).toBe(
      'critical',
    )
    expect(container.textContent).toContain('●')
  })

  it('renders high label', () => {
    const { container } = render(<PriorityBadge priority="high" />)
    expect(screen.getByText(/HIGH/)).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).dataset.priority).toBe('high')
  })

  it('renders normal label', () => {
    const { container } = render(<PriorityBadge priority="normal" />)
    expect(screen.getByText(/NORMAL/)).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).dataset.priority).toBe(
      'normal',
    )
  })

  it('renders log label', () => {
    const { container } = render(<PriorityBadge priority="log" />)
    expect(screen.getByText(/LOG/)).toBeInTheDocument()
    expect((container.firstChild as HTMLElement).dataset.priority).toBe('log')
  })
})
