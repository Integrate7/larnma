import Link from 'next/link'
import { Button } from '@/components/atom/button'

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-3xl font-bold">นโยบายความเป็นส่วนตัว (PDPA)</h1>
      <section className="flex flex-col gap-2 text-sm">
        <p>
          แอปหลานม่าเก็บและประมวลผลข้อมูลของผู้สูงอายุและผู้ดูแลภายใต้กฎหมาย
          PDPA
        </p>
        <ul className="list-disc pl-6">
          <li>ข้อมูลเสียง: เก็บชั่วคราว 24 ชั่วโมง แล้วลบออก</li>
          <li>Transcript + mood: เก็บ 90 วัน</li>
          <li>ข้อมูลสุขภาพ: เข้ารหัส AES-256 at-rest</li>
          <li>TLS สำหรับการส่งข้อมูลทั้งหมด</li>
        </ul>
        <p>ผู้ดูแลสามารถลบข้อมูลได้ตลอดเวลา (right to be forgotten)</p>
      </section>
      <Button asChild size="lg" variant="outline" className="w-fit">
        <Link href="/">กลับหน้าหลัก</Link>
      </Button>
    </main>
  )
}
