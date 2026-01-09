import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'
import type { EmploymentType, StaffMember, StaffRole } from '../domain/staff'

function mapStaff(row: any): StaffMember {
  return {
    id: row.id,
    orgId: row.org_id,
    homeHotelId: row.home_hotel_id,
    fullName: row.full_name,
    role: row.role,
    employmentType: row.employment_type,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    active: row.active,
    createdAt: row.created_at,
    shiftPattern: row.shift_pattern ?? 'rotativo',
    maxShiftsPerWeek: row.max_shifts_per_week ?? 5,
  }
}

export async function listStaff(orgId: string, onlyActive?: boolean): Promise<StaffMember[]> {
  const supabase = getSupabaseClient()
  let query = supabase
    .from('staff_members')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (onlyActive) query = query.eq('active', true)
  const { data, error } = await query
  if (error) {
    throw mapSupabaseError(error, {
      module: 'staff',
      operation: 'listStaff',
      orgId,
    })
  }
  return data?.map(mapStaff) ?? []
}

export async function createStaffMember(params: {
  orgId: string
  fullName: string
  role: StaffRole
  employmentType: EmploymentType
  homeHotelId?: string | null
  notes?: string | null
  shiftPattern?: 'mañana' | 'tarde' | 'rotativo'
  maxShiftsPerWeek?: number
}): Promise<StaffMember> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('staff_members')
    .insert({
      org_id: params.orgId,
      full_name: params.fullName,
      role: params.role,
      employment_type: params.employmentType,
      home_hotel_id: params.homeHotelId ?? null,
      notes: params.notes ?? null,
      shift_pattern: params.shiftPattern ?? 'rotativo',
      max_shifts_per_week: params.maxShiftsPerWeek ?? 5,
    })
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'staff',
      operation: 'createStaffMember',
      orgId: params.orgId,
    })
  }
  return mapStaff(data)
}

export async function updateStaffMember(
  id: string,
  payload: Partial<{ role: StaffRole; employmentType: EmploymentType; homeHotelId?: string | null; notes?: string | null }>,
) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('staff_members')
    .update({
      role: payload.role,
      employment_type: payload.employmentType,
      home_hotel_id: payload.homeHotelId ?? null,
      notes: payload.notes ?? null,
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    throw mapSupabaseError(error, {
      module: 'staff',
      operation: 'updateStaffMember',
      id,
    })
  }
  return mapStaff(data)
}

export async function toggleStaffActive(id: string, active: boolean) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('staff_members').update({ active }).eq('id', id)
  if (error) {
    throw mapSupabaseError(error, {
      module: 'staff',
      operation: 'toggleStaffActive',
      id,
    })
  }
}

// Hooks
export function useStaffMembers(orgId: string | undefined, onlyActive?: boolean) {
  return useQuery({
    queryKey: ['staff_members', orgId, onlyActive],
    queryFn: () => listStaff(orgId ?? '', onlyActive),
    enabled: Boolean(orgId),
  })
}

export function useCreateStaffMember(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      fullName: string
      role: StaffRole
      employmentType: EmploymentType
      homeHotelId?: string | null
      notes?: string | null
      shiftPattern?: 'mañana' | 'tarde' | 'rotativo'
      maxShiftsPerWeek?: number
    }) => {
      if (!orgId) throw new Error('Falta orgId')
      return createStaffMember({ orgId, ...payload })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff_members', orgId] })
    },
  })
}

export function useToggleStaffActive(orgId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { id: string; active: boolean }) => toggleStaffActive(params.id, params.active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff_members', orgId] })
    },
  })
}
