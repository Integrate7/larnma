import { expect, test } from '@playwright/test'
import { copyCookies, seedPrimaryAndElder } from '../helpers/seed'

test.describe('Voice → DANGER event', () => {
  test('Elder DANGER creates critical noti; caregiver acks to lock', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL ?? 'http://localhost:3100'
    const { ctx, fixture } = await seedPrimaryAndElder(base)

    const elder = await browser.newContext()
    const elderPage = await elder.newPage()
    await elderPage.goto(`/elder/pair?token=${fixture.pairingToken}`)
    await expect(elderPage.getByTestId('pair-success')).toBeVisible({
      timeout: 15_000,
    })
    await elderPage.waitForURL('**/elder')

    const audioRes = await elder.request.post('/api/audio', {
      data: { hintKeyword: 'ช่วยด้วย ล้ม' },
      headers: {
        origin: base,
        host: new URL(base).host,
        'content-type': 'application/json',
      },
    })
    const audio = await audioRes.json()
    expect(audio.mood).toBe('DANGER')

    const caregiver = await browser.newContext()
    await copyCookies(ctx.api, caregiver, base)
    const cgPage = await caregiver.newPage()
    await cgPage.goto('/dashboard')

    await expect(cgPage.locator('[data-mood="DANGER"]').first()).toBeVisible({
      timeout: 15_000,
    })

    const ackButton = cgPage
      .getByTestId('dashboard-notis')
      .getByRole('button', { name: /ฉันจัดการ/ })
      .first()
    await expect(ackButton).toBeVisible()
    await ackButton.click()

    // After ack the button should disappear (row shows "รับทราบแล้ว")
    await expect(
      cgPage.getByTestId('dashboard-notis').getByText('รับทราบแล้ว').first(),
    ).toBeVisible({ timeout: 10_000 })
  })
})
