
import * as XLSX from 'xlsx'

export interface ExcelParseOptions {
    raw?: boolean
    header?: number
    dateNF?: string
}

export type ParsedSheet = Record<string, unknown>[]

const RESERVED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const sanitizeHeader = (value: unknown, index: number, used: Map<string, number>, emptyCounter: { value: number }) => {
    let key = String(value ?? '').trim()
    if (!key) {
        key = emptyCounter.value === 0 ? '__EMPTY' : `__EMPTY_${emptyCounter.value}`
        emptyCounter.value += 1
    }
    const lower = key.toLowerCase()
    if (RESERVED_KEYS.has(lower)) {
        key = `column_${index + 1}`
    }
    const seenCount = used.get(key) ?? 0
    used.set(key, seenCount + 1)
    return seenCount > 0 ? `${key}_${seenCount}` : key
}

const rowsToJson = (rows: unknown[][]): ParsedSheet => {
    if (!rows.length) return []
    const used = new Map<string, number>()
    const emptyCounter = { value: 0 }
    const headers = rows[0].map((value, index) => sanitizeHeader(value, index, used, emptyCounter))
    return rows.slice(1).map((row) => {
        const obj: Record<string, unknown> = Object.create(null)
        headers.forEach((header, index) => {
            obj[header] = row?.[index] ?? ''
        })
        return obj
    })
}

/**
 * Parses an Excel file (.xlsx, .xls) and returns the data.
 * For single-sheet logic, returns the first sheet's data.
 * For multi-sheet logic, can return a map of sheet names to data (future extension).
 */
export async function parseExcelFile(file: File): Promise<{
    sheets: Record<string, ParsedSheet>;
    sheetNames: string[];
}> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const data = e.target?.result
                if (!data) return reject(new Error('No data read from file'))

                const workbook = XLSX.read(data, { type: 'array', cellDates: true })
                const sheets: Record<string, ParsedSheet> = {}

                workbook.SheetNames.forEach((sheetName) => {
                    const worksheet = workbook.Sheets[sheetName]
                    const rows = XLSX.utils.sheet_to_json(worksheet, {
                        header: 1,
                        defval: '', // Default value for empty cells
                        raw: false, // Convert to strings/dates (more predictable for UI)
                    }) as unknown[][]
                    sheets[sheetName] = rowsToJson(rows)
                })

                resolve({
                    sheets,
                    sheetNames: workbook.SheetNames
                })
            } catch (err) {
                reject(err)
            }
        }

        reader.onerror = (err) => reject(err)
        reader.readAsArrayBuffer(file)
    })
}
