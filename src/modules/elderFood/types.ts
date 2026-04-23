import type { MenuItem } from '@/services/menu'

export type { MenuItem }

export type AnnotatedMenuItem = MenuItem & {
  allergyMatch: string[]
  conditionMatch: string[]
  isSafe: boolean
  suggestedAlternative: string | null
}

export type FoodRequestStatus = 'idle' | 'requesting' | 'requested' | 'error'

export type ElderFoodState = {
  menus: AnnotatedMenuItem[]
  loading: boolean
  error: string | null
  selectedMenuId: string | null
  requestStatus: FoodRequestStatus
}
