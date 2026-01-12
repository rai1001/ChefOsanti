
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: 'supabase/.env' })
dotenv.config({ path: '.env.local' })
dotenv.config()

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !service) {
    console.error('Missing env vars', { url: !!url, service: !!service })
    process.exit(1)
}

const admin = createClient(url, service, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function run() {
    const email = `debug+${Date.now()}@test.com`
    const password = 'Test1234!'
    console.log('Attempting to create user:', { email, password })

    const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    })

    if (error) {
        console.error('FAILURE:', JSON.stringify(error, null, 2))
    } else {
        console.log('SUCCESS:', data.user?.id)
    }
}

run()
