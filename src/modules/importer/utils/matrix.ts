// Helper to normalize dates (Excel can return strings like "10/05/2025" or Date objects)
export const normalizeDate = (input: any, defaultYear?: number): string | null => {
    if (!input) return null
    if (input instanceof Date) return input.toISOString()

    // Logic for handling Strings
    if (typeof input === 'string') {
        // Case 1: DD/MM/YYYY (Explicit Year)
        if (input.match(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/)) {
            const parts = input.split(/[\/\-]/)
            // Assuming DD/MM/YYYY
            const day = Number(parts[0])
            const month = Number(parts[1])
            const year = Number(parts[2])
            return new Date(year, month - 1, day).toISOString()
        }

        // Case 2: DD/MM (Implicit Year) or "15-Ene" (Implicit Year)
        const shortDateMatch = input.match(/^(\d{1,2})[\/\-](\d{1,2})$/)
        if (shortDateMatch && defaultYear) {
            const day = Number(shortDateMatch[1])
            const month = Number(shortDateMatch[2])
            return new Date(defaultYear, month - 1, day).toISOString()
        }
    }

    // Fallback: Standard parsing
    const d = new Date(input)
    if (!isNaN(d.getTime())) {
        if (defaultYear && d.getFullYear() !== defaultYear) {
            if (!/\d{4}/.test(String(input))) {
                d.setFullYear(defaultYear)
                return d.toISOString()
            }
        }
        return d.toISOString()
    }

    console.warn('Could not parse date:', input)
    return null
}

const monthsFull = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
const monthsShort = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const monthsEng = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
const monthsEngShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export const processMatrixData = (raw: any[], headerIndex: number, dateColKey: string, selectedSheetName: string, fileName: string): any[] => {
    if (!raw || raw.length <= headerIndex) return []
    const unpivoted: any[] = []

    let currentMonthIdx = -1

    const sNameUpper = selectedSheetName.toUpperCase()
    for (let i = 0; i < 12; i++) {
        if (sNameUpper.includes(monthsFull[i]) || sNameUpper.includes(monthsShort[i]) || sNameUpper.includes(monthsEng[i]) || sNameUpper.includes(monthsEngShort[i])) {
            currentMonthIdx = i
            break
        }
    }

    const yearRegex = /20[1-2]\d/
    const yearMatch = selectedSheetName.match(yearRegex) || (fileName || '').match(yearRegex)
    const year = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear()

    raw.forEach(row => {
        const cellDate = row[dateColKey]
        const cellDateStr = cellDate ? String(cellDate).toUpperCase().trim() : ''

        let isHeaderRow = false
        if (cellDateStr && !/^\d/.test(cellDateStr)) {
            const junkKeywords = ['TOTAL', 'TRIMESTRE', 'SEMESTRE', 'NOTAS']
            if (!junkKeywords.some(k => cellDateStr.includes(k))) {
                let foundIdx = monthsFull.findIndex(m => cellDateStr === m || (cellDateStr.includes(m) && cellDateStr.length < 20))
                if (foundIdx === -1) foundIdx = monthsShort.findIndex(m => cellDateStr === m)
                if (foundIdx === -1) foundIdx = monthsEng.findIndex(m => cellDateStr === m || (cellDateStr.includes(m) && cellDateStr.length < 20))
                if (foundIdx === -1) foundIdx = monthsEngShort.findIndex(m => cellDateStr === m)
                if (foundIdx !== -1) {
                    currentMonthIdx = foundIdx
                    isHeaderRow = true
                }
            }
        }
        if (isHeaderRow) return

        const dateValue = row[dateColKey]
        if (!dateValue) return
        const dateStr = String(dateValue).toUpperCase().trim()
        const junkKeywords = [
            'TOTAL', 'P.V.P', 'IDENTIFICACIÓN', 'ALERGENOS',
            'ROOM', 'DESAYUNO', 'BANQUETES', 'COFFEE',
            'MINIBAR', 'SALA', 'PRODUCCION', 'BAR', 'BUFFET',
            'HORAS', 'EQUIPOS', 'GRUPOS', 'ESTADO',
            'TRIMESTRE', 'SEMESTRE'
        ]
        if (junkKeywords.some(k => dateStr.includes(k))) return

        let finalDate = null
        if (typeof dateValue === 'number' || (typeof dateValue === 'string' && dateValue.match(/^\d{1,2}$/))) {
            const day = Number(dateValue)
            if (day >= 1 && day <= 31) {
                if (currentMonthIdx >= 0) {
                    finalDate = new Date(year, currentMonthIdx, day).toISOString()
                }
            }
        } else {
            finalDate = normalizeDate(dateValue, year)
            if (finalDate) {
                const d = new Date(finalDate)
                if (!isNaN(d.getTime())) {
                    currentMonthIdx = d.getMonth()
                }
            }
        }
        if (!finalDate) return

        Object.keys(row).forEach(key => {
            if (key !== dateColKey && key !== '__rowNum__' && !key.startsWith('__EMPTY')) {
                const cellValue = row[key]
                if (cellValue && /\S/.test(String(cellValue))) {
                    unpivoted.push({
                        name: cellValue,
                        date: finalDate,
                        location: key,
                    })
                }
            }
        })
    })
    return unpivoted
}
