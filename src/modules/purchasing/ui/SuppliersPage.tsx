import { useMemo, useState } from 'react'
import { Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useSupabaseSession } from '@/modules/auth/data/session'
import { useActiveOrgId } from '@/modules/orgs/data/activeOrg'
import { useCreateSupplier, useSuppliersInfinite } from '../data/suppliers'
import { useHotels, usePurchaseOrders } from '../data/orders'
import { useFormattedError } from '@/modules/shared/hooks/useFormattedError'
import { PageHeader } from '@/modules/shared/ui/PageHeader'
import { ErrorBanner } from '@/modules/shared/ui/ErrorBanner'
import { EmptyState } from '@/modules/shared/ui/EmptyState'
import { Spinner } from '@/modules/shared/ui/Spinner'
import { Card } from '@/modules/shared/ui/Card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/modules/shared/ui/Table'
import { Badge } from '@/modules/shared/ui/Badge'
import { Button } from '@/modules/shared/ui/Button'
import { FormField } from '@/modules/shared/ui/FormField'
import { DataState } from '@/modules/shared/ui/DataState'
import type { Supplier } from '../domain/types'
import type { PurchaseOrderStatus } from '../domain/purchaseOrder'

const supplierSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
})

type SupplierForm = z.infer<typeof supplierSchema>

const CATEGORY_VALUES = ['Food', 'Beverage', 'Non-food'] as const
const REGION_VALUES = ['Local', 'National', 'International'] as const
const CATEGORY_OPTIONS = ['All', ...CATEGORY_VALUES]
const REGION_OPTIONS = ['All', ...REGION_VALUES]
const SUPPLIER_STATUS_OPTIONS = ['All', 'Active', 'Inactive'] as const
const ORDER_STATUS_OPTIONS: (PurchaseOrderStatus | 'all')[] = [
  'all',
  'draft',
  'confirmed',
  'received',
  'cancelled',
]

const HUB_TABS = [
  { id: 'overview', label: 'Overview', description: 'Health + spend' },
  { id: 'suppliers', label: 'Suppliers', description: 'Vendors & filters' },
  { id: 'orders', label: 'Purchase Orders', description: 'Approvals + spend' },
] as const

type HubTab = (typeof HUB_TABS)[number]['id']

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
  const tone =
    val >= 95 ? 'success' : val >= 90 ? 'warning' : 'danger'
  return (
    <div className="flex items-center gap-1 text-sm text-foreground">
      <Star
        size={14}
        className={
          tone === 'success'
            ? 'text-success'
            : tone === 'warning'
            ? 'text-warning'
            : 'text-danger'
        }
      />
      {val}% ({tone === 'success' ? 'High' : tone === 'warning' ? 'Med' : 'Low'})
    </div>
  )
}

function supplierStateBadge(state: 'Active' | 'Inactive') {
  return (
    <Badge variant={state === 'Active' ? 'success' : 'danger'} className="capitalize">
      {state}
    </Badge>
  )
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

export default function SuppliersPage() {
  const { session, loading, error } = useSupabaseSession()
  const { activeOrgId } = useActiveOrgId()
  const hotels = useHotels(activeOrgId ?? undefined)
  const purchaseOrders = usePurchaseOrders(activeOrgId ?? undefined)
  const suppliers = useSuppliersInfinite(activeOrgId ?? undefined, !!session && !!activeOrgId && !loading)
  const createSupplier = useCreateSupplier(activeOrgId ?? undefined)
  const sessionError = useFormattedError(error)
  const createError = useFormattedError(createSupplier.error)
  const ordersError = useFormattedError(purchaseOrders.error)

  const [activeTab, setActiveTab] = useState<HubTab>('overview')
  const [search, setSearch] = useState('')
  const [supplierStatus, setSupplierStatus] = useState<typeof SUPPLIER_STATUS_OPTIONS[number]>('All')
  const [categoryFilter, setCategoryFilter] = useState<typeof CATEGORY_OPTIONS[number]>('All')
  const [regionFilter, setRegionFilter] = useState<typeof REGION_OPTIONS[number]>('All')
  const [selectedHotel, setSelectedHotel] = useState('')
  const [orderStatus, setOrderStatus] = useState<PurchaseOrderStatus | 'all'>('all')
  const [showForm, setShowForm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '' },
  })

  const hotelList = useMemo(() => hotels.data ?? [], [hotels.data])
  const hotelMap = useMemo(
    () =>
      hotelList.reduce<Record<string, string>>((acc, hotel) => {
        acc[hotel.id] = hotel.name
        return acc
      }, {}),
    [hotelList],
  )

  const flatSuppliers: Supplier[] = useMemo(
    () => suppliers.data?.pages.flatMap((page: Supplier[]) => page) ?? [],
    [suppliers.data],
  )

  const enrichedSuppliers = useMemo(
    () =>
      flatSuppliers.map((supplier, idx) => {
        const leadTimes = ['3-5 Days', '2-4 Days', '4-6 Days']
        const activePOs = ['2 Open', '3 Open', '1 Open']
        const contact = `${supplier.name.toLowerCase().replace(/\s+/g, '.')}@example.com`
        const category = CATEGORY_VALUES[idx % CATEGORY_VALUES.length]
        const region = REGION_VALUES[idx % REGION_VALUES.length]
        const status: 'Active' | 'Inactive' = idx % 4 === 0 ? 'Inactive' : 'Active'
        const branch = hotelList.length ? hotelList[idx % hotelList.length] : undefined
        return {
          supplier,
          contact,
          leadTime: leadTimes[idx % leadTimes.length],
          activePos: activePOs[idx % activePOs.length],
          healthIdx: idx,
          reliabilityIdx: idx,
          category,
          region,
          status,
          branchId: branch?.id,
        }
      }),
    [flatSuppliers, hotelList],
  )

  const filteredSuppliers = useMemo(
    () =>
      enrichedSuppliers.filter((row) => {
        const matchesSearch = row.supplier.name.toLowerCase().includes(search.toLowerCase())
        const matchesStatus =
          supplierStatus === 'All' || row.status === supplierStatus
        const matchesCategory =
          categoryFilter === 'All' || row.category === categoryFilter
        const matchesRegion =
          regionFilter === 'All' || row.region === regionFilter
        const matchesHotel =
          !selectedHotel || row.branchId === selectedHotel
        return matchesSearch && matchesStatus && matchesCategory && matchesRegion && matchesHotel
      }),
    [enrichedSuppliers, search, supplierStatus, categoryFilter, regionFilter, selectedHotel],
  )

  const orderList = useMemo(() => purchaseOrders.data ?? [], [purchaseOrders.data])
  const receivedCount = orderList.filter((order) => order.status === 'received').length
  const pendingApprovalCount = orderList.filter((order) => order.approvalStatus === 'pending').length
  const openOrdersCount = orderList.filter((order) => order.status !== 'received' && order.status !== 'cancelled').length
  const spendForecast = orderList.reduce((acc, order) => acc + (order.totalEstimated ?? 0), 0)
  const onTimeRate = orderList.length ? Math.round((receivedCount / orderList.length) * 100) : 0

  const overviewStats = [
    { label: 'Active Suppliers', value: `${enrichedSuppliers.filter((row) => row.status === 'Active').length} / ${enrichedSuppliers.length}`, subline: 'Tiered network' },
    { label: 'Pending Approvals', value: `${pendingApprovalCount}`, subline: 'Awaiting buyers' },
    { label: 'Open Purchase Orders', value: `${openOrdersCount}`, subline: 'In progress' },
    { label: 'Spend Forecast', value: formatCurrency(spendForecast), subline: 'Next 30 days' },
    { label: 'On-time Rate', value: `${onTimeRate}%`, subline: 'Received vs total' },
  ]

  const filteredOrders = useMemo(
    () =>
      orderList.filter((order) => {
        const matchesHotel = !selectedHotel || order.hotelId === selectedHotel
        const matchesStatus = orderStatus === 'all' || order.status === orderStatus
        return matchesHotel && matchesStatus
      }),
    [orderList, selectedHotel, orderStatus],
  )

  const handleAddSupplier = async (values: SupplierForm) => {
    await createSupplier.mutateAsync(values)
    reset()
    setShowForm(false)
  }

  if (!session && !loading) {
    return <ErrorBanner title="Inicia sesión" message={sessionError || 'Acceso requerido para ver proveedores.'} />
  }

  if (!activeOrgId) {
    return <ErrorBanner title="Selecciona organización" message="Sin organización asignada." />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Supplier & Procurement Hub"
        subtitle="Gestiona proveedores, compras y salud financiera."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => setShowForm(true)}>
              Add supplier
            </Button>
            <Link to="/purchasing/orders/new">
              <Button variant="primary">New purchase order</Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border/30 bg-surface/80 p-1">
          {HUB_TABS.map((tab) => {
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[18px] px-4 py-2 text-sm font-semibold transition ${active
                  ? 'bg-foreground text-surface shadow-lg shadow-foreground/20'
                  : 'bg-white/5 text-foreground/70 hover:bg-white/10'
                }`}
              >
                <p>{tab.label}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {tab.description}
                </p>
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border/40 px-3 py-1">Branch: {selectedHotel ? hotelMap[selectedHotel] : 'All'}</span>
          {selectedHotel && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedHotel('')}>
              Reset branch
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'overview' && (
        <Card className="rounded-3xl border border-border/25 bg-surface/80 p-5 shadow-[0_20px_60px_rgba(3,7,18,0.5)]">
          <div className="grid gap-4 md:grid-cols-5">
            {overviewStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.subline}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="secondary">Review approvals</Button>
            <Button variant="ghost">Import suppliers</Button>
            <Button variant="ghost">Export data</Button>
          </div>
        </Card>
      )}

      <Card className="rounded-3xl border border-border/25 bg-surface/70 p-4 shadow-[0_20px_60px_rgba(3,7,18,0.45)]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <input
              type="search"
              placeholder="Search suppliers..."
              className="h-11 w-full rounded-xl border border-border/40 bg-surface/80 px-4 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="ds-input w-[160px]"
            value={supplierStatus}
            onChange={(event) => setSupplierStatus(event.target.value as typeof SUPPLIER_STATUS_OPTIONS[number])}
          >
            {SUPPLIER_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="ds-input w-[160px]"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as typeof CATEGORY_OPTIONS[number])}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="ds-input w-[160px]"
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value as typeof REGION_OPTIONS[number])}
          >
            {REGION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="ds-input w-[200px]"
            value={selectedHotel}
            onChange={(event) => setSelectedHotel(event.target.value)}
          >
            <option value="">All branches</option>
            {hotelList.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </select>
          {activeTab === 'orders' && (
            <select
              className="ds-input w-[180px]"
              value={orderStatus}
              onChange={(event) => setOrderStatus(event.target.value as PurchaseOrderStatus | 'all')}
            >
              {ORDER_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 'all' ? 'All statuses' : option}
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {showForm && (
        <Card className="rounded-3xl border border-border/25 bg-surface/70 p-5 shadow-[0_22px_60px_rgba(3,7,18,0.5)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-lg font-semibold text-foreground">New Supplier</p>
              <p className="text-sm text-muted-foreground">Add a vendor to start issuing POs.</p>
            </div>
            {createError && <p className="text-xs text-danger">{createError}</p>}
          </div>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleAddSupplier)}>
            <FormField
              id="supplier-name"
              label="Supplier Name"
              placeholder="Acme Food Services"
              className="bg-surface2/80 text-foreground"
              error={errors.name}
              {...register('name')}
            />
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Create supplier'}
              </Button>
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'suppliers' && (
        <Card className="rounded-3xl border border-border/25 bg-surface/80 shadow-[0_24px_60px_rgba(3,7,18,0.45)]">
          <DataState
            loading={suppliers.isLoading}
            error={suppliers.error}
            errorTitle="Error al cargar proveedores"
            errorMessage={(suppliers.error as Error | undefined)?.message}
            empty={filteredSuppliers.length === 0 && !suppliers.isLoading}
            emptyState={
              <div className="p-8">
                <EmptyState
                  title="No suppliers found"
                  description="Ajusta los filtros o crea un proveedor."
                  action={<Button onClick={() => setShowForm(true)}>Add Supplier</Button>}
                />
              </div>
            }
            skeleton={
              <div className="p-6">
                <Spinner />
              </div>
            }
          >
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Active POs</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Reliability</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((row) => (
                    <TableRow key={row.supplier.id} className="hover:bg-white/5">
                      <TableCell className="font-semibold text-foreground">
                        <Link to={`/purchasing/suppliers/${row.supplier.id}`} className="hover:underline">
                          {row.supplier.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.contact}</TableCell>
                      <TableCell className="text-foreground">{row.leadTime}</TableCell>
                      <TableCell className="text-foreground">{row.activePos}</TableCell>
                      <TableCell className="text-foreground">{row.category}</TableCell>
                      <TableCell className="text-foreground">{row.region}</TableCell>
                      <TableCell>{supplierStateBadge(row.status)}</TableCell>
                      <TableCell>
                        {row.branchId ? (
                          <Badge variant="neutral">{hotelMap[row.branchId]}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">multi</span>
                        )}
                      </TableCell>
                      <TableCell>{healthBadge(row.healthIdx)}</TableCell>
                      <TableCell>{reliabilityBadge(row.reliabilityIdx)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DataState>
        </Card>
      )}

      {activeTab === 'orders' && (
        <Card className="rounded-3xl border border-border/25 bg-surface/80 shadow-[0_24px_60px_rgba(3,7,18,0.45)]">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Purchase Orders</p>
              <p className="text-xs text-muted-foreground">Revision rapida y aprobaciones.</p>
            </div>
            <Badge variant="info" className="px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {orderList.length} in org
            </Badge>
          </div>

          {purchaseOrders.isLoading ? (
            <div className="p-6">
              <Spinner />
            </div>
          ) : purchaseOrders.isError ? (
            <div className="px-5 py-6">
              <ErrorBanner title="Error al cargar pedidos" message={ordersError} onRetry={() => purchaseOrders.refetch()} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Hotel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead className="is-num">Total</TableHead>
                    <TableHead className="is-action">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const statusTone =
                      order.status === 'received'
                        ? 'success'
                        : order.status === 'confirmed'
                        ? 'warning'
                        : 'neutral'
                    const approvalTone =
                      order.approvalStatus === 'approved'
                        ? 'success'
                        : order.approvalStatus === 'pending'
                        ? 'warning'
                        : 'danger'
                    return (
                      <TableRow key={order.id} className="hover:bg-white/5">
                        <TableCell className="font-semibold text-foreground">{order.orderNumber}</TableCell>
                        <TableCell>{hotelMap[order.hotelId] ?? 'Branch'}</TableCell>
                        <TableCell>
                          <Badge variant={statusTone} className="capitalize">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={approvalTone} className="capitalize">
                            {order.approvalStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="is-num">{formatCurrency(order.totalEstimated ?? 0)}</TableCell>
                        <TableCell className="is-action">
                          <Link to={`/purchasing/orders/${order.id}`} className="ds-btn ds-btn-ghost h-auto py-1 text-xs">
                            Ver
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!filteredOrders.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        No hay pedidos que coincidan con los filtros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
