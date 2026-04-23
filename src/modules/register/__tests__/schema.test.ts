import { registerFormSchema } from '../schema'

const valid = {
  phone: '0812345678',
  otp: '123456',
  caregiverName: 'ทดสอบ',
  relationship: 'ลูก',
  consentAudioAi: true,
  consentHealthData: true,
  consentMarketing: false,
  elderName: 'คุณยาย',
  elderPhone: '0823456789',
  birthdate: '1950-01-01',
  addressLine: '123 ถนนทดสอบ',
  district: 'บางรัก',
  province: 'กรุงเทพ',
  postalCode: '10500',
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

describe('registerFormSchema', () => {
  it('accepts a fully valid form', () => {
    expect(() => registerFormSchema.parse(valid)).not.toThrow()
  })

  it('rejects invalid phone format', () => {
    const r = registerFormSchema.safeParse({ ...valid, phone: '1234' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid OTP format', () => {
    const r = registerFormSchema.safeParse({ ...valid, otp: '12345' })
    expect(r.success).toBe(false)
  })

  it('rejects empty caregiverName', () => {
    const r = registerFormSchema.safeParse({ ...valid, caregiverName: '  ' })
    expect(r.success).toBe(false)
  })

  it('rejects invalid postal code', () => {
    const r = registerFormSchema.safeParse({ ...valid, postalCode: '1234' })
    expect(r.success).toBe(false)
  })

  // superRefine: phone provided without name
  it('requires name when hospitalPhone is provided', () => {
    const r = registerFormSchema.safeParse({ ...valid, hospitalPhone: '0811111111', hospitalName: '' })
    expect(r.success).toBe(false)
  })

  // superRefine: name provided without phone
  it('requires phone when hospitalName is provided', () => {
    const r = registerFormSchema.safeParse({ ...valid, hospitalName: 'โรงพยาบาล', hospitalPhone: '' })
    expect(r.success).toBe(false)
  })

  // superRefine: invalid phone format for contactPhone
  it('rejects invalid hospitalPhone format when provided', () => {
    const r = registerFormSchema.safeParse({ ...valid, hospitalName: 'โรงพยาบาล', hospitalPhone: '12345' })
    expect(r.success).toBe(false)
  })

  it('accepts valid hospitalName+Phone pair', () => {
    const r = registerFormSchema.safeParse({ ...valid, hospitalName: 'โรงพยาบาล', hospitalPhone: '0811111111' })
    expect(r.success).toBe(true)
  })

  it('accepts empty hospitalName+Phone pair', () => {
    const r = registerFormSchema.safeParse({ ...valid, hospitalName: '', hospitalPhone: '' })
    expect(r.success).toBe(true)
  })

  it('validates doctorName+doctorPhone pair', () => {
    const r = registerFormSchema.safeParse({ ...valid, doctorName: 'หมอ', doctorPhone: '' })
    expect(r.success).toBe(false)
  })

  it('validates backupName+backupPhone pair', () => {
    const r = registerFormSchema.safeParse({ ...valid, backupName: 'ญาติ', backupPhone: '' })
    expect(r.success).toBe(false)
  })

  it('accepts valid backupName+Phone pair', () => {
    const r = registerFormSchema.safeParse({ ...valid, backupName: 'ญาติ', backupPhone: '0899999999' })
    expect(r.success).toBe(true)
  })
})
