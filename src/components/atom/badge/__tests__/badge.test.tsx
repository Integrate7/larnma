import { render, screen } from '@testing-library/react'
import { Badge } from '../badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>hi</Badge>)
    expect(screen.getByText('hi')).toBeInTheDocument()
  })

  it('applies variant', () => {
    render(<Badge variant="destructive">x</Badge>)
    expect(screen.getByText('x').className).toContain('bg-destructive')
  })

  it('applies outline variant', () => {
    render(<Badge variant="outline">y</Badge>)
    expect(screen.getByText('y').className).toContain('text-foreground')
  })

  it('applies secondary variant', () => {
    render(<Badge variant="secondary">z</Badge>)
    expect(screen.getByText('z').className).toContain('bg-secondary')
  })
})
