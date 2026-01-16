// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'
import { checkRateLimit } from '../_shared/rateLimit.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

function supabaseForUser(req: Request) {
    const authHeader = req.headers.get('Authorization') || ''
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
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

    try {
        const client = supabaseForUser(req)
        const { orderId } = (await req.json().catch(() => ({}))) as { orderId?: string }

        if (!orderId) {
            return new Response(JSON.stringify({ error: 'orderId requerido' }), { status: 400 })
        }

        // Check rate limit (20 requests per minute per org for audit)
        checkRateLimit(orderId, { limit: 20, windowMs: 60 * 1000, keyPrefix: 'audit' })

        // 1. Fetch Order & Items
        // Try purchase_orders first
        const { data: order } = await client
            .from('purchase_orders')
            .select('*, purchase_order_items(*)')
            .eq('id', orderId)
            .single()

        if (!order) {
            // Try event orders if not found
            const { data: evOrder, error: evErr } = await client
                .from('event_purchase_orders')
                .select('*, event_purchase_order_items(*)')
                .eq('id', orderId)
                .single()

            if (evErr || !evOrder) throw new Error('Order not found')

            // Normalize structure
            order = {
                ...evOrder,
                purchase_order_items: evOrder.event_purchase_order_items
            }
        }

        // 2. Call Gemini
        if (!geminiApiKey) throw new Error('Missing GEMINI_API_KEY')
        const genAI = new GoogleGenerativeAI(geminiApiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        const prompt = `
      Eres un auditor de compras para un restaurante. Revisa este pedido:
      ${JSON.stringify(order, null, 2)}
      
      Busca anomalías:
      - Cantidades inusuales.
      - Precios unitarios muy altos (si están disponibles).
      - Productos que no parecen comida/bebida o suministros válidos.
      
      Devuelve un breve reporte en JSON:
      {
        "status": "ok" | "warning",
        "findings": ["Posible error en cantidad de Tomates (500kg)", "Precio de Solomillo parece bajo"]
      }
      
      Si todo parece normal, devuelve status "ok" y findings vacio.
      Solo JSON.
    `

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        // Cleanup markdown
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()
        const json = JSON.parse(cleanedText)

        return new Response(JSON.stringify(json), { headers: { 'Content-Type': 'application/json' } })

    } catch (err: any) {
        if (err.name === 'RateLimitError') {
            return new Response(JSON.stringify({ error: err.message, retryAfter: err.retryAfter }), { status: 429 })
        }
        return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 })
    }
}

if (import.meta.main) {
    serve(handler)
}
