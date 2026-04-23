import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/atom/button'
import { Card, CardContent } from '@/components/atom/card'
import { Skeleton } from '@/components/atom/skeleton'
import type { ElderFoodHandler } from '../controller/hooks/handler'
import type { ElderFoodState } from '../types'

type Props = {
  state: ElderFoodState
  handler: ElderFoodHandler
}

export function ElderFoodView({ state, handler }: Props) {
  const t = useTranslations()

  if (state.requestStatus === 'requested') {
    return (
      <main className="elder-mode mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-5 py-6">
        <CheckCircle2 className="h-20 w-20" style={{ color: 'var(--ok)' }} />
        <p className="text-center text-3xl font-bold">{t('food.requested')}</p>
        <p className="serif-caption text-center text-xl">{t('food.waiting')}</p>
        <Button asChild size="xl" variant="outline">
          <Link href="/elder">
            <ArrowLeft className="mr-2 h-5 w-5" />
            {t('elder.back')}
          </Link>
        </Button>
      </main>
    )
  }

  return (
    <main className="elder-mode mx-auto flex min-h-screen max-w-xl flex-col gap-5 px-5 py-6">
      <header className="flex items-center gap-3 border-b border-[var(--rule)] pb-3">
        <Button
          asChild
          size="icon"
          variant="outline"
          aria-label={t('elder.back')}
        >
          <Link href="/elder">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="mono-label">เมนูแนะนำ</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {t('food.suggestTitle')}
          </h1>
        </div>
      </header>

      {state.loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))] bg-[var(--danger-wash)] p-3 text-sm text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}

      {!state.loading && !state.error ? (
        <div className="flex flex-col gap-4">
          {state.menus.map((item) => {
            const isSelected = state.selectedMenuId === item.id
            const cardKey = item.id
            if (!item.isSafe) {
              return (
                <Card
                  key={cardKey}
                  accent="crit"
                  data-testid={`food-item-${item.id}`}
                >
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-[var(--danger)]" />
                      <span className="text-xl font-semibold text-[var(--danger)]">
                        {item.name}
                      </span>
                      <span className="mono-label">฿{item.price}</span>
                    </div>
                    <p className="text-sm text-[var(--danger)]">
                      แพ้: {item.allergyMatch.join(', ')}
                      {item.conditionMatch.length > 0
                        ? ` · ไม่เหมาะกับโรค: ${item.conditionMatch.join(', ')}`
                        : ''}
                    </p>
                    {item.suggestedAlternative ? (
                      <p
                        className="serif-caption"
                        style={{ color: 'var(--ok)' }}
                      >
                        แนะนำแทน: {item.suggestedAlternative}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              )
            }
            return (
              <Card
                key={cardKey}
                accent="log"
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'border-[var(--brand)] border-2' : ''
                }`}
                onClick={() => handler.onSelect(item.id)}
                data-testid={`food-item-${item.id}`}
              >
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl font-semibold">{item.name}</span>
                    <span className="mono-label">฿{item.price}</span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2
                      className="h-8 w-8"
                      style={{ color: 'var(--brand)' }}
                    />
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : null}

      {state.selectedMenuId ? (
        <Button
          size="xl"
          variant="default"
          className="w-full"
          disabled={state.requestStatus === 'requesting'}
          onClick={handler.onConfirm}
          data-testid="food-confirm-btn"
        >
          {state.requestStatus === 'requesting' ? (
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          ) : null}
          {t('food.orderNow')}
        </Button>
      ) : null}

      {state.requestStatus === 'error' ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))] bg-[var(--danger-wash)] p-3 text-center text-sm text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}
    </main>
  )
}
