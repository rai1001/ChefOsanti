// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

function supabaseForUser(req: Request) {
    const authHeader = req.headers.get('Authorization') || ''
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    })
}

serve(async (req) => {
    // CORS
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
        const { weekStart, orgId } = (await req.json().catch(() => ({}))) as { weekStart?: string; orgId?: string }

        if (!weekStart || !orgId) {
            return new Response(JSON.stringify({ error: 'weekStart y orgId requeridos' }), { status: 400 })
        }

        // 1. Fetch Events for the week
        const startDate = new Date(weekStart)
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 7)

        const { data: events, error: evErr } = await client
            .from('events')
            .select('id, title, starts_at, status, pax, event_services(service_type, pax, format)')
            .eq('org_id', orgId)
            .gte('starts_at', startDate.toISOString())
            .lt('starts_at', endDate.toISOString())
            .order('starts_at')

        if (evErr) throw evErr

        // 2. Fetch Pending Orders (optional context)
        const { data: orders, error: ordErr } = await client
            .from('purchase_orders')
            .select('id, supplier_name, status, total_amount')
            .eq('org_id', orgId)
            .eq('status', 'draft') // Focus on what needs attention
            .limit(5)

        if (ordErr) throw ordErr

        // 3. Call Gemini
        if (!geminiApiKey) throw new Error('Missing GEMINI_API_KEY')
        const genAI = new GoogleGenerativeAI(geminiApiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

        const prompt = `
      Eres el asistente ejecutivo de un Chef. Genera un "Daily Brief" (o Weekly Brief) conciso para la semana del ${weekStart}.
      Usa un tono profesional pero directo y útil.
      
      Información de la semana:
      ${JSON.stringify(events, null, 2)}
      
      Pedidos en borrador (pendientes de revisar):
      ${JSON.stringify(orders, null, 2)}
      
      Instrucciones:
      - Resalta el día con más carga de trabajo.
      - Menciona eventos clave y sus servicios (ej: "Boda el sábado con 150 pax").
      - Avisa si hay pedidos pendientes que podrían bloquear la producción.
      - Formato Markdown.
    `

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        return new Response(JSON.stringify({ content: text }), { headers: { 'Content-Type': 'application/json' } })

    } catch (err: any) {
        return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 })
    }
})
