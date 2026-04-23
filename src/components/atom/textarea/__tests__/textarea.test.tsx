import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from '../textarea'

describe('Textarea', () => {
  it('accepts typing', async () => {
    render(<Textarea aria-label="t" />)
    const el = screen.getByRole('textbox')
    await userEvent.type(el, 'abc')
    expect((el as HTMLTextAreaElement).value).toBe('abc')
  })

  it('sets aria-invalid on invalid', () => {
    render(<Textarea aria-label="t" invalid />)
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
  })
})
