export type ExpiryLotSuggestion = {
  expiresAt?: string
  lotCode?: string
  confidence: number
  rawMatches: string[]
}

function toIsoDate(value: string): string | undefined {
  const clean = value.replace(/[^\d]/g, '')
  let year: number
  let month: number
  let day: number

  if (/^\d{4}[\/.-]\d{2}[\/.-]\d{2}$/.test(value)) {
    year = Number(clean.slice(0, 4))
    month = Number(clean.slice(4, 6))
    day = Number(clean.slice(6, 8))
  } else if (clean.length === 8) {
    day = Number(clean.slice(0, 2))
    month = Number(clean.slice(2, 4))
    year = Number(clean.slice(4, 8))
  } else if (clean.length === 6) {
    day = Number(clean.slice(0, 2))
    month = Number(clean.slice(2, 4))
    const yy = Number(clean.slice(4, 6))
    year = yy >= 70 ? 1900 + yy : 2000 + yy
  } else if (clean.length === 8 && value.startsWith('20')) {
    year = Number(clean.slice(0, 4))
    month = Number(clean.slice(4, 6))
    day = Number(clean.slice(6, 8))
  } else {
    return undefined
  }
  if (!year || !month || !day) return undefined
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

export function parseExpiryAndLot(text: string): ExpiryLotSuggestion {
  const rawMatches: string[] = []
  const dateRegex = /\b(\d{2}[\/.-]\d{2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g
  let expiresAt: string | undefined
  let confidence = 0

  const keywordBeforeDate = /(cad|caduc|caducidad|best before|consumir preferentemente)/i

  for (const match of text.matchAll(dateRegex)) {
    const raw = match[1]
    rawMatches.push(raw)
    const iso = toIsoDate(raw)
    if (!iso) continue
    expiresAt = iso
    confidence = keywordBeforeDate.test(text) ? 0.9 : Math.max(confidence, 0.6)
  }

  const lotRegex = /(lot[eo]?:?\s*([A-Za-z0-9\-_/]+)|batch\s*([A-Za-z0-9\-_/]+))/i
  const lotMatch = text.toLowerCase().match(lotRegex)
  const lotCode = lotMatch ? (lotMatch[2] || lotMatch[3] || '').toUpperCase() : undefined
  if (lotCode) rawMatches.push(lotCode)

  if (!expiresAt && !lotCode) {
    return { confidence: 0, rawMatches: [] }
  }

  return {
    expiresAt,
    lotCode,
    confidence: expiresAt ? confidence || 0.5 : 0.4,
    rawMatches,
  }
}
