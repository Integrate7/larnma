import { Suspense } from 'react'
import { RegisterPage } from '@/modules/register'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterPage />
    </Suspense>
  )
}
