import { useState, useRef } from 'react'

import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useImportJobs, useImportStage, useImportValidate, useImportCommit, useImportJobRows } from '../data/importer'
import { parseCSV } from '../logic/csvParser'
import type { ImportEntity } from '../domain/types'

export function ImporterPage() {
    // State
    const { activeOrgId } = useActiveOrgId()
    const [entity, setEntity] = useState<ImportEntity>('suppliers')
    const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [activeJobId, setActiveJobId] = useState<string | null>(null)

    // Queries & Mutations
    const jobs = useImportJobs(activeOrgId ?? undefined)
    const jobRows = useImportJobRows(activeJobId ?? undefined)
    const stageMutation = useImportStage()
    const validateMutation = useImportValidate()
    const commitMutation = useImportCommit()

    const activeJob = jobs.data?.find(j => j.id === activeJobId)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleStage = async () => {
        if (!activeOrgId || !file) return
        setIsLoading(true)
        try {
            const rows = await parseCSV(file)
            const jobId = await stageMutation.mutateAsync({
                orgId: activeOrgId,
                entity,
                filename: file.name,
                rows
            })
            setActiveJobId(jobId)
        } catch (err) {
            alert('Error parsing or staging CSV')
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
        } catch (err) {
            alert('Validation failed')
        } finally {
            setIsLoading(false)
        }
    }

    const handleCommit = async () => {
        if (!activeJobId) return
        setIsLoading(true)
        try {
            await commitMutation.mutateAsync(activeJobId)
            alert('Importación completada con éxito')
            setFile(null)
            setActiveJobId(null) // Reset to allow new import
        } catch (err) {
            alert('Commit failed')
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
                <p className="text-slate-400 mt-1">Sube tus archivos CSV para actualizar proveedores, artículos y eventos.</p>
            </header>

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
                                        accept=".csv"
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
            </div>
        </div>
    )
}
