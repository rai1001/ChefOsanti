
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'

dotenv.config({ path: 'supabase/.env' })
dotenv.config({ path: '.env.local' })
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
})

async function seed() {
    console.log('🌱 Starting demo seed...')

    // 1. Create Demo Org
    const orgSlug = 'demo-org'
    let orgId: string

    const { data: existingOrg } = await supabase
        .from('orgs')
        .select('id')
        .eq('slug', orgSlug)
        .single()

    if (existingOrg) {
        console.log('✅ Org exists:', orgSlug)
        orgId = existingOrg.id
    } else {
        orgId = randomUUID()
        const { error } = await supabase.from('orgs').insert({
            id: orgId,
            name: 'Demo Organization',
            slug: orgSlug,
        })
        if (error) throw error
        console.log('✨ Created Org:', orgSlug)
    }

    // 2. Create Demo Hotel
    let hotelId: string
    const { data: existingHotel } = await supabase
        .from('hotels')
        .select('id')
        .eq('org_id', orgId)
        .eq('name', 'Hotel Principal')
        .single()

    if (existingHotel) {
        console.log('✅ Hotel exists: Hotel Principal')
        hotelId = existingHotel.id
    } else {
        hotelId = randomUUID()
        const { error } = await supabase.from('hotels').insert({
            id: hotelId,
            org_id: orgId,
            name: 'Hotel Principal',
        })
        if (error) throw error
        console.log('✨ Created Hotel: Hotel Principal')
    }

    // 3. Create Products
    const productsToCreate = [
        { name: 'Tomate', base_unit: 'kg', category: 'vegetables' },
        { name: 'Lechuga', base_unit: 'kg', category: 'vegetables' },
        { name: 'Carne Picada', base_unit: 'kg', category: 'meat' },
        { name: 'Pan Burger', base_unit: 'ud', category: 'bread' },
        { name: 'Queso Cheddar', base_unit: 'kg', category: 'dairy' },
    ]

    const productMap = new Map<string, string>() // name -> id

    for (const p of productsToCreate) {
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('org_id', orgId)
            .eq('name', p.name)
            .single()

        if (existing) {
            productMap.set(p.name, existing.id)
        } else {
            const { data, error } = await supabase
                .from('products')
                .insert({
                    org_id: orgId,
                    name: p.name,
                    base_unit: p.base_unit,
                    category: p.category,
                })
                .select('id')
                .single()
            if (error) throw error
            productMap.set(p.name, data.id)
            console.log(`✨ Created Product: ${p.name}`)
        }
    }

    // 4. Create Supplier
    const supplierName = 'Frutas Manolo'
    let supplierId: string
    const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('org_id', orgId)
        .eq('name', supplierName)
        .single()

    if (existingSupplier) {
        console.log(`✅ Supplier exists: ${supplierName}`)
        supplierId = existingSupplier.id
    } else {
        const { data, error } = await supabase
            .from('suppliers')
            .insert({ org_id: orgId, name: supplierName })
            .select('id')
            .single()
        if (error) throw error
        supplierId = data.id
        console.log(`✨ Created Supplier: ${supplierName}`)
    }

    // 5. Create Supplier Items
    const itemsToCreate = [
        { name: 'Tomate Pera', purchase_unit: 'kg', pack_size: 1, rounding_rule: 'none' },
        { name: 'Lechuga Iceberg', purchase_unit: 'ud', pack_size: 1, rounding_rule: 'none' },
    ]

    for (const item of itemsToCreate) {
        const { data: existingItem } = await supabase
            .from('supplier_items')
            .select('id')
            .eq('supplier_id', supplierId)
            .eq('name', item.name)
            .single()

        if (!existingItem) {
            const { error } = await supabase.from('supplier_items').insert({
                supplier_id: supplierId,
                name: item.name,
                purchase_unit: item.purchase_unit,
                pack_size: item.pack_size,
                rounding_rule: item.rounding_rule,
            })
            if (error) throw error
            console.log(`✨ Created Supplier Item: ${item.name}`)
        }
    }

    // 6. Create Recipe
    const recipeName = 'Hamburguesa Clásica'
    const { data: existingRecipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('org_id', orgId)
        .eq('name', recipeName)
        .single()

    if (!existingRecipe) {
        const { data: recipe, error } = await supabase
            .from('recipes')
            .insert({
                org_id: orgId,
                name: recipeName,
                default_servings: 1,
                category: 'main',
            })
            .select('id')
            .single()

        if (error) throw error
        console.log(`✨ Created Recipe: ${recipeName}`)

        // Add lines
        const lines = [
            { product: 'Carne Picada', qty: 0.15, unit: 'kg' },
            { product: 'Pan Burger', qty: 1, unit: 'ud' },
            { product: 'Queso Cheddar', qty: 0.02, unit: 'kg' },
            { product: 'Tomate', qty: 0.03, unit: 'kg' },
            { product: 'Lechuga', qty: 0.02, unit: 'kg' },
        ]

        for (const line of lines) {
            const prodId = productMap.get(line.product)
            if (prodId) {
                await supabase.from('recipe_lines').insert({
                    org_id: orgId,
                    recipe_id: recipe.id,
                    product_id: prodId,
                    qty: line.qty,
                    unit: line.unit,
                })
            }
        }
        console.log(`✨ Added ingredients to ${recipeName}`)
    } else {
        console.log(`✅ Recipe exists: ${recipeName}`)
    }

    // 7. Create Menu Template
    const menuName = 'Menú Degustación'
    const { data: existingMenu } = await supabase
        .from('menu_templates')
        .select('id')
        .eq('org_id', orgId)
        .eq('name', menuName)
        .single()

    if (!existingMenu) {
        const { error } = await supabase.from('menu_templates').insert({
            org_id: orgId,
            name: menuName,
            category: 'coctel',
            notes: 'Menú de prueba generado automáticamente',
        })
        if (error) throw error
        console.log(`✨ Created Menu Template: ${menuName}`)
    } else {
        console.log(`✅ Menu Template exists: ${menuName}`)
    }

    console.log('✅ Demo seed completed successfully!')
}

seed().catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
})
