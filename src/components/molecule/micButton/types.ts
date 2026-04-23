export type MicButtonState = 'idle' | 'listening' | 'uploading' | 'done' | 'error'

export type MicButtonProps = {
  state: MicButtonState
  onPress: () => void
  disabled?: boolean
  label?: string
}
