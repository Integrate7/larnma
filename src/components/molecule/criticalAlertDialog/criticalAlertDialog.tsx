'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/atom/dialog'
import { PriorityBadge } from '@/components/molecule/priorityBadge'
import type { CriticalAlertDialogProps } from '@/modules/dashboard/types'

export function CriticalAlertDialog({
  open,
  cases,
  tone,
  elderName: _elderName,
  elderPhone,
  onCallElder,
  onCall1669,
  onClose,
}: CriticalAlertDialogProps) {
  const t = useTranslations('emergency.alert')

  const elderCallVariant = tone === 'critical' ? 'outline' : 'default'
  const e1669Variant = tone === 'critical' ? 'destructive' : 'outline'
  const elderCallSize = tone === 'critical' ? 'default' : 'lg'
  const e1669Size = tone === 'critical' ? 'lg' : 'default'

  const elderDisabled = elderPhone == null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle
            className={
              tone === 'critical'
                ? 'flex items-center gap-2 text-destructive'
                : 'flex items-center gap-2'
            }
          >
            {tone === 'critical' ? t('titleCritical') : t('titleHigh')}
          </DialogTitle>
          <DialogDescription>
            {t('summary', { count: cases.length })}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-3">
          {cases.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-1"
              data-testid={`critical-alert-case-${c.id}`}
            >
              <div className="flex items-center gap-2">
                <PriorityBadge priority={c.priority} />
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleTimeString('th-TH')}
                </span>
              </div>
              {c.transcript.length === 0 && c.summary.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <>
                  {c.transcript.length > 0 && (
                    <p className="text-sm font-medium">"{c.transcript}"</p>
                  )}
                  {c.summary.length > 0 && (
                    <p className="text-sm text-muted-foreground">{c.summary}</p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {elderDisabled && (
          <p className="text-xs text-muted-foreground">{t('noElderPhone')}</p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('close')}
          </Button>
          <Button
            variant={elderCallVariant}
            size={elderCallSize}
            disabled={elderDisabled}
            onClick={onCallElder}
          >
            {t('callElder')}
          </Button>
          <Button
            variant={e1669Variant}
            size={e1669Size}
            onClick={onCall1669}
            data-testid="critical-alert-call-1669"
          >
            {t('call1669')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
