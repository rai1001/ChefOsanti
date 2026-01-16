import { getSupabaseClient } from '@/lib/supabaseClient'
import { mapSupabaseError } from '@/lib/shared/errors'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export async function downloadPurchaseOrderPdf(params: { orderId: string; orderType: 'purchase' | 'event' }) {
  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL no configurado')
  }
  const supabase = getSupabaseClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) {
    throw new Error('Sesion no disponible para descargar PDF')
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/purchase_order_pdf`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId: params.orderId, orderType: params.orderType }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw mapSupabaseError({ code: String(res.status), message: text }, {
      module: 'purchasing',
      operation: 'downloadPurchaseOrderPdf',
      orderId: params.orderId,
    })
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${params.orderType}-order-${params.orderId.slice(0, 6)}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
