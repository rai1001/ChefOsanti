import type { ReportKPIs, ReportType } from './types';
import * as repo from '../data/kpiRepository';

// Native Date helpers since we don't have date-fns
function getMonday(d: Date) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getEndOfWeek(d: Date) {
    const monday = getMonday(d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
}

function getStartOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getEndOfMonth(d: Date) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function subPeriod(date: Date, type: ReportType): Date {
    const d = new Date(date);
    if (type === 'weekly') {
        d.setDate(d.getDate() - 7);
    } else if (type === 'monthly') {
        d.setMonth(d.getMonth() - 1);
    }
    return d;
}

export async function generateReportData(orgId: string, type: ReportType, referenceDate: Date = new Date()): Promise<ReportKPIs> {
    // 1. Calculate Periods
    let start: Date, end: Date;

    if (type === 'weekly') {
        // Last completed week? Or current week? usually reporting is on "last completed week".
        // Let's assume we want the *previous* full week if running on Monday morning.
        // But the requirement says "Weekly Report". Let's assume "Last Full Week" relative to referenceDate.
        // If reference is today, we find the start of THIS week, then subtract 7 days.
        const thisWeekStart = getMonday(referenceDate);
        start = new Date(thisWeekStart);
        start.setDate(start.getDate() - 7); // Previous week
        end = getEndOfWeek(start);
    } else {
        // Last Full Month
        const thisMonthStart = getStartOfMonth(referenceDate);
        start = new Date(thisMonthStart);
        start.setMonth(start.getMonth() - 1); // Previous month
        end = getEndOfMonth(start);
    }

    // Previous period for trends
    // Shift both by 1 period
    const prevStart = subPeriod(start, type);
    const prevEnd = subPeriod(end, type);

    // 2. Fetch Data (Parallel)
    const [
        currEvents, currPurchasing, currStaff, currWaste,
        prevEvents, prevPurchasing, prevStaff
    ] = await Promise.all([
        repo.getEventsMetrics(orgId, { start, end }),
        repo.getPurchasingMetrics(orgId, { start, end }),
        repo.getStaffMetrics(orgId, { start, end }),
        repo.getWasteMetrics(orgId, { start, end }),
        repo.getEventsMetrics(orgId, { start: prevStart, end: prevEnd }),
        repo.getPurchasingMetrics(orgId, { start: prevStart, end: prevEnd }),
        repo.getStaffMetrics(orgId, { start: prevStart, end: prevEnd }),
    ]);

    // 3. Trends
    const trends = {
        events_growth_pct: calculateGrowth(currEvents.total_events, prevEvents.total_events),
        spend_growth_pct: calculateGrowth(currPurchasing.total_spend, prevPurchasing.total_spend),
        labor_hours_growth_pct: calculateGrowth(currStaff.total_hours, prevStaff.total_hours),
    };

    // 4. Assemble
    return {
        period: {
            start: start.toISOString(),
            end: end.toISOString(),
        },
        events: currEvents,
        purchasing: currPurchasing,
        staff: currStaff,
        waste: currWaste,
        trends
    };
}

function calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    const diff = current - previous;
    return Math.round((diff / previous) * 100);
}
