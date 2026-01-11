
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEndpoint(name, promise) {
    console.log(`\n--- Testing ${name} ---`)
    const { data, error, count, status, statusText } = await promise

    if (error) {
        console.error(`FAILED (${status || '?'}) ${statusText || ''}:`, error.message, error.code)
        if (status === 404 || error.code === 'PGRST106' || (error.message && error.message.includes('404'))) {
            console.error('>>> CONFIRMED 404: Resource not found/hidden.')
        }
    } else {
        console.log(`SUCCESS (${status}) - Count: ${count}`)
    }
}

async function run() {
    console.log('Target URL:', supabaseUrl)

    // 1. Test ANON Access
    console.log('\n[SCENARIO 1: ANON ACCESS]')
    await testEndpoint('Waste Entries (Anon)', supabase.from('waste_entries').select('*', { count: 'exact', head: true }))

    // 2. Test AUTHENTICATED Access
    console.log('\n[SCENARIO 2: AUTHENTICATED ACCESS]')
    const tempEmail = `test_${Date.now()}@example.com`
    const tempPass = 'password123'

    console.log(`Attempting SignUp with ${tempEmail}...`)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPass
    })

    let session = authData?.session

    if (!session) {
        console.log('SignUp did not return a session (likely email confirmation required).')
        // Fallback: Try known user
        console.log('Falling back to test@example.com login...')
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: 'test@example.com',
            password: 'password'
        })
        if (loginError) console.error('Fallback Login Failed:', loginError.message)
        session = loginData?.session
    }

    if (!session) {
        console.error('CRITICAL: Could not obtain a valid session. Skipping Auth tests.')
    } else {
        console.log('✅ Logged in as:', session.user.email)

        // Create authenticated client
        const authClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${session.access_token}` } }
        })

        await testEndpoint('Waste Entries (Auth)', authClient.from('waste_entries').select('*', { count: 'exact', head: true }))
        await testEndpoint('Waste Reasons (Auth)', authClient.from('waste_reasons').select('*', { count: 'exact', head: true }))
        await testEndpoint('Reporting (Auth)', authClient.from('reporting_generated_reports').select('*', { count: 'exact', head: true }))

        // RPC Test
        console.log('\n--- Testing RPC log_event (Auth) ---')
        const { error: rpcError } = await authClient.rpc('log_event', {
            p_org_id: '00000000-0000-0000-0000-000000000000',
            p_level: 'info',
            p_event: 'debug_probe'
        })
        console.log('RPC Result:', rpcError ? `FAILED: ${rpcError.message}` : 'SUCCESS')
    }

    // 3. Test Edge Function
    console.log('\n[SCENARIO 3: EDGE FUNCTION OPTIONS]')
    try {
        const funcUrl = `${supabaseUrl}/functions/v1/reporting_generate`
        const res = await fetch(funcUrl, {
            method: 'OPTIONS',
            headers: {
                'Access-Control-Request-Method': 'POST',
                'Origin': 'https://chef-osanti.vercel.app'
            }
        })
        console.log(`Function OPTIONS Status: ${res.status} ${res.statusText}`)
        const headersToCheck = ['x-served-by', 'access-control-allow-origin']
        headersToCheck.forEach(h => {
            if (res.headers.get(h)) console.log(`${h}: ${res.headers.get(h)}`)
        })
    } catch (err) {
        console.error('Function Request Failed:', err.message)
    }
}

run()
