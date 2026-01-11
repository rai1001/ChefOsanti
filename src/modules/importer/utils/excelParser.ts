
import * as XLSX from 'xlsx'

export interface ExcelParseOptions {
    raw?: boolean
    header?: number
    dateNF?: string
}

export type ParsedSheet = any[]

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
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        defval: '', // Default value for empty cells
                        raw: false, // Convert to strings/dates (more predictable for UI)
                    })
                    sheets[sheetName] = jsonData
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
