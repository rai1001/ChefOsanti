import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReportData } from '../domain/kpiService';
import * as repo from '../data/kpiRepository';

// Mock repository
vi.mock('../data/kpiRepository', () => ({
    getEventsMetrics: vi.fn(),
    getPurchasingMetrics: vi.fn(),
    getStaffMetrics: vi.fn(),
    getWasteMetrics: vi.fn(),
}));

describe('kpiService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should generate weekly report with trends', async () => {
        // Setup Mocks
        const mockEvents = { total_events: 10, confirmed_events: 8, cancelled_events: 2, total_pax: 100 };
        const mockPrevEvents = { total_events: 8, confirmed_events: 7, cancelled_events: 1, total_pax: 80 }; // +25%

        const mockPurchasing = { total_spend: 5000, top_suppliers: [] };
        const mockPrevPurchasing = { total_spend: 3000, top_suppliers: [] }; // +66.6% -> 67%

        const mockStaff = { total_hours: 100, total_shifts: 15 };
        const mockPrevStaff = { total_hours: 100, total_shifts: 15 }; // 0%

        const mockWaste = { total_loss: 200, items_count: 5 };
        const mockPrevWaste = { total_loss: 250, items_count: 6 };

        (repo.getEventsMetrics as any)
            .mockResolvedValueOnce(mockEvents)
            .mockResolvedValueOnce(mockPrevEvents);

        (repo.getPurchasingMetrics as any)
            .mockResolvedValueOnce(mockPurchasing)
            .mockResolvedValueOnce(mockPrevPurchasing);

        (repo.getStaffMetrics as any)
            .mockResolvedValueOnce(mockStaff)
            .mockResolvedValueOnce(mockPrevStaff);

        (repo.getWasteMetrics as any)
            .mockResolvedValueOnce(mockWaste)
            .mockResolvedValueOnce(mockPrevWaste);

        // Execute
        // refDate = Monday Jan 20 2026. Previous week = Jan 12 - Jan 18.
        const refDate = new Date('2026-01-20T10:00:00Z');
        const result = await generateReportData('org-123', 'weekly', refDate);

        // Assertions
        expect(repo.getEventsMetrics).toHaveBeenCalledTimes(2);

        // Trends logic check
        // Events: (10 - 8) / 8 = 0.25 -> 25%
        expect(result.trends?.events_growth_pct).toBe(25);
        // Spend: (5000 - 3000) / 3000 = 0.666 -> 67%
        expect(result.trends?.spend_growth_pct).toBe(67);
        // Hours: 0%
        expect(result.trends?.labor_hours_growth_pct).toBe(0);

        // Zero div check
        // If prev was 0
    });
});
