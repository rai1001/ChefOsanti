import json
import os
import pandas as pd

NORMALIZED_DIR = "normalized"
IMPORT_DIR = "import"

def generate_package():
    if not os.path.exists(IMPORT_DIR):
        os.makedirs(IMPORT_DIR)
        
    with open(os.path.join(NORMALIZED_DIR, "events.json"), "r", encoding="utf-8") as f:
        events = json.load(f)
    
    # Deterministic Org ID for Hotel Atlantico (MD5-based or fixed)
    # Using a fixed valid UUID for "Hotel Atlantico"
    ORG_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
        
    # 1. Supabase/Postgres Migration
    sql_migration = f"""
-- Migration: Create events and rooms tables
-- Compatible with Supabase (UUIDs, Timestamps, org_id)

CREATE EXTENSION IF NOT EXISTS "pg_crypto";

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID DEFAULT '{ORG_ID}', -- Hotel Atlantico
    name TEXT NOT NULL,
    event_date DATE NOT NULL,
    menu_status TEXT DEFAULT 'pending',
    menu_data JSONB DEFAULT '{{}}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.event_rooms (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    org_id UUID DEFAULT '{ORG_ID}',
    PRIMARY KEY (event_id, room_name)
);

-- Index for performance and RLS
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(org_id);
CREATE INDEX IF NOT EXISTS idx_event_rooms_org_id ON public.event_rooms(org_id);
"""
    
    with open(os.path.join(IMPORT_DIR, "supabase_migration.sql"), "w", encoding="utf-8") as f:
        f.write(sql_migration)
        
    # 2. Hotel Atlantico & User Setup
    seed_org_sql = f"""
-- 1. Create Organization
INSERT INTO public.orgs (id, name, slug)
VALUES ('{ORG_ID}', 'Hotel Atlantico', 'hotel-atlantico')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Hotel Entry
INSERT INTO public.hotels (org_id, name, city, country)
VALUES ('{ORG_ID}', 'Hotel Atlantico', 'Vigo', 'Spain')
ON CONFLICT DO NOTHING;

-- 3. Link Current User (Run this in Supabase SQL Editor)
-- This assumes the user running the script wants to be a member
INSERT INTO public.org_memberships (org_id, user_id, role)
SELECT '{ORG_ID}', auth.uid(), 'owner'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (org_id, user_id) DO NOTHING;
"""
    with open(os.path.join(IMPORT_DIR, "00_setup_hotel_atlantico.sql"), "w", encoding="utf-8") as f:
        f.write(seed_org_sql)

    # 3. Seed Data (Events)
    with open(os.path.join(IMPORT_DIR, "seed.sql"), "w", encoding="utf-8") as f:
        f.write("-- Seed data for events and rooms\n")
        
        # Split into chunks of 1000 for performance/limits
        f.write("BEGIN;\n")
        
        count = 0
        for ev in events:
            # Convert MD5 hash to a UUID-like string if it's 32 chars
            h = ev["id"]
            uuid_id = f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"
            
            safe_name = ev["name"].replace("'", "''")
            menu_json = json.dumps(ev["menu"]).replace("'", "''")
            
            # Use the defined ORG_ID
            f.write(f"INSERT INTO public.events (id, org_id, name, event_date, menu_data) VALUES ('{uuid_id}', '{ORG_ID}', '{safe_name}', '{ev['date']}', '{menu_json}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, event_date = EXCLUDED.event_date, menu_data = EXCLUDED.menu_data;\n")
            
            for room in ev["rooms"]:
                f.write(f"INSERT INTO public.event_rooms (event_id, room_name, org_id) VALUES ('{uuid_id}', '{room}', '{ORG_ID}') ON CONFLICT DO NOTHING;\n")
            
            count += 1
            if count % 500 == 0:
                f.write("COMMIT; BEGIN;\n")
        
        f.write("COMMIT;\n")

    # 4. JSON API Payloads (chunked)
    chunk_size = 100
    for i in range(0, len(events), chunk_size):
        chunk = events[i:i+chunk_size]
        # Inject UUIDs into payloads as well
        for item in chunk:
            h = item["id"]
            item["id"] = f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"
            item["org_id"] = ORG_ID

        filename = f"events_payload_{i // chunk_size + 1}.json"
        with open(os.path.join(IMPORT_DIR, filename), "w", encoding="utf-8") as f:
            json.dump(chunk, f, indent=2, ensure_ascii=False)

    print(f"Generated Supabase-optimized import package in {IMPORT_DIR}")
    print(f"Org ID: {ORG_ID}")

if __name__ == "__main__":
    generate_package()
