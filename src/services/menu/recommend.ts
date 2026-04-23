import { MENU_CATALOG } from './catalog'
import type { MenuItem } from './types'

export type RecommendInput = {
  conditions?: string[]
  allergies?: string[]
  dislikes?: string[]
  limit?: number
}

export function recommendMenus(input: RecommendInput): MenuItem[] {
  const conditions = new Set(input.conditions ?? [])
  const allergies = new Set(input.allergies ?? [])
  const dislikes = new Set(input.dislikes ?? [])
  const filtered = MENU_CATALOG.filter((m) => {
    if (m.conditionsExcluded.some((c) => conditions.has(c))) return false
    if (m.allergensContained.some((a) => allergies.has(a))) return false
    if (dislikes.has(m.name)) return false
    return true
  })
  return filtered.slice(0, input.limit ?? 3)
}
