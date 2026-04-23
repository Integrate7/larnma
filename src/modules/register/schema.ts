import { z } from 'zod'

export const registerFormSchema = z.object({
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
  birthdate: z.string().optional().default(''),
  addressLine: z.string().trim().min(1, 'กรุณากรอกที่อยู่'),
  district: z.string().trim().min(1, 'กรุณากรอกอำเภอ/เขต'),
  province: z.string().trim().min(1, 'กรุณากรอกจังหวัด'),
  postalCode: z.string().regex(/^\d{5}$/, 'รหัสไปรษณีย์ 5 หลัก'),
  // Elder health
  conditions: z.array(z.string()).default([]),
  symptoms: z.array(z.string()).default([]),
  medications: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        time: z.string(),
      }),
    )
    .default([]),
  allergies: z.array(z.string()).default([]),
  // Elder emergency
  hospitalName: z.string().optional().default(''),
  hospitalPhone: z.string().refine(v => !v || /^0\d{9}$/.test(v), { message: 'เบอร์ต้องเป็น 10 หลัก' }).optional().default(''),
  doctorName: z.string().optional().default(''),
  doctorPhone: z.string().refine(v => !v || /^0\d{9}$/.test(v), { message: 'เบอร์ต้องเป็น 10 หลัก' }).optional().default(''),
  backupName: z.string().optional().default(''),
  backupPhone: z.string().refine(v => !v || /^0\d{9}$/.test(v), { message: 'เบอร์ต้องเป็น 10 หลัก' }).optional().default(''),
  // Elder optional
  bloodType: z.string().optional().default(''),
  heightCm: z.union([z.number(), z.nan()]).optional(),
  weightKg: z.union([z.number(), z.nan()]).optional(),
  foodPreferences: z.array(z.string()).default([]),
  foodDislikes: z.array(z.string()).default([]),
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
