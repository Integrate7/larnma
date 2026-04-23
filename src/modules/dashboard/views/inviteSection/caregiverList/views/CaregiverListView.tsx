import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import type { CaregiverListViewProps } from '../types'

export function CaregiverListView({
  caregivers,
  loading,
  error,
  onRevoke,
}: CaregiverListViewProps) {
  const t = useTranslations()

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div className="mt-4 flex flex-col gap-1" data-testid="caregiver-list">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {caregivers.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('caregiver.caregiverList.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y">
          {caregivers.map((cg) => {
            const itemKey = cg.pairingId
            return (
              <li key={itemKey} className="flex items-center gap-3 py-2">
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{cg.name}</span>
                  <span className="text-xs text-muted-foreground">{cg.phone}</span>
                </div>
                {cg.isCurrentUser || cg.isPrimary ? (
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">
                    {t('caregiver.caregiverList.primary')}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRevoke(cg.pairingId)}
                    data-testid={`revoke-${cg.pairingId}`}
                  >
                    {t('caregiver.caregiverList.revoke')}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
