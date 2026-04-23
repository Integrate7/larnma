'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/atom/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/atom/card'
import { Input } from '@/components/atom/input'
import { Skeleton } from '@/components/atom/skeleton'
import { Textarea } from '@/components/atom/textarea'
import { FormField } from '@/components/molecule/formField'
import { useElderProfileController } from './controller/controller'

export function ElderProfileEdit({ elderId }: Readonly<{ elderId: string }>) {
  const router = useRouter()
  const { state, handler } = useElderProfileController(elderId)
  const [allergies, setAllergies] = useState('')
  const [conditions, setConditions] = useState('')
  const [addressLine, setAddressLine] = useState('')

  useEffect(() => {
    if (state.data) {
      setAllergies(state.data.allergies.join(', '))
      setConditions(state.data.conditions.join(', '))
      setAddressLine(state.data.addressLine)
    }
  }, [state.data])

  const save = async () => {
    await handler.save('health', {
      allergies: allergies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      conditions: conditions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      addressLine,
    })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 px-5 py-6">
      <header className="border-b border-[var(--rule)] pb-3">
        <div className="mono-label">ผู้สูงอายุ · แก้ไข</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {state.data?.name ?? 'แก้ไขข้อมูล'}
        </h1>
      </header>

      {state.loading ? <Skeleton className="h-48" /> : null}
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_oklch,var(--danger)_35%,var(--rule))] bg-[var(--danger-wash)] p-3 text-sm text-[var(--danger)]"
        >
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <output className="text-[var(--brand-ink)]">
          บันทึกเรียบร้อย
        </output>
      ) : null}

      {state.data ? (
        <Card>
          <CardHeader>
            <CardTitle className="mono-label">ข้อมูลสุขภาพ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField label="ที่อยู่" htmlFor="e-address">
              <Textarea
                id="e-address"
                rows={2}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
              />
            </FormField>
            <FormField label="โรคประจำตัว (คั่นด้วย ,)" htmlFor="e-cond">
              <Input
                id="e-cond"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
              />
            </FormField>
            <FormField label="แพ้ (คั่นด้วย ,)" htmlFor="e-allergy">
              <Input
                id="e-allergy"
                data-testid="elder-edit-allergies"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            </FormField>
            <div className="flex gap-2">
              <Button variant="outline" size="xl" onClick={() => router.back()}>
                ยกเลิก
              </Button>
              <Button
                onClick={() => void save()}
                loading={state.saving}
                size="xl"
                className="flex-1"
                data-testid="elder-edit-save"
              >
                บันทึก
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </main>
  )
}
