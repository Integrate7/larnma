import Link from 'next/link'
import { Button } from '@/components/atom/button'

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-5 py-10">
      <header className="border-b border-[var(--rule)] pb-3">
        <div className="mono-label">Legal</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          นโยบายความเป็นส่วนตัว (PDPA)
        </h1>
      </header>
      <article
        className="flex flex-col gap-3"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '15px',
          lineHeight: 1.55,
          color: 'var(--ink-2)',
        }}
      >
        <p>แอปหลานม่าเก็บและประมวลผลข้อมูลของผู้สูงอายุและผู้ดูแลภายใต้กฎหมาย PDPA</p>
        <ul className="list-disc pl-6">
          <li>ข้อมูลเสียง: เก็บชั่วคราว 24 ชั่วโมง แล้วลบออก</li>
          <li>Transcript + mood: เก็บ 90 วัน</li>
          <li>ข้อมูลสุขภาพ: เข้ารหัส AES-256 at-rest</li>
          <li>TLS สำหรับการส่งข้อมูลทั้งหมด</li>
        </ul>
        <p>ผู้ดูแลสามารถลบข้อมูลได้ตลอดเวลา (right to be forgotten)</p>
      </article>
      <Button asChild size="lg" variant="outline" className="w-fit">
        <Link href="/">กลับหน้าหลัก</Link>
      </Button>
    </main>
  )
}
