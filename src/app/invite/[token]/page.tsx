import { InviteLandingPage } from '@/modules/inviteLanding'

export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <InviteLandingPage token={token} />
}
