import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { listLocations, listBatches } from '@/modules/inventory/data/batches'
import { listPreparations } from '@/modules/inventory/data/preparations'
import { listExpiryAlerts } from '@/modules/inventory/data/expiryAlerts'
import { assignBarcode, fetchBarcodeMappings } from '@/modules/inventory/data/barcodes'
import { createSupabaseMock } from './utils/supabaseMock'

vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(),
}))

describe('Inventory Data', () => {
  let client: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    vi.clearAllMocks()
    client = createSupabaseMock()
    ;(getSupabaseClient as unknown as vi.Mock).mockReturnValue(client)
  })

  it('listLocations filters by org and hotel', async () => {
    client.order.mockResolvedValueOnce({ data: [], error: null })

    await listLocations('org-1', 'hotel-1')

    expect(client.from).toHaveBeenCalledWith('inventory_locations')
    expect(client.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(client.eq).toHaveBeenCalledWith('hotel_id', 'hotel-1')
    expect(client.order).toHaveBeenCalledWith('name')
  })

  it('listBatches applies search filter', async () => {
    client.order.mockReturnValueOnce(client)
    client.order.mockResolvedValueOnce({
      data: [
        {
          id: 'b1',
          org_id: 'org-1',
          location_id: 'loc-1',
          supplier_item_id: 'item-1',
          qty: 2,
          unit: 'kg',
          expires_at: null,
          lot_code: null,
          source: 'purchase',
          created_at: new Date().toISOString(),
          supplier_items: { name: 'Leche' },
        },
      ],
      error: null,
    })

    await listBatches({ locationId: 'loc-1', search: 'leche' })

    expect(client.from).toHaveBeenCalledWith('stock_batches')
    expect(client.eq).toHaveBeenCalledWith('location_id', 'loc-1')
    expect(client.ilike).toHaveBeenCalledWith('supplier_items.name', '%leche%')
  })

  it('listPreparations filters by org', async () => {
    client.order.mockResolvedValueOnce({
      data: [
        {
          id: 'p1',
          org_id: 'org-1',
          name: 'Salsa',
          default_yield_qty: 1,
          default_yield_unit: 'kg',
          shelf_life_days: 3,
          storage: 'fridge',
          allergens: null,
        },
      ],
      error: null,
    })

    const result = await listPreparations('org-1')

    expect(client.from).toHaveBeenCalledWith('preparations')
    expect(client.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(result[0].name).toBe('Salsa')
  })

  it('listExpiryAlerts filters by status', async () => {
    client.rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'a1',
          org_id: 'org-1',
          batch_id: 'b1',
          rule_id: 'r1',
          status: 'open',
          created_at: new Date().toISOString(),
          sent_at: null,
          days_before: 3,
          expires_at: new Date().toISOString(),
          qty: 2,
          unit: 'kg',
          product_name: 'Leche',
          location_id: 'loc-1',
          location_name: 'Cocina',
          hotel_id: 'hotel-1',
          lot_code: null,
          source: 'purchase',
        },
      ],
      error: null,
    })

    const result = await listExpiryAlerts({ orgId: 'org-1', status: 'open' })

    expect(client.rpc).toHaveBeenCalledWith('list_expiry_alerts', {
      p_org_id: 'org-1',
      p_status: 'open',
    })
    expect(result[0].productName).toBe('Leche')
  })

  it('fetchBarcodeMappings filters by org', async () => {
    client.eq.mockResolvedValueOnce({
      data: [
        { id: 'm1', org_id: 'org-1', supplier_item_id: 'item-1', barcode: '123', symbology: 'ean13' },
      ],
      error: null,
    })

    const result = await fetchBarcodeMappings('org-1')

    expect(client.from).toHaveBeenCalledWith('product_barcodes')
    expect(client.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(result[0].barcode).toBe('123')
  })

  it('assignBarcode trims barcode', async () => {
    client.upsert.mockResolvedValueOnce({ error: null })

    await assignBarcode({ orgId: 'org-1', supplierItemId: 'item-1', barcode: ' 123 ', symbology: null })

    expect(client.from).toHaveBeenCalledWith('product_barcodes')
    expect(client.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: '123', supplier_item_id: 'item-1' }),
    )
  })
})
