export type QrScannerProps = Readonly<{
  onDecode: (text: string) => void
  onError?: (error: Error) => void
  disabled?: boolean
}>
