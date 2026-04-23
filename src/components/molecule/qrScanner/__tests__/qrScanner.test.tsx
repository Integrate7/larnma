import { render, screen, waitFor } from '@testing-library/react'
import { QrScanner } from '../qrScanner'

const decodeFromVideoDevice = jest.fn()

jest.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: jest.fn().mockImplementation(() => ({
    decodeFromVideoDevice,
  })),
}))

describe('QrScanner', () => {
  beforeEach(() => {
    decodeFromVideoDevice.mockReset()
  })

  it('fires onDecode with scan result', async () => {
    const onDecode = jest.fn()
    decodeFromVideoDevice.mockImplementation(
      async (_id: string | undefined, _video: HTMLVideoElement, cb: any) => {
        cb({ getText: () => 'SCAN_TOKEN' })
        return { stop: jest.fn() }
      },
    )
    render(<QrScanner onDecode={onDecode} />)
    await waitFor(() => {
      expect(onDecode).toHaveBeenCalledWith('SCAN_TOKEN')
    })
  })

  it('calls onError on permission denied', async () => {
    const onError = jest.fn()
    decodeFromVideoDevice.mockRejectedValueOnce(new Error('permission denied'))
    render(<QrScanner onDecode={() => {}} onError={onError} />)
    await waitFor(() => {
      expect(onError).toHaveBeenCalled()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('permission denied')
  })

  it('ignores transient per-frame decode exceptions', async () => {
    const onError = jest.fn()
    decodeFromVideoDevice.mockImplementation(
      async (_id: string | undefined, _video: HTMLVideoElement, cb: any) => {
        for (const name of [
          'NotFoundException',
          'ChecksumException',
          'FormatException',
        ]) {
          const err = new Error(name.toLowerCase())
          err.name = name
          cb(undefined, err)
        }
        return { stop: jest.fn() }
      },
    )
    render(<QrScanner onDecode={() => {}} onError={onError} />)
    await new Promise((r) => setTimeout(r, 120))
    expect(onError).not.toHaveBeenCalled()
  })

  it('does not start when disabled', async () => {
    render(<QrScanner onDecode={() => {}} disabled />)
    await new Promise((r) => setTimeout(r, 120))
    expect(decodeFromVideoDevice).not.toHaveBeenCalled()
  })
})
