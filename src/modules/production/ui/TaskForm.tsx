import { useState } from 'react'
import type { CreateTaskInput } from '../data/productionRepository' // Importing types
import type { ProductionStation } from '../types'
import { FormField } from '@/modules/shared/ui/FormField'
import { Button } from '@/modules/shared/ui/Button'

interface TaskFormProps {
    planId: string
    orgId: string
    onSubmit: (input: CreateTaskInput) => Promise<void>
    onCancel: () => void
    defaultStation?: ProductionStation
}

export function TaskForm({ planId, orgId, onSubmit, onCancel, defaultStation = 'frio' }: TaskFormProps) {
    const [title, setTitle] = useState('')
    const [station, setStation] = useState<ProductionStation>(defaultStation)
    const [priority, setPriority] = useState(3)
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setIsSubmitting(true)
        try {
            await onSubmit({
                orgId,
                planId,
                station,
                title,
                priority,
                notes: notes || undefined
            })
            // Form usually closes or resets on success in parent
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <FormField label="Estación" id="station">
                <select
                    id="station"
                    value={station}
                    onChange={(e) => setStation(e.target.value as ProductionStation)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500"
                >
                    <option value="frio">Frío</option>
                    <option value="caliente">Caliente</option>
                    <option value="pasteleria">Pastelería</option>
                    <option value="barra">Barra</option>
                    <option value="office">Office</option>
                    <option value="almacen">Almacén</option>
                    <option value="externo">Externo</option>
                </select>
            </FormField>

            <FormField label="Título" id="title">
                <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Cortar cebolla brunoise"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-nano-blue-500 focus:outline-none focus:ring-1 focus:ring-nano-blue-500"
                    autoFocus
                />
            </FormField>

            <div className="flex gap-4">
                <FormField label="Prioridad" id="priority" className="flex-1">
                    <select
                        id="priority"
                        value={priority}
                        onChange={(e) => setPriority(Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                        <option value={1}>Baja (1)</option>
                        <option value={3}>Normal (3)</option>
                        <option value={5}>Alta (5)</option>
                    </select>
                </FormField>
            </div>

            <FormField label="Notas" id="notes">
                <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
            </FormField>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" type="button" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button variant="default" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                </Button>
            </div>
        </form>
    )
}
