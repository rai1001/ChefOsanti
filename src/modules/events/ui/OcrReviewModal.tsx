import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { X, Plus, Trash2, Clock, Users, Utensils, AlignLeft } from 'lucide-react'
import type { OcrDraft, OcrDetectedService, OcrSection } from '../domain/ocrParser'

interface Props {
    draft: OcrDraft
    onClose: () => void
    onApply: (draft: OcrDraft) => Promise<void>
}

export function OcrReviewModal({ draft, onClose, onApply }: Props) {
    const [editedDraft, setEditedDraft] = useState<OcrDraft>(draft)
    const [isApplying, setIsApplying] = useState(false)

    // Sync if prop changes (though usually specific instance)
    useEffect(() => {
        setEditedDraft(draft)
    }, [draft])

    const updateService = (index: number, updates: Partial<OcrDetectedService>) => {
        const newServices = [...editedDraft.detectedServices]
        newServices[index] = { ...newServices[index], ...updates }
        setEditedDraft({ ...editedDraft, detectedServices: newServices })
    }

    const updateSection = (serviceIndex: number, sectionIndex: number, updates: Partial<OcrSection>) => {
        const newServices = [...editedDraft.detectedServices]
        const newSections = [...newServices[serviceIndex].sections]
        newSections[sectionIndex] = { ...newSections[sectionIndex], ...updates }
        newServices[serviceIndex] = { ...newServices[serviceIndex], sections: newSections }
        setEditedDraft({ ...editedDraft, detectedServices: newServices })
    }

    const deleteSection = (serviceIndex: number, sectionIndex: number) => {
        const newServices = [...editedDraft.detectedServices]
        newServices[serviceIndex].sections = newServices[serviceIndex].sections.filter((_, i) => i !== sectionIndex)
        setEditedDraft({ ...editedDraft, detectedServices: newServices })
    }

    const addSection = (serviceIndex: number) => {
        const newServices = [...editedDraft.detectedServices]
        newServices[serviceIndex].sections.push({ title: 'Nueva Sección', items: [] })
        setEditedDraft({ ...editedDraft, detectedServices: newServices })
    }

    const handleApply = async () => {
        setIsApplying(true)
        try {
            await onApply(editedDraft)
        } finally {
            setIsApplying(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="w-full max-w-4xl bg-nano-navy-900 border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-nano-navy-800 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span className="text-nano-blue-400">✨</span> Revisión de OCR
                        </h2>
                        <p className="text-xs text-slate-400">Verifica y corrige los datos detectados antes de importar.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {editedDraft.detectedServices.map((service, sIdx) => (
                        <div key={sIdx} className="space-y-4 animate-fade-in relative">
                            <div className="absolute -left-3 top-0 bottom-0 w-1 bg-nano-blue-500/30 rounded-full" />

                            {/* Service Config Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-lg border border-white/5">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-1"><Utensils size={12} /> Tipo</label>
                                    <select
                                        value={service.serviceType}
                                        onChange={(e) => updateService(sIdx, { serviceType: e.target.value as any })}
                                        className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-nano-blue-500 outline-none"
                                    >
                                        <option value="desayuno">Desayuno</option>
                                        <option value="coffee_break">Coffee Break</option>
                                        <option value="comida">Comida / Almuerzo</option>
                                        <option value="merienda">Merienda</option>
                                        <option value="cena">Cena</option>
                                        <option value="coctel">Cóctel</option>
                                        <option value="otros">Otros</option>
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-1"><Clock size={12} /> Hora (Estimada)</label>
                                    <input
                                        type="time"
                                        value={service.startsAtGuess || ''}
                                        onChange={(e) => updateService(sIdx, { startsAtGuess: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-nano-blue-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-1"><Users size={12} /> Pax</label>
                                    <input
                                        type="number"
                                        value={service.paxGuess || 0}
                                        onChange={(e) => updateService(sIdx, { paxGuess: Number(e.target.value) })}
                                        className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-nano-blue-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-1"><AlignLeft size={12} /> Formato</label>
                                    <select
                                        value={service.formatGuess}
                                        onChange={(e) => updateService(sIdx, { formatGuess: e.target.value as any })}
                                        className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-nano-blue-500 outline-none"
                                    >
                                        <option value="sentado">Sentado</option>
                                        <option value="de_pie">De Pie / Cocktail</option>
                                    </select>
                                </div>
                            </div>

                            {/* Menu Sections */}
                            <div className="space-y-3 pl-2">
                                {service.sections.map((section, secIdx) => (
                                    <div key={secIdx} className="bg-white/5 rounded-lg border border-white/10 overflow-hidden group">
                                        <div className="flex items-center justify-between bg-black/20 px-3 py-2 border-b border-white/5">
                                            <input
                                                type="text"
                                                value={section.title}
                                                onChange={(e) => updateSection(sIdx, secIdx, { title: e.target.value })}
                                                className="bg-transparent text-sm font-semibold text-nano-blue-300 placeholder-slate-600 focus:text-white outline-none w-full"
                                                placeholder="Título de la Sección (ej. Entrantes)"
                                            />
                                            <button
                                                onClick={() => deleteSection(sIdx, secIdx)}
                                                className="text-slate-600 hover:text-red-400 transition-colors p-1"
                                                title="Eliminar Sección"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="p-2">
                                            <textarea
                                                value={section.items.join('\n')}
                                                onChange={(e) => updateSection(sIdx, secIdx, { items: e.target.value.split('\n') })}
                                                rows={Math.max(3, section.items.length)}
                                                className="w-full bg-transparent text-sm text-slate-300 placeholder-slate-600 focus:text-white outline-none resize-none leading-relaxed"
                                                placeholder="Escribe los platos aquí (uno por línea)..."
                                            />
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={() => addSection(sIdx)}
                                    className="w-full py-2 border border-dashed border-white/10 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus size={14} /> Añadir Sección de Menú
                                </button>
                            </div>
                        </div>
                    ))}

                    {editedDraft.detectedServices.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                            <p>No se detectaron servicios. Revisa el texto original.</p>
                        </div>
                    )}

                    <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                        <h3 className="text-xs font-semibold text-slate-500 mb-2">Texto Original (Solo Lectura)</h3>
                        <pre className="text-[10px] text-slate-400 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                            {editedDraft.rawText}
                        </pre>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-nano-navy-800 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={isApplying}
                        className="px-6 py-2 bg-gradient-to-r from-nano-blue-600 to-nano-blue-500 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-nano-blue-500/20 hover:scale-[1.02] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isApplying ? 'Importando...' : 'Confirmar e Importar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
