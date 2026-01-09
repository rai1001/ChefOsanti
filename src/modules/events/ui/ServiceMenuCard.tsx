import { useState, useMemo } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
    useAddServiceItem,
    useAddServiceNote,
    useDeleteAddedItem,
    useExcludeTemplateItem,
    useReplaceTemplateItem,
    useRemoveReplacement,
    useServiceOverrides,
} from '../data/overrides'
import { useServiceMenu, useApplyTemplateToService, type MenuTemplate } from '../data/menus'
import { useServiceMenuContent } from '../data/ocr'
import type { AddedItem, ServiceOverrides } from '../domain/overrides'
import { computeServiceNeedsWithOverrides } from '../domain/overrides'

const overrideItemSchema = z
    .object({
        section: z.string().optional(),
        name: z.string().min(1, 'Nombre obligatorio'),
        unit: z.enum(['ud', 'kg']),
        qtyPerPaxSeated: z.number().nonnegative('>=0'),
        qtyPerPaxStanding: z.number().nonnegative('>=0'),
        roundingRule: z.enum(['ceil_unit', 'ceil_pack', 'none']),
        packSize: z.number().optional(),
        notes: z.string().optional(),
    })
    .refine(
        (data) =>
            data.roundingRule !== 'ceil_pack' || (data.packSize !== undefined && data.packSize > 0),
        { message: 'pack_size obligatorio con ceil_pack', path: ['packSize'] },
    )
    .refine((data) => data.qtyPerPaxSeated > 0 || data.qtyPerPaxStanding > 0, {
        message: 'Define ratio para sentado o de_pie',
        path: ['qtyPerPaxSeated'],
    })

type OverrideItemForm = z.infer<typeof overrideItemSchema>

interface ServiceMenuCardProps {
    serviceId: string
    orgId: string
    format: 'sentado' | 'de_pie'
    pax: number
    templates: MenuTemplate[]
}

export function ServiceMenuCard({
    serviceId,
    orgId,
    format,
    pax,
    templates,
}: ServiceMenuCardProps) {
    const serviceMenu = useServiceMenu(serviceId)
    const content = useServiceMenuContent(serviceId)
    const overrides = useServiceOverrides(serviceId)
    const applyTemplate = useApplyTemplateToService(serviceId)
    const excludeItem = useExcludeTemplateItem(serviceId)
    const addItem = useAddServiceItem(serviceId)
    const deleteAdded = useDeleteAddedItem(serviceId)
    const replaceItem = useReplaceTemplateItem(serviceId)
    const removeReplacement = useRemoveReplacement(serviceId)
    const addNote = useAddServiceNote(serviceId)
    const [noteText, setNoteText] = useState('')
    const [replaceTarget, setReplaceTarget] = useState<string | null>(null)

    const {
        register: registerAdd,
        handleSubmit: handleSubmitAdd,
        reset: resetAdd,
        formState: { isSubmitting: addSubmitting },
    } = useForm<OverrideItemForm>({
        resolver: zodResolver(overrideItemSchema),
        defaultValues: {
            unit: 'ud',
            roundingRule: 'ceil_unit',
            qtyPerPaxSeated: 0,
            qtyPerPaxStanding: 0,
        },
    })

    const {
        register: registerReplace,
        handleSubmit: handleSubmitReplace,
        reset: resetReplace,
        formState: { isSubmitting: replaceSubmitting },
    } = useForm<OverrideItemForm>({
        resolver: zodResolver(overrideItemSchema),
        defaultValues: {
            unit: 'ud',
            roundingRule: 'ceil_unit',
            qtyPerPaxSeated: 0,
            qtyPerPaxStanding: 0,
        },
    })

    const templateItems = serviceMenu.data?.items ?? []

    const excludedSet = useMemo(
        () => new Set(overrides.data?.excluded.map((e) => e.templateItemId)),
        [overrides.data],
    )
    const replacementsMap = useMemo(() => {
        const map = new Map<string, AddedItem>()
        overrides.data?.replaced.forEach((r) => map.set(r.templateItemId, r.replacement))
        return map
    }, [overrides.data])
    const addedItems = overrides.data?.added ?? []

    const overridesForCalc: ServiceOverrides = useMemo(
        () => ({
            excluded: overrides.data?.excluded ?? [],
            added: addedItems.map(({ id, ...rest }) => rest), // Remove id for calculation if not needed, but wait, types match
            // Actually AddedItem in overridesForCalc (domain/overrides) expects specific shape.
            // Let's rely on data matching.
            replaced:
                overrides.data?.replaced.map(({ templateItemId, replacement }) => ({
                    templateItemId,
                    replacement,
                })) ?? [],
        }),
        [overrides.data, addedItems],
    )

    const needs = useMemo(
        () =>
            computeServiceNeedsWithOverrides(pax, format, templateItems, overridesForCalc).filter(
                (n) => n.qtyRounded > 0,
            ),
        [pax, format, templateItems, overridesForCalc],
    )

    const toggleExclude = (templateItemId: string, exclude: boolean) => {
        if (!orgId) return
        excludeItem.mutate({ orgId, templateItemId, exclude })
    }

    const onAddSubmit = async (values: OverrideItemForm) => {
        if (!orgId) return
        await addItem.mutateAsync({ orgId, ...values })
        resetAdd({
            unit: 'ud',
            roundingRule: 'ceil_unit',
            qtyPerPaxSeated: 0,
            qtyPerPaxStanding: 0,
            section: values.section,
        })
    }

    const openReplace = (item: any) => {
        setReplaceTarget(item.id)
        resetReplace({
            section: item.section ?? undefined,
            name: item.name,
            unit: item.unit,
            qtyPerPaxSeated: item.qtyPerPaxSeated,
            qtyPerPaxStanding: item.qtyPerPaxStanding,
            roundingRule: item.roundingRule,
            packSize: item.packSize ?? undefined,
            notes: '',
        })
    }

    const onReplaceSubmit = async (values: OverrideItemForm) => {
        if (!orgId || !replaceTarget) return
        await replaceItem.mutateAsync({ orgId, templateItemId: replaceTarget, ...values })
        setReplaceTarget(null)
    }

    const onAddNote = async () => {
        if (!orgId || !noteText.trim()) return
        await addNote.mutateAsync({ orgId, note: noteText.trim() })
        setNoteText('')
    }

    return (
        <div className="space-y-4 rounded border border-white/10 bg-white/5 p-3">
            {serviceMenu.data?.template ? (
                <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                        Menú aplicado: {serviceMenu.data.template.name}
                    </p>
                    <select
                        aria-label="Plantilla"
                        className="rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                        onChange={(e) => {
                            if (e.target.value && orgId) applyTemplate.mutate({ templateId: e.target.value, orgId })
                        }}
                        defaultValue={serviceMenu.data.template.id}
                    >
                        <option value="">Cambiar plantilla</option>
                        {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            ) : (
                <div className="mb-2 flex items-center gap-2">
                    <p className="text-sm text-slate-300">Sin menú. Aplica plantilla:</p>
                    <select
                        aria-label="Plantilla"
                        className="rounded-md border border-white/10 bg-nano-navy-800 px-2 py-1 text-xs text-white focus:border-nano-blue-500 outline-none"
                        defaultValue=""
                        onChange={(e) => {
                            if (e.target.value && orgId) applyTemplate.mutate({ templateId: e.target.value, orgId })
                        }}
                    >
                        <option value="">Selecciona</option>
                        {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {content.data && content.data.length > 0 && (
                <div className="mb-3 rounded border border-white/10 bg-white/5 p-3">
                    <h4 className="text-sm font-semibold text-white">Menú OCR</h4>
                    <div className="mt-2 space-y-2">
                        {content.data.map((sec) => (
                            <div key={sec.id} className="rounded border border-white/10 bg-white/5 p-2">
                                <p className="text-xs font-semibold text-slate-300">{sec.title}</p>
                                <ul className="ml-4 list-disc text-xs text-slate-400">
                                    {sec.items.map((it) => (
                                        <li key={it.id}>{it.text}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {serviceMenu.isLoading || overrides.isLoading ? (
                <p className="text-sm text-slate-400">Cargando menú y overrides...</p>
            ) : (
                <>
                    {serviceMenu.data?.template ? (
                        <div className="space-y-2 rounded border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white">Modificaciones</h3>
                                {excludeItem.isError && (
                                    <span className="text-xs text-red-400">Error overrides</span>
                                )}
                            </div>
                            {templateItems.length ? (
                                templateItems.map((item) => {
                                    const isExcluded = excludedSet.has(item.id)
                                    const replacement = replacementsMap.get(item.id)
                                    return (
                                        <div key={item.id} className="border-t border-white/10 pt-2 first:border-t-0">
                                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <p
                                                        className={`text-sm font-semibold ${isExcluded ? 'line-through text-slate-500' : 'text-slate-200'
                                                            }`}
                                                    >
                                                        {item.section ? `${item.section} - ` : ''}
                                                        {item.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        Unidad {item.unit} - sentado {item.qtyPerPaxSeated} - de pie{' '}
                                                        {item.qtyPerPaxStanding} - {item.roundingRule}{' '}
                                                        {item.packSize ? `- pack ${item.packSize}` : ''}
                                                    </p>
                                                    {item.notes && (
                                                        <p className="text-xs text-slate-500 italic">{item.notes}</p>
                                                    )}
                                                    {replacement && (
                                                        <div className="mt-1 rounded bg-nano-blue-600/10 p-1 text-xs">
                                                            <span className="font-semibold text-nano-blue-300">
                                                                Reemplazado por:
                                                            </span>{' '}
                                                            <span className="text-slate-300">
                                                                {replacement.name} ({replacement.unit}) - Ratio:{' '}
                                                                {replacement.qtyPerPaxSeated}/{replacement.qtyPerPaxStanding} - {replacement.roundingRule}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="flex items-center gap-1 text-xs text-slate-400">
                                                        <input
                                                            type="checkbox"
                                                            checked={isExcluded}
                                                            onChange={(e) => toggleExclude(item.id, e.target.checked)}
                                                            className="accent-nano-blue-500"
                                                        />
                                                        Excluir
                                                    </label>
                                                    {!isExcluded && !replacement && (
                                                        <button
                                                            onClick={() => openReplace(item)}
                                                            className="text-xs text-nano-blue-300 hover:text-nano-blue-200"
                                                        >
                                                            Reemplazar
                                                        </button>
                                                    )}
                                                    {replacement && (
                                                        <button
                                                            onClick={() => {
                                                                if (!orgId) return
                                                                removeReplacement.mutate(item.id)
                                                            }}
                                                            className="text-xs text-red-400 hover:text-red-300"
                                                        >
                                                            Quitar reemplazo
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-xs text-slate-500 italic">Plantilla sin items.</p>
                            )}

                            <div className="mt-3 border-t border-white/10 pt-3">
                                <h4 className="mb-2 text-xs font-semibold text-white">Añadir items extra</h4>
                                <form
                                    onSubmit={handleSubmitAdd(onAddSubmit)}
                                    className="grid gap-2 md:grid-cols-6 items-end"
                                >
                                    <label className="col-span-2">
                                        <span className="text-[10px] text-slate-400">Nombre</span>
                                        <input
                                            className="w-full rounded bg-nano-navy-900 border border-white/10 px-2 py-1 text-xs text-white"
                                            {...registerAdd('name')}
                                        />
                                    </label>
                                    <label>
                                        <span className="text-[10px] text-slate-400">Unidad</span>
                                        <select
                                            className="w-full rounded bg-nano-navy-900 border border-white/10 px-2 py-1 text-xs text-white"
                                            {...registerAdd('unit')}
                                        >
                                            <option value="ud">Ud</option>
                                            <option value="kg">Kg</option>
                                        </select>
                                    </label>
                                    <label>
                                        <span className="text-[10px] text-slate-400">Ratio Sentado</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full rounded bg-nano-navy-900 border border-white/10 px-2 py-1 text-xs text-white"
                                            {...registerAdd('qtyPerPaxSeated', { valueAsNumber: true })}
                                        />
                                    </label>
                                    <label>
                                        <span className="text-[10px] text-slate-400">Ratio Pie</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full rounded bg-nano-navy-900 border border-white/10 px-2 py-1 text-xs text-white"
                                            {...registerAdd('qtyPerPaxStanding', { valueAsNumber: true })}
                                        />
                                    </label>
                                    <button
                                        disabled={addSubmitting}
                                        className="rounded bg-nano-blue-600 px-3 py-1 text-xs font-semibold text-white"
                                    >
                                        +
                                    </button>
                                </form>
                                {addedItems.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                        {addedItems.map((ai, idx) => (
                                            <li key={ai.id || idx} className="flex justify-between items-center text-xs text-slate-300 bg-white/5 p-1 rounded">
                                                <span>
                                                    {ai.name} ({ai.unit}) - S:{ai.qtyPerPaxSeated} P:{ai.qtyPerPaxStanding}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        if (orgId && ai.id) deleteAdded.mutate({ id: ai.id })
                                                    }}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    x
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : null}

                    <div className="space-y-2 rounded border border-white/10 bg-white/5 p-3">
                        <h3 className="text-sm font-semibold text-white">Notas del servicio</h3>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 rounded bg-nano-navy-900 border border-white/10 px-2 py-1 text-xs text-white"
                                placeholder="Añadir nota..."
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && onAddNote()}
                            />
                            <button
                                onClick={onAddNote}
                                className="rounded bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white"
                            >
                                Añadir
                            </button>
                        </div>
                        {overrides.data?.notes?.length ? (
                            <ul className="list-disc ml-4 space-y-1">
                                {overrides.data.notes.map((n) => (
                                    <li key={n.id} className="text-xs text-slate-400">
                                        {n.note}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>

                    <div className="rounded border border-white/10 bg-white/5 p-3">
                        <h3 className="text-sm font-semibold text-white mb-2">Cálculo de necesidades</h3>
                        {needs.length ? (
                            <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
                                {needs.map((n, i) => (
                                    <div key={i} className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-1">
                                        <span>
                                            {n.section ? `[${n.section}]` : ''}
                                            {n.name}
                                        </span>
                                        <span className="font-mono text-nano-blue-300">
                                            {n.qtyRounded} {n.unit}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 italic">No hay necesidades calculadas.</p>
                        )}
                    </div>
                </>
            )
            }

            {
                replaceTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="w-full max-w-lg bg-nano-navy-800 border border-white/10 rounded-xl p-4">
                            <h3 className="text-white font-bold mb-4">Reemplazar item</h3>
                            <form onSubmit={handleSubmitReplace(onReplaceSubmit)} className="space-y-3">
                                <label className="block">
                                    <span className="text-xs text-slate-400">Nuevo Nombre</span>
                                    <input className="w-full mt-1 rounded bg-black/20 border border-white/10 px-3 py-2 text-sm text-white" {...registerReplace('name')} />
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label>
                                        <span className="text-xs text-slate-400">Ratio Sentado</span>
                                        <input type="number" step="0.01" className="w-full mt-1 rounded bg-black/20 border border-white/10 px-3 py-2 text-sm text-white" {...registerReplace('qtyPerPaxSeated', { valueAsNumber: true })} />
                                    </label>
                                    <label>
                                        <span className="text-xs text-slate-400">Ratio Pie</span>
                                        <input type="number" step="0.01" className="w-full mt-1 rounded bg-black/20 border border-white/10 px-3 py-2 text-sm text-white" {...registerReplace('qtyPerPaxStanding', { valueAsNumber: true })} />
                                    </label>
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button type="button" onClick={() => setReplaceTarget(null)} className="px-3 py-2 text-sm text-slate-400">Cancelar</button>
                                    <button type="submit" disabled={replaceSubmitting} className="px-3 py-2 text-sm bg-nano-blue-600 text-white rounded">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
