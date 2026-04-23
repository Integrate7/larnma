import { render, screen } from '@testing-library/react'
import { MOOD_LABEL_TH } from '@/shared/types'
import { MoodChip } from '../moodChip'

describe('MoodChip', () => {
  it('renders the Thai label for the mood', () => {
    render(<MoodChip mood="HAPPY" />)
    expect(screen.getByText(MOOD_LABEL_TH.HAPPY)).toBeInTheDocument()
  })

  it('renders Thai label for each mood', () => {
    const { rerender } = render(<MoodChip mood="DANGER" />)
    expect(screen.getByText(MOOD_LABEL_TH.DANGER)).toBeInTheDocument()

    rerender(<MoodChip mood="HUNGRY" />)
    expect(screen.getByText(MOOD_LABEL_TH.HUNGRY)).toBeInTheDocument()

    rerender(<MoodChip mood="HAPPY" />)
    expect(screen.getByText(MOOD_LABEL_TH.HAPPY)).toBeInTheDocument()
  })

  it('exposes data-mood attribute', () => {
    const { container } = render(<MoodChip mood="LONELY" />)
    expect((container.firstChild as HTMLElement).dataset.mood).toBe('LONELY')
  })

  it('uses custom label when provided', () => {
    render(<MoodChip mood="NORMAL" label="ok" />)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })
})
