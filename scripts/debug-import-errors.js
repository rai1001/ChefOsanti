
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY // using anon key might not have permission to read all jobs unless we login?
// Wait, import_jobs has RLS.
// We should use SERVICE_ROLE_KEY if we want to debug everything, or use the raisada user.
// But I don't have raisada's password here easily (it's in the create script).
// I will use the service key I used in other scripts.
// The other scripts used a hardcoded service key or similar?
// `create-raisada.js` had a `serviceKey` variable?
// Check `create-raisada.js` content from my memory/history.
// Ah, I don't have the service key in .env.local usually? 
// .env.local usually has ANON key.
// If I use ANON key, I need to sign in.

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// If we don't have service key, this might fail if RLS blocks.
// Let's try anon key first. If it fails, I'll ask user or look for service key.
// Actually `scripts/create-raisada.js` had "const serviceKey = '...'" hardcoded which I removed? No, I viewed it.
// Let's check `scripts/create-raisada.js` again to see if I can reuse the key logic.
// Or just try to query with what we have.

async function checkErrors() {
    console.log('Connecting to Supabase...')
    const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY)

    // We need to login as raisada to see their jobs?
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: 'raisada1001@gmail.com',
        password: 'chefos_premium'
    })

    if (authError) {
        console.error('Login failed:', authError)
        // Try continuing?
    } else {
        console.log('Logged in as raisada1001@gmail.com')
    }

    // Get latest job
    const { data: jobs, error: jobsError } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

    if (jobsError) {
        console.error('Error fetching jobs:', jobsError)
        return
    }

    if (!jobs || jobs.length === 0) {
        console.log('No jobs found.')
        return
    }

    const job = jobs[0]
    console.log(`Latest Job: ${job.id} (Status: ${job.status})`)
    console.log('Summary:', job.summary)

    // Get sample errors
    const { data: rows, error: rowsError } = await supabase
        .from('import_rows')
        .select('row_number, errors, raw')
        .eq('job_id', job.id)
        .limit(5)

    if (rowsError) {
        console.error('Error fetching rows:', rowsError)
        return
    }

    console.log('--- Sample Errors ---')
    rows.forEach(r => {
        console.log(`Row ${r.row_number}:`, r.errors)
        console.log('Raw:', JSON.stringify(r.raw).substring(0, 100) + '...')
    })
}

checkErrors()
