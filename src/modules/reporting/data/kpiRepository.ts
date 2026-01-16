import { getSupabaseClient } from '@/lib/supabaseClient';

export interface DateRange {
    start: Date;
    end: Date;
}

export async function getEventsMetrics(orgId: string, range: DateRange) {
    const supabase = getSupabaseClient();

    // Events count by status
    const { data: events, error } = await supabase
        .from('events')
        .select('id, status, starts_at')
        .eq('org_id', orgId)
        .gte('starts_at', range.start.toISOString())
        .lte('starts_at', range.end.toISOString());

    if (error) throw error;

    const total = events.length;
    const confirmed = events.filter(e => e.status === 'confirmed' || e.status === 'in_production' || e.status === 'closed').length;
    const cancelled = events.filter(e => e.status === 'cancelled').length;

    return {
        total_events: total,
        confirmed_events: confirmed,
        cancelled_events: cancelled,
        total_pax: 0,
    };
}

export async function getPurchasingMetrics(orgId: string, range: DateRange) {
    const supabase = getSupabaseClient();
    type PurchaseOrderRow = {
        id: string;
        total_estimated: number | null;
        supplier_id?: string | null;
        suppliers?: { name: string | null }[] | null;
    };

    // Expenses from Purchase Orders
    const { data: ordersRaw, error } = await supabase
        .from('purchase_orders')
        .select('id, total_estimated, supplier_id, suppliers(name)')
        .eq('org_id', orgId)
        .gte('created_at', range.start.toISOString())
        .lte('created_at', range.end.toISOString())
        .neq('status', 'cancelled');

    if (error) throw error;

    const orders = (ordersRaw ?? []) as PurchaseOrderRow[];
    const total_spend = orders.reduce((sum, order) => sum + (Number(order.total_estimated) || 0), 0);

    // Top Suppliers
    const supplierSpend: Record<string, number> = {};
    orders.forEach(order => {
        const name = order.suppliers?.[0]?.name || 'Unknown';
        supplierSpend[name] = (supplierSpend[name] || 0) + (Number(order.total_estimated) || 0);
    });

    const top_suppliers = Object.entries(supplierSpend)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    return {
        total_spend,
        top_suppliers,
    };
}

export async function getStaffMetrics(orgId: string, range: DateRange) {
    const supabase = getSupabaseClient();

    // Calculate hours from Staff Assignments linked to Shifts
    // We need to join staff_assignments -> shifts
    // But Supabase JS client generic joins can be tricky without foreign key embedding.
    // staff_assignments has shift_id -> shifts.id

    const { data: assignments, error } = await supabase
        .from('staff_assignments')
        .select(`
      id,
      shifts!inner (
        starts_at,
        ends_at,
        shift_date
      )
    `)
        .eq('org_id', orgId)
        .gte('shifts.shift_date', range.start.toISOString().split('T')[0])
        .lte('shifts.shift_date', range.end.toISOString().split('T')[0]);

    if (error) throw error;

    let total_hours = 0;

    assignments.forEach((a: any) => {
        if (a.shifts) {
            const start = parseTime(a.shifts.starts_at);
            const end = parseTime(a.shifts.ends_at);
            let duration = end - start;
            if (duration < 0) duration += 24; // overnight
            total_hours += duration;
        }
    });

    return {
        total_shifts: assignments.length,
        total_hours: Math.round(total_hours * 10) / 10,
    };
}

// Helper for '07:00' -> 7.0
function parseTime(timeStr: string): number {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h + (m || 0) / 60;
}

export async function getWasteMetrics(orgId: string, range: DateRange) {
    const supabase = getSupabaseClient();

    try {
        const { data: waste, error } = await supabase
            .from('waste_logs')
            .select('total_cost')
            .eq('org_id', orgId)
            .gte('created_at', range.start.toISOString())
            .lte('created_at', range.end.toISOString());

        if (error) {
            console.warn('Waste table access failed', error);
            return { total_loss: 0, items_count: 0 };
        }

        const total_loss = waste.reduce((sum, w) => sum + (Number(w.total_cost) || 0), 0);
        return {
            total_loss,
            items_count: waste.length
        };
    } catch (e) {
        return { total_loss: 0, items_count: 0 };
    }
}
