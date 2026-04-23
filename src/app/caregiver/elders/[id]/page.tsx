import { ElderProfileView } from '@/modules/elderProfile'

export default async function Page({
  params,
}: Readonly<{
  params: Promise<{ id: string }>
}>) {
  const { id } = await params
  return <ElderProfileView elderId={id} />
}
