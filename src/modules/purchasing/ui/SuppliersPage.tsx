import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateSupplier, useSuppliersInfinite } from '../data/suppliers'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { Card } from '@/modules/shared/ui/Card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/modules/shared/ui/Table'
import { Badge } from '@/modules/shared/ui/Badge'
import { Button } from '@/modules/shared/ui/Button'
import { FormField } from '@/modules/shared/ui/FormField'
import type { Supplier } from '../domain/types'

const supplierSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
})

type SupplierForm = z.infer<typeof supplierSchema>

const STATUS_OPTIONS = ['Active', 'All']
const CATEGORY_OPTIONS = ['All', 'Food', 'Beverage', 'Non-food']
const REGION_OPTIONS = ['All', 'Local', 'National', 'International']

function healthBadge(idx: number) {
  const grades = ['A+', 'A', 'B', 'A+']
  const label = grades[idx % grades.length]
  return (
    <Badge variant={label === 'B' ? 'warning' : 'success'} className="gap-1">
      {label}
      <span className="text-xs text-foreground/80">(Stable)</span>
    </Badge>
  )
}

function reliabilityBadge(idx: number) {
  const scores = [98, 92, 96, 88]
  const val = scores[idx % scores.length]
  const tone = val >= 95 ? 'success' : val >= 90 ? 'warning' : 'danger'
  return (
    <div className="flex items-center gap-1 text-sm text-foreground">
      <Star size={14} className={tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-danger'} />
      {val}% ({tone === 'success' ? 'High' : tone === 'warning' ? 'Med' : 'Low'})
    </div>
  )
}

export default function SuppliersPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const suppliers = useSuppliersInfinite(activeOrgId ?? undefined, !!session && !!activeOrgId && !loading)
  const createSupplier = useCreateSupplier(activeOrgId ?? undefined)
  const sessionError = useFormattedError(error)
  const createError = useFormattedError(createSupplier.error)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '' },
  })

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('Active')
  const [category, setCategory] = useState<string>('All')
  const [region, setRegion] = useState<string>('All')
  const [showForm, setShowForm] = useState(false)

  const onSubmit = async (values: SupplierForm) => {
    await createSupplier.mutateAsync(values)
    reset()
    setShowForm(false)
  }

  const flatSuppliers: Supplier[] = useMemo(
    () => suppliers.data?.pages.flatMap((page: Supplier[]) => page) ?? [],
    [suppliers.data],
  )

  const filtered = flatSuppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
  const enriched = filtered.map((s, idx) => {
    const leadTimes = ['3-5 Days', '2-4 Days', '4-6 Days']
    const activePOs = ['2 Open', '3 Open', '1 Open']
    const contact = `${s.name.toLowerCase().replace(/\s+/g, '.')}@example.com`
    return {
      supplier: s,
      contact,
      leadTime: leadTimes[idx % leadTimes.length],
      activePos: activePOs[idx % activePOs.length],
      healthIdx: idx,
      reliabilityIdx: idx,
    }
  })

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session || error) {
    return <ErrorBanner title="Inicia sesion para gestionar proveedores." message={sessionError} />
  }

  if (!activeOrgId) {
    return <ErrorBanner title="Selecciona una organizacion" message="No se encontraron organizaciones para tu usuario." />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Supplier & Procurement Hub"
        subtitle="Gestiona proveedores, compras y salud financiera."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary">Overview</Button>
            <Button variant="primary">Suppliers</Button>
            <Button variant="ghost">Purchase Orders</Button>
            <Button variant="ghost">Analytics</Button>
            <Button variant="ghost">Settings</Button>
          </div>
        }
      />

      <Card className="rounded-3xl border border-border/20 bg-surface/70 p-4 shadow-[0_20px_60px_rgba(3,7,18,0.5)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <input
              type="search"
              placeholder="Search suppliers..."
              className="h-11 w-full rounded-xl border border-border/30 bg-surface2/70 px-4 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-brand-500/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="ds-input w-[140px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <select className="ds-input w-[140px]" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <select className="ds-input w-[140px]" value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGION_OPTIONS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add Supplier'}</Button>
        </div>
      </Card>

      {showForm && (
        <Card className="rounded-3xl border border-border/20 bg-surface/70 p-5 shadow-[0_20px_60px_rgba(3,7,18,0.5)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-lg font-semibold text-foreground">New Supplier</p>
              <p className="text-sm text-muted-foreground">Create a supplier to start raising POs.</p>
            </div>
            {createError && <p className="text-xs text-danger">{createError}</p>}
          </div>
          <form className="grid gap-3 md:grid-cols-[1fr_auto] items-end" onSubmit={handleSubmit(onSubmit)}>
            <FormField
              id="supplier-name"
              label="Supplier Name"
              placeholder="Acme Food Services"
              className="bg-surface2/80 text-foreground"
              error={errors.name}
              {...register('name')}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Save'}
            </Button>
          </form>
        </Card>
      )}

      <Card className="rounded-3xl border border-border/25 bg-surface/70 shadow-[0_24px_60px_rgba(3,7,18,0.45)]">
        {suppliers.isLoading ? (
          <div className="p-6 flex justify-center">
            <Spinner />
          </div>
        ) : enriched.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No suppliers found"
              description="Ajusta los filtros o crea un proveedor."
              action={<Button onClick={() => setShowForm(true)}>Add Supplier</Button>}
            />
          </div>
        ) : (
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead>Active POs</TableHead>
                  <TableHead>Financial Health</TableHead>
                  <TableHead>Reliability Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enriched.map((row) => (
                  <TableRow key={row.supplier.id} className="hover:bg-white/5">
                    <TableCell className="font-semibold text-foreground">
                      <Link to={`/purchasing/suppliers/${row.supplier.id}`} className="hover:underline">
                        {row.supplier.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{row.contact}</TableCell>
                    <TableCell className="text-foreground">{row.leadTime}</TableCell>
                    <TableCell className="text-foreground">{row.activePos}</TableCell>
                    <TableCell>{healthBadge(row.healthIdx)}</TableCell>
                    <TableCell>{reliabilityBadge(row.reliabilityIdx)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {suppliers.hasNextPage && (
          <div className="border-t border-border/20 p-4 text-center">
            <Button variant="ghost" onClick={() => suppliers.fetchNextPage()} disabled={suppliers.isFetchingNextPage}>
              {suppliers.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
