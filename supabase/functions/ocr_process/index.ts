// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3'
import { checkRateLimit, RateLimitError } from '../_shared/rateLimit.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
// Use provided key as fallback if env var is missing (common in local dev without cli linking)
const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
const ocrProvider = Deno.env.get('OCR_PROVIDER') ?? 'gemini'

function supabaseForUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || ''
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })
}

type DraftSection = { title: string; items: string[] }
type DraftService = {
  serviceType: 'desayuno' | 'coffee_break' | 'comida' | 'merienda' | 'cena' | 'coctel' | 'otros'
  startsAtGuess: string | null
  paxGuess: number | null
  formatGuess: 'sentado' | 'de_pie'
  sections: DraftSection[]
}

function detectServiceType(text: string): DraftService['serviceType'] {
  const lower = text.toLowerCase()
  if (lower.includes('desayuno')) return 'desayuno'
  if (lower.includes('coffee')) return 'coffee_break'
  if (lower.includes('almuerzo') || lower.includes('comida')) return 'comida'
  if (lower.includes('merienda')) return 'merienda'
  if (lower.includes('cena')) return 'cena'
  if (lower.includes('coctel') || lower.includes('cocktail')) return 'coctel'
  return 'otros'
}

function detectPax(text: string): number | null {
  const withKeyword = text.match(/(\d{2,4})\s*(pax|personas)/i)
  if (withKeyword) {
    const n = Number(withKeyword[1])
    return Number.isFinite(n) ? n : null
  }
  return null
}

function detectStart(text: string): string | null {
  const match = text.match(/\b(\d{1,2}[:.]\d{2})\b/)
  return match ? match[1].replace('.', ':') : null
}

function detectFormat(text: string): 'sentado' | 'de_pie' {
  const lower = text.toLowerCase()
  if (lower.includes('de pie') || lower.includes('coctel')) return 'de_pie'
  return 'sentado'
}

function buildDraftFromText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const sections: DraftSection[] = []
  let current: DraftSection = { title: 'General', items: [] }
  lines.forEach((line) => {
    const isSection = /[:]+$/.test(line) || line === line.toUpperCase()
    if (isSection) {
      if (current.items.length || current.title !== 'General') sections.push(current)
      current = { title: line.replace(/:$/, '').trim() || 'Seccion', items: [] }
    } else {
      current.items.push(line)
    }
  })
  if (current.items.length || sections.length === 0) sections.push(current)

  const serviceText = lines.join(' ')
  const detected: DraftService = {
    serviceType: detectServiceType(serviceText),
    paxGuess: detectPax(serviceText),
    startsAtGuess: detectStart(serviceText),
    formatGuess: detectFormat(serviceText),
    sections,
  }

  return {
    rawText: text,
    warnings: [],
    detectedServices: [detected],
  }
}

function buildFallbackDraft(originalName: string) {
  return {
    rawText: '',
    warnings: ['OCR no disponible, revisar manualmente'],
    detectedServices: [
      {
        serviceType: 'otros',
        startsAtGuess: null,
        paxGuess: null,
        formatGuess: 'sentado',
        sections: [
          {
            title: 'OCR',
            items: [originalName || 'Revisar menu'],
          },
        ],
      },
    ],
  }
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
    // Check rate limit (10 requests per minute per org)
    checkRateLimit(job.org_id, { limit: 10, windowMs: 60 * 1000, keyPrefix: 'ocr' })

    let extractedText = ''
    let draftJson: any = {}

    // 1. Load attachment metadata (user context, RLS enforced)
    const { data: attachment, error: attachmentErr } = await client
      .from('event_attachments')
      .select('storage_bucket, storage_path, mime_type, original_name')
      .eq('id', job.attachment_id)
      .single()

    if (attachmentErr || !attachment) throw new Error(attachmentErr?.message || 'Attachment not found')

    const download = await client.storage.from(attachment.storage_bucket).download(attachment.storage_path)
    if (download.error) throw download.error

    const arrayBuffer = await download.data.arrayBuffer()
    const mimeType = attachment.mime_type || 'application/octet-stream'

    if (mimeType.startsWith('text/')) {
      extractedText = new TextDecoder().decode(arrayBuffer)
      draftJson = buildDraftFromText(extractedText)
    } else if (geminiApiKey && ocrProvider === 'gemini') {
      const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      const prompt = `
Devuelve JSON estricto con este formato:
{
  "rawText": "Texto completo extraido aproximado...",
  "warnings": ["Warning 1", "Warning 2"],
  "detectedServices": [
    {
      "serviceType": "desayuno" | "coffee_break" | "comida" | "cena" | "coctel" | "merienda" | "otros",
      "startsAtGuess": "HH:MM",
      "paxGuess": 0,
      "formatGuess": "sentado" | "de_pie",
      "sections": [
        { "title": "Entrantes", "items": ["Item 1", "Item 2"] }
      ]
    }
  ]
}
Devuelve solo JSON, sin markdown.
`

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
      ])

      const response = await result.response
      const text = response.text()
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim()

      try {
        draftJson = JSON.parse(cleanedText)
        extractedText = draftJson.rawText || text.slice(0, 1000)
      } catch (e) {
        console.error('Failed to parse JSON from Gemini', text)
        draftJson = buildFallbackDraft(attachment.original_name)
        extractedText = draftJson.rawText || ''
      }
    } else {
      draftJson = buildFallbackDraft(attachment.original_name)
      extractedText = draftJson.rawText || ''
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
    if (err.name === 'RateLimitError') {
      console.warn('Rate limit exceeded for OCR job', body.jobId)
      // Do not fail the job, just retry later or return 429 to client
      return new Response(JSON.stringify({ error: err.message, retryAfter: err.retryAfter }), { status: 429 })
    }

    console.error('OCR Process Error:', err)
    await client.from('ocr_jobs').update({ status: 'failed', error: String(err?.message || err) }).eq('id', body.jobId)
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 })
  }
}

export async function handler(req: Request) {
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
}

if (import.meta.main) {
  serve(handler)
}
