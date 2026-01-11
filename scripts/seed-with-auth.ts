
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'

// Prioritize .env.local
dotenv.config({ path: '.env.local' })
dotenv.config({ path: 'supabase/.env' })
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Missing SUPABASE_URL or ANON_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function seed() {
    console.log('🌱 Starting demo seed (via Auth)...')

    // 1. Authenticate
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password'
    })

    if (authError) {
        throw new Error(`Auth failed: ${authError.message}`)
    }
    console.log('✅ Authenticated as test user')

    // 2. Get Org (assume demo org exists from previous migrations/seeds)
    const { data: org } = await supabase.from('orgs').select('id').eq('slug', 'demo-org').single()
    if (!org) throw new Error('Demo Org not found')
    const orgId = org.id

    // 3. Get Hotel
    const { data: hotel } = await supabase.from('hotels').select('id').eq('org_id', orgId).limit(1).single()
    if (!hotel) throw new Error('Demo Hotel not found')
    const hotelId = hotel.id

    // 4. Create Waste Reasons
    const reasons = [
        'Caducidad',
        'Sobreproducción',
        'Error de Producción',
        'Error de Recepción',
        'Devolución Cliente',
        'Otros'
    ]

    const reasonMap = new Map<string, string>()

    for (const name of reasons) {
        const { data: existing } = await supabase
            .from('waste_reasons')
            .select('id')
            .eq('org_id', orgId)
            .eq('name', name)
            .single()

        if (existing) {
            reasonMap.set(name, existing.id)
        } else {
            const { data, error } = await supabase
                .from('waste_reasons')
                .insert({ org_id: orgId, name })
                .select('id')
                .single()

            if (error) throw error
            reasonMap.set(name, data.id)
            console.log(`✨ Created Waste Reason: ${name}`)
        }
    }

    // 5. Get a Product to waste (Tomate)
    const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('org_id', orgId)
        .ilike('name', 'Tomate')
        .limit(1)
        .single()

    if (!product) {
        console.log('⚠️ Product "Tomate" not found, skipping entries creation')
        return
    }

    // 6. Create Waste Entries
    const wasteReasonId = reasonMap.get('Caducidad')
    if (wasteReasonId) {
        const { count } = await supabase
            .from('waste_entries')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId)

        if (count === 0) {
            const entries = Array.from({ length: 10 }).map((_, i) => ({
                org_id: orgId,
                hotel_id: hotelId,
                product_id: product.id,
                unit: product.base_unit,
                quantity: parseFloat((Math.random() * 5).toFixed(2)),
                reason_id: wasteReasonId,
                unit_cost: 1.50,
                occurred_at: new Date(Date.now() - i * 86400000).toISOString(),
                notes: `Demo waste entry ${i + 1}`,
            }))

            const { error } = await supabase.from('waste_entries').insert(entries)
            if (error) throw error
            console.log('✨ Created 10 Demo Waste Entries')
        } else {
            console.log('✅ Waste Entries already exist')
        }
    }

    console.log('✅ Manual seed completed!')
}

seed().catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
})
