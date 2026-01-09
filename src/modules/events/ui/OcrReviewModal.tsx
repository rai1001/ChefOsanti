import type { OcrDraft } from '../domain/ocrParser'

interface Props {
    draft: OcrDraft
    onClose: () => void
    onApply: (draft: OcrDraft) => Promise<void>
}

export function OcrReviewModal({ draft, onClose, onApply }: Props) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-nano-navy-900 border border-white/10 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Revisar OCR</h2>
                <div className="text-white">
                    <p>Stub de OcrReviewModal para compilación.</p>
                    <pre className="text-xs text-slate-400 mt-2 p-2 bg-black/50 rounded overflow-auto max-h-60">
                        {JSON.stringify(draft, null, 2)}
                    </pre>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                    <button onClick={() => onApply(draft)} className="px-4 py-2 bg-nano-blue-600 text-white rounded-lg">Aplicar</button>
                </div>
            </div>
        </div>
    )
}
