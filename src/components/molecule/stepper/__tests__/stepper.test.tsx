import { render, screen } from '@testing-library/react'
import { Stepper } from '../stepper'

describe('Stepper', () => {
  it('renders label', () => {
    render(<Stepper current={2} total={5} label="step 2 of 5" />)
    expect(screen.getByText('step 2 of 5')).toBeInTheDocument()
  })

  it('sets aria-valuenow and aria-valuemax', () => {
    render(<Stepper current={3} total={6} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '6')
  })

  it('clamps percentage at 100', () => {
    render(<Stepper current={10} total={5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('style')).toContain('width: 100%')
  })

  it('clamps percentage at 0', () => {
    render(<Stepper current={-1} total={5} />)
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('style')).toContain('width: 0%')
  })
})
