
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { WasteEntry, CreateWasteEntryInput } from '../domain/types'

function mapEntry(row: any): WasteEntry {
    return {
        id: row.id,
        orgId: row.org_id,
        hotelId: row.hotel_id,
        occurredAt: row.occurred_at,
        productId: row.product_id,
        unit: row.unit,
        quantity: row.quantity,
        reasonId: row.reason_id,
        unitCost: row.unit_cost,
        totalCost: row.total_cost,
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: row.created_at,
    }
}

export type WasteFilters = {
    hotelId?: string | null
    startDate?: Date | null
    endDate?: Date | null
    reasonId?: string[] | null
}

export async function listWasteEntries(orgId: string, filters?: WasteFilters): Promise<WasteEntry[]> {
    const supabase = getSupabaseClient()
    let query = supabase
        .from('waste_entries')
        .select('*')
        .eq('org_id', orgId)
        .order('occurred_at', { ascending: false })

    if (filters?.hotelId) {
        query = query.eq('hotel_id', filters.hotelId)
    }
    if (filters?.startDate) {
        query = query.gte('occurred_at', filters.startDate.toISOString())
    }
    if (filters?.endDate) {
        query = query.lte('occurred_at', filters.endDate.toISOString())
    }
    if (filters?.reasonId && filters.reasonId.length > 0) {
        query = query.in('reason_id', filters.reasonId)
    }

    const { data, error } = await query

    if (error) {
        throw mapSupabaseError(error, {
            module: 'waste',
            operation: 'listWasteEntries',
            orgId,
        })
    }

    return data?.map(mapEntry) ?? []
}

export async function createWasteEntry(input: CreateWasteEntryInput): Promise<WasteEntry> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('waste_entries')
        .insert({
            org_id: input.orgId,
            hotel_id: input.hotelId,
            product_id: input.productId,
            unit: input.unit,
            quantity: input.quantity,
            reason_id: input.reasonId,
            unit_cost: input.unitCost,
            // total_cost is generated
            occurred_at: input.occurredAt ?? new Date().toISOString(),
            notes: input.notes ?? null,
        })
        .select('*')
        .single()

    if (error) {
        throw mapSupabaseError(error, {
            module: 'waste',
            operation: 'createWasteEntry',
            orgId: input.orgId,
        })
    }

    return mapEntry(data)
}

export function useWasteEntries(orgId: string | undefined, filters?: WasteFilters) {
    return useQuery({
        queryKey: ['waste_entries', orgId, filters],
        queryFn: () => listWasteEntries(orgId!, filters),
        enabled: Boolean(orgId),
    })
}

export function useCreateWasteEntry(orgId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: Omit<CreateWasteEntryInput, 'orgId'>) => {
            if (!orgId) throw new Error('No orgId provided')
            return createWasteEntry({ ...input, orgId })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waste_entries', orgId] })
        },
    })
}
