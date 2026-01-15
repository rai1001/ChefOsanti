import { useState, useMemo, useRef } from 'react'
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
import { useServiceMenuContent, useUpdateServiceMenuItem } from '../data/ocr'
import { useServiceRequirements } from '../data/requirements'
import type { AddedItem, ServiceOverrides } from '../domain/overrides'
import { computeServiceNeedsWithOverrides } from '../domain/overrides'
import { useRecipes } from '@/modules/recipes/data/recipes'
import { useGenerateProductionPlan } from '@/modules/production/data/productionRepository'
import { useGenerateEventPurchaseOrders } from '@/modules/purchasing/data/eventOrders'
import { ConfirmDialog } from '@/modules/shared/ui/ConfirmDialog'

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
    const updateMenuItem = useUpdateServiceMenuItem(serviceId)
    const recipes = useRecipes(orgId)
    const requirements = useServiceRequirements(serviceId)
    const generatePlan = useGenerateProductionPlan()
    const generateOrders = useGenerateEventPurchaseOrders()
    const [noteText, setNoteText] = useState('')
    const [replaceTarget, setReplaceTarget] = useState<string | null>(null)
    const [confirmProductionOpen, setConfirmProductionOpen] = useState(false)
    const [confirmOrdersOpen, setConfirmOrdersOpen] = useState(false)
    const [productionMessage, setProductionMessage] = useState<string | null>(null)
    const [purchaseMessage, setPurchaseMessage] = useState<string | null>(null)
    const [purchaseMissingItems, setPurchaseMissingItems] = useState<string[]>([])
    const productionKeyRef = useRef<string | null>(null)
    const purchaseKeyRef = useRef<string | null>(null)

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
    const hasOcrItems = useMemo(
        () => Boolean(content.data?.some((section) => section.items.length > 0)),
        [content.data],
    )
    const pendingOcrItems = useMemo(() => {
        if (!content.data) return 0
        return content.data.reduce(
            (acc, section) =>
                acc + section.items.filter((item) => !item.recipeId || item.requiresReview).length,
            0,
        )
    }, [content.data])
    const missingItems = requirements.data?.missingItems ?? []
    const canGenerate = Boolean(requirements.data) && missingItems.length === 0

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

    const needs = useMemo(() => {
        if (hasOcrItems) return []
        return computeServiceNeedsWithOverrides(pax, format, templateItems, overridesForCalc).filter(
            (n) => n.qtyRounded > 0,
        )
    }, [pax, format, templateItems, overridesForCalc, hasOcrItems])

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

    const handleRecipeChange = (itemId: string, recipeId: string) => {
        updateMenuItem.mutate({
            itemId,
            recipeId: recipeId || null,
            requiresReview: recipeId ? false : true,
        })
    }

    const handleReviewToggle = (itemId: string, requiresReview: boolean) => {
        updateMenuItem.mutate({ itemId, requiresReview })
    }

    const handlePortionBlur = (itemId: string, value: string) => {
        const parsed = Number(value)
        if (!Number.isFinite(parsed) || parsed <= 0) return
        updateMenuItem.mutate({ itemId, portionMultiplier: parsed })
    }

    const handleGenerateProduction = async () => {
        setConfirmProductionOpen(false)
        setProductionMessage(null)
        if (!productionKeyRef.current) productionKeyRef.current = crypto.randomUUID()
        try {
            const result = await generatePlan.mutateAsync({
                serviceId,
                idempotencyKey: productionKeyRef.current,
                strict: true,
            })
            if (result.status === 'blocked') {
                setProductionMessage(
                    `Bloqueado: faltan recetas en ${result.missing_items?.length ?? 0} items.`,
                )
                return
            }
            productionKeyRef.current = null
            setProductionMessage(`Plan generado. Tareas creadas: ${result.created}.`)
        } catch (err) {
            setProductionMessage(`Error al generar plan: ${(err as Error).message}`)
        }
    }

    const handleGenerateOrders = async () => {
        setConfirmOrdersOpen(false)
        setPurchaseMessage(null)
        setPurchaseMissingItems([])
        if (!purchaseKeyRef.current) purchaseKeyRef.current = crypto.randomUUID()
        try {
            const result = await generateOrders.mutateAsync({
                serviceId,
                idempotencyKey: purchaseKeyRef.current,
                strict: true,
            })
            if (result.status === 'blocked') {
                setPurchaseMissingItems(result.missingItems)
                setPurchaseMessage(
                    `Bloqueado: faltan mappings para ${result.missingItems.length} items.`,
                )
                return
            }
            if (result.status === 'empty' || result.created === 0) {
                setPurchaseMessage('No hay lineas para generar.')
                return
            }
            purchaseKeyRef.current = null
            setPurchaseMissingItems(result.missingItems)
            setPurchaseMessage(`Pedidos generados: ${result.orderIds.length}.`)
        } catch (err) {
            setPurchaseMessage(`Error al generar compras: ${(err as Error).message}`)
        }
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
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h4 className="text-sm font-semibold text-white">Menu OCR</h4>
                            <p className="text-xs text-slate-400">Mapea items a recetas y ajusta raciones.</p>
                        </div>
                        {pendingOcrItems > 0 && (
                            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-300">
                                Pendientes: {pendingOcrItems}
                            </span>
                        )}
                    </div>
                    {recipes.isLoading && (
                        <p className="mt-2 text-xs text-slate-400">Cargando recetas...</p>
                    )}
                    <div className="mt-3 space-y-3">
                        {content.data.map((sec) => (
                            <div key={sec.id} className="rounded border border-white/10 bg-white/5 p-2">
                                <p className="text-xs font-semibold text-slate-300">{sec.title}</p>
                                <div className="mt-2 space-y-2">
                                    {sec.items.map((it) => {
                                        const needsReview = !it.recipeId || it.requiresReview
                                        return (
                                            <div
                                                key={it.id}
                                                className="grid gap-2 rounded border border-white/5 bg-black/10 p-2 md:grid-cols-[2fr_2fr_1fr_1fr] md:items-center"
                                            >
                                                <div className={`text-xs ${needsReview ? 'text-amber-300' : 'text-slate-200'}`}>
                                                    {it.text}
                                                </div>
                                                <select
                                                    className="rounded bg-nano-navy-900 border border-white/10 px-2 py-1 text-xs text-white"
                                                    value={it.recipeId ?? ''}
                                                    onChange={(e) => handleRecipeChange(it.id, e.target.value)}
                                                >
                                                    <option value="">Sin receta</option>
                                                    {recipes.data?.map((recipe) => (
                                                        <option key={recipe.id} value={recipe.id}>
                                                            {recipe.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0.1"
                                                    className="rounded bg-nano-navy-900 border border-white/10 px-2 py-1 text-xs text-white"
                                                    defaultValue={it.portionMultiplier}
                                                    onBlur={(e) => handlePortionBlur(it.id, e.target.value)}
                                                />
                                                <label className="flex items-center gap-2 text-xs text-slate-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={!it.requiresReview}
                                                        onChange={(e) => handleReviewToggle(it.id, !e.target.checked)}
                                                        className="accent-nano-blue-500"
                                                    />
                                                    Revisado
                                                </label>
                                            </div>
                                        )
                                    })}
                                </div>
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

                    <div className="rounded border border-white/10 bg-white/5 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Resumen de produccion y compras</h3>
                                <p className="text-xs text-slate-400">Basado en recetas y mappings del servicio.</p>
                            </div>
                            {requirements.isLoading && (
                                <span className="text-xs text-slate-400">Calculando...</span>
                            )}
                        </div>
                        {missingItems.length > 0 && (
                            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
                                Faltan recetas para {missingItems.length} items: {missingItems.slice(0, 4).join(', ')}{missingItems.length > 4 ? '...' : ''}
                            </div>
                        )}
                        {requirements.data ? (
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="rounded border border-white/10 bg-white/5 p-2">
                                    <p className="text-xs font-semibold text-slate-300">Recetas</p>
                                    {requirements.data.recipes.length ? (
                                        <ul className="mt-2 space-y-1">
                                            {requirements.data.recipes.map((r) => (
                                                <li key={r.id} className="flex justify-between text-xs text-slate-300">
                                                    <span>{r.name}</span>
                                                    <span className="font-mono text-nano-blue-300">{r.servings} raciones</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-slate-500 italic">Sin recetas calculadas.</p>
                                    )}
                                </div>
                                <div className="rounded border border-white/10 bg-white/5 p-2">
                                    <p className="text-xs font-semibold text-slate-300">Ingredientes</p>
                                    {requirements.data.products.length ? (
                                        <ul className="mt-2 space-y-1">
                                            {requirements.data.products.map((p) => (
                                                <li key={p.id} className="flex justify-between text-xs text-slate-300">
                                                    <span>{p.name}</span>
                                                    <span className="font-mono text-nano-blue-300">{p.qty} {p.unit}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-slate-500 italic">Sin ingredientes calculados.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500 italic">Sin datos de requirements.</p>
                        )}
                        <div className="flex flex-wrap gap-2 pt-2">
                            <button
                                type="button"
                                className="rounded bg-nano-blue-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                disabled={!canGenerate || generatePlan.isPending}
                                onClick={() => setConfirmProductionOpen(true)}
                            >
                                {generatePlan.isPending ? 'Generando OP...' : 'Generar OP'}
                            </button>
                            <button
                                type="button"
                                className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                                disabled={!canGenerate || generateOrders.isPending}
                                onClick={() => setConfirmOrdersOpen(true)}
                            >
                                {generateOrders.isPending ? 'Generando compras...' : 'Generar compras'}
                            </button>
                            <button
                                type="button"
                                className="rounded bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300 opacity-60"
                                disabled
                            >
                                Generar picking list
                            </button>
                        </div>
                        {productionMessage && (
                            <p className="text-xs text-slate-400">{productionMessage}</p>
                        )}
                        {purchaseMessage && (
                            <p className="text-xs text-slate-400">{purchaseMessage}</p>
                        )}
                        {purchaseMissingItems.length > 0 && (
                            <p className="text-xs text-amber-300">Items sin mapping: {purchaseMissingItems.join(', ')}</p>
                        )}
                    </div>

                    {!hasOcrItems && (
                        <div className="rounded border border-white/10 bg-white/5 p-3">
                            <h3 className="text-sm font-semibold text-white mb-2">Calculo de necesidades</h3>
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
                    )}
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
            <ConfirmDialog
                open={confirmProductionOpen}
                title="Generar orden de produccion"
                description="Se creara una nueva version del plan para este servicio."
                confirmLabel="Generar"
                onConfirm={handleGenerateProduction}
                onCancel={() => setConfirmProductionOpen(false)}
            />
            <ConfirmDialog
                open={confirmOrdersOpen}
                title="Generar compras"
                description="Se crearan pedidos borrador por proveedor."
                confirmLabel="Generar"
                onConfirm={handleGenerateOrders}
                onCancel={() => setConfirmOrdersOpen(false)}
            />
        </div >
    )
}
