'use client'

import Link from 'next/link'
import { Button } from '@/components/atom/button'
import { Badge } from '@/components/atom/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atom/card'
import { Skeleton } from '@/components/atom/skeleton'
import { useElderProfileController } from './controller/controller'

export function ElderProfileView({ elderId }: { elderId: string }) {
  const { state } = useElderProfileController(elderId)

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold">ข้อมูลผู้สูงอายุ</h1>

      {state.loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24" />
        </div>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.data ? (
        <div className="flex flex-col gap-3" data-testid="elder-profile-view">
          <Card>
            <CardHeader>
              <CardTitle data-testid="elder-profile-name">
                {state.data.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <p>
                <strong>โทร:</strong> {state.data.phone}
              </p>
              <p>
                <strong>ที่อยู่:</strong> {state.data.addressLine}{' '}
                {state.data.district} {state.data.province}{' '}
                {state.data.postalCode}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>สุขภาพ</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div>
                <p className="mb-1 font-medium">โรคประจำตัว</p>
                <div className="flex flex-wrap gap-2">
                  {state.data.conditions.length === 0 ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    state.data.conditions.map((c) => (
                      <Badge key={c} variant="secondary">
                        {c}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium">แพ้</p>
                <div
                  className="flex flex-wrap gap-2"
                  data-testid="elder-profile-allergies"
                >
                  {state.data.allergies.length === 0 ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    state.data.allergies.map((a) => (
                      <Badge key={a} variant="destructive">
                        {a}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Button asChild size="xl">
            <Link
              href={`/caregiver/elders/${elderId}/edit`}
              data-testid="elder-profile-edit-link"
            >
              แก้ไขข้อมูล
            </Link>
          </Button>
        </div>
      ) : null}
    </main>
  )
}
