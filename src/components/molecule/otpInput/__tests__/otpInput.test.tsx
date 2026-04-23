import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { OtpInput } from '../otpInput'

function Wrapper({ autoFocus = false }: { autoFocus?: boolean }) {
  const [v, setV] = useState('')
  return <OtpInput value={v} onChange={setV} autoFocus={autoFocus} />
}

describe('OtpInput', () => {
  it('renders 6 boxes', () => {
    render(<Wrapper />)
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
  })

  it('types digits and advances focus', async () => {
    render(<Wrapper />)
    const boxes = screen.getAllByRole('textbox') as HTMLInputElement[]
    await userEvent.click(boxes[0])
    await userEvent.keyboard('1')
    expect(boxes[0].value).toBe('1')
    await userEvent.keyboard('2')
    expect(boxes[1].value).toBe('2')
  })

  it('ignores non-digit input', async () => {
    render(<Wrapper />)
    const box = screen.getAllByRole('textbox')[0] as HTMLInputElement
    await userEvent.click(box)
    await userEvent.keyboard('a')
    expect(box.value).toBe('')
  })

  it('handles paste of full code', async () => {
    render(<Wrapper />)
    const box = screen.getAllByRole('textbox')[0] as HTMLInputElement
    box.focus()
    await act(async () => {
      box.dispatchEvent(
        Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
          clipboardData: { getData: () => '123456' },
        }),
      )
    })
    const values = (screen.getAllByRole('textbox') as HTMLInputElement[]).map(
      (b) => b.value,
    )
    expect(values.join('')).toBe('123456')
  })

  it('backspace moves focus back when empty', async () => {
    render(<Wrapper />)
    const boxes = screen.getAllByRole('textbox') as HTMLInputElement[]
    await userEvent.click(boxes[0])
    await userEvent.keyboard('1')
    // now at box 1
    expect(document.activeElement).toBe(boxes[1])
    await userEvent.keyboard('{Backspace}')
    // cursor should have moved back to box 0
    expect(document.activeElement).toBe(boxes[0])
  })

  it('auto-focuses first box when autoFocus=true', () => {
    render(<Wrapper autoFocus />)
    const boxes = screen.getAllByRole('textbox') as HTMLInputElement[]
    expect(document.activeElement).toBe(boxes[0])
  })
})
