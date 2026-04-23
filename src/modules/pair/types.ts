export type PairState = 'ready' | 'scanning' | 'pairing' | 'success' | 'error'

export type PairGlobalState = {
  state: PairState
  errorMessage: string | null
}
