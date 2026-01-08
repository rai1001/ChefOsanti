
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55eGFvZnNpeW1ocnBjeXdkemV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg1NDM2OSwiZXhwIjoyMDgzNDMwMzY5fQ.BTZgy_1SYigKjscCgAjlOjGgPssoOzpV9bJ_R3GkvZw'

if (!supabaseUrl || !serviceKey) {
    console.error('Missing URL or Service Key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function createAdmin() {
    const email = 'pagopaypal1974@gmail.com'
    const password = 'password123'

    console.log(`Checking/Creating user ${email}...`)

    // 1. Create or Get Auth User
    let userId;
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    const existingUser = users.find(u => u.email === email)

    if (existingUser) {
        console.log('User already exists:', existingUser.id)
        userId = existingUser.id
    } else {
        const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { first_name: 'Admin', last_name: 'User' }
        })
        if (createError) {
            console.error('Error creating auth user:', createError.message)
            process.exit(1)
        }
        userId = user.id
        console.log('Auth user created:', userId)
    }

    // 2. Create Default Org
    console.log('Creating/Checking default Organization...')
    // Check if any org exists (for this user or general) - simplified: just create one if not exists
    // We'll try to find one by slug 'chefos-default'
    let orgId;
    const { data: orgs } = await supabase.from('orgs').select('*').eq('slug', 'chefos-default').single()

    if (orgs) {
        console.log('Org exists:', orgs.id)
        orgId = orgs.id
    } else {
        const { data: newOrg, error: orgError } = await supabase
            .from('orgs')
            .insert([{ name: 'ChefOS Default', slug: 'chefos-default' }])
            .select()
            .single()

        if (orgError) {
            console.error('Error creating org:', orgError.message)
            process.exit(1)
        }
        console.log('Org created:', newOrg.id)
        orgId = newOrg.id
    }

    // 3. Create Membership
    console.log('Creating/Checking Membership...')
    const { data: membership } = await supabase
        .from('org_memberships')
        .select('*')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .single()

    if (membership) {
        console.log('Membership already exists.')
    } else {
        const { error: memberError } = await supabase
            .from('org_memberships')
            .insert([{ org_id: orgId, user_id: userId, role: 'admin' }])

        if (memberError) {
            console.error('Error creating membership:', memberError.message)
        } else {
            console.log('Membership created. Admin access granted.')
        }
    }
}

createAdmin()
