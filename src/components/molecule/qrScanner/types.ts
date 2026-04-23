export type QrScannerProps = {
  onDecode: (text: string) => void
  onError?: (error: Error) => void
  disabled?: boolean
}
