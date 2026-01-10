
-- Create waste_reasons table
CREATE TABLE IF NOT EXISTS public.waste_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(org_id, name)
);

-- Create waste_entries table
CREATE TABLE IF NOT EXISTS public.waste_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.orgs(id),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    product_id UUID NOT NULL REFERENCES public.products(id),
    unit TEXT NOT NULL CHECK (unit IN ('kg', 'ud', 'l')),
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    reason_id UUID NOT NULL REFERENCES public.waste_reasons(id),
    unit_cost NUMERIC NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    total_cost NUMERIC GENERATED ALWAYS AS (ROUND(quantity * unit_cost, 2)) STORED,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waste_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_entries ENABLE ROW LEVEL SECURITY;

-- Policies for waste_reasons
CREATE POLICY "Users can view waste reasons from their org" ON public.waste_reasons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.org_memberships
            WHERE org_memberships.org_id = waste_reasons.org_id
            AND org_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Users with permission can manage waste reasons" ON public.waste_reasons
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.org_memberships
            WHERE org_memberships.org_id = waste_reasons.org_id
            AND org_memberships.user_id = auth.uid()
            -- AND (role = 'admin' OR ...) -- Simplified for MVP, enforcing Org membership
        )
    );

-- Policies for waste_entries
CREATE POLICY "Users can view waste entries from their org" ON public.waste_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.org_memberships
            WHERE org_memberships.org_id = waste_entries.org_id
            AND org_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert waste entries for their org" ON public.waste_entries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.org_memberships
            WHERE org_memberships.org_id = waste_entries.org_id
            AND org_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update waste entries for their org" ON public.waste_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.org_memberships
            WHERE org_memberships.org_id = waste_entries.org_id
            AND org_memberships.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete waste entries for their org" ON public.waste_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.org_memberships
            WHERE org_memberships.org_id = waste_entries.org_id
            AND org_memberships.user_id = auth.uid()
        )
    );

-- Trigger for consistency (ensure hotel, product, and reason belong to same org)
CREATE OR REPLACE FUNCTION public.check_waste_org_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- Check Hotel Org
    IF NOT EXISTS (SELECT 1 FROM public.hotels WHERE id = NEW.hotel_id AND org_id = NEW.org_id) THEN
        RAISE EXCEPTION 'Hotel does not belong to the Organisation';
    END IF;

    -- Check Product Org
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id AND org_id = NEW.org_id) THEN
        RAISE EXCEPTION 'Product does not belong to the Organisation';
    END IF;

    -- Check Reason Org
    IF NOT EXISTS (SELECT 1 FROM public.waste_reasons WHERE id = NEW.reason_id AND org_id = NEW.org_id) THEN
        RAISE EXCEPTION 'Waste Reason does not belong to the Organisation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_waste_org_consistency
    BEFORE INSERT OR UPDATE ON public.waste_entries
    FOR EACH ROW EXECUTE FUNCTION public.check_waste_org_consistency();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waste_reasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waste_entries TO authenticated;
