import type { ReactNode } from 'react'

export default function ElderLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="elder-mode min-h-screen">{children}</div>
}
