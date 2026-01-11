
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

async function checkDB() {
  // Try to select from a table we know should exist if migrated
  // 'settings' or 'users' (but users is protected), let's try 'settings' or check user session

  console.log('Checking connection to:', supabaseUrl)

  // 1. Check if we can reach the server (health check via a simple query)
  // Since we don't know if tables exist, we'll try to sign in with a fake user to check Auth service
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password'
  })

  if (authError && authError.message.includes('Invalid login credentials')) {
    console.log('Auth service is reachable (Invalid login credentials expected).')
  } else if (authError) {
    console.log('Auth service error:', authError.message)
  }

  // 2. Check for public tables. We'll try to read from 'outlets' or a common table
  const { count, error } = await supabase
    .from('reporting_generated_reports')
    .select('*', { count: 'exact', head: true })

  console.log('Reporting reports count:', count)

  if (error) {
    console.log('Table check error:', error.message)
    if (error.code === '42P01') {
      console.log('CONFIRMED: Table "outlets" does not exist. Schema is likely empty.')
    }
  } else {
    console.log('Table "reporting_generated_reports" exists.')
  }
}

checkDB()
