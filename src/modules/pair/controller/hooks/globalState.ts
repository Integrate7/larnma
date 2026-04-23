import { useState } from 'react'
import type { PairGlobalState, PairState } from '../../types'

export function usePairGlobalState() {
  const [state, setState] = useState<PairState>('ready')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const gs: PairGlobalState = { state, errorMessage }
  return {
    gs,
    setState,
    setErrorMessage,
  }
}
