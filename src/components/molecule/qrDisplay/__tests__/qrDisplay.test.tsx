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

  it('renders code prop when provided', async () => {
    render(<QrDisplay value="x" dataUrl="data:image/png;base64,a" code="ABC-123" />)
    await waitFor(() => {
      expect(screen.getByTestId('qr-code')).toHaveTextContent('ABC-123')
    })
  })

  it('renders expiry when expiresAt is provided', async () => {
    const future = new Date(Date.now() + 60000)
    render(<QrDisplay value="x" dataUrl="data:image/png;base64,a" expiresAt={future} />)
    await waitFor(() => {
      expect(screen.getByTestId('qr-expiry')).toBeInTheDocument()
    })
  })

  it('shows skeleton while loading (no dataUrl)', () => {
    const { container } = render(<QrDisplay value="hello" />)
    expect(container.querySelector('[data-testid="qr-skeleton"]')).toBeInTheDocument()
  })

  it('handles QRCode.toDataURL rejection gracefully', async () => {
    const QRCode = require('qrcode')
    QRCode.default.toDataURL.mockRejectedValueOnce(new Error('fail'))
    const { container } = render(<QrDisplay value="badvalue" />)
    await waitFor(() => {
      expect(container.querySelector('[data-testid="qr-skeleton"]')).toBeInTheDocument()
    })
  })
})
