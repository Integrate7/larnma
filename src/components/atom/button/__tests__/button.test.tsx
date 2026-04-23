import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>click me</Button>)
    expect(screen.getByRole('button', { name: 'click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn()
    render(<Button onClick={onClick}>go</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalled()
  })

  it('is disabled when loading', () => {
    render(<Button loading>go</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('respects disabled prop', () => {
    render(<Button disabled>go</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders as child via asChild', () => {
    render(
      <Button asChild>
        <a href="/x">link</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'link' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/x')
  })

  it('applies variant class', () => {
    render(<Button variant="destructive">x</Button>)
    expect(screen.getByRole('button').className).toContain('bg-destructive')
  })

  it('applies size class', () => {
    render(<Button size="xl">x</Button>)
    expect(screen.getByRole('button').className).toContain('h-14')
  })
})
