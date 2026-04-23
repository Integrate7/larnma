'use client'
import { useState } from 'react'
import type { InviteGlobalState } from '../../types'

export function useInviteGlobalState() {
  const [open, setOpen] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const state: InviteGlobalState = { open, inviteUrl, loading, error, copied }

  return { state, setOpen, setInviteUrl, setLoading, setError, setCopied }
}
