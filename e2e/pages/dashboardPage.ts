import { expect, type Page } from '@playwright/test'

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/dashboard')
  }

  latest() {
    return this.page.getByTestId('dashboard-latest')
  }

  timeline() {
    return this.page.getByTestId('dashboard-timeline')
  }

  notifications() {
    return this.page.getByTestId('dashboard-notis')
  }

  async reload() {
    await this.page.reload()
  }

  async waitForMood(mood: string) {
    await expect(
      this.page.locator(`[data-mood="${mood}"]`).first(),
    ).toBeVisible({ timeout: 15_000 })
  }
}
