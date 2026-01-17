import { useEffect, useState } from 'react'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCurrentRole } from '@/modules/auth/data/permissions'
import { can } from '@/modules/auth/domain/roles'
import { useCreateHotel, useOrgHotels } from '../data/hotels'
import { useInviteOrgMember, useOrgMembers, useRemoveOrgMember } from '../data/orgAdmin'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/modules/shared/ui/Card'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { Skeleton } from '@/modules/shared/ui/Skeleton'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { Badge } from '@/modules/shared/ui/Badge'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { toast } from 'sonner'

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Staff', value: 'staff' },
] as const

export default function OrgSettingsPage() {
  const { activeOrgId, loading, error } = useActiveOrgId()
  const { role } = useCurrentRole()
  const canAdmin = can(role, 'admin:org')
  const formattedError = useFormattedError(error)

  const members = useOrgMembers(activeOrgId ?? undefined)
  const inviteMember = useInviteOrgMember(activeOrgId ?? undefined)
  const removeMember = useRemoveOrgMember(activeOrgId ?? undefined)
  const hotels = useOrgHotels(activeOrgId ?? undefined)
  const createHotel = useCreateHotel(activeOrgId ?? undefined)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'staff'>('staff')
  const [removingId, setRemovingId] = useState<string | null>(null)

  const [hotelName, setHotelName] = useState('')
  const [hotelCity, setHotelCity] = useState('')
  const [hotelCountry, setHotelCountry] = useState('')
  const [hotelCurrency, setHotelCurrency] = useState('EUR')

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
    )
  }

  if (error || !activeOrgId) {
    return (
      <ErrorBanner title="Selecciona una organizacion" message={formattedError || 'Selecciona una organizacion.'} />
    )
  }

  if (!canAdmin) {
    return <ErrorBanner title="Sin permisos" message="Necesitas permisos admin para gestionar usuarios y hoteles." />
  }

  const onInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error('Email requerido')
      return
    }
    try {
      await inviteMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole })
      toast.success('Invitacion enviada')
      setInviteEmail('')
      setInviteRole('staff')
    } catch (err: any) {
      toast.error(err?.message || 'Error al invitar')
    }
  }

  const onRemove = async (userId: string, deleteAuth: boolean) => {
    const label = deleteAuth ? 'Eliminar usuario del sistema' : 'Quitar acceso del org'
    if (!window.confirm(`${label}. Confirmar?`)) return
    setRemovingId(userId)
    try {
      await removeMember.mutateAsync({ userId, deleteAuth })
      toast.success('Acceso actualizado')
    } catch (err: any) {
      toast.error(err?.message || 'Error al eliminar')
    } finally {
      setRemovingId(null)
    }
  }

  const onCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hotelName.trim()) {
      toast.error('Nombre requerido')
      return
    }
    try {
      await createHotel.mutateAsync({
        name: hotelName.trim(),
        city: hotelCity.trim() || null,
        country: hotelCountry.trim() || null,
        currency: hotelCurrency.trim() || 'EUR',
      })
      toast.success('Hotel creado')
      setHotelName('')
      setHotelCity('')
      setHotelCountry('')
      setHotelCurrency('EUR')
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear hotel')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Organizacion"
        subtitle="Gestiona usuarios y hoteles para esta organizacion."
      />

      <Card className="border border-border/20 bg-surface/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-[2fr,1fr,auto]" onSubmit={onInvite}>
            <input
              type="email"
              placeholder="email@dominio.com"
              className="h-10 rounded-md border border-border/40 bg-surface2/70 px-3 text-sm text-foreground outline-none"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              disabled={inviteMember.isPending}
            />
            <select
              className="h-10 rounded-md border border-border/40 bg-surface2/70 px-3 text-sm text-foreground outline-none"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
              disabled={inviteMember.isPending}
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500"
              disabled={inviteMember.isPending}
            >
              {inviteMember.isPending ? 'Enviando...' : 'Invitar'}
            </button>
          </form>

          {members.isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner />
              <span>Cargando usuarios...</span>
            </div>
          )}

          {!members.isLoading && members.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin usuarios en esta organizacion.</p>
          )}

          <div className="space-y-2">
            {members.data?.map((member) => {
              const isSelf = currentUserId === member.userId
              return (
                <div
                  key={member.userId}
                  className="flex flex-col gap-2 rounded-lg border border-border/20 bg-surface2/60 p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{member.email ?? member.userId}</p>
                    <p className="text-xs text-muted-foreground">
                      Rol: {member.role} | Alta: {member.createdAt?.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={member.isActive ? 'success' : 'neutral'}>
                      {member.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <button
                      type="button"
                      className="rounded-md border border-border/40 bg-surface/60 px-3 py-1 text-xs text-foreground hover:bg-surface/80 disabled:opacity-50"
                      onClick={() => onRemove(member.userId, false)}
                      disabled={isSelf || removingId === member.userId}
                      title={isSelf ? 'No puedes quitarte acceso' : undefined}
                    >
                      Quitar acceso
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-danger/40 bg-danger/10 px-3 py-1 text-xs text-danger hover:bg-danger/20 disabled:opacity-50"
                      onClick={() => onRemove(member.userId, true)}
                      disabled={isSelf || removingId === member.userId}
                      title={isSelf ? 'No puedes eliminar tu propio usuario' : undefined}
                    >
                      Eliminar usuario
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/20 bg-surface/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground">Hoteles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-4" onSubmit={onCreateHotel}>
            <input
              className="h-10 rounded-md border border-border/40 bg-surface2/70 px-3 text-sm text-foreground outline-none"
              placeholder="Nombre del hotel"
              value={hotelName}
              onChange={(e) => setHotelName(e.target.value)}
              disabled={createHotel.isPending}
            />
            <input
              className="h-10 rounded-md border border-border/40 bg-surface2/70 px-3 text-sm text-foreground outline-none"
              placeholder="Ciudad"
              value={hotelCity}
              onChange={(e) => setHotelCity(e.target.value)}
              disabled={createHotel.isPending}
            />
            <input
              className="h-10 rounded-md border border-border/40 bg-surface2/70 px-3 text-sm text-foreground outline-none"
              placeholder="Pais"
              value={hotelCountry}
              onChange={(e) => setHotelCountry(e.target.value)}
              disabled={createHotel.isPending}
            />
            <input
              className="h-10 rounded-md border border-border/40 bg-surface2/70 px-3 text-sm text-foreground outline-none"
              placeholder="Moneda (EUR)"
              value={hotelCurrency}
              onChange={(e) => setHotelCurrency(e.target.value.toUpperCase())}
              disabled={createHotel.isPending}
            />
            <div className="md:col-span-4">
              <button
                type="submit"
                className="h-10 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500"
                disabled={createHotel.isPending}
              >
                {createHotel.isPending ? 'Guardando...' : 'Crear hotel'}
              </button>
            </div>
          </form>

          {hotels.isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner />
              <span>Cargando hoteles...</span>
            </div>
          )}
          {!hotels.isLoading && hotels.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin hoteles en esta organizacion.</p>
          )}
          <div className="grid gap-2 md:grid-cols-2">
            {hotels.data?.map((hotel) => (
              <div key={hotel.id} className="rounded-lg border border-border/20 bg-surface2/60 p-3">
                <p className="text-sm font-semibold text-foreground">{hotel.name}</p>
                <p className="text-xs text-muted-foreground">
                  {hotel.city || 'Ciudad n/a'} | {hotel.country || 'Pais n/a'} | {hotel.currency}
                </p>
                <p className="text-[11px] text-muted-foreground">ID: {hotel.id}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
