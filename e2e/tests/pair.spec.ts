import { expect, test } from '@playwright/test'
import { seedPrimaryAndElder } from '../helpers/seed'

test.describe('Elder pairing via QR token', () => {
  test('consumes token and sets device cookie', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://localhost:3100'
    const { fixture } = await seedPrimaryAndElder(base)

    await page.goto(`/elder/pair?token=${fixture.pairingToken}`)
    await expect(page.getByTestId('pair-success')).toBeVisible({
      timeout: 15_000,
    })

    // Should redirect to elder home shortly after
    await page.waitForURL('**/elder', { timeout: 15_000 })
    await expect(page.getByTestId('mic-button')).toBeVisible()
  })

  test('rejects invalid token', async ({ page, baseURL }) => {
    const base = baseURL ?? 'http://localhost:3100'
    await seedPrimaryAndElder(base) // reset + seed to avoid stale state

    await page.goto('/elder/pair?token=not-a-real-token')
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 })
  })
})
