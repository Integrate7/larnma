import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/atom/button'
import { Card, CardContent } from '@/components/atom/card'
import { Skeleton } from '@/components/atom/skeleton'
import { useTranslations } from 'next-intl'
import type { ElderFoodState } from '../types'
import type { ElderFoodHandler } from '../controller/hooks/handler'

type Props = {
  state: ElderFoodState
  handler: ElderFoodHandler
}

export function ElderFoodView({ state, handler }: Props) {
  const t = useTranslations()

  if (state.requestStatus === 'requested') {
    return (
      <main className="elder-mode flex min-h-screen flex-col items-center justify-center gap-6 p-6">
        <CheckCircle2 className="h-20 w-20 text-green-500" />
        <p className="text-center text-3xl font-bold">{t('food.requested')}</p>
        <p className="text-center text-xl text-muted-foreground">{t('food.waiting')}</p>
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
    <main className="elder-mode flex min-h-screen flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Button asChild size="icon" variant="outline" aria-label={t('elder.back')}>
          <Link href="/elder">
            <ArrowLeft className="h-6 w-6" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{t('food.suggestTitle')}</h1>
      </div>

      {state.loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-destructive text-xl">
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
                  className="border-destructive/50 bg-destructive/5 opacity-80"
                  data-testid={`food-item-${item.id}`}
                >
                  <CardContent className="flex flex-col gap-2 p-5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      <span className="text-xl font-semibold text-destructive">{item.name}</span>
                      <span className="text-muted-foreground">฿{item.price}</span>
                    </div>
                    <p className="text-destructive text-sm">
                      แพ้: {item.allergyMatch.join(', ')}
                      {item.conditionMatch.length > 0 ? ` · ไม่เหมาะกับโรค: ${item.conditionMatch.join(', ')}` : ''}
                    </p>
                    {item.suggestedAlternative ? (
                      <p className="text-sm text-green-700">
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
                className={`cursor-pointer transition-colors ${isSelected ? 'border-primary border-2' : ''}`}
                onClick={() => handler.onSelect(item.id)}
                data-testid={`food-item-${item.id}`}
              >
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl font-semibold">{item.name}</span>
                    <span className="text-muted-foreground text-lg">฿{item.price}</span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="h-8 w-8 text-primary" />
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
        <p role="alert" className="text-destructive text-center text-xl">
          {state.error}
        </p>
      ) : null}
    </main>
  )
}
