import type { Page } from '@playwright/test'

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/register')
  }

  async start() {
    await this.page.getByTestId('welcome-next').click()
    // Choice step: click "ลงทะเบียนปกติ" to proceed to phone step
    await this.page.getByRole('button', { name: 'ลงทะเบียนปกติ' }).click()
  }

  async fillPhoneAndSend(phone: string) {
    await this.page.getByPlaceholder(/เบอร์/).fill(phone)
    await this.page.getByTestId('phone-next').click()
  }

  async fillOtp(code: string) {
    // Fill each digit individually so existing values are cleared first.
    // keyboard.type() can't overwrite maxLength=1 inputs that are already filled,
    // but .fill() selects-all before typing, so it works for retry scenarios.
    for (let i = 0; i < code.length; i++) {
      await this.page.getByRole('textbox', { name: `digit ${i + 1}` }).fill(code[i])
    }
  }

  async verifyOtp() {
    await this.page.getByTestId('otp-next').click()
  }

  async fillCaregiverProfile(name: string, relationship: string) {
    await this.page.locator('#caregiverName').fill(name)
    await this.page.locator('#relationship').fill(relationship)
    await this.page.getByTestId('caregiver-next').click()
  }

  async acceptConsents() {
    const switches = this.page.getByRole('switch')
    await switches.nth(0).click()
    await switches.nth(1).click()
    await this.page.getByTestId('consent-next').click()
  }

  async fillElderBasic(fields: {
    elderName: string
    elderPhone: string
    addressLine: string
    district: string
    province: string
    postalCode: string
  }) {
    await this.page.locator('#elderName').fill(fields.elderName)
    await this.page.locator('#elderPhone').fill(fields.elderPhone)
    await this.page.locator('#addressLine').fill(fields.addressLine)
    await this.page.locator('#district').fill(fields.district)
    await this.page.locator('#province').fill(fields.province)
    await this.page.locator('#postalCode').fill(fields.postalCode)
    await this.page.getByTestId('elder-basic-next').click()
  }

  async walkThroughElderSecondarySections() {
    // Health, Emergency, Optional → just click "ถัดไป" each
    for (let i = 0; i < 3; i += 1) {
      await this.page.getByRole('button', { name: /ถัดไป/ }).first().click()
    }
  }

  async submitReview() {
    await this.page.getByTestId('review-submit').click()
  }
}
