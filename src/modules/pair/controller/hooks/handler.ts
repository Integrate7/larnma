import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import { deviceFingerprint } from '@/shared/helpers/deviceFingerprint'
import type { usePairGlobalState } from './globalState'

export function usePairHandler(gs: ReturnType<typeof usePairGlobalState>) {
  const consume = async (token: string) => {
    gs.setState('pairing')
    gs.setErrorMessage(null)
    const fingerprint = deviceFingerprint()
    const res = await fetcher(
      '/api/pairings/consume',
      z.object({ elderId: z.string() }),
      { method: 'POST', body: { token, deviceFingerprint: fingerprint } },
    )
    if (!res.success) {
      gs.setState('error')
      gs.setErrorMessage(res.error)
      return
    }
    gs.setState('success')
  }

  const onDecode = (text: string) => {
    void consume(text)
  }

  const onError = (err: Error) => {
    gs.setState('error')
    gs.setErrorMessage(err.message)
  }

  const startScan = () => {
    gs.setState('scanning')
    gs.setErrorMessage(null)
  }

  return { consume, onDecode, onError, startScan }
}
