
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eGFvZnNpeW1ocnBjeXdkemV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg1NDM2OSwiZXhwIjoyMDgzNDMwMzY5fQ.BTZgy_1SYigKjscCgAjlOjGgPssoOzpV9bJ_R3GkvZw'

if (!supabaseUrl) {
    console.error('Missing URL')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function createRaisada() {
    const email = 'raisada1001@gmail.com'
    const password = 'chefos_premium' // Temporary password
    const hotelOrgId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

    console.log(`Checking/Creating user ${email}...`)

    // 1. Create or Get Auth User
    let userId;
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
        console.error('Error listing users:', listError)
        process.exit(1)
    }

    const existingUser = users.find(u => u.email === email)

    if (existingUser) {
        console.log('User already exists:', existingUser.id)
        userId = existingUser.id
        // Optional: Update password if needed
        // await supabase.auth.admin.updateUserById(userId, { password: password })
    } else {
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { first_name: 'Premium', last_name: 'User' }
        })
        if (createError) {
            console.error('Error creating auth user:', createError.message)
            process.exit(1)
        }
        userId = user.id
        console.log('Auth user created:', userId)
    }

    // 2. Grant Access to Hotel Atlantico
    console.log('Granting OWNER access to Hotel Atlantico...')

    // Ensure Org Exists
    const { data: org, error: orgError } = await supabase.from('orgs').upsert({
        id: hotelOrgId,
        name: 'Hotel Atlantico',
        slug: 'hotel-atlantico'
    }).select().single()

    if (orgError) {
        console.error('Error ensuring org exists:', orgError.message)
        // process.exit(1) // Try to continue anyway
    } else {
        console.log('Org verified/created:', hotelOrgId)
    }

    const { error: memberError } = await supabase.from('org_memberships').upsert({
        org_id: hotelOrgId,
        user_id: userId,
        role: 'admin'
    }, { onConflict: 'org_id,user_id' })

    if (memberError) {
        console.error('Error granting access:', memberError.message)
    } else {
        console.log('SUCCESS: Access granted.')
        console.log(`Credentials: ${email} / ${password}`)
    }
}

createRaisada()
