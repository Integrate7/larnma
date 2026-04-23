import { z } from 'zod'

export const inviteAcceptSchema = z.object({
  phone: z.string().regex(/^0\d{9}$/, 'เบอร์ต้องเป็น 10 หลัก'),
  otp: z.string().regex(/^\d{6}$/, 'รหัส OTP 6 หลัก'),
  name: z.string().trim().min(1, 'กรุณากรอกชื่อ'),
  relationship: z.string().optional().default(''),
})

export const inviteAcceptDefaults: z.input<typeof inviteAcceptSchema> = {
  phone: '',
  otp: '',
  name: '',
  relationship: '',
}
