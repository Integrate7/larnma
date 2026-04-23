import { render, screen } from '@testing-library/react'
import { Stepper } from '../stepper'

describe('Stepper', () => {
  it('renders label', () => {
    render(<Stepper current={2} total={5} label="step 2 of 5" />)
    expect(screen.getByText('step 2 of 5')).toBeInTheDocument()
  })

  it('sets value and max attributes', () => {
    render(<Stepper current={3} total={6} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('value', '3')
    expect(bar).toHaveAttribute('max', '6')
  })

  it('renders progress bar with clamped high value', () => {
    render(<Stepper current={10} total={5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('max', '5')
  })

  it('renders progress bar with clamped low value', () => {
    render(<Stepper current={-1} total={5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('max', '5')
  })
})
