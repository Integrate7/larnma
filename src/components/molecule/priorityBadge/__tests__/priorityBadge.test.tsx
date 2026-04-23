import { render, screen } from '@testing-library/react'
import { PriorityBadge } from '../priorityBadge'

describe('PriorityBadge', () => {
  it('renders critical label', () => {
    render(<PriorityBadge priority="critical" />)
    expect(screen.getByText(/ฉุกเฉิน/)).toBeInTheDocument()
  })

  it('renders high label', () => {
    render(<PriorityBadge priority="high" />)
    expect(screen.getByText(/สำคัญ/)).toBeInTheDocument()
  })

  it('renders normal label', () => {
    render(<PriorityBadge priority="normal" />)
    expect(screen.getByText(/ปกติ/)).toBeInTheDocument()
  })

  it('renders log label', () => {
    render(<PriorityBadge priority="log" />)
    expect(screen.getByText(/บันทึก/)).toBeInTheDocument()
  })
})
