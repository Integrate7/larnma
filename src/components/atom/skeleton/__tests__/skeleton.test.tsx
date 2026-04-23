import { render } from '@testing-library/react'
import { Skeleton } from '../skeleton'

describe('Skeleton', () => {
  it('renders with animate-pulse', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveClass('animate-pulse')
  })

  it('merges className', () => {
    const { container } = render(<Skeleton className="h-4" />)
    expect(container.firstChild).toHaveClass('h-4')
  })
})
