
-- Migration: Create events and rooms tables
-- Compatible with Supabase (UUIDs, Timestamps, org_id)

CREATE EXTENSION IF NOT EXISTS "pg_crypto";

CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Hotel Atlantico
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
    org_id UUID DEFAULT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    PRIMARY KEY (event_id, room_name)
);

-- Index for performance and RLS
CREATE INDEX IF NOT EXISTS idx_events_org_id ON public.events(org_id);
CREATE INDEX IF NOT EXISTS idx_event_rooms_org_id ON public.event_rooms(org_id);
