import { expect, test } from '@playwright/test'
import { copyCookies, seedPrimaryAndElder } from '../helpers/seed'

test.describe('Food order flow', () => {
  test('HUNGRY event → caregiver acks → picks safe menu → order confirmed', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL ?? 'http://localhost:3100'
    // No allergies → all menus are safe
    const { ctx, fixture } = await seedPrimaryAndElder(base)

    // Pair elder device to get device cookie
    const elder = await browser.newContext()
    const elderPage = await elder.newPage()
    await elderPage.goto(`/elder/pair?token=${fixture.pairingToken}`)
    await expect(elderPage.getByTestId('pair-success')).toBeVisible({
      timeout: 15_000,
    })
    await elderPage.waitForURL('**/elder')

    // Elder sends HUNGRY audio
    const audioRes = await elder.request.post('/api/audio', {
      data: { hintKeyword: 'หิวข้าว อยากกินข้าวผัด' },
      headers: {
        origin: base,
        host: new URL(base).host,
        'content-type': 'application/json',
      },
    })
    expect(audioRes.ok()).toBeTruthy()
    const audio = await audioRes.json()
    expect(audio.mood).toBe('HUNGRY')

    // Caregiver opens dashboard
    const caregiver = await browser.newContext()
    await copyCookies(ctx.api, caregiver, base)
    const cgPage = await caregiver.newPage()
    await cgPage.goto('/dashboard')

    // HUNGRY notification appears
    await expect(cgPage.locator('[data-mood="HUNGRY"]').first()).toBeVisible({
      timeout: 15_000,
    })

    // Ack the notification to reveal menu suggestions
    const ackBtn = cgPage
      .getByTestId('dashboard-notis')
      .getByRole('button', { name: /ฉันจัดการ/ })
      .first()
    await expect(ackBtn).toBeVisible()
    await ackBtn.click()

    // Safe menu button appears (ข้าวผัดกะเพราไก่ has no allergens)
    const menuBtn = cgPage.getByTestId('order-menu-kao-phat-gapraw')
    await expect(menuBtn).toBeVisible({ timeout: 10_000 })
    await menuBtn.click()

    // After ordering, "สั่งเรียบร้อย" label replaces the ack button
    await expect(
      cgPage.getByTestId('dashboard-notis').getByText('สั่งเรียบร้อย').first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('HUNGRY event with allergy → unsafe menu shows warning dialog → confirm still orders', async ({
    browser,
    baseURL,
  }) => {
    const base = baseURL ?? 'http://localhost:3100'
    // Elder is allergic to กุ้ง — ต้มยำกุ้ง will trigger allergy dialog
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

    await elder.request.post('/api/audio', {
      data: { hintKeyword: 'หิวข้าว อยากกินต้มยำ' },
      headers: {
        origin: base,
        host: new URL(base).host,
        'content-type': 'application/json',
      },
    })

    const caregiver = await browser.newContext()
    await copyCookies(ctx.api, caregiver, base)
    const cgPage = await caregiver.newPage()
    await cgPage.goto('/dashboard')

    await expect(cgPage.locator('[data-mood="HUNGRY"]').first()).toBeVisible({
      timeout: 15_000,
    })

    await cgPage
      .getByTestId('dashboard-notis')
      .getByRole('button', { name: /ฉันจัดการ/ })
      .first()
      .click()

    // Unsafe menu button (ต้มยำกุ้ง) is rendered in destructive style
    const unsafeBtn = cgPage.getByTestId('order-menu-tom-yam-kung')
    await expect(unsafeBtn).toBeVisible({ timeout: 10_000 })
    await unsafeBtn.click()

    // Allergy warning dialog appears
    await expect(cgPage.getByRole('dialog')).toBeVisible({ timeout: 5_000 })
    await expect(cgPage.getByRole('dialog')).toContainText('กุ้ง')

    // Caregiver confirms anyway
    await cgPage.getByTestId('confirm-allergic-order').click()

    // Order still goes through
    await expect(
      cgPage.getByTestId('dashboard-notis').getByText('สั่งเรียบร้อย').first(),
    ).toBeVisible({ timeout: 10_000 })
  })
})
