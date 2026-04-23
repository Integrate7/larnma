'use client'
import { useCaregiverListController } from './controller/controller'
import { CaregiverListView } from './views/CaregiverListView'
import type { CaregiverListProps } from './types'

export function CaregiverList({ elderId }: CaregiverListProps) {
  const { state, handler } = useCaregiverListController(elderId)

  return (
    <CaregiverListView
      caregivers={state.caregivers}
      loading={state.loading}
      error={state.error}
      onRevoke={(pairingId) => void handler.revoke(pairingId)}
    />
  )
}
