
import { X } from 'lucide-react'
import { Button } from '@/modules/shared/ui/Button'
import { CreateWasteForm } from './CreateWasteForm'
import { toast } from 'sonner'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CreateWasteDialog({ open, onOpenChange }: Props) {
    if (!open) return null

    const handleSuccess = () => {
        toast.success('Merma registrada correctamente')
        onOpenChange(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg rounded-xl bg-nano-navy-800 border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Registrar nueva merma</h2>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <CreateWasteForm
                    onSuccess={handleSuccess}
                    onCancel={() => onOpenChange(false)}
                />
            </div>
        </div>
    )
}
