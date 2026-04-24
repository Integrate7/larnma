import { fireEvent, render, screen } from '@testing-library/react'
import { QrStep } from '../stepViews'

describe('QrStep', () => {
  const baseProps = {
    pairingToken: 'TOKEN123',
    onGenerate: jest.fn(),
    onDownload: jest.fn(),
    onGoToDashboard: jest.fn(),
  }

  beforeEach(() => {
    baseProps.onGenerate.mockClear()
    baseProps.onDownload.mockClear()
    baseProps.onGoToDashboard.mockClear()
  })

  it('shows "Generate QR" button when qrDataUrl is null', () => {
    render(<QrStep qrDataUrl={null} {...baseProps} />)
    expect(screen.getByTestId('qr-generate')).toBeInTheDocument()
    expect(screen.queryByTestId('qr-download')).not.toBeInTheDocument()
    expect(screen.queryByTestId('qr-go-dashboard')).not.toBeInTheDocument()
  })

  it('clicking the generate button invokes onGenerate', () => {
    render(<QrStep qrDataUrl={null} {...baseProps} />)
    fireEvent.click(screen.getByTestId('qr-generate'))
    expect(baseProps.onGenerate).toHaveBeenCalledTimes(1)
  })

  it('shows Download + Go-to-Dashboard buttons when qrDataUrl is set', () => {
    render(
      <QrStep qrDataUrl="data:image/png;base64,xx" {...baseProps} />,
    )
    expect(screen.getByTestId('qr-download')).toBeInTheDocument()
    expect(screen.getByTestId('qr-go-dashboard')).toBeInTheDocument()
    expect(screen.queryByTestId('qr-generate')).not.toBeInTheDocument()
  })

  it('clicking the download button invokes onDownload', () => {
    render(
      <QrStep qrDataUrl="data:image/png;base64,xx" {...baseProps} />,
    )
    fireEvent.click(screen.getByTestId('qr-download'))
    expect(baseProps.onDownload).toHaveBeenCalledTimes(1)
    expect(baseProps.onGoToDashboard).not.toHaveBeenCalled()
  })

  it('clicking the go-to-dashboard button invokes onGoToDashboard', () => {
    render(
      <QrStep qrDataUrl="data:image/png;base64,xx" {...baseProps} />,
    )
    fireEvent.click(screen.getByTestId('qr-go-dashboard'))
    expect(baseProps.onGoToDashboard).toHaveBeenCalledTimes(1)
    expect(baseProps.onDownload).not.toHaveBeenCalled()
  })
})
