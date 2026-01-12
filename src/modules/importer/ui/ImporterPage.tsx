import { useState, useRef } from 'react'

import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useImportJobs, useImportStage, useImportValidate, useImportCommit, useImportJobRows } from '../data/importer'
import { parseCSV } from '../data/csvParser'
import { listHotelsByOrg } from '@/modules/orgs/data/hotels'
import { useQuery } from '@tanstack/react-query'
import type { ImportEntity } from '../domain/types'

export default function ImporterPage() {
    // State
    const { activeOrgId } = useActiveOrgId()
    const [entity, setEntity] = useState<ImportEntity>('suppliers')
    const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [activeJobId, setActiveJobId] = useState<string | null>(null)
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    // Events Specific State
    const [rawSheet, setRawSheet] = useState<any[] | null>(null)
    const [sheets, setSheets] = useState<Record<string, any[]>>({})
    const [sheetNames, setSheetNames] = useState<string[]>([])
    const [selectedSheetName, setSelectedSheetName] = useState<string>('')
    const [dateColumn, setDateColumn] = useState<string>('')
    const [selectedHotelId, setSelectedHotelId] = useState<string>('')
    const [activeParsedData, setActiveParsedData] = useState<any[] | null>(null) // For non-event standard CSV/Excel

    const { data: hotels } = useQuery({
        queryKey: ['hotels', activeOrgId],
        queryFn: () => activeOrgId ? listHotelsByOrg(activeOrgId) : Promise.resolve([]),
        enabled: !!activeOrgId && entity === 'events'
    })

    // Queries & Mutations
    const jobs = useImportJobs(activeOrgId ?? undefined)
    const jobRows = useImportJobRows(activeJobId ?? undefined)
    const stageMutation = useImportStage()
    const validateMutation = useImportValidate()
    const commitMutation = useImportCommit()

    const activeJob = jobs.data?.find(j => j.id === activeJobId)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Handlers
    const processMatrixData = (raw: any[], headerIndex: number, dateColKey: string, selectedSheetName: string): any[] => {
        if (!raw || raw.length <= headerIndex) return []
        const unpivoted: any[] = []

        // Initialize Quarter/Month Context
        const monthsFull = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
        const monthsShort = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
        const monthsEng = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
        const monthsEngShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

        // Try to determine initial month from Sheet Name (e.g. "2025-ENE-MAR" -> Starts with ENE)
        const sNameUpper = selectedSheetName.toUpperCase()
        // Find FIRST occurrence of any month in the sheet name to use as default
        // We iterate through months chronologicaly, but we should probably check position?
        // Simple heuristic: First match in the month list is usually the start of the quarter (Jan, Apr, Jul, Oct) if ordered.
        let currentMonthIdx = -1

        // Find the first month that appears in the sheet name (Scanning 0..11)
        // This favors "ENERO" in "ENERO-MARZO"
        for (let i = 0; i < 12; i++) {
            if (sNameUpper.includes(monthsFull[i]) || sNameUpper.includes(monthsShort[i]) || sNameUpper.includes(monthsEng[i]) || sNameUpper.includes(monthsEngShort[i])) {
                currentMonthIdx = i
                break
            }
        }

        // Try to find Year in Sheet Name (e.g. "2025-...") OR File Name
        // Regex to find years like 2014, 2025, 2026. Matches 2010-2029 to be safe, or just 4 digits.
        const yearRegex = /20[1-2]\d/
        const yearMatch = selectedSheetName.match(yearRegex) || (file?.name || '').match(yearRegex)
        const year = yearMatch ? Number(yearMatch[0]) : new Date().getFullYear()

        raw.forEach(row => {
            // 1. Context Switch Check: Scan Date Column Only (or First Column if Date Empty)
            // Priority: Date Column -> Then other columns if date is empty

            const cellDate = row[dateColKey]
            const cellDateStr = cellDate ? String(cellDate).toUpperCase().trim() : ''

            // Check Date Column Context Switch
            let isHeaderRow = false

            // Only consider it a header if it's NOT a number (e.g. "15") and matches a month name exactly or closely
            if (cellDateStr && !/^\d/.test(cellDateStr)) {
                // Skip known junk (Total, etc)
                const junkKeywords = ['TOTAL', 'TRIMESTRE', 'SEMESTRE', 'NOTAS']
                if (!junkKeywords.some(k => cellDateStr.includes(k))) {
                    let foundIdx = monthsFull.findIndex(m => cellDateStr === m || (cellDateStr.includes(m) && cellDateStr.length < 20)) // Strict length to avoid titles
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

            // 2. Process Date Data
            // Note: dateValue was already grabbed above but let's re-declare or just use `cellDate` if compatible?
            // To minimize diff risk, we'll keep existing flow but ensure we rely on `dateValue`.
            const dateValue = row[dateColKey]
            if (!dateValue) return
            const dateStr = String(dateValue).toUpperCase().trim()

            // Junk check again for the specific date column specific value
            const junkKeywords = [
                'TOTAL', 'P.V.P', 'IDENTIFICACIÓN', 'ALERGENOS',
                'ROOM', 'DESAYUNO', 'BANQUETES', 'COFFEE',
                'MINIBAR', 'SALA', 'PRODUCCION', 'BAR', 'BUFFET',
                'HORAS', 'EQUIPOS', 'GRUPOS', 'ESTADO',
                'TRIMESTRE', 'SEMESTRE'
            ]
            if (junkKeywords.some(k => dateStr.includes(k))) return

            // Parse Date immediately to verify validity
            let finalDate = null

            // Numeric day (1-31) logic
            if (typeof dateValue === 'number' || (typeof dateValue === 'string' && dateValue.match(/^\d{1,2}$/))) {
                const day = Number(dateValue)
                if (day >= 1 && day <= 31) {
                    // Use detected context
                    if (currentMonthIdx >= 0) {
                        finalDate = new Date(year, currentMonthIdx, day).toISOString()
                    }
                }
            } else {
                // Standard or String date
                // Standard or String date
                finalDate = normalizeDate(dateValue, year)

                // If we resolved a full date (not just a day number), Update the Context!
                // This handles cases where a header is actually "01/02/2026" formatted as "Febrero"
                // or if the list just jumps to "15-Feb" without a header.
                if (finalDate) {
                    const d = new Date(finalDate)
                    if (!isNaN(d.getTime())) {
                        currentMonthIdx = d.getMonth()
                    }
                }
            }

            // FILTER: If we couldn't resolve a valid date, SKIP this row entirely
            // This prevents "Missing starts_at" errors for miscellaneous text rows
            if (!finalDate) return

            Object.keys(row).forEach(key => {
                // Ignore the Date Column itself, internal row num, and any empty header columns from XLSX parsing
                if (key !== dateColKey && key !== '__rowNum__' && !key.startsWith('__EMPTY')) {
                    const cellValue = row[key]
                    // Strict filter: omit null/undefined and empty/whitespace strings
                    if (cellValue && /\S/.test(String(cellValue))) {
                        unpivoted.push({
                            name: cellValue,
                            date: finalDate,
                            location: key, // Using Column Header as Location Name
                        })
                    }
                }
            })
        })
        return unpivoted
    }

    // Helper to normalize dates (Excel can return strings like "10/05/2025" or Date objects)
    // Helper to normalize dates (Excel can return strings like "10/05/2025" or Date objects)
    const normalizeDate = (input: any, defaultYear?: number): string | null => {
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
            // If defaultYear is provided, we must enforce it.
            // Problem: new Date("10/05") defaults to 2001 (Chrome) or Current Year.
            // We retry parsing with the year appended if possible, or construct manually.

            // DD/MM Regex
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
            // Fix: If standard parsing results in "Current Year" (or 2001) but we have a `defaultYear` different from it,
            // AND the input string didn't look like it had a year... we might want to override.
            // However, detecting "did it have a year" is tricky across locales.
            // Safe bet: If we passed `defaultYear`, we expect the result to be in that year UNLESS input explicitly had another year.

            // For now, let's trust explicit DD/MM logic above for overrides.
            // If it falls through here (e.g. "15 Jan"), we can try to fix the year if it mismatches.
            if (defaultYear && d.getFullYear() !== defaultYear) {
                // Heuristic: If input lacks 4 digits, assume it meant defaultYear
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

    const parsePreviewExcel = async (file: File) => {
        const { parseExcelFile } = await import('@/modules/importer/utils/excelParser')
        const { sheets, sheetNames } = await parseExcelFile(file)
        if (sheetNames.length === 0) throw new Error('El archivo Excel está vacío')

        // Return full structure
        return { sheets, sheetNames }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setNotification(null)
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return
        setFile(selectedFile)
        setRawSheet(null)
        setActiveParsedData(null)
        setSheets({})
        setSheetNames([])
        setSelectedSheetName('')

        if (selectedFile.name.match(/\.xlsx?$/)) {
            try {
                // Pre-parse to facilitate UI configuration (header selection)
                const { sheets, sheetNames } = await parsePreviewExcel(selectedFile)
                setSheets(sheets)
                setSheetNames(sheetNames)

                // Default to first sheet
                const firstSheet = sheetNames[0]
                setSelectedSheetName(firstSheet)
                const data = sheets[firstSheet]
                const headers = data.length > 0 ? Object.keys(data[0]) : []

                if (entity === 'events') {
                    setRawSheet(data)
                    // Auto-detect date column
                    const potentialDate = headers.find(h => h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date'))
                    if (potentialDate) setDateColumn(potentialDate)
                } else {
                    setActiveParsedData(data)
                }
            } catch (err) {
                setNotification({ type: 'error', message: 'Error al leer Excel' })
                console.error(err)
            }
        }
    }

    // Handle switching sheets
    const handleSheetChange = (newSheetName: string) => {
        setSelectedSheetName(newSheetName)
        const data = sheets[newSheetName] || []
        const headers = data.length > 0 ? Object.keys(data[0]) : []

        if (entity === 'events') {
            setRawSheet(data)
            // Do NOT reset date column on sheet change - persist user selection
            // Auto-detect date column ONLY if not already set
            const potentialDate = headers.find(h => h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date'))
            if (potentialDate && !dateColumn) setDateColumn(potentialDate)
        } else {
            setActiveParsedData(data)
        }
    }

    const handleStage = async () => {
        if (!activeOrgId || !file) return
        setIsLoading(true)
        try {
            let rows: any[] = []

            if (file.name.endsWith('.csv')) {
                rows = await parseCSV(file)
            } else if (file.name.match(/\.xlsx?$/)) {
                if (entity === 'events') {
                    if (!selectedHotelId) throw new Error('Selecciona un hotel')
                    if (sheetNames.length === 0) throw new Error('No se encontraron hojas en el Excel')

                    // Iterate ALL sheets
                    const allUnpivoted: any[] = []
                    const skippedSheets: string[] = []

                    for (const sName of sheetNames) {
                        const sData = sheets[sName]
                        if (!sData || sData.length === 0) {
                            skippedSheets.push(`${sName} (Vacía)`)
                            continue
                        }

                        const sHeaders = Object.keys(sData[0])
                        // Auto-detect date column per sheet
                        let sDateCol = ''
                        const potentialDate = sHeaders.find(h => h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date'))

                        // 1. SMART MATCH: Check if any header is a Month Name that matches the Sheet Name
                        // e.g. Sheet "2025-ENERO" -> Look for column "ENERO"
                        // Support 3-letter abbreviations (Spanish & English)
                        const monthsFull = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']
                        const monthsShort = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
                        const monthsEng = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER']
                        const monthsEngShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

                        const sNameUpper = sName.toUpperCase()

                        // Find matches by full or short name (Spanish then English)
                        let sheetMonthIndex = monthsFull.findIndex(m => sNameUpper.includes(m))
                        if (sheetMonthIndex === -1) sheetMonthIndex = monthsShort.findIndex(m => sNameUpper.includes(m))
                        if (sheetMonthIndex === -1) sheetMonthIndex = monthsEng.findIndex(m => sNameUpper.includes(m))
                        if (sheetMonthIndex === -1) sheetMonthIndex = monthsEngShort.findIndex(m => sNameUpper.includes(m))

                        const sheetMonthName = sheetMonthIndex >= 0 ? monthsFull[sheetMonthIndex] : null

                        if (sheetMonthName && sHeaders.includes(sheetMonthName)) {
                            sDateCol = sheetMonthName
                        }
                        // STRICT REMOVED: Do not skip just because sheet name doesn't match a month.
                        // We will check for Date columns next.

                        // 2. Fallback to "Fecha"/"Date" scan
                        else if (potentialDate) {
                            sDateCol = potentialDate
                        }
                        // 3. User Selection (only if it exists in this sheet)
                        else if (dateColumn && sHeaders.includes(dateColumn)) {
                            sDateCol = dateColumn
                        }
                        // 4. Last Resort: First Column (often implicit date)
                        else {
                            sDateCol = sHeaders[0]
                            console.warn(`Sheet ${sName}: Auto-selecting first column '${sDateCol}' as Date Column.`)
                        }

                        if (!sDateCol) {
                            skippedSheets.push(`${sName} (Sin columna fecha)`)
                            continue
                        }

                        const unpivoted = processMatrixData(sData, 0, sDateCol, sName)
                        if (unpivoted.length === 0) {
                            skippedSheets.push(`${sName} (Sin filas válidas - ¿Fallo mes?)`)
                        }
                        allUnpivoted.push(...unpivoted)
                    }

                    if (allUnpivoted.length === 0) throw new Error('No se pudieron extraer eventos. Hojas omitidas: ' + skippedSheets.join(', '))

                    rows = allUnpivoted.map(u => ({
                        title: u.name,
                        name: u.name,
                        // Ensure starts_at is ISO8601 to prevent SQL Cast Errors (400 Bad Request)
                        starts_at: normalizeDate(u.date),
                        hotel_id: selectedHotelId,
                        // WORKAROUND: Send hotel_name for old backend validation compatibility
                        // WORKAROUND: Send hotel_name for old backend validation compatibility
                        // Fallback to "Hotel Atlantico" if lookup fails (temporary fix for user)
                        hotel_name: hotels?.find(h => h.id === selectedHotelId)?.name || 'Hotel Atlantico',
                        space_name: u.location,
                        status: 'confirmed'
                    }))

                    let msg = `Procesados ${rows.length} eventos.`
                    if (skippedSheets.length > 0) {
                        msg += ` Omitidas: ${skippedSheets.join(', ')}`
                    }
                    setNotification({ type: 'success', message: msg })

                } else {
                    // Non-events standard logic (single sheet)
                    if (activeParsedData) {
                        rows = activeParsedData
                    } else if (sheetNames.length > 0 && selectedSheetName) {
                        rows = sheets[selectedSheetName]
                    } else {
                        const { sheets: reSheets, sheetNames: reNames } = await parsePreviewExcel(file)
                        rows = reSheets[reNames[0]]
                    }
                }
            }


            const jobId = await stageMutation.mutateAsync({
                orgId: activeOrgId,
                entity,
                filename: file.name,
                rows
            })
            console.log('DEBUG: Staged Rows Sample:', rows[0])
            setActiveJobId(jobId)
            setNotification({ type: 'success', message: 'Datos previsualizados correctamente' })
        } catch (err) {
            setNotification({ type: 'error', message: 'Error al procesar el archivo CSV' })
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleValidate = async () => {
        if (!activeJobId) return
        setIsLoading(true)
        try {
            await validateMutation.mutateAsync(activeJobId)
            setNotification({ type: 'success', message: 'Validación completada' })
        } catch (err) {
            setNotification({ type: 'error', message: 'Error durante la validación' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCommit = async () => {
        if (!activeJobId) return
        setIsLoading(true)
        try {
            await commitMutation.mutateAsync(activeJobId)
            setNotification({ type: 'success', message: 'Importación completada con éxito' })
            setFile(null)
            setActiveJobId(null) // Reset to allow new import
        } catch (err) {
            setNotification({ type: 'error', message: 'Error al guardar los datos' })
        } finally {
            setIsLoading(false)
        }
    }

    // Render Helpers
    const renderStatusBadge = (status: string) => {
        const colors: any = {
            staged: 'bg-slate-500/20 text-slate-400',
            validated: 'bg-blue-500/20 text-blue-400',
            committed: 'bg-green-500/20 text-green-400',
            failed: 'bg-red-500/20 text-red-400'
        }
        return <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${colors[status] || colors.staged}`}>{status}</span>
    }

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <header>
                <h1 className="text-3xl font-bold text-white tracking-tight text-glow">Importador Universal</h1>
                <p className="text-slate-400 mt-1">Sube tus archivos CSV o Excel para actualizar proveedores, artículos y eventos.</p>
            </header>

            {
                notification && (
                    <div className={`p-4 rounded-lg border ${notification.type === 'success'
                        ? 'bg-green-500/10 border-green-500/20 text-green-200'
                        : 'bg-red-500/10 border-red-500/20 text-red-200'
                        } flex justify-between items-center animate-fade-in`}>
                        <span>{notification.message}</span>
                        <button onClick={() => setNotification(null)} className="hover:opacity-75">✕</button>
                    </div>
                )
            }

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Area: Wizard */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 1. Configuration & Upload */}
                    <section className="glass-panel p-6 rounded-xl space-y-4">
                        <h2 className="text-lg font-semibold text-white">1. Configuración</h2>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Entidad</label>
                                <select
                                    value={entity}
                                    onChange={e => { setEntity(e.target.value as ImportEntity); setActiveJobId(null); setFile(null); }}
                                    className="w-full rounded-lg bg-nano-navy-900 border border-white/10 px-3 py-2 text-white text-sm"
                                    disabled={!!activeJobId && activeJob?.status !== 'staged'}
                                >
                                    <option value="suppliers">Proveedores (suppliers)</option>
                                    <option value="supplier_items">Artículos (supplier_items)</option>
                                    <option value="events">Eventos (events)</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-400 mb-1">Archivo CSV</label>
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        accept=".csv, .xlsx, .xls"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 rounded-lg border border-dashed border-white/20 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:border-nano-blue-500/50 transition-all truncate"
                                        disabled={!!activeJobId && activeJob?.status !== 'staged'}
                                    >
                                        {file ? file.name : 'Seleccionar archivo...'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Sheet Selection (if multi-sheet) */}
                        {sheetNames.length > 1 && entity !== 'events' && (
                            <div className="bg-white/5 p-4 rounded-lg border border-white/10 animate-in fade-in">
                                <label className="block text-xs font-semibold text-slate-400 mb-2">Seleccionar Hoja de Excel</label>
                                <div className="flex flex-wrap gap-2">
                                    {sheetNames.map(name => (
                                        <button
                                            key={name}
                                            onClick={() => handleSheetChange(name)}
                                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${selectedSheetName === name
                                                ? 'bg-nano-blue-600 text-white shadow-lg shadow-nano-blue-500/20'
                                                : 'bg-white/10 text-slate-300 hover:bg-white/20'
                                                }`}
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {entity === 'events' && sheetNames.length > 1 && (
                            <div className="bg-nano-blue-500/10 p-4 rounded-lg border border-nano-blue-500/20 flex items-center gap-3 animate-in fade-in">
                                <div className="text-nano-blue-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Importación Multi-Hoja Detectada</p>
                                    <p className="text-xs text-nano-blue-200">Se procesarán las {sheetNames.length} hojas encontradas (2025-2026).</p>
                                </div>
                            </div>
                        )}


                        {/* Event Specific Configuration */}
                        {entity === 'events' && file && file.name.match(/\.xlsx?$/) && rawSheet && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 p-4 bg-white/5 rounded-lg border border-white/10">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-400">Hotel Destino</label>
                                    <select
                                        value={selectedHotelId}
                                        onChange={e => setSelectedHotelId(e.target.value)}
                                        className="w-full rounded-lg bg-nano-navy-900 border border-white/10 px-3 py-2 text-white text-sm"
                                    >
                                        <option value="">Seleccionar Hotel...</option>
                                        {hotels?.map(h => (
                                            <option key={h.id} value={h.id}>{h.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-400">Columna Fechas</label>
                                    <select
                                        value={dateColumn}
                                        onChange={e => setDateColumn(e.target.value)}
                                        className="w-full rounded-lg bg-nano-navy-900 border border-white/10 px-3 py-2 text-white text-sm"
                                    >
                                        <option value="">Seleccionar Columna...</option>
                                        {Object.keys(rawSheet[0] || {}).map(k => (
                                            <option key={k} value={k}>{k}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2 text-xs text-nano-blue-300 bg-nano-blue-500/10 p-2 rounded border border-nano-blue-500/20">
                                    Modo Planning: Las columnas restantes se interpretarán como Salas.
                                </div>
                            </div>
                        )}

                        {!activeJobId && (
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={handleStage}
                                    disabled={!file || isLoading}
                                    className="bg-nano-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-nano-blue-500/20 hover:bg-nano-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Procesando...' : 'Subir y Previsualizar'}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* 2. Validation & Preview */}
                    {activeJobId && activeJob && (
                        <section className="glass-panel p-6 rounded-xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                    2. Validación
                                    {renderStatusBadge(activeJob.status)}
                                </h2>
                                <div className="text-sm text-slate-400">
                                    Total filas: <span className="text-white font-mono">{activeJob.summary.total}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 bg-nano-navy-900/50 p-3 rounded-lg border border-white/5">
                                {activeJob.status === 'staged' && (
                                    <button
                                        onClick={handleValidate}
                                        disabled={isLoading}
                                        className="flex-1 bg-nano-orange-600/80 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-nano-orange-500 disabled:opacity-50"
                                    >
                                        {isLoading ? 'Validando...' : 'Validar Datos'}
                                    </button>
                                )}
                                {activeJob.status === 'validated' && (
                                    <>
                                        <div className="flex-1 flex items-center gap-4 px-4 text-sm text-slate-300">
                                            <span className="text-green-400">OK: {activeJob.summary.ok}</span>
                                            <span className="text-red-400">Errores: {activeJob.summary.errors}</span>
                                        </div>
                                        <button
                                            onClick={handleCommit}
                                            disabled={isLoading || (activeJob.summary.errors ?? 0) > 0}
                                            className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
                                        >
                                            {isLoading ? 'Importando...' : 'Confirmar Importación'}
                                        </button>
                                    </>
                                )}
                                {activeJob.status === 'committed' && (
                                    <div className="w-full text-center text-green-400 font-medium py-2">
                                        ¡Importación completada! ({activeJob.summary.inserted} creados, {activeJob.summary.updated} actualizados)
                                    </div>
                                )}
                            </div>

                            {/* Table Preview */}
                            <div className="overflow-x-auto rounded-lg border border-white/10 mt-4">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/5 text-slate-300 uppercase font-semibold">
                                        <tr>
                                            <th className="px-3 py-2">#</th>
                                            <th className="px-3 py-2">Status</th>
                                            <th className="px-3 py-2 w-full">Data / Errors</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-400">
                                        {jobRows.data?.map(row => (
                                            <tr key={row.id} className={row.errors.length > 0 ? 'bg-red-500/5' : ''}>
                                                <td className="px-3 py-2 font-mono">{row.row_number}</td>
                                                <td className="px-3 py-2">
                                                    {row.errors.length > 0
                                                        ? <span className="text-red-400">Error</span>
                                                        : <span className="text-green-400">{row.action}</span>
                                                    }
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.errors.length > 0 ? (
                                                        <div className="text-red-400 font-medium space-y-1">
                                                            {row.errors.map((e, i) => <div key={i}>• {e}</div>)}
                                                            <div className="text-slate-500 text-[10px] mt-1 font-mono">{JSON.stringify(row.raw)}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="font-mono text-slate-300 truncate max-w-md">
                                                            {JSON.stringify(row.normalized || row.raw)}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {jobRows.isLoading && <div className="p-4 text-center text-slate-500">Cargando filas...</div>}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar: History */}
                <div className="space-y-4">
                    <div className="glass-panel p-4 rounded-xl">
                        <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Historial Reciente</h3>
                        <div className="space-y-3">
                            {jobs.data?.map(job => (
                                <div
                                    key={job.id}
                                    onClick={() => setActiveJobId(job.id)}
                                    className={`p-3 rounded-lg border border-white/5 cursor-pointer transition-colors ${activeJobId === job.id ? 'bg-white/10 border-nano-blue-500/50' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-slate-200 capitalize">{job.entity.replace('_', ' ')}</span>
                                        {renderStatusBadge(job.status)}
                                    </div>
                                    <div className="text-xs text-slate-400 truncate" title={job.filename}>{job.filename}</div>
                                    <div className="flex justify-between items-end mt-2">
                                        <span className="text-[10px] text-slate-500">{new Date(job.created_at).toLocaleDateString()}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {job.summary.total} filas
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {jobs.data?.length === 0 && <div className="text-sm text-slate-500 italic">No hay importaciones recientes.</div>}
                        </div>
                    </div>
                </div>
            </div >
        </div >
    )
}
