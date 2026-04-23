export type OtpInputProps = Readonly<{
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  'aria-label'?: string
}>
