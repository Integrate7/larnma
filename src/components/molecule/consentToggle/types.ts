export type ConsentToggleProps = Readonly<{
  id: string
  label: string
  description?: string
  required?: boolean
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}>
