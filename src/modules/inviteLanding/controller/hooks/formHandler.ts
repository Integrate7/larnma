import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { inviteAcceptDefaults, inviteAcceptSchema } from '../../schema'
import type { InviteAcceptForm, InviteAcceptValues } from '../../types'

export function useInviteAcceptFormHandler(): { form: InviteAcceptForm } {
  const form = useForm<InviteAcceptValues>({
    resolver: zodResolver(inviteAcceptSchema),
    defaultValues: inviteAcceptDefaults as InviteAcceptValues,
    mode: 'onBlur',
  })
  return { form }
}
