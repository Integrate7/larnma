'use client'

import {
  QueryClientProvider,
  type QueryClient,
} from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { createQueryClient } from '@/services/adapter/queryClient'

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState<QueryClient>(() => createQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  )
}
