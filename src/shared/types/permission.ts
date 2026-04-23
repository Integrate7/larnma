export const PERMISSION_KEYS = [
  'view_dashboard',
  'receive_noti',
  'reply_to_elder',
  'edit_elder_profile',
  'pay_food_orders',
  'decide_emergency',
  'redeem_points',
  'invite_caregivers',
  'transfer_primary',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export type Permissions = Record<PermissionKey, boolean>

export const DEFAULT_PRIMARY_PERMISSIONS: Permissions = {
  view_dashboard: true,
  receive_noti: true,
  reply_to_elder: true,
  edit_elder_profile: true,
  pay_food_orders: true,
  decide_emergency: true,
  redeem_points: true,
  invite_caregivers: true,
  transfer_primary: true,
}

export const DEFAULT_SECONDARY_PERMISSIONS: Permissions = {
  view_dashboard: true,
  receive_noti: true,
  reply_to_elder: true,
  edit_elder_profile: false,
  pay_food_orders: false,
  decide_emergency: false,
  redeem_points: false,
  invite_caregivers: false,
  transfer_primary: false,
}
