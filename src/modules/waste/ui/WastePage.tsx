
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/modules/shared/ui/Button'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { useActiveOrgId } from '@/modules/shared/auth/useActiveOrgId'
import { useWasteEntries, WasteFilters as Filters } from '@/modules/waste/data/wasteEntries'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { WasteTable } from './components/WasteTable'
import { WasteFilters } from './components/WasteFilters'
import { CreateWasteDialog } from './components/CreateWasteDialog'
import { WasteStats } from './components/WasteStats'

export default function WastePage() {
    const orgId = useActiveOrgId()
    const [filters, setFilters] = useState<Filters>({})
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const { data: entries, isLoading } = useWasteEntries(orgId, filters)

    const handleCreate = () => {
        setIsCreateOpen(true)
    }

    if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>

    const hasEntries = entries && entries.length > 0
    const hasFilters = Object.keys(filters).length > 0 && Object.values(filters).some(v => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true))

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Mermas</h1>
                    <p className="text-sm text-slate-400">Gestiona y controla el desperdicio de alimentos.</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Registrar Merma
                </Button>
            </div>

            <WasteFilters filters={filters} onChange={setFilters} orgId={orgId!} />

            {hasEntries && <WasteStats entries={entries!} />}

            {!hasEntries && !hasFilters ? (
                <EmptyState
                    title="No hay mermas registradas"
                    description="Comienza registrando las pérdidas para llevar un control de costes."
                    actionLabel="Registrar primera merma"
                    onAction={handleCreate}
                />
            ) : !hasEntries && hasFilters ? (
                <div className="text-center py-10 text-muted-foreground border border-dashed border-white/10 rounded-xl bg-nano-navy-800/30">
                    No se encontraron resultados para los filtros seleccionados.
                </div>
            ) : (
                <WasteTable entries={entries!} />
            )}

            <CreateWasteDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    )
}
