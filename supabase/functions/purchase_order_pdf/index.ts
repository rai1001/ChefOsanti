import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

function supabaseForUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || ''
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  })
}

export async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo no permitido' }, 405)
  }

  const { orderId, orderType } = (await req.json().catch(() => ({}))) as {
    orderId?: string
    orderType?: 'purchase' | 'event'
  }

  if (!orderId || (orderType !== 'purchase' && orderType !== 'event')) {
    return jsonResponse({ error: 'orderId y orderType requeridos' }, 400)
  }

  const supabase = supabaseForUser(req)

  let orderNumber = ''
  let supplierName = ''
  let totalEstimated = 0
  let createdAt = ''
  let lines: { label: string; qty: number; unit: string; unitPrice: number; lineTotal: number }[] = []

  if (orderType === 'purchase') {
    const { data: order, error } = await supabase
      .from('purchase_orders')
      .select('id, order_number, total_estimated, created_at, suppliers(name)')
      .eq('id', orderId)
      .single()
    if (error || !order) {
      return jsonResponse({ error: error?.message ?? 'Pedido no encontrado' }, 404)
    }
    orderNumber = order.order_number
    supplierName = order.suppliers?.name ?? 'Proveedor'
    totalEstimated = Number(order.total_estimated ?? 0)
    createdAt = order.created_at

    const { data: lineRows, error: lineErr } = await supabase
      .from('purchase_order_lines')
      .select('requested_qty, purchase_unit, unit_price, line_total, ingredients(name)')
      .eq('purchase_order_id', orderId)
    if (lineErr) {
      return jsonResponse({ error: lineErr.message }, 500)
    }
    lines = (lineRows ?? []).map((row: any) => ({
      label: row.ingredients?.name ?? 'Item',
      qty: Number(row.requested_qty ?? 0),
      unit: row.purchase_unit ?? 'ud',
      unitPrice: Number(row.unit_price ?? 0),
      lineTotal: Number(row.line_total ?? 0),
    }))
  } else {
    const { data: order, error } = await supabase
      .from('event_purchase_orders')
      .select('id, order_number, total_estimated, created_at, suppliers(name)')
      .eq('id', orderId)
      .single()
    if (error || !order) {
      return jsonResponse({ error: error?.message ?? 'Pedido evento no encontrado' }, 404)
    }
    orderNumber = order.order_number
    supplierName = order.suppliers?.name ?? 'Proveedor'
    totalEstimated = Number(order.total_estimated ?? 0)
    createdAt = order.created_at

    const { data: lineRows, error: lineErr } = await supabase
      .from('event_purchase_order_lines')
      .select('qty, purchase_unit, unit_price, line_total, item_label')
      .eq('event_purchase_order_id', orderId)
    if (lineErr) {
      return jsonResponse({ error: lineErr.message }, 500)
    }
    lines = (lineRows ?? []).map((row: any) => ({
      label: row.item_label ?? 'Item',
      qty: Number(row.qty ?? 0),
      unit: row.purchase_unit ?? 'ud',
      unitPrice: Number(row.unit_price ?? 0),
      lineTotal: Number(row.line_total ?? 0),
    }))
  }

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageSize: [number, number] = [595, 842]
  let page = pdfDoc.addPage(pageSize)
  let y = page.getHeight() - 50

  const drawLine = (text: string, size = 11, isBold = false) => {
    if (y < 60) {
      page = pdfDoc.addPage(pageSize)
      y = page.getHeight() - 50
    }
    page.drawText(text, {
      x: 50,
      y,
      size,
      font: isBold ? fontBold : font,
      color: rgb(0.1, 0.1, 0.1),
    })
    y -= size + 8
  }

  drawLine(`Pedido ${orderNumber}`, 16, true)
  drawLine(`Proveedor: ${supplierName}`)
  drawLine(`Creado: ${new Date(createdAt).toLocaleDateString()}`)
  drawLine(`Total estimado: ${totalEstimated.toFixed(2)}`)
  y -= 8
  drawLine('Lineas:', 12, true)

  lines.forEach((line) => {
    drawLine(`- ${line.label}: ${line.qty.toFixed(2)} ${line.unit} | ${line.unitPrice.toFixed(2)} | ${line.lineTotal.toFixed(2)}`)
  })

  const pdfBytes = await pdfDoc.save()
  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=order-${orderNumber}.pdf`,
      'Access-Control-Allow-Origin': '*',
    },
  })
}

if (import.meta.main) {
  serve(handler)
}
