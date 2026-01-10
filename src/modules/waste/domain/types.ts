
export type WasteReason = {
    id: string
    orgId: string
    name: string
    isActive: boolean
    createdAt: string
}

export type WasteEntry = {
    id: string
    orgId: string
    hotelId: string
    occurredAt: string
    productId: string
    unit: 'kg' | 'ud' | 'l'
    quantity: number
    reasonId: string
    unitCost: number
    totalCost: number
    notes?: string | null
    createdBy?: string | null
    createdAt: string
}

export type CreateWasteEntryInput = {
    orgId: string
    hotelId: string
    productId: string
    unit: 'kg' | 'ud' | 'l'
    quantity: number
    reasonId: string
    unitCost: number
    occurredAt?: string // Default now
    notes?: string
}
