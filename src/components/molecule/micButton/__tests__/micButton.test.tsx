import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MicButton } from '../micButton'

describe('MicButton', () => {
  it('fires onPress when clicked (idle)', async () => {
    const onPress = jest.fn()
    render(<MicButton state="idle" onPress={onPress} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onPress).toHaveBeenCalled()
  })

  it('renders each state label', () => {
    const { rerender } = render(<MicButton state="idle" onPress={() => {}} />)
    expect(screen.getAllByText('แตะเพื่อพูด').length).toBeGreaterThan(0)

    rerender(<MicButton state="listening" onPress={() => {}} />)
    expect(screen.getAllByText('กำลังฟัง...').length).toBeGreaterThan(0)

    rerender(<MicButton state="uploading" onPress={() => {}} />)
    expect(screen.getAllByText('กำลังส่ง...').length).toBeGreaterThan(0)

    rerender(<MicButton state="done" onPress={() => {}} />)
    expect(screen.getAllByText('เรียบร้อย').length).toBeGreaterThan(0)

    rerender(<MicButton state="error" onPress={() => {}} />)
    expect(screen.getAllByText('ลองใหม่').length).toBeGreaterThan(0)
  })

  it('respects disabled', async () => {
    const onPress = jest.fn()
    render(<MicButton state="idle" onPress={onPress} disabled />)
    await userEvent.click(screen.getByRole('button'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('uses custom label when provided', () => {
    render(<MicButton state="idle" onPress={() => {}} label="พูดได้เลย" />)
    expect(screen.getAllByText('พูดได้เลย').length).toBeGreaterThan(0)
  })
})
