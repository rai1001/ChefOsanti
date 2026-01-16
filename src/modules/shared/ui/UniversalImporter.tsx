import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { formatErrorMessage } from '@/modules/shared/hooks/useFormattedError'
import { useImportStage, useImportValidate, useImportCommit, useImportJobRows } from '@/modules/importer/data/importer'

import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { listHotelsByOrg } from '@/modules/orgs/data/hotels'
import { useQuery } from '@tanstack/react-query'
import type { ImportEntity } from '@/modules/importer/domain/types'
import { ConfirmDialog } from '@/modules/shared/ui/ConfirmDialog'

interface UniversalImporterProps {
    isOpen: boolean
    onClose: () => void
    /**
     * Si no se provee entity, el importador opera en modo local (sin Supabase)
     * y llama directamente a onImport con los datos parseados.
     */
    entity?: ImportEntity
    title: string
    fields: { key: string; label: string; aliases?: string[]; transform?: (val: string) => unknown }[]
    onImport?: (rows: Record<string, unknown>[]) => Promise<unknown> | unknown
}

export function UniversalImporter({ isOpen, onClose, entity, title, fields, onImport = async () => undefined }: UniversalImporterProps) {
    const { activeOrgId } = useActiveOrgId()
    const isLocalMode = !entity
    const [file, setFile] = useState<File | null>(null)
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'done'>('upload')
    const [parsedData, setParsedData] = useState<any[] | null>(null)
    const [rawSheet, setRawSheet] = useState<any[] | null>(null)
    const [importMode, setImportMode] = useState<'standard' | 'schedule'>('standard')
    const [dateColumn, setDateColumn] = useState<string>('')
    const [sheets, setSheets] = useState<Record<string, any[]>>({})
    const [sheetNames, setSheetNames] = useState<string[]>([])
    const [selectedSheetName, setSelectedSheetName] = useState<string>('')
    const [jobId, setJobId] = useState<string | null>(null)
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)
    const [selectedHotelId, setSelectedHotelId] = useState<string>('')
    const [confirmOpen, setConfirmOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isExcelFile = (name: string) => /\.xls(x|m|b)?$/i.test(name)
    const isCsvFile = (name: string) => /\.csv$/i.test(name)

    const { data: hotels } = useQuery({
        queryKey: ['hotels', activeOrgId],
        queryFn: () => activeOrgId ? listHotelsByOrg(activeOrgId) : Promise.resolve([]),
        enabled: !!activeOrgId && entity === 'events'
    })

    const stage = useImportStage()
    const validate = useImportValidate()
    const commit = useImportCommit()
    const rows = useImportJobRows(jobId ?? undefined)

    if (!isOpen) return null

    const processData = (data: any[], currentMapping: Record<string, string>) => {
        return data.map((row) => {
            const obj: Record<string, unknown> = {}
            fields.forEach((field) => {
                const targetHeader = currentMapping[field.key] || field.label
                const val = row[targetHeader]
                obj[field.key] = field.transform ? field.transform(val) : val
            })
            return obj
        })
    }

    const processMatrixData = (raw: any[], headerIndex: number, dateColKey: string): any[] => {
        if (!raw || raw.length <= headerIndex) return []

        const unpivoted: any[] = []

        raw.forEach(row => {
            const dateValue = row[dateColKey]
            if (!dateValue) return

            Object.keys(row).forEach(key => {
                if (key !== dateColKey && key !== '__rowNum__') {
                    const cellValue = row[key]
                    if (cellValue) {
                        unpivoted.push({
                            name: cellValue,
                            date: dateValue,
                            location: key,
                        })
                    }
                }
            })
        })

        return unpivoted
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return
        setFile(selectedFile)
        setError(null)
        setParsedData(null)
        setRawSheet(null)
        setSheets({})
        setSheetNames([])
        setSelectedSheetName('')
        setDateColumn('')

        if (isCsvFile(selectedFile.name)) {
            Papa.parse(selectedFile, {
                header: true,
                skipEmptyLines: true,
                preview: 0,
                complete: (results) => {
                    const headers = results.meta.fields || []
                    setParsedData(results.data)
                    autoMapHeaders(headers)
                },
                error: (err) => setError(formatErrorMessage(err)),
            })
        } else if (isExcelFile(selectedFile.name)) {
            try {
                const { sheets, sheetNames, output, headers, selectedSheetName } = await parsePreviewExcel(selectedFile)
                setSheets(sheets)
                setSheetNames(sheetNames)
                setSelectedSheetName(selectedSheetName)

                if (entity === 'events') {
                    setImportMode('schedule')
                    setRawSheet(output)
                    const potentialDate = headers.find(h => h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date'))
                    if (potentialDate) setDateColumn(potentialDate)
                    setStep('mapping')
                } else {
                    setImportMode('standard')
                    setParsedData(output)
                    autoMapHeaders(headers)
                }
            } catch (err) {
                setError('Error al leer el archivo Excel: ' + formatErrorMessage(err))
            }
        }
    }

    const autoMapHeaders = (headers: string[]) => {
        const normalize = (value: string) => value.trim().toLowerCase()
        const initialMapping: Record<string, string> = {}
        fields.forEach(f => {
            const targets = [f.label, f.key, ...(f.aliases ?? [])].map(normalize)
            const match = headers.find(h => targets.includes(normalize(h)))
            if (match) initialMapping[f.key] = match
        })
        setMapping(initialMapping)
        setStep(isLocalMode ? 'preview' : 'mapping')
    }

    const parsePreviewExcel = async (file: File) => {
        const { parseExcelFile } = await import('@/modules/importer/utils/excelParser')
        const { sheets, sheetNames } = await parseExcelFile(file)

        if (sheetNames.length === 0) throw new Error('El archivo Excel esta vacio')

        const firstNonEmpty = sheetNames.find((name) => (sheets[name] ?? []).length > 0) ?? sheetNames[0]
        const data = sheets[firstNonEmpty] ?? []

        if (data.length === 0) throw new Error('No hay hojas con datos')

        const headers = Object.keys(data[0] ?? {})
        return { sheets, sheetNames, selectedSheetName: firstNonEmpty, output: data, headers }
    }

    const handleSheetChange = (sheetName: string) => {
        const data = sheets[sheetName] ?? []
        if (data.length === 0) return
        setSelectedSheetName(sheetName)
        const headers = Object.keys(data[0] ?? {})

        if (entity === 'events') {
            setRawSheet(data)
            const potentialDate = headers.find(h => h.toLowerCase().includes('fecha') || h.toLowerCase().includes('date'))
            if (potentialDate) setDateColumn(potentialDate)
            setStep('mapping')
        } else {
            setParsedData(data)
            autoMapHeaders(headers)
        }
    }

    const handleStage = async () => {
        if (isLocalMode) {
            setStep('preview')
            return
        }
        if (!file || !activeOrgId) return
        setError(null)

        try {
            let mappedData: any[] = []

            if (importMode === 'schedule' && rawSheet) {
                if (!selectedHotelId) throw new Error('Debes seleccionar un hotel')

                const unpivoted = processMatrixData(rawSheet, 0, dateColumn)
                mappedData = unpivoted.map(u => ({
                    title: u.name,
                    name: u.name,
                    starts_at: u.date,
                    hotel_id: selectedHotelId,
                    space_name: u.location,
                    status: 'confirmed'
                }))
            } else if (parsedData) {
                mappedData = processData(parsedData, mapping)
            } else {
                return
            }

            const id = await stage.mutateAsync({
                orgId: activeOrgId,
                entity,
                filename: file.name,
                rows: mappedData
            })
            setJobId(id)
            await validate.mutateAsync(id)
            setStep('preview')
        } catch (err) {
            setError(formatErrorMessage(err))
        }
    }

    const handleCommit = async () => {
        try {
            if (isLocalMode) {
                if (!parsedData) return
                const mapped = processData(parsedData, mapping)
                await onImport(mapped)
                setStep('done')
                return
            }

            if (!jobId) return
            await commit.mutateAsync(jobId)
            await onImport(processData(parsedData ?? [], mapping))
            setStep('done')
        } catch (err) {
            setError(formatErrorMessage(err))
        }
    }

    const localPreviewRows = isLocalMode && parsedData ? processData(parsedData, mapping) : null
    const hasSupabaseRows = rows.data && rows.data.length > 0
    const supabaseRows = (rows.data ?? []) as {
        id: string
        row_number: number
        raw: Record<string, unknown>
        errors?: string[]
    }[]
    const previewRows = hasSupabaseRows ? supabaseRows : (localPreviewRows ?? [])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50 animate-fade-in">
            <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-nano-navy-800 p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Importar {title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-4">
                    {step === 'upload' && (
                        <div className="rounded-lg border-2 border-dashed border-white/10 bg-nano-navy-900 p-8 text-center transition-colors hover:border-nano-blue-500/50">
                            <input
                                type="file"
                                accept=".csv, .xlsx, .xls, .xlsm, .xlsb"
                                onChange={handleFileChange}
                                className="hidden"
                                id="file-upload"
                                ref={fileInputRef}
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <div className="mx-auto mb-2 h-10 w-10 text-nano-blue-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium text-white">
                                    Click para subir CSV o Excel
                                </span>
                                <p className="mt-1 text-xs text-slate-400">.csv, .xlsx, .xls</p>
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-4">
                            {sheetNames.length > 1 && (
                                <div className="rounded-md border border-white/10 bg-nano-navy-900/60 p-3">
                                    <label className="block text-xs text-slate-400 mb-2">Hoja de Excel</label>
                                    <div className="flex flex-wrap gap-2">
                                        {sheetNames.map((name) => (
                                            <button
                                                key={name}
                                                onClick={() => handleSheetChange(name)}
                                                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                                    selectedSheetName === name
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
                            {importMode === 'schedule' && rawSheet ? (
                                <div className="space-y-4">
                                    <div className="bg-nano-blue-500/10 p-3 rounded-md border border-nano-blue-500/20">
                                        <p className="text-sm text-nano-blue-200">
                                            <strong>Modo Planning:</strong> Selecciona la columna de fechas. Las demas columnas se usaran como Salas.
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">Columna de Fechas</label>
                                        <select
                                            className="w-full bg-nano-navy-900 border border-white/10 rounded-md p-2 text-sm text-white focus:outline-none focus:border-nano-blue-500"
                                            onChange={(e) => setDateColumn(e.target.value)}
                                            value={dateColumn}
                                        >
                                            <option value="">Seleccionar Columna...</option>
                                            {rawSheet && rawSheet.length > 0 && Object.keys(rawSheet[0]).map(k => (
                                                <option key={k} value={k}>{k}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">Hotel Destino</label>
                                        <select
                                            className="w-full bg-nano-navy-900 border border-white/10 rounded-md p-2 text-sm text-white focus:outline-none focus:border-nano-blue-500"
                                            onChange={(e) => setSelectedHotelId(e.target.value)}
                                            value={selectedHotelId}
                                        >
                                            <option value="">Seleccionar Hotel...</option>
                                            {hotels?.map(h => (
                                                <option key={h.id} value={h.id}>{h.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-300 font-medium">Mapea las columnas de tu archivo:</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        {fields.map(field => (
                                            <div key={field.key} className="space-y-1">
                                                <label className="text-xs text-slate-500 uppercase">{field.label}</label>
                                                <input
                                                    value={mapping[field.key] || ''}
                                                    onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                    className="w-full rounded-lg bg-nano-navy-900 border border-white/10 px-3 py-2 text-sm text-white"
                                                    placeholder="Cabecera en archivo"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="overflow-hidden rounded-lg border border-white/10 max-h-64 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/5 text-slate-300 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 border-r border-white/5 w-10">#</th>
                                            {fields.map(f => (
                                                <th key={f.key} className="px-3 py-2 border-r border-white/5">{f.label}</th>
                                            ))}
                                            {!isLocalMode && <th className="px-3 py-2">Estado</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-400">
                                        {previewRows.map((row, idx) => (
                                            <tr key={hasSupabaseRows ? (row as any).id : idx}>
                                                <td className="px-3 py-2 border-r border-white/5">{hasSupabaseRows ? (row as any).row_number : idx + 1}</td>
                                                {fields.map(f => {
                                                    const value = hasSupabaseRows
                                                        ? (row as any).raw?.[mapping[f.key] || f.label] || ''
                                                        : (row as Record<string, unknown>)[f.key] ?? ''
                                                    return (
                                                        <td key={f.key} className="px-3 py-2 border-r border-white/5">
                                                            {String(value)}
                                                        </td>
                                                    )
                                                })}
                                                {!isLocalMode && (
                                                    <td className="px-3 py-2">
                                                        {(row as any).errors?.length > 0 ? (
                                                            <span className="text-red-400 font-medium">{(row as any).errors.join(', ')}</span>
                                                        ) : (
                                                            <span className="text-green-400 font-medium">Listo</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                                <span>Total: {(hasSupabaseRows ? rows.data?.length : localPreviewRows?.length) ?? 0} filas</span>
                                {!isLocalMode && validate.isPending && <span className="animate-pulse">Validando...</span>}
                            </div>
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="py-12 text-center space-y-4">
                            <div className="mx-auto h-16 w-16 text-green-500">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white">¡Importación Completada!</h3>
                            <p className="text-sm text-slate-400">Los datos se han guardado correctamente en el sistema.</p>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                            <span className="font-bold block">Error</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        {step !== 'done' && (
                            <button
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5"
                            >
                                {step === 'upload' ? 'Cancelar' : 'Cerrar'}
                            </button>
                        )}
                        {step === 'mapping' && (
                            <button
                                onClick={handleStage}
                                disabled={stage.isPending}
                                className="rounded-lg bg-nano-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition-all hover:bg-nano-blue-500"
                            >
                                {stage.isPending ? 'Procesando...' : 'Validar Datos'}
                            </button>
                        )}
                        {step === 'preview' && (
                            <button
                                onClick={() => setConfirmOpen(true)}
                                disabled={commit.isPending || (!isLocalMode && (rows.data?.some(r => r.errors?.length > 0) ?? false))}
                                className="rounded-lg bg-nano-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition-all hover:bg-nano-blue-500 disabled:opacity-50"
                            >
                                {commit.isPending ? 'Confirmando...' : 'Confirmar Importación'}
                            </button>
                        )}
                        {step === 'done' && (
                            <button
                                onClick={onClose}
                                className="rounded-lg bg-nano-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition-all hover:bg-nano-blue-500"
                            >
                                Finalizar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        <ConfirmDialog
            open={confirmOpen}
            title="Confirmar importacion"
            description="Se guardaran los datos y no se puede deshacer desde la UI."
            confirmLabel="Importar"
            onConfirm={async () => {
                setConfirmOpen(false)
                await handleCommit()
            }}
            onCancel={() => setConfirmOpen(false)}
        />

        </div>
    )
}
