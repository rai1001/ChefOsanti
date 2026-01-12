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
        
    # 1. Supabase/Postgres Migration
    sql_migration = """
-- Migration: Create events and rooms tables
-- Compatible with Supabase (UUIDs, Timestamps, org_id)

CREATE EXTENSION IF NOT EXISTS "pg_crypto";

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000000', -- Placeholder for RLS
    name TEXT NOT NULL,
    event_date DATE NOT NULL,
    menu_status TEXT DEFAULT 'pending',
    menu_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.event_rooms (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    org_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
    PRIMARY KEY (event_id, room_name)
);

-- Index for performance and RLS
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(org_id);
CREATE INDEX IF NOT EXISTS idx_event_rooms_org_id ON public.event_rooms(org_id);
"""
    
    with open(os.path.join(IMPORT_DIR, "supabase_migration.sql"), "w", encoding="utf-8") as f:
        f.write(sql_migration)
        
    # 2. Seed Data
    with open(os.path.join(IMPORT_DIR, "seed.sql"), "w", encoding="utf-8") as f:
        f.write("-- Seed data for events and rooms\n")
        for ev in events:
            # Convert MD5 hash to a UUID-like string if it's 32 chars
            # Simple conversion for demo: 8-4-4-4-12
            h = ev["id"]
            uuid_id = f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"
            
            safe_name = ev["name"].replace("'", "''")
            menu_json = json.dumps(ev["menu"]).replace("'", "''")
            
            f.write(f"INSERT INTO public.events (id, name, event_date, menu_data) VALUES ('{uuid_id}', '{safe_name}', '{ev['date']}', '{menu_json}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, event_date = EXCLUDED.event_date, menu_data = EXCLUDED.menu_data;\n")
            
            for room in ev["rooms"]:
                f.write(f"INSERT INTO public.event_rooms (event_id, room_name) VALUES ('{uuid_id}', '{room}') ON CONFLICT DO NOTHING;\n")

    # 3. JSON API Payloads (chunked)
    chunk_size = 100
    for i in range(0, len(events), chunk_size):
        chunk = events[i:i+chunk_size]
        # Inject UUIDs into payloads as well
        for item in chunk:
            h = item["id"]
            item["id"] = f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"
            item["org_id"] = "00000000-0000-0000-0000-000000000000"

        filename = f"events_payload_{i // chunk_size + 1}.json"
        with open(os.path.join(IMPORT_DIR, filename), "w", encoding="utf-8") as f:
            json.dump(chunk, f, indent=2, ensure_ascii=False)

    print(f"Generated Supabase-optimized import package in {IMPORT_DIR}")

if __name__ == "__main__":
    generate_package()
