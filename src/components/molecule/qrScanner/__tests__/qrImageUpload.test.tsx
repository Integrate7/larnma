import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QrImageUpload } from '../qrImageUpload'
import { useTranslations } from 'next-intl'


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
    // @ts-expect-error - Mocking Image for JSDOM
    global.Image = class {
      onload: () => void = () => {}
      onerror: () => void = () => {}
      src: string = ''
      width: number = 0
      height: number = 0
      constructor() {
        setTimeout(() => {
          if (this.src === 'error-url') {
            this.onerror()
          } else if (this.src === 'landscape-url') {
            this.width = 1200
            this.height = 600
            this.onload()
          } else if (this.src === 'portrait-url') {
            this.width = 400
            this.height = 1200
            this.onload()
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
    global.URL.createObjectURL = jest.fn((file) => {
      if (!(file instanceof File)) return 'blob:url'
      if (file.name === 'error.png') return 'error-url'
      if (file.name === 'landscape.png') return 'landscape-url'
      if (file.name === 'portrait.png') return 'portrait-url'
      return 'blob:url'
    })
    global.URL.revokeObjectURL = jest.fn()
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      drawImage: jest.fn(),
    })
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

  it('decodes QR from landscape image (width > height resize path)', async () => {
    const onDecode = jest.fn()
    decodeFromImageElement.mockRejectedValue(new Error('no qr original'))
    decodeFromCanvas.mockResolvedValueOnce({ getText: () => 'LANDSCAPE_TOKEN' })

    render(<QrImageUpload onDecode={onDecode} />)

    const file = new File(['foo'], 'landscape.png', { type: 'image/png' })
    const input = screen.getByTestId('qr-image-upload-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onDecode).toHaveBeenCalledWith('LANDSCAPE_TOKEN')
    })
  })

  it('decodes QR from portrait image (height > width resize path)', async () => {
    const onDecode = jest.fn()
    decodeFromImageElement.mockRejectedValue(new Error('no qr original'))
    decodeFromCanvas
      .mockImplementationOnce(() => { throw new Error('no qr first resize') })
      .mockResolvedValueOnce({ getText: () => 'PORTRAIT_TOKEN' })

    render(<QrImageUpload onDecode={onDecode} />)

    const file = new File(['foo'], 'portrait.png', { type: 'image/png' })
    const input = screen.getByTestId('qr-image-upload-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(onDecode).toHaveBeenCalledWith('PORTRAIT_TOKEN')
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
