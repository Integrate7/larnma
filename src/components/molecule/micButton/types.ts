export type MicButtonState =
  | 'idle'
  | 'wakeListening'
  | 'listening'
  | 'uploading'
  | 'done'
  | 'error'

export type MicButtonProps = {
  state: MicButtonState
  onPress: () => void
  disabled?: boolean
  label?: string
}
