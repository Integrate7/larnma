'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const processAuth = async () => {
      const code = searchParams.get('code')

      if (code) {
        try {
          const response = await fetch('/api/auth/google/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          })

          const userData = await response.json()

          if (userData.error) {
            console.error('Auth error:', userData.error)
            router.push('/')
            return
          }

          // Store data to prefill registration form
          localStorage.setItem('prefill_email', userData.email || '')
          localStorage.setItem('prefill_name', userData.name || '')
          localStorage.setItem('prefill_firstName', userData.firstName || '')
          localStorage.setItem('prefill_lastName', userData.lastName || '')

          // Redirect to register page with a hint that we're coming from google
          router.push('/register?from=google')
        } catch (error) {
          console.error('Callback error:', error)
          router.push('/')
        }
      } else {
        router.push('/')
      }
    }

    processAuth()
  }, [router, searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[var(--rule)] border-t-[var(--brand)]" />
        <div className="mono-label">Google Auth</div>
        <p className="serif-caption">กำลังเชื่อมต่อกับ Google...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="mono-label">Google Auth</div>
            <p className="serif-caption">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  )
}
