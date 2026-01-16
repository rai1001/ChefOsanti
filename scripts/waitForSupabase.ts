import dotenv from 'dotenv'

dotenv.config({ path: 'supabase/.env' })
dotenv.config({ path: '.env.local' })
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

async function waitForAuth(url: string) {
  const deadline = Date.now() + 90_000
  let attempt = 0
  while (Date.now() < deadline) {
    attempt++
    try {
      const res = await fetch(`${url}/auth/v1/health`)
      if (res.ok) {
        console.log(`Supabase Auth ready after ${attempt} attempts`)
        return
      }
    } catch {
      // ignore and retry
    }
    const delay = Math.min(500 * attempt, 4000)
    await new Promise((r) => setTimeout(r, delay))
  }
  throw new Error('Supabase Auth no respondió en el tiempo esperado')
}

async function main() {
  if (!SUPABASE_URL) {
    console.error('Falta SUPABASE_URL/VITE_SUPABASE_URL para esperar Auth')
    process.exit(1)
  }
  await waitForAuth(SUPABASE_URL)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
