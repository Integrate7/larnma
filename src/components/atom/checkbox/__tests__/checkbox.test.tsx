import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '../checkbox'

describe('Checkbox', () => {
  it('renders', () => {
    render(<Checkbox aria-label="agree" />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('toggles on click', async () => {
    const onCheckedChange = jest.fn()
    render(<Checkbox aria-label="x" onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('respects disabled', async () => {
    const onCheckedChange = jest.fn()
    render(<Checkbox aria-label="x" disabled onCheckedChange={onCheckedChange} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
