import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import { categorizeExpiry, daysUntilExpiry } from '../domain/expiryAlerts'

export type ExpiryRule = {
  id: string
  orgId: string
  daysBefore: number
  isEnabled: boolean
  createdAt: string
}

export type ExpiryAlert = {
  id: string
  batchId: string
  ruleId: string
  status: 'open' | 'dismissed' | 'sent'
  createdAt: string
  sentAt: string | null
  daysBefore: number | null
  expiresAt: string | null
  qty: number
  unit: string
  productName: string
  locationId: string
  locationName: string
  hotelId: string | null
  lotCode: string | null
  source: string | null
  expiryCategory: ReturnType<typeof categorizeExpiry>
  daysUntil: number | null
}

export async function listExpiryRules(orgId: string | undefined) {
  if (!orgId) return []
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('expiry_rules')
    .select('id, org_id, days_before, is_enabled, created_at')
    .eq('org_id', orgId)
    .order('days_before')
  if (error) throw mapSupabaseError(error, { module: 'inventory', operation: 'listExpiryRules', orgId })
  return (
    data?.map((row) => ({
      id: row.id as string,
      orgId: row.org_id as string,
      daysBefore: row.days_before as number,
      isEnabled: row.is_enabled as boolean,
      createdAt: row.created_at as string,
    })) ?? []
  ) as ExpiryRule[]
}

export function useExpiryRules(orgId: string | undefined) {
  return useQuery({
    queryKey: ['expiry_rules', orgId],
    queryFn: () => listExpiryRules(orgId),
    enabled: Boolean(orgId),
  })
}

export async function createExpiryRule(input: { orgId: string; daysBefore: number }) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('expiry_rules').insert({
    org_id: input.orgId,
    days_before: input.daysBefore,
  })
  if (error) throw mapSupabaseError(error, { module: 'inventory', operation: 'createExpiryRule' })
}

export function useCreateExpiryRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createExpiryRule,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['expiry_rules', vars.orgId] })
    },
  })
}

export async function toggleExpiryRule(input: { ruleId: string; isEnabled: boolean }) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('expiry_rules')
    .update({ is_enabled: input.isEnabled })
    .eq('id', input.ruleId)
  if (error) throw mapSupabaseError(error, { module: 'inventory', operation: 'toggleExpiryRule' })
}

export function useToggleExpiryRule(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: toggleExpiryRule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expiry_rules', orgId] })
    },
  })
}

export async function listExpiryAlerts(params: {
  orgId: string | undefined
  status?: 'open' | 'dismissed' | 'sent'
}) {
  if (!params.orgId) return []
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('expiry_alerts')
    .select(
      `
      id, org_id, batch_id, rule_id, status, created_at, sent_at,
      expiry_rules (days_before),
      stock_batches (
        expires_at, qty, unit, lot_code, source, location_id,
        supplier_items (name),
        preparations (name),
        inventory_locations (id, name, hotel_id)
      )
    `,
    )
    .eq('org_id', params.orgId)
    .eq('status', params.status ?? 'open')
    .order('created_at', { ascending: false })

  if (error) throw mapSupabaseError(error, { module: 'inventory', operation: 'listExpiryAlerts', orgId: params.orgId })

  return (
    data?.map((row: any) => {
      const batch = row.stock_batches ?? {}
      const location = batch.inventory_locations ?? {}
      const productName = batch.supplier_items?.name ?? batch.preparations?.name ?? 'Lote'
      const expiresAt = batch.expires_at as string | null
      const daysUntil = daysUntilExpiry(expiresAt)
      const expiryCategory = categorizeExpiry(expiresAt)
      return {
        id: row.id as string,
        batchId: row.batch_id as string,
        ruleId: row.rule_id as string,
        status: row.status as 'open' | 'dismissed' | 'sent',
        createdAt: row.created_at as string,
        sentAt: row.sent_at as string | null,
        daysBefore: row.expiry_rules?.days_before ?? null,
        expiresAt,
        qty: Number(batch.qty ?? 0),
        unit: batch.unit as string,
        productName,
        locationId: location.id as string,
        locationName: location.name as string,
        hotelId: location.hotel_id as string | null,
        lotCode: batch.lot_code as string | null,
        source: batch.source as string | null,
        expiryCategory,
        daysUntil,
      } as ExpiryAlert
    }) ?? []
  )
}

export function useExpiryAlerts(params: { orgId: string | undefined; status?: 'open' | 'dismissed' | 'sent' }) {
  return useQuery({
    queryKey: ['expiry_alerts', params.orgId, params.status],
    queryFn: () => listExpiryAlerts(params),
    enabled: Boolean(params.orgId),
  })
}

export async function dismissExpiryAlert(alertId: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('expiry_alerts')
    .update({ status: 'dismissed' })
    .eq('id', alertId)
  if (error) throw mapSupabaseError(error, { module: 'inventory', operation: 'dismissExpiryAlert' })
}

export function useDismissExpiryAlert(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: dismissExpiryAlert,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expiry_alerts', orgId] })
    },
  })
}
