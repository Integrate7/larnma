import { render, screen } from '@testing-library/react'
import { MoodChip } from '../moodChip'

describe('MoodChip', () => {
  it('renders Thai label for each mood', () => {
    const { rerender } = render(<MoodChip mood="DANGER" />)
    expect(screen.getByText('ฉุกเฉิน')).toBeInTheDocument()

    rerender(<MoodChip mood="HUNGRY" />)
    expect(screen.getByText('หิว')).toBeInTheDocument()

    rerender(<MoodChip mood="HAPPY" />)
    expect(screen.getByText('อารมณ์ดี')).toBeInTheDocument()
  })

  it('renders custom label when provided', () => {
    render(<MoodChip mood="HAPPY" label="OK" />)
    expect(screen.getByText('OK')).toBeInTheDocument()
  })

  it('applies mood color class', () => {
    render(<MoodChip mood="DANGER" />)
    expect(screen.getByText('ฉุกเฉิน').className).toContain('bg-mood-danger')
  })
})
