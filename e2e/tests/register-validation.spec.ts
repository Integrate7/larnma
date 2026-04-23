import { expect, test } from '@playwright/test'
import { RegisterPage } from '../pages/registerPage'
import { resetServerState } from '../helpers/reset'

test.describe('Register form validation', () => {
  test.beforeEach(async ({ baseURL }) => {
    await resetServerState(baseURL ?? 'http://localhost:3100')
  })

  test('invalid phone format shows validation error', async ({ page }) => {
    const register = new RegisterPage(page)
    await register.goto()
    await register.start()

    // Type a non-phone string and try to advance
    await page.getByPlaceholder(/เบอร์/).fill('abc')
    await page.getByTestId('phone-next').click()

    // Client-side validation message from Zod — FormField renders role="alert"
    await expect(page.getByText('เบอร์ต้องเป็น 10 หลัก')).toBeVisible()
  })

  test('wrong OTP shows error message', async ({ page }) => {
    const register = new RegisterPage(page)
    await register.goto()
    await register.start()

    await register.fillPhoneAndSend('0812345678')
    // OTP step is now shown
    await expect(page.getByText(/OTP/)).toBeVisible()

    // Enter wrong code
    await register.fillOtp('000000')
    await register.verifyOtp()

    // Global error message is shown (error code 'INVALID' returned from API)
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 10_000 })
  })

  test('correct OTP after wrong attempt proceeds', async ({ page }) => {
    const register = new RegisterPage(page)
    await register.goto()
    await register.start()

    await register.fillPhoneAndSend('0812345678')
    await expect(page.getByText(/OTP/)).toBeVisible()

    // First attempt with wrong code
    await register.fillOtp('000000')
    await register.verifyOtp()
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 10_000 })

    // Second attempt with correct code — should proceed to caregiver step
    await register.fillOtp('123456')
    await register.verifyOtp()
    await expect(page.locator('#caregiverName')).toBeVisible({ timeout: 10_000 })
  })

  test('consent step blocks without both required toggles', async ({ page }) => {
    const register = new RegisterPage(page)
    await register.goto()
    await register.start()

    await register.fillPhoneAndSend('0812345678')
    await register.fillOtp('123456')
    await register.verifyOtp()
    await register.fillCaregiverProfile('คุณลูก', 'ลูก')

    // Try to advance without toggling consents
    await page.getByTestId('consent-next').click()
    await expect(page.getByText('ต้องยินยอมทั้ง 2 ข้อเพื่อใช้งาน')).toBeVisible()
  })
})
