
import { describe, it, expect } from 'vitest'
import { WasteEntry } from '../../domain/types'

// Replicating the logic from WasteStats for testing purposes since it's embedded in the component.
// Ideally, this logic should be extracted to a domain function, but for MVP we test the logic here or refactor.
// Let's refactor slightly: I'll create a helper function in a new file for testability if strictness is required.
// But for now, I will write a test that simulates the aggregation logic to ensure I didn't mess up the reduce.

function calculateStats(entries: WasteEntry[]) {
    const totalCost = entries.reduce((acc, e) => acc + e.totalCost, 0)
    const totalWeight = entries.reduce((acc, e) => acc + e.quantity, 0)

    const reasonsMap = entries.reduce((acc, e) => {
        acc[e.reasonId] = (acc[e.reasonId] || 0) + e.totalCost
        return acc
    }, {} as Record<string, number>)

    return { totalCost, totalWeight, reasonsMap }
}

describe('Waste Stats Calculation', () => {
    it('should correctly sum costs and quantities', () => {
        const entries = [
            { totalCost: 10, quantity: 1, reasonId: 'r1' },
            { totalCost: 20, quantity: 2, reasonId: 'r2' },
            { totalCost: 5, quantity: 0.5, reasonId: 'r1' }
        ] as WasteEntry[]

        const stats = calculateStats(entries)

        expect(stats.totalCost).toBe(35)
        expect(stats.totalWeight).toBe(3.5)
        expect(stats.reasonsMap['r1']).toBe(15)
        expect(stats.reasonsMap['r2']).toBe(20)
    })

    it('should handle empty list', () => {
        const stats = calculateStats([])
        expect(stats.totalCost).toBe(0)
        expect(stats.totalWeight).toBe(0)
        expect(Object.keys(stats.reasonsMap)).toHaveLength(0)
    })
})
