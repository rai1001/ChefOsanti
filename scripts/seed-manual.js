
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'

// Only load what works in check-db.js
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Missing URL or KEY', { url: !!SUPABASE_URL, key: !!ANON_KEY })
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function seed() {
    console.log('🌱 Starting seed (JS manual)...')

    // Authenticate
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password'
    })

    if (authError) throw new Error(`Auth failed: ${authError.message}`)
    console.log('✅ Authenticated')

    // Get Org
    const { data: org } = await supabase.from('orgs').select('id').eq('slug', 'demo-org').single()
    if (!org) throw new Error('Org not found')
    const orgId = org.id

    // Get Hotel
    const { data: hotel } = await supabase.from('hotels').select('id').eq('org_id', orgId).limit(1).single()
    if (!hotel) throw new Error('Hotel not found')
    const hotelId = hotel.id

    // Reasons
    const reasons = ['Caducidad', 'Sobreproducción', 'Otros']
    const reasonMap = new Map()

    for (const name of reasons) {
        const { data: existing } = await supabase.from('waste_reasons').select('id').eq('org_id', orgId).eq('name', name).maybeSingle()
        if (existing) {
            reasonMap.set(name, existing.id)
        } else {
            const { data, error } = await supabase.from('waste_reasons').insert({ org_id: orgId, name }).select('id').single()
            if (error) throw error
            reasonMap.set(name, data.id)
            console.log('Created reason:', name)
        }
    }

    // Product (Tomate)
    const { data: product } = await supabase.from('products').select('*').eq('org_id', orgId).ilike('name', 'Tomate').limit(1).single()
    if (!product) {
        console.log('Tomate not found')
        return
    }

    // Entries
    const reasonId = reasonMap.get('Caducidad')
    if (reasonId) {
        const { count } = await supabase.from('waste_entries').select('*', { count: 'exact', head: true })
        if (count === 0) {
            await supabase.from('waste_entries').insert([{
                org_id: orgId,
                hotel_id: hotelId,
                product_id: product.id,
                unit: product.base_unit,
                quantity: 2.5,
                reason_id: reasonId,
                unit_cost: 1.5,
                notes: 'Manual seed entry'
            }])
            console.log('Created 1 entry')
        } else {
            console.log('Entries exist')
        }
    }
}

seed().catch(console.error)
