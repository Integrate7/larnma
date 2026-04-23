import { expect, test } from '@playwright/test'
import { createInvite, seedPrimaryAndElder } from '../helpers/seed'

test.describe('Secondary caregiver invite flow', () => {
  test('Primary creates invite, Secondary joins via link', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL ?? 'http://localhost:3100'
    const { ctx, fixture } = await seedPrimaryAndElder(base)

    // Primary generates the invite via API (UI tested in register flow)
    const { token, url } = await createInvite(ctx, fixture.elderId)
    expect(token).toBeTruthy()
    expect(url).toContain('/invite/')

    // Secondary opens the landing in a fresh browser context
    const secondary = await browser.newContext()
    const sPage = await secondary.newPage()
    await sPage.goto(`/invite/${token}`)
    await expect(sPage.getByTestId('invite-landing-header')).toBeVisible({
      timeout: 15_000,
    })

    await sPage.getByLabel('เบอร์โทรของคุณ').fill('0899111222')
    await sPage.getByTestId('invite-send-otp').click()

    // OTP field appears after send
    await expect(sPage.getByLabel('digit 1')).toBeVisible()
    await sPage.getByLabel('digit 1').focus()
    await sPage.keyboard.type('123456')
    await sPage.getByLabel('ชื่อของคุณ').fill('คุณน้อง')

    await sPage.getByTestId('invite-accept').click()
    await expect(sPage.getByRole('status')).toHaveText(/ยอมรับเรียบร้อย/, {
      timeout: 10_000,
    })

    // Go to dashboard — Secondary should land there with cookies from accept
    await sPage.getByTestId('invite-go-dashboard').click()
    await sPage.waitForURL('**/dashboard')
    await expect(
      sPage.getByRole('heading', { name: 'คุณแม่วันนี้' }),
    ).toBeVisible()
  })
})
