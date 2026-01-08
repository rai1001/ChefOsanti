import type { Role } from './roles'

export type PlanTier = 'basic' | 'pro' | 'vip'

export type AiFeature = {
  key: 'daily_brief' | 'ocr_review' | 'order_audit'
  minPlan: PlanTier
  minRole: Role
}

export const aiFeatures: AiFeature[] = [
  { key: 'daily_brief', minPlan: 'pro', minRole: 'manager' },
  { key: 'ocr_review', minPlan: 'pro', minRole: 'manager' },
  { key: 'order_audit', minPlan: 'vip', minRole: 'admin' },
]

const planRank: Record<PlanTier, number> = { basic: 1, pro: 2, vip: 3 }
const roleRank: Record<Role, number> = { staff: 1, manager: 2, admin: 3 }

export function canUseFeature(role: Role | undefined, plan: PlanTier, featureKey: AiFeature['key']) {
  const feature = aiFeatures.find((f) => f.key === featureKey)
  if (!feature) return false
  const userRole = role ?? 'staff'
  if (planRank[plan] < planRank[feature.minPlan]) return false
  if (roleRank[userRole] < roleRank[feature.minRole]) return false
  return true
}
