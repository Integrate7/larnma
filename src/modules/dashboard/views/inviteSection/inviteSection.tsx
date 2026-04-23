'use client'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atom/card'
import { Button } from '@/components/atom/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/atom/dialog'
import { useInviteController } from './controller/controller'
import { CaregiverList } from './caregiverList/caregiverList'
import type { InviteSectionProps } from './types'

export function InviteSection({ elderId, isPrimary }: InviteSectionProps) {
  const t = useTranslations()
  const { state, handler } = useInviteController(elderId)

  if (!isPrimary) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('caregiver.addCaregiver')}</CardTitle>
      </CardHeader>
      <CardContent>
        {state.error ? (
          <p role="alert" className="text-destructive text-sm">{state.error}</p>
        ) : null}
        <Button
          onClick={() => void handler.openDialog()}
          disabled={state.loading}
          data-testid="invite-open-btn"
        >
          {state.loading ? '...' : t('caregiver.addCaregiver')}
        </Button>

        <Dialog open={state.open} onOpenChange={(o) => { if (!o) handler.close() }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('invite.dialogTitle')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{t('invite.linkLabel')}</p>
            <p
              className="break-all rounded bg-muted px-3 py-2 text-sm font-mono"
              data-testid="invite-url"
            >
              {state.inviteUrl}
            </p>
            <p className="text-xs text-muted-foreground">{t('invite.expiresNote')}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void handler.copyLink()}
                data-testid="invite-copy-btn"
              >
                {state.copied ? t('invite.copied') : t('invite.copyLink')}
              </Button>
              <Button
                variant="outline"
                onClick={handler.shareViaLine}
                data-testid="invite-line-btn"
              >
                {t('invite.shareViaLine')}
              </Button>
              <Button
                variant="outline"
                onClick={handler.shareViaSms}
                data-testid="invite-sms-btn"
              >
                {t('invite.shareViaSms')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <CaregiverList elderId={elderId} />
      </CardContent>
    </Card>
  )
}
