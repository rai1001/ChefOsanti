// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// Use provided key as fallback if env var is missing (common in local dev without cli linking)
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? 'AIzaSyCfjgND4PgkwhFvo5PvewjaJbEHPG8yf8o'
const ocrProvider = Deno.env.get('OCR_PROVIDER') ?? 'gemini'

function supabaseForUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || ''
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
}

function supabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceRole)
}

async function handleEnqueue(req: Request) {
  const client = supabaseForUser(req)
  const body = (await req.json().catch(() => ({}))) as { attachmentId?: string }
  if (!body.attachmentId) {
    return new Response(JSON.stringify({ error: 'attachmentId requerido' }), { status: 400 })
  }
  const { data: attachment, error: attErr } = await client
    .from('event_attachments')
    .select('id, org_id')
    .eq('id', body.attachmentId)
    .single()
  if (attErr || !attachment) {
    return new Response(JSON.stringify({ error: attErr?.message || 'No attachment' }), { status: 400 })
  }

  const { data: job, error: jobErr } = await client
    .from('ocr_jobs')
    .insert({
      org_id: attachment.org_id,
      attachment_id: attachment.id,
      status: 'queued',
      provider: ocrProvider,
    })
    .select('id')
    .single()
  if (jobErr) return new Response(JSON.stringify({ error: jobErr.message }), { status: 400 })
  return new Response(JSON.stringify({ jobId: job.id }), { headers: { 'Content-Type': 'application/json' } })
}

async function handleRun(req: Request) {
  const client = supabaseForUser(req)
  const body = (await req.json().catch(() => ({}))) as { jobId?: string }
  if (!body.jobId) return new Response(JSON.stringify({ error: 'jobId requerido' }), { status: 400 })

  const { data: job, error: jobErr } = await client
    .from('ocr_jobs')
    .select('id, status, org_id, attachment_id')
    .eq('id', body.jobId)
    .single()
  if (jobErr || !job) return new Response(JSON.stringify({ error: jobErr?.message || 'Job no encontrado' }), { status: 404 })

  if (job.status === 'done' || job.status === 'failed') {
    return new Response(JSON.stringify({ status: job.status }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Update status to processing
  const toProcessing = await client.from('ocr_jobs').update({ status: 'processing' }).eq('id', body.jobId)
  if (toProcessing.error) return new Response(JSON.stringify({ error: toProcessing.error.message }), { status: 400 })

  try {
    let extractedText = ''
    let draftJson: any = {}

    // 1. Download file
    const admin = supabaseAdmin()
    const { data: attachment } = await admin
      .from('event_attachments')
      .select('storage_bucket, storage_path, file_type') // Ensure file_type is selected if available, or guess
      .eq('id', job.attachment_id)
      .single()

    if (!attachment) throw new Error('Attachment not found')

    const download = await admin.storage.from(attachment.storage_bucket).download(attachment.storage_path)
    if (download.error) throw download.error

    const arrayBuffer = await download.data.arrayBuffer()
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    // Guess mime type if needed, usually passed in file_type or inferred
    // Simple inference for common types
    let mimeType = 'image/jpeg'
    if (attachment.storage_path.endsWith('.pdf')) mimeType = 'application/pdf'
    else if (attachment.storage_path.endsWith('.png')) mimeType = 'image/png'
    else if (attachment.storage_path.endsWith('.webp')) mimeType = 'image/webp'


    // 2. Call Gemini
    if (!geminiApiKey) throw new Error('Missing GEMINI_API_KEY')

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const prompt = `
      Analiza este documento (factura, hoja de servicio o menú de evento) y extrae la información en el siguiente formato JSON estrictamente.
      Si es una imagen borrosa o no legible, indica warnings.
      
      Estructura deseada:
      {
        "rawText": "Texto completo extraído aproximado...",
        "warnings": ["Warning 1", "Warning 2"],
        "detectedServices": [
          {
            "service_type": "desayuno" | "coffee_break" | "almuerzo" | "cena" | "coctel" | "barra_libre" | "merienda" | "otros",
            "starts_at_guess": "HH:MM",
            "pax_guess": number,
            "format_guess": "sentado" | "de_pie" | "buffet",
            "sections": [
              { "title": "Nombre sección (ej Entrantes)", "items": ["Item 1", "Item 2"] }
            ]
          }
        ]
      }
      
      Retorna SOLO el JSON, sin markdown code blocks.
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ])

    const response = await result.response
    const text = response.text()

    // Clean markdown if present
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()

    try {
      draftJson = JSON.parse(cleanedText)
      extractedText = draftJson.rawText || text.slice(0, 1000)
    } catch (e) {
      console.error('Failed to parse JSON from Gemini', text)
      draftJson = { rawText: text, warnings: ['Failed to parse JSON response'], detectedServices: [] }
      extractedText = text
    }

    const { error: updErr } = await client
      .from('ocr_jobs')
      .update({
        status: 'done',
        extracted_text: extractedText,
        draft_json: draftJson,
        error: null,
      })
      .eq('id', body.jobId)

    if (updErr) throw updErr

    return new Response(JSON.stringify({ status: 'done', data: draftJson }), { headers: { 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error('OCR Process Error:', err)
    await client.from('ocr_jobs').update({ status: 'failed', error: String(err?.message || err) }).eq('id', body.jobId)
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 })
  }
}

serve(async (req) => {
  const url = new URL(req.url)
  // Headers CORS for browser direct calls if needed, though usually proxied
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method === 'POST' && url.pathname.endsWith('/enqueue')) {
    return handleEnqueue(req)
  }
  if (req.method === 'POST' && url.pathname.endsWith('/run')) {
    return handleRun(req)
  }
  return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
})
