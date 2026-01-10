import { getSupabaseClient } from '@/lib/supabaseClient';
import type { GeneratedReport, ReportType } from '../domain/types';

export async function listReports(orgId: string): Promise<GeneratedReport[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('reporting_generated_reports')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as GeneratedReport[];
}

export async function getReportById(id: string): Promise<GeneratedReport | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('reporting_generated_reports')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as GeneratedReport;
}

export async function generateReport(orgId: string, type: ReportType, referenceDate?: Date): Promise<GeneratedReport> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('reporting_generate', {
        body: { orgId, type, referenceDate: referenceDate?.toISOString() }
    });

    if (error) throw error;
    if (data.error) throw new Error(data.error);

    // The edge function returns { success: true, report: dbEntry }
    return data.report;
}
