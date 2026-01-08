
import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrate() {
    const password = process.env.DB_PASSWORD || process.argv[2]
    if (!password) {
        console.error('Please provide the DB password as an argument or DB_PASSWORD env var.')
        process.exit(1)
    }

    const projectRef = 'nyxaofsiymhrpcywdzew' // Hardcoded from user request
    const connectionString = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`

    console.log(`Connecting to ${projectRef}...`)
    const client = new pg.Client({ connectionString })

    try {
        await client.connect()
        console.log('Connected!')

        const migrationsDir = path.join(__dirname, '../supabase/migrations')
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort()

        if (files.length === 0) {
            console.log('No migration files found.')
            return
        }

        console.log(`Found ${files.length} migration files.`)

        for (const file of files) {
            console.log(`Processing ${file}...`)
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
            try {
                // Determine if we should split by statement (simplistic) or run whole file
                // Supabase migrations usually run as one block, but pg client might want one statement at a time 
                // if it sends multiple queries. simple query() supports multiple statements.
                await client.query(sql)
                console.log(`  ✓ Applied`)
            } catch (err) {
                console.error(`  X Failed to apply ${file}:`, err.message)
                // Continue or break? Usually break.
                process.exit(1)
            }
        }

        console.log('All migrations applied successfully.')

    } catch (err) {
        console.error('Migration failed:', err)
    } finally {
        await client.end()
    }
}

migrate()
