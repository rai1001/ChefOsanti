-- S12 Procurement Orders: status enums, lead times, and event split by product type

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_order_status') THEN
    CREATE TYPE public.purchase_order_status AS ENUM ('draft', 'approved', 'ordered', 'received', 'cancelled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'purchase_order_received_state') THEN
    CREATE TYPE public.purchase_order_received_state AS ENUM ('none', 'partial', 'full');
  END IF;
END $$;

-- Lead times by supplier and product type
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS lead_time_days int NOT NULL DEFAULT 2;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'suppliers' AND constraint_name = 'suppliers_lead_time_chk'
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT suppliers_lead_time_chk CHECK (lead_time_days >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.supplier_lead_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs (id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers (id) ON DELETE CASCADE,
  product_type public.product_type NOT NULL,
  lead_time_days int NOT NULL CHECK (lead_time_days >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (supplier_id, product_type)
);

CREATE INDEX IF NOT EXISTS supplier_lead_times_org_idx ON public.supplier_lead_times (org_id);
CREATE INDEX IF NOT EXISTS supplier_lead_times_supplier_idx ON public.supplier_lead_times (supplier_id);

ALTER TABLE public.supplier_lead_times ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_supplier_lead_time()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  sup_org uuid;
BEGIN
  SELECT org_id INTO sup_org FROM public.suppliers WHERE id = NEW.supplier_id;
  IF sup_org IS NULL THEN
    RAISE EXCEPTION 'supplier not found';
  END IF;
  IF sup_org <> NEW.org_id THEN
    RAISE EXCEPTION 'org mismatch in supplier_lead_times';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS supplier_lead_times_validate ON public.supplier_lead_times;
CREATE TRIGGER supplier_lead_times_validate
BEFORE INSERT OR UPDATE ON public.supplier_lead_times
FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_lead_time();

DROP POLICY IF EXISTS "Supplier lead times select by membership" ON public.supplier_lead_times;
CREATE POLICY "Supplier lead times select by membership"
  ON public.supplier_lead_times
  FOR SELECT
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Supplier lead times insert by membership" ON public.supplier_lead_times;
CREATE POLICY "Supplier lead times insert by membership"
  ON public.supplier_lead_times
  FOR INSERT
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Supplier lead times update by membership" ON public.supplier_lead_times;
CREATE POLICY "Supplier lead times update by membership"
  ON public.supplier_lead_times
  FOR UPDATE
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "Supplier lead times delete by membership" ON public.supplier_lead_times;
CREATE POLICY "Supplier lead times delete by membership"
  ON public.supplier_lead_times
  FOR DELETE
  USING (public.is_org_member(org_id));

-- Purchase orders status enum + received state
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS ordered_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS received_state public.purchase_order_received_state NOT NULL DEFAULT 'none';

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders
  ALTER COLUMN status TYPE public.purchase_order_status
  USING (
    CASE status
      WHEN 'confirmed' THEN 'ordered'::public.purchase_order_status
      ELSE status::public.purchase_order_status
    END
  );

UPDATE public.purchase_orders
SET ordered_at = COALESCE(ordered_at, confirmed_at)
WHERE ordered_at IS NULL AND confirmed_at IS NOT NULL;

-- Event purchase orders status enum + product type split
ALTER TABLE public.event_purchase_orders
  ADD COLUMN IF NOT EXISTS product_type public.product_type NOT NULL DEFAULT 'fresh',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS ordered_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS received_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS received_state public.purchase_order_received_state NOT NULL DEFAULT 'none';

ALTER TABLE public.event_purchase_orders
  DROP CONSTRAINT IF EXISTS event_purchase_orders_status_check;

ALTER TABLE public.event_purchase_orders
  ALTER COLUMN status TYPE public.purchase_order_status
  USING (
    CASE status
      WHEN 'sent' THEN 'ordered'::public.purchase_order_status
      ELSE status::public.purchase_order_status
    END
  );

DROP INDEX IF EXISTS event_purchase_orders_service_version_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS event_purchase_orders_service_version_uniq
  ON public.event_purchase_orders (event_service_id, version_num, supplier_id, product_type);

-- Update receive RPC for new status + received_state
CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_order_id uuid, p_lines jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  po_org uuid;
  po_status public.purchase_order_status;
  line record;
  all_full boolean := true;
BEGIN
  SELECT org_id, status INTO po_org, po_status FROM public.purchase_orders WHERE id = p_order_id;
  IF po_org IS NULL THEN
    RAISE EXCEPTION 'purchase order not found';
  END IF;
  IF po_status <> 'ordered' THEN
    RAISE EXCEPTION 'purchase order must be ordered to receive';
  END IF;

  FOR line IN SELECT * FROM jsonb_to_recordset(p_lines) AS (line_id uuid, received_qty numeric) LOOP
    UPDATE public.purchase_order_lines
    SET received_qty = line.received_qty
    WHERE id = line.line_id
      AND purchase_order_id = p_order_id
      AND org_id = po_org;
  END LOOP;

  -- update stock
  UPDATE public.ingredients ing
  SET stock = stock + sub.received_qty
  FROM (
    SELECT pol.ingredient_id, pol.received_qty
    FROM public.purchase_order_lines pol
    WHERE pol.purchase_order_id = p_order_id
      AND pol.org_id = po_org
  ) sub
  WHERE ing.id = sub.ingredient_id;

  SELECT bool_and(received_qty >= requested_qty)
  INTO all_full
  FROM public.purchase_order_lines
  WHERE purchase_order_id = p_order_id;

  UPDATE public.purchase_orders
  SET status = 'received',
      received_at = timezone('utc', now()),
      received_state = CASE WHEN all_full THEN 'full' ELSE 'partial' END
  WHERE id = p_order_id;
END;
$$;

-- Reminder view for deadlines (active until 2 days before deadline)
CREATE OR REPLACE VIEW public.event_purchase_order_deadlines AS
SELECT
  epo.id AS event_purchase_order_id,
  epo.org_id,
  epo.hotel_id,
  epo.event_id,
  epo.supplier_id,
  epo.product_type,
  epo.status,
  epo.order_number,
  ev.starts_at,
  COALESCE(slt.lead_time_days, s.lead_time_days, 2) AS lead_time_days,
  (ev.starts_at - make_interval(days => COALESCE(slt.lead_time_days, s.lead_time_days, 2))) AS order_deadline_at,
  (ev.starts_at - make_interval(days => COALESCE(slt.lead_time_days, s.lead_time_days, 2) + 2)) AS reminder_end_at,
  (now() <= (ev.starts_at - make_interval(days => COALESCE(slt.lead_time_days, s.lead_time_days, 2) + 2))) AS reminder_active
FROM public.event_purchase_orders epo
JOIN public.events ev ON ev.id = epo.event_id
JOIN public.suppliers s ON s.id = epo.supplier_id
LEFT JOIN public.supplier_lead_times slt
  ON slt.supplier_id = epo.supplier_id
  AND slt.product_type = epo.product_type
WHERE epo.status IN ('draft', 'approved', 'ordered');

CREATE OR REPLACE VIEW public.dashboard_purchase_event_metrics
WITH (security_invoker = true)
AS
WITH event_metrics AS (
  SELECT
    e.org_id,
    e.hotel_id,
    date_trunc('day', e.starts_at)::date AS day,
    count(distinct e.id) AS events_count,
    count(distinct e.id) FILTER (WHERE esm.event_service_id IS NOT NULL) AS confirmed_menus
  FROM public.events e
  LEFT JOIN public.event_services es ON es.event_id = e.id
  LEFT JOIN public.event_service_menus esm ON esm.event_service_id = es.id
  WHERE e.starts_at IS NOT NULL
  GROUP BY e.org_id, e.hotel_id, date_trunc('day', e.starts_at)::date
),
purchase_metrics AS (
  SELECT
    po.org_id,
    po.hotel_id,
    date_trunc('day', po.created_at)::date AS day,
    count(*) FILTER (WHERE po.status IN ('draft', 'approved', 'ordered')) AS pending_orders,
    count(*) FILTER (WHERE po.status = 'received') AS received_orders,
    coalesce(sum(po.total_estimated), 0) AS total_order_value,
    coalesce(sum(po.total_estimated) FILTER (WHERE po.status IN ('draft', 'approved', 'ordered')), 0) AS pending_value,
    coalesce(sum(po.total_estimated) FILTER (WHERE po.status = 'received'), 0) AS received_value
  FROM public.purchase_orders po
  GROUP BY po.org_id, po.hotel_id, date_trunc('day', po.created_at)::date
)
SELECT
  coalesce(pm.org_id, em.org_id) AS org_id,
  coalesce(pm.hotel_id, em.hotel_id) AS hotel_id,
  coalesce(pm.day, em.day) AS day,
  coalesce(em.events_count, 0) AS events_count,
  coalesce(em.confirmed_menus, 0) AS confirmed_menus,
  coalesce(pm.pending_orders, 0) AS pending_orders,
  coalesce(pm.received_orders, 0) AS received_orders,
  coalesce(pm.total_order_value, 0) AS total_order_value,
  coalesce(pm.pending_value, 0) AS pending_value,
  coalesce(pm.received_value, 0) AS received_value
FROM purchase_metrics pm
FULL JOIN event_metrics em
  ON em.org_id = pm.org_id AND em.hotel_id = pm.hotel_id AND em.day = pm.day
WHERE public.is_org_member(coalesce(pm.org_id, em.org_id));

-- Update generate_event_purchase_orders to split by product_type
CREATE OR REPLACE FUNCTION public.generate_event_purchase_orders(
  p_event_service_id uuid,
  p_version_reason text DEFAULT null,
  p_idempotency_key text DEFAULT null,
  p_strict boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_service record;
  v_requirements jsonb;
  v_missing_items text[] := array[]::text[];
  v_version_id uuid;
  v_existing_version_id uuid;
  v_version_num int;
  v_order_ids uuid[] := array[]::uuid[];
  v_settings record;
  v_product record;
  v_supplier record;
  v_order_id uuid;
  v_idx int := 0;
BEGIN
  SELECT es.id, es.org_id, es.event_id, ev.hotel_id
  INTO v_service
  FROM public.event_services es
  JOIN public.events ev ON ev.id = es.event_id
  WHERE es.id = p_event_service_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service not found';
  END IF;

  IF NOT public.has_org_role(v_service.org_id, array['owner', 'admin', 'manager']) THEN
    RAISE EXCEPTION 'insufficient permissions';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('purchase:' || p_event_service_id::text));

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_version_id
    FROM public.order_versions
    WHERE event_service_id = p_event_service_id
      AND entity_type = 'purchase'
      AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF v_existing_version_id IS NOT NULL THEN
      SELECT COALESCE(array_agg(id), array[]::uuid[]) INTO v_order_ids
      FROM public.event_purchase_orders
      WHERE order_version_id = v_existing_version_id;
      RETURN jsonb_build_object(
        'order_ids', v_order_ids,
        'missing_items', to_jsonb(array[]::text[]),
        'version_num', null,
        'created', 0
      );
    END IF;
  END IF;

  SELECT public.compute_service_requirements(p_event_service_id, false) INTO v_requirements;
  SELECT COALESCE(array_agg(value), array[]::text[]) INTO v_missing_items
  FROM jsonb_array_elements_text(COALESCE(v_requirements->'missing_items', '[]'::jsonb)) AS value;

  SELECT default_buffer_percent, default_buffer_qty INTO v_settings
  FROM public.purchasing_settings
  WHERE org_id = v_service.org_id;
  IF v_settings.default_buffer_percent IS NULL THEN
    v_settings.default_buffer_percent := 0;
  END IF;
  IF v_settings.default_buffer_qty IS NULL THEN
    v_settings.default_buffer_qty := 0;
  END IF;

  CREATE TEMPORARY TABLE tmp_po_lines (
    supplier_id uuid,
    product_type public.product_type,
    supplier_item_id uuid,
    item_label text,
    gross_qty numeric,
    buffer_percent numeric,
    buffer_qty numeric,
    net_qty numeric,
    rounded_qty numeric,
    purchase_unit text,
    unit_price numeric,
    unit_mismatch boolean
  ) ON COMMIT DROP;

  FOR v_product IN
    SELECT
      (value->>'product_id')::uuid AS product_id,
      (value->>'name') AS name,
      (value->>'qty')::numeric AS qty,
      (value->>'unit') AS unit
    FROM jsonb_array_elements(COALESCE(v_requirements->'products', '[]'::jsonb)) AS value
  LOOP
    IF v_product.product_id IS NULL OR v_product.qty IS NULL OR v_product.qty <= 0 THEN
      CONTINUE;
    END IF;

    SELECT
      si.id,
      si.supplier_id,
      si.purchase_unit,
      si.rounding_rule,
      si.pack_size,
      si.price_per_unit,
      si.is_primary,
      COALESCE(si.product_type_override, p.product_type, 'fresh'::public.product_type) AS product_type
    INTO v_supplier
    FROM public.supplier_items si
    JOIN public.suppliers s ON s.id = si.supplier_id
    JOIN public.products p ON p.id = si.product_id
    WHERE s.org_id = v_service.org_id
      AND si.product_id = v_product.product_id
    ORDER BY si.is_primary DESC, si.created_at
    LIMIT 1;

    IF NOT FOUND THEN
      v_missing_items := array_append(v_missing_items, v_product.name);
      CONTINUE;
    END IF;

    IF v_supplier.purchase_unit <> v_product.unit THEN
      v_missing_items := array_append(v_missing_items, v_product.name);
      CONTINUE;
    END IF;

    INSERT INTO tmp_po_lines (
      supplier_id,
      product_type,
      supplier_item_id,
      item_label,
      gross_qty,
      buffer_percent,
      buffer_qty,
      net_qty,
      rounded_qty,
      purchase_unit,
      unit_price,
      unit_mismatch
    ) VALUES (
      v_supplier.supplier_id,
      v_supplier.product_type,
      v_supplier.id,
      v_product.name,
      v_product.qty,
      v_settings.default_buffer_percent,
      v_settings.default_buffer_qty,
      v_product.qty + (v_product.qty * v_settings.default_buffer_percent / 100) + v_settings.default_buffer_qty,
      public.round_qty(
        v_product.qty + (v_product.qty * v_settings.default_buffer_percent / 100) + v_settings.default_buffer_qty,
        v_supplier.rounding_rule,
        v_supplier.pack_size
      ),
      v_supplier.purchase_unit,
      v_supplier.price_per_unit,
      false
    );
  END LOOP;

  IF p_strict AND array_length(v_missing_items, 1) > 0 THEN
    RETURN jsonb_build_object(
      'status', 'blocked',
      'missing_items', to_jsonb(v_missing_items),
      'created', 0
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM tmp_po_lines) THEN
    RETURN jsonb_build_object(
      'status', 'empty',
      'missing_items', to_jsonb(COALESCE(v_missing_items, array[]::text[])),
      'order_ids', array[]::uuid[],
      'created', 0
    );
  END IF;

  SELECT COALESCE(max(version_num), 0) + 1
  INTO v_version_num
  FROM public.order_versions
  WHERE event_service_id = p_event_service_id
    AND entity_type = 'purchase';

  INSERT INTO public.order_versions (
    org_id, event_id, event_service_id, entity_type, version_num, version_reason, idempotency_key, created_by, is_current
  )
  VALUES (
    v_service.org_id, v_service.event_id, p_event_service_id, 'purchase', v_version_num, p_version_reason, p_idempotency_key, auth.uid(), true
  )
  RETURNING id INTO v_version_id;

  UPDATE public.order_versions
  SET is_current = false
  WHERE event_service_id = p_event_service_id
    AND entity_type = 'purchase'
    AND id <> v_version_id;

  FOR v_supplier IN
    SELECT DISTINCT supplier_id, product_type
    FROM tmp_po_lines
  LOOP
    v_idx := v_idx + 1;
    INSERT INTO public.event_purchase_orders (
      org_id, hotel_id, event_id, event_service_id, supplier_id,
      status, order_number, total_estimated, approval_status,
      order_version_id, version_num, version_reason, idempotency_key, is_current, product_type
    )
    VALUES (
      v_service.org_id,
      v_service.hotel_id,
      v_service.event_id,
      p_event_service_id,
      v_supplier.supplier_id,
      'draft',
      'SV-' || left(p_event_service_id::text, 8) || '-' || v_idx::text,
      0,
      'pending',
      v_version_id,
      v_version_num,
      p_version_reason,
      p_idempotency_key,
      true,
      v_supplier.product_type
    )
    RETURNING id INTO v_order_id;

    v_order_ids := array_append(v_order_ids, v_order_id);

    INSERT INTO public.event_purchase_order_lines (
      org_id,
      event_purchase_order_id,
      supplier_item_id,
      item_label,
      qty,
      purchase_unit,
      unit_price,
      line_total,
      "freeze",
      buffer_percent,
      buffer_qty,
      gross_qty,
      on_hand_qty,
      on_order_qty,
      net_qty,
      rounded_qty,
      unit_mismatch
    )
    SELECT
      v_service.org_id,
      v_order_id,
      l.supplier_item_id,
      l.item_label,
      l.rounded_qty,
      l.purchase_unit,
      l.unit_price,
      COALESCE(l.rounded_qty, 0) * COALESCE(l.unit_price, 0),
      false,
      l.buffer_percent,
      l.buffer_qty,
      l.gross_qty,
      0,
      0,
      l.net_qty,
      l.rounded_qty,
      l.unit_mismatch
    FROM tmp_po_lines l
    WHERE l.supplier_id = v_supplier.supplier_id
      AND l.product_type = v_supplier.product_type;
  END LOOP;

  UPDATE public.event_purchase_orders
  SET is_current = false
  WHERE event_service_id = p_event_service_id
    AND id <> ALL(v_order_ids);

  RETURN jsonb_build_object(
    'order_ids', COALESCE(v_order_ids, array[]::uuid[]),
    'missing_items', to_jsonb(COALESCE(v_missing_items, array[]::text[])),
    'version_num', v_version_num,
    'created', COALESCE(array_length(v_order_ids, 1), 0)
  );
END;
$$;
