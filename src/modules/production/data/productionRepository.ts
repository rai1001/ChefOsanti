import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type {
    ProductionPlan,
    ProductionTask,
    ProductionStation
} from '../types'

// Input Types
export type CreatePlanInput = {
    orgId: string
    hotelId: string
    eventId: string
    eventServiceId: string
}

export type CreateTaskInput = {
    orgId: string
    planId: string
    station: ProductionStation
    title: string
    priority: number
    dueAt?: string
    assigneeStaffId?: string
    notes?: string
}

export type UpdateTaskInput = Partial<Omit<ProductionTask, 'id' | 'org_id' | 'plan_id' | 'created_at'>> & {
    id: string
}

// Mappers
function mapPlan(row: any): ProductionPlan {
    return {
        id: row.id,
        org_id: row.org_id,
        hotel_id: row.hotel_id,
        event_id: row.event_id,
        event_service_id: row.event_service_id,
        status: row.status,
        generated_from: row.generated_from,
        created_at: row.created_at,
        created_by: row.created_by,
    }
}

function mapTask(row: any): ProductionTask {
    return {
        id: row.id,
        org_id: row.org_id,
        plan_id: row.plan_id,
        station: row.station,
        title: row.title,
        due_at: row.due_at,
        assignee_staff_id: row.assignee_staff_id,
        priority: row.priority,
        status: row.status,
        blocked_reason: row.blocked_reason,
        notes: row.notes,
        created_at: row.created_at,
    }
}

// Fetchers
async function fetchPlanByService(serviceId: string): Promise<ProductionPlan | null> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('production_plans')
        .select('*')
        .eq('event_service_id', serviceId)
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw mapSupabaseError(error, { module: 'production', operation: 'fetchPlanByService', serviceId })
    }

    return mapPlan(data)
}

async function fetchTasks(planId: string): Promise<ProductionTask[]> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('production_tasks')
        .select('*')
        .eq('plan_id', planId)
        .order('station', { ascending: true })
        .order('priority', { ascending: false })

    if (error) {
        throw mapSupabaseError(error, { module: 'production', operation: 'fetchTasks', planId })
    }

    return data.map(mapTask)
}

// Mutations
async function insertPlan(input: CreatePlanInput): Promise<ProductionPlan> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('production_plans')
        .insert({
            org_id: input.orgId,
            hotel_id: input.hotelId,
            event_id: input.eventId,
            event_service_id: input.eventServiceId,
            status: 'draft',
            generated_from: 'manual'
        })
        .select('*')
        .single()

    if (error) {
        throw mapSupabaseError(error, { module: 'production', operation: 'insertPlan' })
    }
    return mapPlan(data)
}

async function insertTask(input: CreateTaskInput): Promise<ProductionTask> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('production_tasks')
        .insert({
            org_id: input.orgId,
            plan_id: input.planId,
            station: input.station,
            title: input.title,
            priority: input.priority,
            due_at: input.dueAt,
            assignee_staff_id: input.assigneeStaffId,
            notes: input.notes
        })
        .select('*')
        .single()

    if (error) {
        throw mapSupabaseError(error, { module: 'production', operation: 'insertTask' })
    }
    return mapTask(data)
}

async function updateTaskInDb(input: UpdateTaskInput): Promise<ProductionTask> {
    const supabase = getSupabaseClient()
    const { id, ...updates } = input
    const { data, error } = await supabase
        .from('production_tasks')
        .update({
            station: updates.station,
            title: updates.title,
            due_at: updates.due_at,
            assignee_staff_id: updates.assignee_staff_id,
            priority: updates.priority,
            status: updates.status,
            blocked_reason: updates.blocked_reason,
            notes: updates.notes,
        })
        .eq('id', id)
        .select('*')
        .single()

    if (error) {
        throw mapSupabaseError(error, { module: 'production', operation: 'updateTask', id })
    }
    return mapTask(data)
}

async function deleteProductionTask(taskId: string): Promise<void> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from('production_tasks')
        .delete()
        .eq('id', taskId)

    if (error) {
        throw mapSupabaseError(error, { module: 'production', operation: 'deleteTask', taskId })
    }
}

// Hooks

export function useProductionPlan(serviceId: string | undefined) {
    return useQuery({
        queryKey: ['production_plan', serviceId],
        queryFn: () => fetchPlanByService(serviceId!),
        enabled: Boolean(serviceId),
    })
}

export function useProductionTasks(planId: string | undefined) {
    return useQuery({
        queryKey: ['production_tasks', planId],
        queryFn: () => fetchTasks(planId!),
        enabled: Boolean(planId),
    })
}

export function useCreateProductionPlan() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: insertPlan,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['production_plan', data.event_service_id] })
        }
    })
}

export function useCreateProductionTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: insertTask,
        onSuccess: (_, jsVars) => {
            queryClient.invalidateQueries({ queryKey: ['production_tasks', jsVars.planId] })
        }
    })
}

export function useUpdateProductionTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: updateTaskInDb,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['production_tasks', data.plan_id] })
        }
    })
}

export function useDeleteProductionTask() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: deleteProductionTask,
        onSuccess: () => {
            // Invalidate tasks query - getting planId might be tricky without passing it, 
            // but typically we can invalidate by prefix or pass context.
            // For now, simple validation.
            queryClient.invalidateQueries({ queryKey: ['production_tasks'] })
        }
    })
}
