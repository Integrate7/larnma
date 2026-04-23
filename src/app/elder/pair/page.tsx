import { Suspense } from 'react'
import { PairPage } from '@/modules/pair'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PairPage />
    </Suspense>
  )
}
