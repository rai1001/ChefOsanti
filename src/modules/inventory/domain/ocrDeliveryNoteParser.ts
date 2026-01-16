export type ParsedDeliveryHeader = {
  supplierName?: string | null
  deliveryNoteNumber?: string | null
  deliveredAt?: string | null
}

export type ParsedDeliveryLine = {
  description: string
  qty: number | null
  unit: string | null
  expiresAt?: string | null
  lotCode?: string | null
}

export type ParsedDeliveryNote = {
  header: ParsedDeliveryHeader
  lines: ParsedDeliveryLine[]
  rawText: string
  warnings: string[]
}

const datePattern = /\b(\d{2}[./-]\d{2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/

function normalizeUnit(unit?: string | null): string | null {
  if (!unit) return null
  const u = unit.toLowerCase()
  if (/(kg|kilo)/.test(u)) return 'kg'
  if (/(ud|unidad|unidades|u\.?|pz|pzs)/.test(u)) return 'ud'
  return unit
}

function parseDate(text?: string | null): string | null {
  if (!text) return null
  const match = text.match(datePattern)
  if (!match) return null
  const clean = match[1].replace(/[^\d]/g, '')
  let year: number
  let month: number
  let day: number
  if (clean.length === 8) {
    if (text.startsWith('20')) {
      year = Number(clean.slice(0, 4))
      month = Number(clean.slice(4, 6))
      day = Number(clean.slice(6, 8))
    } else {
      day = Number(clean.slice(0, 2))
      month = Number(clean.slice(2, 4))
      year = Number(clean.slice(4, 8))
    }
  } else if (clean.length === 6) {
    day = Number(clean.slice(0, 2))
    month = Number(clean.slice(2, 4))
    const yy = Number(clean.slice(4, 6))
    year = yy >= 70 ? 1900 + yy : 2000 + yy
  } else {
    return null
  }
  if (!year || !month || !day) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
}

export function parseDeliveryNote(text: string): ParsedDeliveryNote {
  const warnings: string[] = []
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const joined = lines.join(' ')
  const header: ParsedDeliveryHeader = {}

  const supplierMatch = lines.find((l) => l.length > 3 && l === l.toUpperCase()) || lines[0]
  if (supplierMatch && supplierMatch.length <= 80) header.supplierName = supplierMatch

  const numberRegex = /(albar[aá]n|alb\.?|nº|n\.|numero|número)\s*[:-]?\s*([A-Za-z0-9-]+)/i
  const numMatch = joined.match(numberRegex)
  if (numMatch) header.deliveryNoteNumber = numMatch[2]

  header.deliveredAt = parseDate(joined)

  const parsedLines: ParsedDeliveryLine[] = []
  const lineRegex = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|kgs?|kilo|ud|unidad(?:es)?|u\.?|pz|pzs|caja|cajas|pack)?/i

  lines.forEach((line) => {
    if (/(albar|fecha|proveedor)/i.test(line)) return
    const m = line.match(lineRegex)
    if (m) {
      const desc = m[1].trim()
      const qty = Number(m[2].replace(',', '.'))
      const unit = normalizeUnit(m[3] || null)
      const lotMatch = line.match(/(lot[eo]|batch)\s*[:-]?\s*([A-Za-z0-9_/-]+)/i)
      const lotCode = lotMatch ? lotMatch[2].toUpperCase() : null
      const expiresAt = parseDate(line)

      parsedLines.push({
        description: desc,
        qty: Number.isFinite(qty) ? qty : null,
        unit,
        lotCode,
        expiresAt,
      })
    }
  })

  if (parsedLines.length === 0) {
    warnings.push('No se pudieron estructurar líneas automáticamente')
  }

  return {
    header,
    lines: parsedLines,
    rawText: text,
    warnings,
  }
}

export function buildShipmentDedupeKey(params: {
  orgId: string
  supplierName?: string | null
  deliveryNoteNumber?: string | null
  deliveredAt?: string | null
  rawText?: string | null
}) {
  const parts = [
    params.orgId || '',
    (params.supplierName ?? '').toLowerCase().trim(),
    (params.deliveryNoteNumber ?? '').toLowerCase().trim(),
    params.deliveredAt ?? '',
    (params.rawText ?? '').trim().slice(0, 120),
  ]
  return parts.join('|')
}
