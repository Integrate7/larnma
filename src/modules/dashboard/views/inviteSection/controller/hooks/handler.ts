'use client'
import { z } from 'zod'
import { fetcher } from '@/services/adapter/fetcher'
import type { InviteHandler } from '../../types'
import type { useInviteGlobalState } from './globalState'

type GS = ReturnType<typeof useInviteGlobalState>

export function useInviteHandler(args: { gs: GS; elderId: string }): InviteHandler {
  const { gs, elderId } = args

  const openDialog = async () => {
    if (!elderId) return
    gs.setLoading(true)
    gs.setError(null)
    const res = await fetcher(
      '/api/invites',
      z.object({ url: z.string(), exp: z.string() }),
      { method: 'POST', body: { elderId } },
    )
    gs.setLoading(false)
    if (res.success) {
      const absolute = res.data.url.startsWith('http')
        ? res.data.url
        : `${globalThis.window.location.origin}${res.data.url}`
      gs.setInviteUrl(absolute)
      gs.setOpen(true)
    } else {
      gs.setError(res.error)
    }
  }

  const close = () => {
    gs.setOpen(false)
    gs.setCopied(false)
    gs.setInviteUrl(null)
  }

  const copyLink = async () => {
    if (!gs.state.inviteUrl) return
    await navigator.clipboard.writeText(gs.state.inviteUrl)
    gs.setCopied(true)
  }

  const shareViaLine = () => {
    if (!gs.state.inviteUrl) return
    globalThis.window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(gs.state.inviteUrl)}`,
      '_blank',
    )
  }

  const shareViaSms = () => {
    if (!gs.state.inviteUrl) return
    globalThis.window.location.href = `sms:?body=${encodeURIComponent(gs.state.inviteUrl)}`
  }

  return { openDialog, close, copyLink, shareViaLine, shareViaSms }
}
