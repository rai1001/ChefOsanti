// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'
import { SYSTEM_PROMPT, getPrompt } from './prompt.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

function supabaseForUser(req: Request) {
    const authHeader = req.headers.get('Authorization') || ''
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
    })
}

// Helper to calculate date ranges (Simplified version of domain logic for Deno)
function getRanges(type: 'weekly' | 'monthly', refDateStr?: string) {
    const refDate = refDateStr ? new Date(refDateStr) : new Date();
    let start: Date, end: Date;

    if (type === 'weekly') {
        const day = refDate.getDay();
        const diff = refDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(refDate);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);

        start = new Date(monday);
        start.setDate(start.getDate() - 7);

        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
    } else {
        start = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 1);
        end = new Date(refDate.getFullYear(), refDate.getMonth(), 0, 23, 59, 59, 999);
    }

    // Period string for query
    return {
        start: start.toISOString(),
        end: end.toISOString()
    };
}

export async function handler(req: Request) {
    // CORS headers - Enable for all responses
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const client = supabaseForUser(req)
        const body = await req.json().catch(() => ({})) as any
        const { orgId, type, referenceDate } = body

        console.log(`Received request: orgId=${orgId}, type=${type}, refDate=${referenceDate}`)

        if (!orgId || !type) {
            console.error('Missing required fields: orgId or type')
            return new Response(JSON.stringify({ error: 'orgId and type (weekly/monthly) are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        const range = getRanges(type, referenceDate);
        console.log(`Calculated range: ${JSON.stringify(range)}`)

        // 1. Fetch Metrics (Parallel execution)
        // Note: Replicating queries here as we cannot import TS/Data layer from Vue/React app directly in Deno easily
        const [eventsRes, ordersRes, wasteRes] = await Promise.all([
            client.from('events').select('status, starts_at').eq('org_id', orgId).gte('starts_at', range.start).lte('starts_at', range.end),
            client.from('purchase_orders').select('total_estimated, suppliers(name)').eq('org_id', orgId).gte('created_at', range.start).lte('created_at', range.end).neq('status', 'cancelled'),
            client.from('waste_logs').select('total_cost').eq('org_id', orgId).gte('created_at', range.start).lte('created_at', range.end)
        ]);

        if (eventsRes.error) {
            console.error('Error fetching events:', eventsRes.error)
            throw eventsRes.error
        }
        if (ordersRes.error) {
            console.error('Error fetching orders:', ordersRes.error)
            throw ordersRes.error
        }
        // Waste might effectively be optional or empty, but check error
        if (wasteRes.error) {
            console.error('Error fetching waste:', wasteRes.error)
            // throw wasteRes.error // Optional: maybe don't fail hard on waste? sticking to strict for now
        }

        // Process Metrics
        const events = {
            total: eventsRes.data.length,
            confirmed: eventsRes.data.filter((e: any) => ['confirmed', 'in_production', 'closed'].includes(e.status)).length,
            cancelled: eventsRes.data.filter((e: any) => e.status === 'cancelled').length
        };

        const totalSpend = ordersRes.data.reduce((sum: number, o: any) => sum + (Number(o.total_estimated) || 0), 0);
        const totalWaste = (wasteRes.data || []).reduce((sum: number, w: any) => sum + (Number(w.total_cost) || 0), 0);

        // Top Suppliers
        const supplierMap: Record<string, number> = {};
        ordersRes.data.forEach((o: any) => {
            const name = o.suppliers?.name || 'Unknown';
            supplierMap[name] = (supplierMap[name] || 0) + (Number(o.total_estimated) || 0);
        });
        const topSuppliers = Object.entries(supplierMap)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        const kpis = {
            period: range,
            type,
            events,
            financial: {
                purchasing_total: totalSpend,
                waste_total: totalWaste,
                top_suppliers: topSuppliers
            }
        };

        console.log('KPIs generated:', JSON.stringify(kpis))

        // 2. Generate AI Report
        if (!geminiApiKey) {
            console.error("GEMINI_API_KEY missing");
            // If no API key, save partial report
            await client.from('reporting_generated_reports').insert({
                org_id: orgId,
                type,
                period_start: range.start,
                period_end: range.end,
                metrics_json: kpis,
                status: 'failed',
                error_message: 'AI Service Config Error'
            });
            throw new Error('AI Service not configured');
        }

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const finalPrompt = `
        ${SYSTEM_PROMPT}

        ${getPrompt(kpis, type)}
        `;

        console.log('Sending prompt to Gemini...');
        const result = await model.generateContent(finalPrompt);
        const response = await result.response;
        const reportMd = response.text();
        console.log('Gemini response received.');

        // 3. Save to DB
        const { data: dbEntry, error: dbError } = await client.from('reporting_generated_reports').insert({
            org_id: orgId,
            type,
            period_start: range.start,
            period_end: range.end,
            metrics_json: kpis,
            report_md: reportMd,
            status: 'generated'
        }).select().single();

        if (dbError) {
            console.error('Error saving report to DB:', dbError)
            throw dbError
        }

        return new Response(JSON.stringify({ success: true, report: dbEntry }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Edge Function Error:', err);
        return new Response(JSON.stringify({ error: String(err?.message || err) }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
}

if (import.meta.main) {
    serve(handler)
}
