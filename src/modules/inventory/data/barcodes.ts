import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

export type BarcodeMapping = {
  id: string
  orgId: string
  supplierItemId: string
  barcode: string
  symbology: string | null
}

export async function fetchBarcodeMappings(orgId: string): Promise<BarcodeMapping[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('product_barcodes')
    .select('id, org_id, supplier_item_id, barcode, symbology')
    .eq('org_id', orgId)

  if (error) {
    throw mapSupabaseError(error, { module: 'inventory', operation: 'fetchBarcodeMappings', orgId })
  }
  return (
    data?.map((row) => ({
      id: row.id as string,
      orgId: row.org_id as string,
      supplierItemId: row.supplier_item_id as string,
      barcode: row.barcode as string,
      symbology: row.symbology as string | null,
    })) ?? []
  )
}

export function useBarcodeMappings(orgId: string | undefined) {
  return useQuery({
    queryKey: ['product_barcodes', orgId],
    queryFn: () => fetchBarcodeMappings(orgId ?? ''),
    enabled: Boolean(orgId),
  })
}

export async function assignBarcode(params: {
  orgId: string
  supplierItemId: string
  barcode: string
  symbology?: string | null
}) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('product_barcodes').upsert({
    org_id: params.orgId,
    supplier_item_id: params.supplierItemId,
    barcode: params.barcode.trim(),
    symbology: params.symbology ?? null,
  })
  if (error) {
    throw mapSupabaseError(error, { module: 'inventory', operation: 'assignBarcode' })
  }
}

export function useAssignBarcode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assignBarcode,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['product_barcodes', vars.orgId] })
    },
  })
}
