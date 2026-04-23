import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QrImageUpload } from '../qrImageUpload'
import { useTranslations } from 'next-intl'

import { BrowserQRCodeReader } from '@zxing/browser'

const decodeFromImageElement = jest.fn()
const decodeFromCanvas = jest.fn()

jest.mock('@zxing/browser', () => ({
  BrowserQRCodeReader: jest.fn().mockImplementation(() => ({
    decodeFromImageElement,
    decodeFromCanvas,
  })),
}))

jest.mock('@zxing/library', () => ({
  DecodeHintType: {
    TRY_HARDER: 'TRY_HARDER',
  },
}))

jest.mock('next-intl', () => ({
  useTranslations: jest.fn(),
}))

describe('QrImageUpload', () => {
  const mockT = (key: string) => key
  let originalImage: typeof Image

  beforeAll(() => {
    originalImage = global.Image
    // @ts-ignore - Mocking Image for JSDOM
    global.Image = class {
      onload: () => void = () => {}
      onerror: () => void = () => {}
      src: string = ''
      constructor() {
        setTimeout(() => {
          if (this.src === 'error-url') {
            this.onerror()
          } else {
            this.onload()
          }
        }, 0)
      }
    }
  })

  afterAll(() => {
    global.Image = originalImage
  })

  beforeEach(() => {
    ;(useTranslations as jest.Mock).mockReturnValue(mockT)
    global.URL.createObjectURL = jest.fn((file) => (file.name === 'error.png' ? 'error-url' : 'blob:url'))
    global.URL.revokeObjectURL = jest.fn()
  })

  it('decodes QR from uploaded file', async () => {
    const onDecode = jest.fn()
    decodeFromImageElement.mockResolvedValue({ getText: () => 'UPLOAD_TOKEN' })

    render(<QrImageUpload onDecode={onDecode} />)

    const file = new File(['foo'], 'qr.png', { type: 'image/png' })
    const input = screen.getByTestId('qr-image-upload-input') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onDecode).toHaveBeenCalledWith('UPLOAD_TOKEN')
    })
  })

  it('calls onError when no QR found after all attempts', async () => {
    const onError = jest.fn()
    decodeFromImageElement.mockRejectedValue(new Error('no qr'))
    decodeFromCanvas.mockImplementation(() => { throw new Error('no qr canvas') })

    render(<QrImageUpload onDecode={() => {}} onError={onError} />)

    const file = new File(['foo'], 'qr.png', { type: 'image/png' })
    const input = screen.getByTestId('qr-image-upload-input') as HTMLInputElement

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
