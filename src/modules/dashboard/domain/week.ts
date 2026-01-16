const DEFAULT_TZ = 'Europe/Madrid'

function toZonedDate(dateInput: Date | string, timeZone: string) {
  const source = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(source).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value
    return acc
  }, {})
  const year = Number(parts.year)
  const month = Number(parts.month) - 1
  const day = Number(parts.day)
  const zoned = new Date(Date.UTC(year, month, day))
  return zoned
}

export function startOfWeek(dateInput: Date | string = new Date(), timeZone: string = DEFAULT_TZ) {
  const zoned = toZonedDate(dateInput, timeZone)
  const dayOfWeek = (zoned.getUTCDay() + 6) % 7 // Monday = 0
  const start = new Date(zoned)
  start.setUTCDate(zoned.getUTCDate() - dayOfWeek)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

export function endOfWeek(weekStart: Date | string, timeZone: string = DEFAULT_TZ) {
  const start = startOfWeek(weekStart, timeZone)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  end.setUTCHours(23, 59, 59, 999)
  return end
}

export function startOfRange(dateInput: Date | string = new Date(), timeZone: string = DEFAULT_TZ) {
  const start = toZonedDate(dateInput, timeZone)
  start.setUTCHours(0, 0, 0, 0)
  return start
}

export function endOfRange(dateInput: Date | string, days: number = 7, timeZone: string = DEFAULT_TZ) {
  const start = startOfRange(dateInput, timeZone)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + Math.max(days - 1, 0))
  end.setUTCHours(23, 59, 59, 999)
  return end
}
