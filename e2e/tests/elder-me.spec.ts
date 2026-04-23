import { expect, test } from '@playwright/test'
import { seedPrimaryAndElder } from '../helpers/seed'

test.describe('Elder "ข้อมูลของฉัน" page', () => {
  test('elder can view their profile with conditions and allergies', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL ?? 'http://localhost:3100'
    const { fixture } = await seedPrimaryAndElder(base, {
      name: 'ย่าสมร',
      conditions: ['เบาหวาน'],
      allergies: ['กุ้ง'],
    })

    // Pair elder device
    const elder = await browser.newContext()
    const elderPage = await elder.newPage()
    await elderPage.goto(`/elder/pair?token=${fixture.pairingToken}`)
    await expect(elderPage.getByTestId('pair-success')).toBeVisible({
      timeout: 15_000,
    })
    await elderPage.waitForURL('**/elder')

    // Navigate to "ข้อมูลของฉัน" via the icon button
    await elderPage.getByTestId('elder-me-link').click()
    await elderPage.waitForURL('**/elder/me')

    // Profile data is visible
    await expect(elderPage.getByText('เบาหวาน')).toBeVisible()
    await expect(elderPage.getByText('กุ้ง')).toBeVisible()
    await expect(elderPage.getByText(fixture.elderPhone)).toBeVisible()

    // Back button navigates back to elder home
    await elderPage.getByRole('link', { name: /กลับ/ }).click()
    await elderPage.waitForURL('**/elder')
  })

  test('elder me page shows call-primary button when caregiver is paired', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL ?? 'http://localhost:3100'
    const { fixture } = await seedPrimaryAndElder(base)

    const elder = await browser.newContext()
    const elderPage = await elder.newPage()
    await elderPage.goto(`/elder/pair?token=${fixture.pairingToken}`)
    await expect(elderPage.getByTestId('pair-success')).toBeVisible({
      timeout: 15_000,
    })
    await elderPage.waitForURL('**/elder')

    await elderPage.goto('/elder/me')

    await expect(elderPage.getByTestId('elder-me-call-primary')).toBeVisible({
      timeout: 10_000,
    })
  })
})
