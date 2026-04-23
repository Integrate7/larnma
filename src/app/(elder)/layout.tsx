import type { ReactNode } from 'react'

export default function ElderLayout({ children }: { children: ReactNode }) {
  return <div className="elder-mode min-h-screen">{children}</div>
}
