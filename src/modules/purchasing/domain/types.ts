export type PurchaseUnit = 'kg' | 'ud'
export type RoundingRule = 'ceil_pack' | 'ceil_unit' | 'none'
export type ProductType = 'fresh' | 'pasteurized' | 'frozen'

export type Supplier = {
  id: string
  orgId: string
  name: string
  createdAt: string
}

export type SupplierItem = {
  id: string
  supplierId: string
  name: string
  purchaseUnit: PurchaseUnit
  packSize?: number | null
  roundingRule: RoundingRule
  pricePerUnit?: number | null
  notes?: string | null
  productTypeOverride?: ProductType | null
  leadTimeDaysOverride?: number | null
  createdAt: string
}
