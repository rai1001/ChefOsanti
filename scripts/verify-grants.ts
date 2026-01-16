
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Missing URL or KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, ANON_KEY)

async function verify() {
    console.log('🔍 Verifying access...')

    // Authenticate
    const { error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password'
    })

    if (authError) throw new Error(`Auth failed: ${authError.message}`)
    console.log('✅ Authenticated')

    // Try to select from reporting_generated_reports
    const { error, count } = await supabase
        .from('reporting_generated_reports')
        .select('*', { count: 'exact', head: true })

    if (error) {
        console.error('❌ Error accessing reporting_generated_reports:', error)
    } else {
        console.log('✅ Access to reporting_generated_reports confirmed. Count:', count)
    }
}

verify().catch(console.error)
