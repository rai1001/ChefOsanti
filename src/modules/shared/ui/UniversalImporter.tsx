import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { formatErrorMessage } from '@/modules/shared/hooks/useFormattedError'
import { useImportStage, useImportValidate, useImportCommit, useImportJobRows } from '@/modules/importer/data/importer'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import type { ImportEntity } from '@/modules/importer/domain/types'

interface UniversalImporterProps {
    isOpen: boolean
    onClose: () => void
    entity: ImportEntity
    title: string
    fields: { key: string; label: string; transform?: (val: string) => any }[]
}

export function UniversalImporter({ isOpen, onClose, entity, title, fields }: UniversalImporterProps) {
    const { activeOrgId } = useActiveOrgId()
    const [file, setFile] = useState<File | null>(null)
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'done'>('upload')
    const [jobId, setJobId] = useState<string | null>(null)
    const [mapping, setMapping] = useState<Record<string, string>>({})
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const stage = useImportStage()
    const validate = useImportValidate()
    const commit = useImportCommit()
    const rows = useImportJobRows(jobId ?? undefined)

    if (!isOpen) return null

    const processData = (data: any[], currentMapping: Record<string, string>) => {
        return data.map((row) => {
            const obj: any = {}
            fields.forEach((field) => {
                const targetHeader = currentMapping[field.key] || field.label
                const val = row[targetHeader]
                obj[field.key] = field.transform ? field.transform(val) : val
            })
            return obj
        })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return
        setFile(selectedFile)
        setError(null)

        Papa.parse(selectedFile, {
            header: true,
            skipEmptyLines: true,
            preview: 1,
            complete: (results) => {
                const headers = results.meta.fields || []
                const initialMapping: Record<string, string> = {}
                fields.forEach(f => {
                    const match = headers.find(h => h.toLowerCase() === f.label.toLowerCase() || h.toLowerCase() === f.key.toLowerCase())
                    if (match) initialMapping[f.key] = match
                })
                setMapping(initialMapping)
                setStep('mapping')
            },
            error: (err) => setError(formatErrorMessage(err)),
        })
    }

    const handleStage = async () => {
        if (!file || !activeOrgId) return
        setError(null)

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const mapped = processData(results.data, mapping)
                    const id = await stage.mutateAsync({
                        orgId: activeOrgId,
                        entity,
                        filename: file.name,
                        rows: mapped
                    })
                    setJobId(id)
                    await validate.mutateAsync(id)
                    setStep('preview')
                } catch (err) {
                    setError(formatErrorMessage(err))
                }
            },
            error: (err) => setError(formatErrorMessage(err)),
        })
    }

    const handleCommit = async () => {
        if (!jobId) return
        try {
            await commit.mutateAsync(jobId)
            setStep('done')
        } catch (err) {
            setError(formatErrorMessage(err))
        }
    }

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
                                accept=".csv"
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
                                    Click para subir CSV
                                </span>
                                <p className="mt-1 text-xs text-slate-400">Separado por comas (.csv)</p>
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-300 font-medium">Mapea las columnas de tu archivo:</p>
                            <div className="grid grid-cols-2 gap-4">
                                {fields.map(field => (
                                    <div key={field.key} className="space-y-1">
                                        <label className="text-xs text-slate-500 uppercase">{field.label}</label>
                                        <input
                                            value={mapping[field.key] || ''}
                                            onChange={(e) => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            className="w-full rounded-lg bg-nano-navy-900 border border-white/10 px-3 py-2 text-sm text-white"
                                            placeholder="Cabecera en CSV"
                                        />
                                    </div>
                                ))}
                            </div>
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
                                            <th className="px-3 py-2">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-400">
                                        {rows.data?.map((row) => (
                                            <tr key={row.id}>
                                                <td className="px-3 py-2 border-r border-white/5">{row.row_number}</td>
                                                {fields.map(f => (
                                                    <td key={f.key} className="px-3 py-2 border-r border-white/5">
                                                        {String(row.raw[mapping[f.key] || f.label] || '')}
                                                    </td>
                                                ))}
                                                <td className="px-3 py-2">
                                                    {row.errors?.length > 0 ? (
                                                        <span className="text-red-400 font-medium">{row.errors.join(', ')}</span>
                                                    ) : (
                                                        <span className="text-green-400 font-medium">✓ Listo</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-400 px-1">
                                <span>Total: {rows.data?.length ?? 0} filas</span>
                                {validate.isPending && <span className="animate-pulse">Validando...</span>}
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
                                onClick={handleCommit}
                                disabled={commit.isPending || (rows.data?.some(r => r.errors?.length > 0) ?? false)}
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
        </div>
    )
}
