import { render, screen } from '@testing-library/react'
import { Label } from '../label'

describe('Label', () => {
  it('renders children', () => {
    render(<Label>phone</Label>)
    expect(screen.getByText('phone')).toBeInTheDocument()
  })

  it('associates with input via htmlFor', () => {
    render(
      <div>
        <Label htmlFor="x">L</Label>
        <input id="x" />
      </div>,
    )
    const label = screen.getByText('L')
    expect(label).toHaveAttribute('for', 'x')
  })
})
