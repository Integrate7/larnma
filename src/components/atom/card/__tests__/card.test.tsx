import { render, screen } from '@testing-library/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../card'

describe('Card', () => {
  it('renders all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>title</CardTitle>
          <CardDescription>desc</CardDescription>
        </CardHeader>
        <CardContent>content</CardContent>
        <CardFooter>footer</CardFooter>
      </Card>,
    )
    expect(screen.getByText('title')).toBeInTheDocument()
    expect(screen.getByText('desc')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.getByText('footer')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<Card className="x-class">b</Card>)
    expect(container.firstChild).toHaveClass('x-class')
  })

  it('applies accent="log" with green left border', () => {
    const { container } = render(<Card accent="log">l</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.dataset.accent).toBe('log')
    expect(el.className).toContain('border-l-[3px]')
  })

  it('applies accent="normal" with brand left border', () => {
    const { container } = render(<Card accent="normal">n</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.dataset.accent).toBe('normal')
  })

  it('applies accent="crit" with danger wash background', () => {
    const { container } = render(<Card accent="crit">c</Card>)
    const el = container.firstChild as HTMLElement
    expect(el.dataset.accent).toBe('crit')
  })
})
