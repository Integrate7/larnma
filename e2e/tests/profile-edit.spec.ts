import { expect, test } from '@playwright/test'
import { copyCookies, seedPrimaryAndElder } from '../helpers/seed'

test.describe('Elder profile edit flow', () => {
  test('Primary can view + edit allergies', async ({ browser, baseURL }) => {
    const base = baseURL ?? 'http://localhost:3100'
    const { ctx, fixture } = await seedPrimaryAndElder(base, {
      allergies: ['กุ้ง'],
    })

    const caregiver = await browser.newContext()
    await copyCookies(ctx.api, caregiver, base)
    const page = await caregiver.newPage()

    await page.goto(`/caregiver/elders/${fixture.elderId}`)
    await expect(page.getByTestId('elder-profile-name')).toHaveText('ย่าสมร')
    await expect(
      page.getByTestId('elder-profile-allergies').getByText('กุ้ง'),
    ).toBeVisible()

    await page.getByTestId('elder-profile-edit-link').click()
    await page.waitForURL('**/edit')

    const allergyInput = page.getByTestId('elder-edit-allergies')
    // Wait until the edit form has hydrated + populated the input from
    // state.data, otherwise the next `fill` can race with React's useEffect
    // and end up being reset back to the server value.
    await expect(allergyInput).toHaveValue('กุ้ง')
    await allergyInput.fill('กุ้ง, ถั่ว')
    await expect(allergyInput).toHaveValue('กุ้ง, ถั่ว')
    await page.getByTestId('elder-edit-save').click()
    await expect(
      page.getByText('บันทึกเรียบร้อย', { exact: true }),
    ).toBeVisible({ timeout: 10_000 })

    // Verify via API that allergies persisted
    const api = await caregiver.request.get(
      `/api/elders/${fixture.elderId}`,
    )
    const body = await api.json()
    expect(body.allergies).toContain('ถั่ว')

    // Back on the view page the new allergy should also appear
    await page.goto(`/caregiver/elders/${fixture.elderId}`)
    await expect(
      page.getByTestId('elder-profile-allergies').getByText('ถั่ว'),
    ).toBeVisible()
  })
})
