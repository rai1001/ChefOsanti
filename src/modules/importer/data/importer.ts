import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { ImportEntity, ImportJob, ImportRow } from '../domain/types'

export function useImportJobs(orgId: string | undefined) {
    return useQuery({
        queryKey: ['import_jobs', orgId],
        queryFn: async () => {
            if (!orgId) return []
            const supabase = getSupabaseClient()
            const { data, error } = await supabase
                .from('import_jobs')
                .select('*')
                .eq('org_id', orgId)
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) throw error
            return data as ImportJob[]
        },
        enabled: Boolean(orgId),
    })
}

export function useImportJobRows(jobId: string | undefined) {
    return useQuery({
        queryKey: ['import_rows', jobId],
        queryFn: async () => {
            if (!jobId) return []
            const supabase = getSupabaseClient()
            const { data, error } = await supabase
                .from('import_rows')
                .select('*')
                .eq('job_id', jobId)
                .order('row_number', { ascending: true })
                .limit(20) // Only preview first 20 for UI perf
            if (error) throw error
            return data as ImportRow[]
        },
        enabled: Boolean(jobId)
    })
}

export function useImportStage() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ orgId, entity, filename, rows }: { orgId: string; entity: ImportEntity; filename: string; rows: any[] }) => {
            const supabase = getSupabaseClient()
            const { data, error } = await supabase.rpc('import_stage_data', {
                p_org_id: orgId,
                p_entity: entity,
                p_filename: filename,
                p_rows: rows
            })
            if (error) throw error
            return data as string // job_id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['import_jobs'] })
        }
    })
}

export function useImportValidate() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (jobId: string) => {
            const supabase = getSupabaseClient()
            const { data, error } = await supabase.rpc('import_validate', {
                p_job_id: jobId
            })
            if (error) throw error
            return data // summary
        },
        onSuccess: (_, jobId) => {
            queryClient.invalidateQueries({ queryKey: ['import_jobs'] })
            queryClient.invalidateQueries({ queryKey: ['import_rows', jobId] })
        }
    })
}

export function useImportCommit() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (jobId: string) => {
            const supabase = getSupabaseClient()
            const { data, error } = await supabase.rpc('import_commit', {
                p_job_id: jobId
            })
            if (error) throw error
            return data // summary
        },
        onSuccess: (_, jobId) => {
            queryClient.invalidateQueries({ queryKey: ['import_jobs'] })
            queryClient.invalidateQueries({ queryKey: ['import_rows', jobId] })
            // Invalidate target tables
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            queryClient.invalidateQueries({ queryKey: ['products'] }) // if supplier items affect products view
            queryClient.invalidateQueries({ queryKey: ['events'] })
        }
    })
}
