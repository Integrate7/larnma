import type { Page } from '@playwright/test'

export class ElderHomePage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/elder')
  }

  micButton() {
    return this.page.getByTestId('mic-button')
  }

  offlineCallButton() {
    return this.page.getByTestId('elder-offline-call')
  }

  lastResult() {
    return this.page.getByTestId('elder-last-result')
  }

  async openProfile() {
    await this.page.getByTestId('elder-me-link').click()
  }
}
