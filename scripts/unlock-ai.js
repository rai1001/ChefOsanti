
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SERVICE_ROLE_KEY } = process.env;

// Extract DB connection string from SERVICE_ROLE_KEY if possible, or use a direct connection string if provided
// Since we are using local supabase or a cloud project, we need the connection string.
// usually provided as DATABASE_URL in .env, but here we might only have the URL/KEY.
// For Supabase scripts, usually we use the postgres connection string.
// Let's assume the user has a DATABASE_URL or we can construct it? 
// actually 'pg' needs a connection string.
// In the previous 'migrate.js' script I created, I might have used DATABASE_URL.
// Let's check if DATABASE_URL is in .env.local.
// If not, I'll ask the user or try to infer it. The user provided `VITE_SUPABASE_URL`.
// But for `pg` client, we need the postgres connection string (port 5432 or 6543).

// Wait, the user moved to a hosted project `nyxaofsiymhrpcywdzew`.
// The connection string usually is `postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
// I don't have the password!
// The user set the password to `password123` for the *dashboard user*, but the database password might be different or same?
// Wait, I created the user `pagopaypal1974@gmail.com` with `password123`.
// But I don't have the *database* password for the `postgres` role?
// Actually, `scripts/migrate.js` used a `DATABASE_URL`. Let's check `migrate.js` CONTENT from previous turn (or view it now).

// If I can't connect directly via PG, I can use the Supabase JS client with the SERVICE_ROLE_KEY to perform the write.
// Supabase JS client is safer if I don't have the direct DB password.
// The user provided `VITE_SUPABASE_ANON_KEY`. I might not have the SERVICE_ROLE_KEY!
// The prompt said "New Supabase credentials...". Did it include SERVICE_ROLE_KEY?
// Check Task.md or .env.local via view_file.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = VITE_SUPABASE_URL;
// We need SERVICE_ROLE_KEY to bypass RLS and write to org_plans (policy "org_plans write service role").
// If I don't have it, I can't do this from a script easily without the user's password for `postgres`.
// Let's check .env.local again.

async function unlockAi() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Error: SUPABASE_SERVICE_ROLE_KEY is missing from .env.local (or process.env). cannot bypass RLS.');
        // Fallback: If we are admin, maybe we can do it if there's a policy?
        // Policy says: "org_plans write service role" -> using (auth.role() = 'service_role').
        // Use the anon key? No.
        // I need the service role key.
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);

    console.log('Connecting to Supabase...');

    // 1. Get the organization for the admin user
    const adminEmail = 'pagopaypal1974@gmail.com'; // The user we created

    // Get User ID
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const adminUser = users.find(u => u.email === adminEmail);
    if (!adminUser) {
        console.error(`User ${adminEmail} not found.`);
        process.exit(1);
    }

    console.log(`Found Admin User: ${adminUser.id}`);

    // Get Org Membership
    const { data: memberships, error: memberError } = await supabase
        .from('org_memberships')
        .select('org_id')
        .eq('user_id', adminUser.id)
        .single();

    if (memberError || !memberships) {
        console.error('No organization membership found for this user.');
        // Maybe create one?
        // For now, assume it exists as per previous setup.
        process.exit(1);
    }

    const orgId = memberships.org_id;
    console.log(`Found Organization: ${orgId}`);

    // 2. Upsert org_plans
    const { error: upsertError } = await supabase
        .from('org_plans')
        .upsert({
            org_id: orgId,
            plan: 'vip'
        }, { onConflict: 'org_id' });

    if (upsertError) {
        console.error('Error updating plan:', upsertError);
        process.exit(1);
    }

    console.log('Success! Organization plan upgraded to VIP.');
    console.log('AI Features (Order Audit, Daily Brief, OCR) should now be unlocked.');
}

unlockAi().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
