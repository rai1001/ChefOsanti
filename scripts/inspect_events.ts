
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    console.log('Available env keys:', Object.keys(process.env).filter(k => k.startsWith('VITE_')))
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectSchema() {
    console.log('Inspecting events table...')

    // We can't query information_schema easily via client unless exposed.
    // But we can try to select one row and see keys, or error.

    const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error querying events:', error)
        return
    }

    if (data && data.length > 0) {
        console.log('Columns found in events table:', Object.keys(data[0]))
    } else {
        // If empty, try inserting a dummy to see constraint errors? No, too risky.
        console.log('Events table is empty. Attempting to select specific columns to check existence.')

        const cols = ['name', 'title', 'hotel_id', 'starts_at']
        for (const col of cols) {
            const { error } = await supabase.from('events').select(col).limit(0)
            if (error) console.log(`Column '${col}' issue:`, error.message)
            else console.log(`Column '${col}' exists.`)
        }
    }
}

inspectSchema()
