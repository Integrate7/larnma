import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../input'

describe('Input', () => {
  it('types text', async () => {
    const onChange = jest.fn()
    render(<Input onChange={onChange} placeholder="phone" />)
    const el = screen.getByPlaceholderText('phone')
    await userEvent.type(el, '123')
    expect(onChange).toHaveBeenCalled()
    expect((el as HTMLInputElement).value).toBe('123')
  })

  it('renders with invalid aria', () => {
    render(<Input invalid placeholder="x" />)
    expect(screen.getByPlaceholderText('x')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('default type is text', () => {
    render(<Input placeholder="x" />)
    expect(screen.getByPlaceholderText('x')).toHaveAttribute('type', 'text')
  })

  it('passes through type', () => {
    render(<Input type="tel" placeholder="x" />)
    expect(screen.getByPlaceholderText('x')).toHaveAttribute('type', 'tel')
  })

  it('forwards ref', () => {
    let ref: HTMLInputElement | null = null
    render(
      <Input
        ref={(el) => {
          ref = el
        }}
        placeholder="x"
      />,
    )
    expect(ref).not.toBeNull()
  })
})
