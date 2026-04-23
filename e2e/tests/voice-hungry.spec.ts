import { expect, test } from '@playwright/test'
import { copyCookies, seedPrimaryAndElder } from '../helpers/seed'

test.describe('Voice → HUNGRY event', () => {
  test('Elder HUNGRY shows up on Caregiver dashboard', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL ?? 'http://localhost:3100'
    const { ctx, fixture } = await seedPrimaryAndElder(base, {
      allergies: ['กุ้ง'],
    })

    const elder = await browser.newContext()
    const elderPage = await elder.newPage()
    await elderPage.goto(`/elder/pair?token=${fixture.pairingToken}`)
    await expect(elderPage.getByTestId('pair-success')).toBeVisible({
      timeout: 15_000,
    })
    await elderPage.waitForURL('**/elder')
    await expect(elderPage.getByTestId('mic-button')).toBeVisible()

    // Post HUNGRY audio through the Elder context (device cookie)
    const audioRes = await elder.request.post('/api/audio', {
      data: { hintKeyword: 'หิวข้าว อยากกินข้าวผัด' },
      headers: {
        origin: base,
        host: new URL(base).host,
        'content-type': 'application/json',
      },
    })
    expect(audioRes.ok()).toBeTruthy()

    // Open caregiver dashboard using seeded cookies
    const caregiver = await browser.newContext()
    await copyCookies(ctx.api, caregiver, base)
    const cgPage = await caregiver.newPage()
    await cgPage.goto('/dashboard')

    await expect(cgPage.locator('[data-mood="HUNGRY"]').first()).toBeVisible({
      timeout: 15_000,
    })
  })
})
