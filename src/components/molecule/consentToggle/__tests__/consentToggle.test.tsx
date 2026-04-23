import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConsentToggle } from '../consentToggle'

describe('ConsentToggle', () => {
  it('fires onChange on toggle', async () => {
    const onChange = jest.fn()
    render(
      <ConsentToggle
        id="x"
        label="L"
        description="D"
        checked={false}
        onChange={onChange}
      />,
    )
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('shows required marker', () => {
    render(
      <ConsentToggle
        id="x"
        label="L"
        required
        checked={false}
        onChange={() => {}}
      />,
    )
    expect(screen.getByText(/จำเป็น/)).toBeInTheDocument()
  })

  it('hides required marker when optional', () => {
    render(
      <ConsentToggle id="x" label="L" checked={false} onChange={() => {}} />,
    )
    expect(screen.queryByText(/จำเป็น/)).not.toBeInTheDocument()
  })
})
