export type ExpiryState = 'expired' | 'soon_3' | 'soon_7' | 'ok' | 'no_expiry'

export function getExpiryState(expiresAt?: string | null, now: Date = new Date()): ExpiryState {
  if (!expiresAt) return 'no_expiry'
  const expDate = new Date(expiresAt)
  if (!Number.isFinite(expDate.getTime())) return 'no_expiry'
  const diffMs = expDate.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  if (diffDays < 0) return 'expired'
  if (diffDays <= 3) return 'soon_3'
  if (diffDays <= 7) return 'soon_7'
  return 'ok'
}
