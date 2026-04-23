export function navigateToTel(phoneOrNumber: string): void {
  if (globalThis.window === undefined) return
  globalThis.location.href = `tel:${phoneOrNumber}`
}
