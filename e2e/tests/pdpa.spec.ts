import { expect, test } from '@playwright/test'
import { RegisterPage } from '../pages/registerPage'
import { resetServerState } from '../helpers/reset'

test.describe('PDPA consent required', () => {
  test.beforeEach(async ({ baseURL }) => {
    await resetServerState(baseURL ?? 'http://localhost:3100')
  })

  test('rejects consent step without both required toggles', async ({
    page,
  }) => {
    const register = new RegisterPage(page)
    await register.goto()
    await register.start()
    await register.fillPhoneAndSend('0812345678')
    await register.fillOtp('123456')
    await register.verifyOtp()
    await register.fillCaregiverProfile('คุณลูก', 'ลูก')

    // Try to advance WITHOUT toggling consents
    await page.getByTestId('consent-next').click()
    await expect(
      page.getByText('ต้องยินยอมทั้ง 2 ข้อเพื่อใช้งาน'),
    ).toBeVisible()
  })
})
