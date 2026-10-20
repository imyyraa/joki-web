'use client'

import type { ReactNode } from 'react'

export default function TombolKonfirmasi({
  pesan,
  className,
  children,
}: {
  pesan: string
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(pesan)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}