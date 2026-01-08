export type ImportEntity = 'suppliers' | 'supplier_items' | 'events'
export type ImportStatus = 'staged' | 'validated' | 'committed' | 'failed'

export interface ImportJob {
    id: string
    org_id: string
    created_by: string
    entity: ImportEntity
    status: ImportStatus
    filename: string
    summary: {
        total: number
        ok?: number
        errors?: number
        inserted?: number
        updated?: number
    }
    created_at: string
}

export interface ImportRow {
    id: string
    job_id: string
    row_number: number
    raw: Record<string, any>
    normalized?: Record<string, any>
    errors: string[]
    action?: 'insert' | 'update' | 'skip'
}
