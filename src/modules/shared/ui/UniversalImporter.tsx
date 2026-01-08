import { useState, useRef } from 'react'

interface UniversalImporterProps {
    isOpen: boolean
    onClose: () => void
    onImport: (data: any[]) => Promise<void>
    title: string
    fields: { key: string; label: string; transform?: (val: string) => any }[]
}

export function UniversalImporter({ isOpen, onClose, onImport, title, fields }: UniversalImporterProps) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(l => l.trim())
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))

        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
            const obj: any = {}
            headers.forEach((h, i) => {
                const field = fields.find(f => f.label.toLowerCase() === h.toLowerCase() || f.key === h) || fields[i] // Try to match by label, key, or index
                if (field) {
                    const val = values[i]
                    obj[field.key] = field.transform ? field.transform(val) : val
                }
            })
            return obj
        })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return
        setFile(selectedFile)
        setError(null)

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string
                const data = parseCSV(text)
                setPreview(data.slice(0, 5))
            } catch (err) {
                setError('Error al leer el archivo. Asegúrate de que sea un CSV válido.')
            }
        }
        reader.readAsText(selectedFile)
    }

    const handleImport = async () => {
        if (!file) return
        setLoading(true)
        setError(null)

        const reader = new FileReader()
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string
                const data = parseCSV(text)
                await onImport(data)
                onClose()
            } catch (err: any) {
                setError(err.message || 'Error al importar datos.')
            } finally {
                setLoading(false)
            }
        }
        reader.readAsText(file)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50 animate-fade-in">
            <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-nano-navy-800 p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Importar {title}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
                </div>

                <div className="space-y-4">
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
                                {file ? file.name : 'Click para subir CSV'}
                            </span>
                            <p className="mt-1 text-xs text-slate-400">Separado por comas (.csv)</p>
                        </label>
                    </div>

                    {preview.length > 0 && (
                        <div className="overflow-hidden rounded-lg border border-white/10">
                            <div className="bg-nano-navy-900 px-4 py-2 text-xs font-semibold text-slate-300">Vista previa (primeras 5 filas)</div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white/5 text-slate-300">
                                        <tr>
                                            {fields.map(f => (
                                                <th key={f.key} className="px-3 py-2">{f.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 text-slate-400">
                                        {preview.map((row, i) => (
                                            <tr key={i}>
                                                {fields.map(f => (
                                                    <td key={f.key} className="px-3 py-2">{String(row[f.key] || '')}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={!file || loading}
                            className="rounded-lg bg-nano-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-nano-blue-500/20 transition-all hover:bg-nano-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Importando...' : 'Confirmar Importación'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
