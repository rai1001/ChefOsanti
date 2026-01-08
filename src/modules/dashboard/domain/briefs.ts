export type BriefPeriod = 'today' | 'tomorrow' | 'week'

export interface Brief {
    id: string
    org_id: string
    created_by: string
    period: BriefPeriod
    content_md: string
    sources: {
        events: number
        orders: number
    }
    created_at: string
}
