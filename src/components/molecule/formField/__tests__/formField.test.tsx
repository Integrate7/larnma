import { render, screen } from '@testing-library/react'
import { FormField } from '../formField'

describe('FormField', () => {
  it('renders label + children', () => {
    render(
      <FormField label="name" htmlFor="n">
        <input id="n" />
      </FormField>,
    )
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('shows required asterisk', () => {
    render(
      <FormField label="phone" required>
        <input />
      </FormField>,
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('shows error when provided', () => {
    render(
      <FormField label="p" error="bad">
        <input />
      </FormField>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('bad')
  })

  it('shows hint when no error', () => {
    render(
      <FormField label="p" hint="tip">
        <input />
      </FormField>,
    )
    expect(screen.getByText('tip')).toBeInTheDocument()
  })

  it('hides hint when error present', () => {
    render(
      <FormField label="p" hint="tip" error="bad">
        <input />
      </FormField>,
    )
    expect(screen.queryByText('tip')).not.toBeInTheDocument()
  })
})
