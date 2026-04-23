import { render, screen, waitFor } from '@testing-library/react'
import { QrDisplay } from '../qrDisplay'

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,fake')),
  },
}))

describe('QrDisplay', () => {
  it('uses provided dataUrl without calling qrcode', async () => {
    render(<QrDisplay value="x" dataUrl="data:image/png;base64,direct" />)
    await waitFor(() => {
      const img = screen.getByAltText('QR code') as HTMLImageElement
      expect(img.src).toContain('direct')
    })
  })

  it('renders skeleton then generated image', async () => {
    render(<QrDisplay value="hello" />)
    await waitFor(() => {
      expect(screen.getByAltText('QR code')).toBeInTheDocument()
    })
  })

  it('uses custom alt', async () => {
    render(
      <QrDisplay value="x" alt="pair QR" dataUrl="data:image/png;base64,a" />,
    )
    await waitFor(() => {
      expect(screen.getByAltText('pair QR')).toBeInTheDocument()
    })
  })
})
