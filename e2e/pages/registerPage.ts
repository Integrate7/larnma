import type { Page } from '@playwright/test'

export class RegisterPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/register')
  }

  async start() {
    await this.page.getByTestId('welcome-next').click()
  }

  async fillPhoneAndSend(phone: string) {
    await this.page.getByPlaceholder(/เบอร์/).fill(phone)
    await this.page.getByTestId('phone-next').click()
  }

  async fillOtp(code: string) {
    // OTP input is 6 inputs — paste the full value into the first one
    const first = this.page.getByRole('textbox', { name: 'digit 1' })
    await first.focus()
    await first.press('Control+A')
    await this.page.keyboard.type(code)
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
