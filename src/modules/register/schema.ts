import { z } from 'zod'

export const registerFormSchema = z
  .object({
    // Auth
    phone: z.string().regex(/^0\d{9}$/, 'เบอร์ต้องเป็น 10 หลัก'),
    otp: z.string().regex(/^\d{6}$/, 'รหัส OTP 6 หลัก'),
    // Caregiver
    caregiverName: z.string().trim().min(1, 'กรุณากรอกชื่อ'),
    relationship: z.string().trim().min(1, 'กรุณาเลือกความสัมพันธ์'),
    // Consent
    consentAudioAi: z.boolean(),
    consentHealthData: z.boolean(),
    consentMarketing: z.boolean(),
    // Elder basic
    elderName: z.string().trim().min(1, 'กรุณากรอกชื่อผู้สูงอายุ'),
    elderPhone: z.string().regex(/^0\d{9}$/, 'เบอร์ผู้สูงอายุ 10 หลัก'),
    birthdate: z.string(),
    addressLine: z.string().trim().min(1, 'กรุณากรอกที่อยู่'),
    district: z.string().trim().min(1, 'กรุณากรอกอำเภอ/เขต'),
    province: z.string().trim().min(1, 'กรุณากรอกจังหวัด'),
    postalCode: z.string().regex(/^\d{5}$/, 'รหัสไปรษณีย์ 5 หลัก'),
    // Elder health
    conditions: z.array(z.string()),
    symptoms: z.array(z.string()),
    medications: z
      .array(
        z.object({
          name: z.string(),
          dosage: z.string(),
          time: z.string(),
        }),
      )
      ,
    allergies: z.array(z.string()),
    // Elder emergency
    hospitalName: z.string(),
    hospitalPhone: z.string(),
    doctorName: z.string(),
    doctorPhone: z.string(),
    backupName: z.string(),
    backupPhone: z.string(),
    // Elder optional
    bloodType: z.string(),
    heightCm: z.union([z.number(), z.nan()]).optional(),
    weightKg: z.union([z.number(), z.nan()]).optional(),
    foodPreferences: z.array(z.string()),
    foodDislikes: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    const pairs = [
      ['hospitalName', 'hospitalPhone'],
      ['doctorName', 'doctorPhone'],
      ['backupName', 'backupPhone'],
    ] as const
    for (const [nameKey, phoneKey] of pairs) {
      const name = (v[nameKey] ?? '').trim()
      const phone = (v[phoneKey] ?? '').trim()
      if (phone && !/^0\d{9}$/.test(phone)) {
        ctx.addIssue({
          code: 'custom',
          path: [phoneKey],
          message: 'เบอร์ต้องเป็น 10 หลัก',
        })
      }
      if (name && !phone) {
        ctx.addIssue({
          code: 'custom',
          path: [phoneKey],
          message: 'กรุณากรอกเบอร์โทร',
        })
      }
      if (phone && !name) {
        ctx.addIssue({ code: 'custom', path: [nameKey], message: 'กรุณากรอกชื่อ' })
      }
    }
  })

export const registerDefaults: z.input<typeof registerFormSchema> = {
  phone: '',
  otp: '',
  caregiverName: '',
  relationship: '',
  consentAudioAi: false,
  consentHealthData: false,
  consentMarketing: false,
  elderName: '',
  elderPhone: '',
  birthdate: '',
  addressLine: '',
  district: '',
  province: '',
  postalCode: '',
  conditions: [],
  symptoms: [],
  medications: [],
  allergies: [],
  hospitalName: '',
  hospitalPhone: '',
  doctorName: '',
  doctorPhone: '',
  backupName: '',
  backupPhone: '',
  bloodType: '',
  foodPreferences: [],
  foodDislikes: [],
}
