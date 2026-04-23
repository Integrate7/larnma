export function navigateToTel(phoneOrNumber: string): void {
  if (typeof window === 'undefined') return
  window.location.href = `tel:${phoneOrNumber}`
}
