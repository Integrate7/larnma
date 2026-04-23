'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/atom/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atom/card'
import { Input } from '@/components/atom/input'
import { Textarea } from '@/components/atom/textarea'
import { FormField } from '@/components/molecule/formField'
import { Skeleton } from '@/components/atom/skeleton'
import { useElderProfileController } from './controller/controller'

export function ElderProfileEdit({ elderId }: { elderId: string }) {
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
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold">แก้ไขข้อมูล</h1>
      {state.loading ? <Skeleton className="h-48" /> : null}
      {state.error ? (
        <p role="alert" className="text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-primary">
          บันทึกเรียบร้อย
        </p>
      ) : null}

      {state.data ? (
        <Card>
          <CardHeader>
            <CardTitle>{state.data.name}</CardTitle>
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
              <Button
                variant="outline"
                size="xl"
                onClick={() => router.back()}
              >
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
