import { expect, test } from '@playwright/test'
import { RegisterPage } from '../pages/registerPage'
import { resetServerState } from '../helpers/reset'

test.describe('Primary caregiver register flow', () => {
  test.beforeEach(async ({ baseURL }) => {
    await resetServerState(baseURL ?? 'http://localhost:3000')
  })

  test('completes the wizard and shows QR', async ({ page }) => {
    const register = new RegisterPage(page)
    await register.goto()
    await register.start()

    await register.fillPhoneAndSend('0812345678')
    await expect(page.getByText(/OTP/)).toBeVisible()

    await register.fillOtp('123456')
    await register.verifyOtp()

    await register.fillCaregiverProfile('คุณลูก', 'ลูก')
    await register.acceptConsents()

    await register.fillElderBasic({
      elderName: 'ย่าสมร',
      elderPhone: '0899999999',
      addressLine: 'บ้านเลขที่ 1',
      district: 'เมือง',
      province: 'กรุงเทพฯ',
      postalCode: '10100',
    })
    await register.walkThroughElderSecondarySections()
    await register.submitReview()

    // On success the QR step shows — look for either the pair QR image or the generate button
    await expect(
      page.locator('img[alt="pairing QR"], [data-testid="qr-generate"]'),
    ).toBeVisible({ timeout: 15_000 })
  })
})
