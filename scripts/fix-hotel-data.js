
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eGFvZnNpeW1ocnBjeXdkemV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg1NDM2OSwiZXhwIjoyMDgzNDMwMzY5fQ.BTZgy_1SYigKjscCgAjlOjGgPssoOzpV9bJ_R3GkvZw'

if (!supabaseUrl) process.exit(1)

const supabase = createClient(supabaseUrl, serviceKey)

async function checkAndFixHotel() {
    const orgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

    console.log('Checking Hotel Data for Org:', orgId)

    const { data: hotels, error } = await supabase.from('hotels').select('*').eq('org_id', orgId)

    if (error) {
        console.error('Error listing hotels:', error)
        return
    }

    console.log('Found hotels:', hotels.length)
    if (hotels.length > 0) {
        console.log('Hotel exists:', hotels[0].name)
    } else {
        console.log('Hotel MISSING. Creating it...')
        const { error: insertError } = await supabase.from('hotels').insert({
            org_id: orgId,
            name: 'Hotel Atlantico',
            city: 'Vigo',
            country: 'Spain',
            currency: 'EUR'
        })
        if (insertError) console.error('Error creating hotel:', insertError)
        else console.log('Hotel Atlantico created successfully.')
    }
}

checkAndFixHotel()
