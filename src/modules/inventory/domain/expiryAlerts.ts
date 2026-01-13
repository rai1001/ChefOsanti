const MS_PER_DAY = 24 * 60 * 60 * 1000

export function daysUntilExpiry(expiresAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!expiresAt) return null
  const exp = new Date(expiresAt)
  if (Number.isNaN(exp.getTime())) return null
  const diff = exp.getTime() - now.getTime()
  return Math.floor(diff / MS_PER_DAY)
}

export function shouldTriggerAlert(expiresAt: string | null | undefined, daysBefore: number, now: Date = new Date()): boolean {
  if (!expiresAt || !Number.isFinite(daysBefore)) return false
  const days = daysUntilExpiry(expiresAt, now)
  if (days === null) return false
  return days <= daysBefore
}

export type ExpiryCategory = 'expired' | 'today' | 'soon_3' | 'soon_7' | 'ok' | 'none'

export function categorizeExpiry(expiresAt: string | null | undefined, now: Date = new Date()): ExpiryCategory {
  const days = daysUntilExpiry(expiresAt, now)
  if (days === null) return 'none'
  if (days < 0) return 'expired'
  if (days === 0) return 'today'
  if (days <= 3) return 'soon_3'
  if (days <= 7) return 'soon_7'
  return 'ok'
}
