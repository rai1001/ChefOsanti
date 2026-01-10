export type ReportType = 'weekly' | 'monthly' | 'on_demand';

export type ReportStatus = 'generating' | 'generated' | 'failed';

export interface ReportKPIs {
    period: {
        start: string;
        end: string;
    };
    events: {
        total_events: number;
        total_pax: number;
        confirmed_events: number;
        cancelled_events: number;
    };
    purchasing: {
        total_spend: number;
        top_suppliers: Array<{ name: string; amount: number }>;
    };
    staff: {
        total_hours: number;
        total_shifts: number;
    };
    waste: {
        total_loss: number;
        items_count: number;
    };
    trends?: {
        events_growth_pct: number;
        spend_growth_pct: number;
        labor_hours_growth_pct: number;
    };
}

export interface GeneratedReport {
    id: string;
    org_id: string;
    type: ReportType;
    period_start: string;
    period_end: string;
    metrics_json: ReportKPIs;
    report_md: string | null;
    status: ReportStatus;
    created_at: string;
    created_by?: string | null;
}
