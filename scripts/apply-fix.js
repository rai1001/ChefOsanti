
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load env from parent dir .env.local
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, '../.env.local') })

async function applyFix() {
    const password = process.env.DB_PASSWORD
    if (!password) {
        console.error('No DB_PASSWORD found in .env.local')
        process.exit(1)
    }

    const projectRef = 'nyxaofsiymhrpcywdzew'
    const connectionString = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`

    console.log(`Connecting to ${projectRef}...`)
    const client = new pg.Client({ connectionString })

    try {
        await client.connect()
        console.log('Connected!')

        const file = '20260112130000_fix_import_validate.sql'
        const filePath = path.join(__dirname, '../supabase/migrations', file)

        console.log(`Reading ${file}...`)
        const sql = fs.readFileSync(filePath, 'utf8')

        console.log(`Applying fix...`)
        await client.query(sql)
        console.log(`  ✓ Fix Applied Successfully!`)

    } catch (err) {
        console.error('Migration failed:', err)
        process.exit(1)
    } finally {
        await client.end()
    }
}

applyFix()
