-- Baseline schema snapshot (generated via supabase db dump)
-- Replaces historical migrations for a clean start.

--
-- PostgreSQL database dump
--

-- \restrict 0zXg1OPQf2NAbkfZm9Y3w3O3b5mleXIpUngKP3e5dJqjxFi0rUOmSAXNZsBH1yo

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';

--
-- Extensions
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";


--
-- Name: expiry_alert_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."expiry_alert_status" AS ENUM (
    'open',
    'dismissed',
    'sent'
);


ALTER TYPE "public"."expiry_alert_status" OWNER TO "postgres";

--
-- Name: inbound_line_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."inbound_line_status" AS ENUM (
    'ready',
    'blocked',
    'skipped'
);


ALTER TYPE "public"."inbound_line_status" OWNER TO "postgres";

--
-- Name: inbound_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."inbound_source" AS ENUM (
    'ocr',
    'manual'
);


ALTER TYPE "public"."inbound_source" OWNER TO "postgres";

--
-- Name: preparation_process; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."preparation_process" AS ENUM (
    'cooked',
    'pasteurized',
    'vacuum',
    'frozen',
    'pasteurized_frozen'
);


ALTER TYPE "public"."preparation_process" OWNER TO "postgres";

--
-- Name: product_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."product_type" AS ENUM (
    'fresh',
    'pasteurized',
    'frozen'
);


ALTER TYPE "public"."product_type" OWNER TO "postgres";

--
-- Name: production_plan_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."production_plan_source" AS ENUM (
    'manual',
    'menu'
);


ALTER TYPE "public"."production_plan_source" OWNER TO "postgres";

--
-- Name: production_plan_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."production_plan_status" AS ENUM (
    'draft',
    'in_progress',
    'done'
);


ALTER TYPE "public"."production_plan_status" OWNER TO "postgres";

--
-- Name: production_station; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."production_station" AS ENUM (
    'frio',
    'caliente',
    'pasteleria',
    'barra',
    'office',
    'almacen',
    'externo'
);


ALTER TYPE "public"."production_station" OWNER TO "postgres";

--
-- Name: production_task_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."production_task_status" AS ENUM (
    'todo',
    'doing',
    'done',
    'blocked'
);


ALTER TYPE "public"."production_task_status" OWNER TO "postgres";

--
-- Name: purchase_order_received_state; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."purchase_order_received_state" AS ENUM (
    'none',
    'partial',
    'full'
);


ALTER TYPE "public"."purchase_order_received_state" OWNER TO "postgres";

--
-- Name: purchase_order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."purchase_order_status" AS ENUM (
    'draft',
    'approved',
    'ordered',
    'received',
    'cancelled'
);


ALTER TYPE "public"."purchase_order_status" OWNER TO "postgres";

--
-- Name: reservation_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."reservation_source" AS ENUM (
    'gross_need',
    'net_need',
    'manual'
);


ALTER TYPE "public"."reservation_source" OWNER TO "postgres";

--
-- Name: reservation_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."reservation_status" AS ENUM (
    'active',
    'released'
);


ALTER TYPE "public"."reservation_status" OWNER TO "postgres";

--
-- Name: stock_batch_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."stock_batch_source" AS ENUM (
    'purchase',
    'prep',
    'adjustment'
);


ALTER TYPE "public"."stock_batch_source" OWNER TO "postgres";

--
-- Name: stock_movement_reason; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."stock_movement_reason" AS ENUM (
    'purchase',
    'adjustment',
    'consume'
);


ALTER TYPE "public"."stock_movement_reason" OWNER TO "postgres";

--
-- Name: storage_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "public"."storage_type" AS ENUM (
    'ambient',
    'fridge',
    'freezer'
);


ALTER TYPE "public"."storage_type" OWNER TO "postgres";

--
-- Name: apply_compensation("uuid", "date"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."apply_compensation"("p_compensation_id" "uuid", "p_applied_at" "date" DEFAULT CURRENT_DATE) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.staff_compensations where id = p_compensation_id;
  if v_org is null then raise exception 'compensation not found'; end if;
  if not public.is_org_member(v_org) then raise exception 'not authorized'; end if;

  update public.staff_compensations
  set status = 'applied',
      applied_at = p_applied_at
  where id = p_compensation_id;
end;
$$;


ALTER FUNCTION "public"."apply_compensation"("p_compensation_id" "uuid", "p_applied_at" "date") OWNER TO "postgres";

--
-- Name: approve_time_off("uuid", boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."approve_time_off"("p_time_off_id" "uuid", "p_approved" boolean DEFAULT true) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org uuid;
begin
  select org_id into v_org from public.staff_time_off where id = p_time_off_id;
  if v_org is null then raise exception 'time_off not found'; end if;
  if not public.is_org_member(v_org) then raise exception 'not authorized'; end if;

  update public.staff_time_off
  set approved = p_approved,
      approved_by = auth.uid(),
      approved_at = timezone('utc', now())
  where id = p_time_off_id;
end;
$$;


ALTER FUNCTION "public"."approve_time_off"("p_time_off_id" "uuid", "p_approved" boolean) OWNER TO "postgres";

--
-- Name: can_use_feature("text", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."can_use_feature"("feature_key" "text", "p_org_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  user_role text;
  org_plan text := 'basic';
  f_min_plan text;
  f_min_role text;
  f_enabled boolean;
begin
  if auth.role() = 'service_role' then
    return true;
  end if;

  if auth.uid() is null then
    return false;
  end if;

  select role into user_role
  from public.org_memberships
  where org_id = p_org_id and user_id = auth.uid()
  limit 1;

  if user_role is null then
    return false;
  end if;

  select min_plan, min_role, is_enabled
    into f_min_plan, f_min_role, f_enabled
  from public.ai_features
  where key = feature_key;

  if f_min_plan is null or f_enabled is not true then
    return false;
  end if;

  select plan into org_plan
  from public.org_plans
  where org_id = p_org_id;

  -- map plan/role to ordinal for comparison
  if (case org_plan when 'basic' then 1 when 'pro' then 2 when 'vip' then 3 else 1 end) <
     (case f_min_plan when 'basic' then 1 when 'pro' then 2 when 'vip' then 3 else 1 end) then
    return false;
  end if;

  if f_min_role = 'admin' and user_role <> 'admin' then
    return false;
  elsif f_min_role = 'manager' and user_role not in ('manager','admin') then
    return false;
  end if;

  return true;
end;
$$;


ALTER FUNCTION "public"."can_use_feature"("feature_key" "text", "p_org_id" "uuid") OWNER TO "postgres";

--
-- Name: FUNCTION "can_use_feature"("feature_key" "text", "p_org_id" "uuid"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."can_use_feature"("feature_key" "text", "p_org_id" "uuid") IS 'Evalúa si el usuario actual puede usar una feature IA en la org indicada.';


--
-- Name: check_waste_org_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."check_waste_org_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."check_waste_org_consistency"() OWNER TO "postgres";

--
-- Name: compute_recipe_mise_en_place("uuid", numeric, numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."compute_recipe_mise_en_place"("p_recipe_id" "uuid", "p_servings" numeric DEFAULT NULL::numeric, "p_packs" numeric DEFAULT NULL::numeric) RETURNS TABLE("product_id" "uuid", "product_name" "text", "qty" numeric, "unit" "text")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_recipe record;
  v_target numeric;
begin
  select id, default_servings into v_recipe
  from public.recipes
  where id = p_recipe_id;

  if not found then
    raise exception 'recipe not found';
  end if;

  if p_servings is null and p_packs is null then
    raise exception 'servings or packs required';
  end if;

  if p_servings is not null and p_packs is not null then
    raise exception 'choose servings or packs, not both';
  end if;

  if p_servings is not null then
    if p_servings <= 0 then
      raise exception 'servings must be > 0';
    end if;
    v_target := p_servings;
  else
    if p_packs <= 0 then
      raise exception 'packs must be > 0';
    end if;
    v_target := p_packs * v_recipe.default_servings;
  end if;

  return query
  select
    rl.product_id,
    p.name as product_name,
    (rl.qty * (v_target / v_recipe.default_servings)) as qty,
    rl.unit
  from public.recipe_lines rl
  join public.products p on p.id = rl.product_id
  where rl.recipe_id = v_recipe.id;
end;
$$;


ALTER FUNCTION "public"."compute_recipe_mise_en_place"("p_recipe_id" "uuid", "p_servings" numeric, "p_packs" numeric) OWNER TO "postgres";

--
-- Name: compute_service_requirements("uuid", boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."compute_service_requirements"("p_event_service_id" "uuid", "p_strict" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_service record;
  v_missing_items text[] := array[]::text[];
  v_recipes jsonb := '[]'::jsonb;
  v_products jsonb := '[]'::jsonb;
  v_has_menu_items boolean := false;
begin
  select es.id, es.org_id, es.event_id, ev.hotel_id, es.pax, es.format
  into v_service
  from public.event_services es
  join public.events ev on ev.id = es.event_id
  where es.id = p_event_service_id;

  if not found then
    raise exception 'service not found';
  end if;

  select exists(
    select 1
    from public.event_service_menu_items emi
    join public.event_service_menu_sections sec on sec.id = emi.section_id
    where sec.event_service_id = p_event_service_id
  ) into v_has_menu_items;

  if v_has_menu_items then
    with items as (
      select emi.text as item_name, emi.recipe_id, emi.requires_review, emi.portion_multiplier
      from public.event_service_menu_items emi
      join public.event_service_menu_sections sec on sec.id = emi.section_id
      where sec.event_service_id = p_event_service_id
    )
    select coalesce(array_agg(item_name), array[]::text[])
    into v_missing_items
    from items
    where recipe_id is null or requires_review = true;

    with items as (
      select emi.text as item_name, emi.recipe_id, emi.requires_review, emi.portion_multiplier
      from public.event_service_menu_items emi
      join public.event_service_menu_sections sec on sec.id = emi.section_id
      where sec.event_service_id = p_event_service_id
    ),
    recipe_totals as (
      select recipe_id, sum((v_service.pax::numeric) * coalesce(portion_multiplier, 1)) as servings
      from items
      where recipe_id is not null and requires_review = false
      group by recipe_id
    ),
    recipe_rows as (
      select r.id, r.name, r.default_servings, rt.servings
      from recipe_totals rt
      join public.recipes r on r.id = rt.recipe_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'recipe_id', rr.id,
      'name', rr.name,
      'servings', rr.servings,
      'default_servings', rr.default_servings
    )), '[]'::jsonb)
    into v_recipes
    from recipe_rows rr;

    with items as (
      select emi.text as item_name, emi.recipe_id, emi.requires_review, emi.portion_multiplier
      from public.event_service_menu_items emi
      join public.event_service_menu_sections sec on sec.id = emi.section_id
      where sec.event_service_id = p_event_service_id
    ),
    recipe_totals as (
      select recipe_id, sum((v_service.pax::numeric) * coalesce(portion_multiplier, 1)) as servings
      from items
      where recipe_id is not null and requires_review = false
      group by recipe_id
    ),
    product_totals as (
      select rl.product_id,
             sum((rt.servings / nullif(r.default_servings, 0)) * rl.qty) as qty,
             max(rl.unit) as unit
      from recipe_totals rt
      join public.recipes r on r.id = rt.recipe_id
      join public.recipe_lines rl on rl.recipe_id = rt.recipe_id
      group by rl.product_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id', pt.product_id,
      'name', p.name,
      'qty', pt.qty,
      'unit', pt.unit
    )), '[]'::jsonb)
    into v_products
    from product_totals pt
    join public.products p on p.id = pt.product_id;
  else
    with base_items as (
      select mti.id, mti.name, mti.unit, mti.qty_per_pax_seated, mti.qty_per_pax_standing
      from public.event_service_menus esm
      join public.menu_template_items mti on mti.template_id = esm.template_id
      where esm.event_service_id = p_event_service_id
    ),
    excluded as (
      select template_item_id from public.event_service_excluded_items where event_service_id = p_event_service_id
    ),
    replaced as (
      select template_item_id, name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_replaced_items
      where event_service_id = p_event_service_id
    ),
    added as (
      select name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_added_items
      where event_service_id = p_event_service_id
    ),
    final_items as (
      select
        coalesce(r.name, b.name) as item_name,
        coalesce(r.unit, b.unit) as unit,
        coalesce(r.qty_per_pax_seated, b.qty_per_pax_seated) as qty_per_pax_seated,
        coalesce(r.qty_per_pax_standing, b.qty_per_pax_standing) as qty_per_pax_standing
      from base_items b
      left join replaced r on r.template_item_id = b.id
      where not exists (select 1 from excluded e where e.template_item_id = b.id)
      union all
      select name, unit, qty_per_pax_seated, qty_per_pax_standing from added
    ),
    menu_totals as (
      select
        item_name,
        unit,
        (v_service.pax::numeric) * case
          when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
          else coalesce(qty_per_pax_standing, 0)
        end as servings
      from final_items
      where case
        when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
        else coalesce(qty_per_pax_standing, 0)
      end > 0
    ),
    mapped as (
      select mt.item_name, mt.unit, mt.servings, mia.recipe_id
      from menu_totals mt
      left join public.menu_item_recipe_aliases mia
        on mia.org_id = v_service.org_id
       and lower(mia.alias_name) = lower(mt.item_name)
    )
    select coalesce(array_agg(item_name), array[]::text[])
    into v_missing_items
    from mapped
    where recipe_id is null;

    with base_items as (
      select mti.id, mti.name, mti.unit, mti.qty_per_pax_seated, mti.qty_per_pax_standing
      from public.event_service_menus esm
      join public.menu_template_items mti on mti.template_id = esm.template_id
      where esm.event_service_id = p_event_service_id
    ),
    excluded as (
      select template_item_id from public.event_service_excluded_items where event_service_id = p_event_service_id
    ),
    replaced as (
      select template_item_id, name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_replaced_items
      where event_service_id = p_event_service_id
    ),
    added as (
      select name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_added_items
      where event_service_id = p_event_service_id
    ),
    final_items as (
      select
        coalesce(r.name, b.name) as item_name,
        coalesce(r.unit, b.unit) as unit,
        coalesce(r.qty_per_pax_seated, b.qty_per_pax_seated) as qty_per_pax_seated,
        coalesce(r.qty_per_pax_standing, b.qty_per_pax_standing) as qty_per_pax_standing
      from base_items b
      left join replaced r on r.template_item_id = b.id
      where not exists (select 1 from excluded e where e.template_item_id = b.id)
      union all
      select name, unit, qty_per_pax_seated, qty_per_pax_standing from added
    ),
    menu_totals as (
      select
        item_name,
        unit,
        (v_service.pax::numeric) * case
          when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
          else coalesce(qty_per_pax_standing, 0)
        end as servings
      from final_items
      where case
        when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
        else coalesce(qty_per_pax_standing, 0)
      end > 0
    ),
    mapped as (
      select mt.item_name, mt.unit, mt.servings, mia.recipe_id
      from menu_totals mt
      left join public.menu_item_recipe_aliases mia
        on mia.org_id = v_service.org_id
       and lower(mia.alias_name) = lower(mt.item_name)
    ),
    recipe_totals as (
      select recipe_id, sum(servings) as servings
      from mapped
      where recipe_id is not null
      group by recipe_id
    ),
    recipe_rows as (
      select r.id, r.name, r.default_servings, rt.servings
      from recipe_totals rt
      join public.recipes r on r.id = rt.recipe_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'recipe_id', rr.id,
      'name', rr.name,
      'servings', rr.servings,
      'default_servings', rr.default_servings
    )), '[]'::jsonb)
    into v_recipes
    from recipe_rows rr;

    with base_items as (
      select mti.id, mti.name, mti.unit, mti.qty_per_pax_seated, mti.qty_per_pax_standing
      from public.event_service_menus esm
      join public.menu_template_items mti on mti.template_id = esm.template_id
      where esm.event_service_id = p_event_service_id
    ),
    excluded as (
      select template_item_id from public.event_service_excluded_items where event_service_id = p_event_service_id
    ),
    replaced as (
      select template_item_id, name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_replaced_items
      where event_service_id = p_event_service_id
    ),
    added as (
      select name, unit, qty_per_pax_seated, qty_per_pax_standing
      from public.event_service_added_items
      where event_service_id = p_event_service_id
    ),
    final_items as (
      select
        coalesce(r.name, b.name) as item_name,
        coalesce(r.unit, b.unit) as unit,
        coalesce(r.qty_per_pax_seated, b.qty_per_pax_seated) as qty_per_pax_seated,
        coalesce(r.qty_per_pax_standing, b.qty_per_pax_standing) as qty_per_pax_standing
      from base_items b
      left join replaced r on r.template_item_id = b.id
      where not exists (select 1 from excluded e where e.template_item_id = b.id)
      union all
      select name, unit, qty_per_pax_seated, qty_per_pax_standing from added
    ),
    menu_totals as (
      select
        item_name,
        unit,
        (v_service.pax::numeric) * case
          when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
          else coalesce(qty_per_pax_standing, 0)
        end as servings
      from final_items
      where case
        when v_service.format = 'sentado' then coalesce(qty_per_pax_seated, 0)
        else coalesce(qty_per_pax_standing, 0)
      end > 0
    ),
    mapped as (
      select mt.item_name, mt.unit, mt.servings, mia.recipe_id
      from menu_totals mt
      left join public.menu_item_recipe_aliases mia
        on mia.org_id = v_service.org_id
       and lower(mia.alias_name) = lower(mt.item_name)
    ),
    recipe_totals as (
      select recipe_id, sum(servings) as servings
      from mapped
      where recipe_id is not null
      group by recipe_id
    ),
    product_totals as (
      select rl.product_id,
             sum((rt.servings / nullif(r.default_servings, 0)) * rl.qty) as qty,
             max(rl.unit) as unit
      from recipe_totals rt
      join public.recipes r on r.id = rt.recipe_id
      join public.recipe_lines rl on rl.recipe_id = rt.recipe_id
      group by rl.product_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'product_id', pt.product_id,
      'name', p.name,
      'qty', pt.qty,
      'unit', pt.unit
    )), '[]'::jsonb)
    into v_products
    from product_totals pt
    join public.products p on p.id = pt.product_id;
  end if;

  return jsonb_build_object(
    'service_id', v_service.id,
    'event_id', v_service.event_id,
    'pax', v_service.pax,
    'missing_items', to_jsonb(coalesce(v_missing_items, array[]::text[])),
    'recipes', v_recipes,
    'products', v_products
  );
end;
$$;


ALTER FUNCTION "public"."compute_service_requirements"("p_event_service_id" "uuid", "p_strict" boolean) OWNER TO "postgres";

--
-- Name: create_preparation_run("uuid", "uuid", "uuid", numeric, "text", timestamp with time zone, "public"."preparation_process", integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."create_preparation_run"("p_org_id" "uuid", "p_preparation_id" "uuid", "p_location_id" "uuid", "p_produced_qty" numeric, "p_produced_unit" "text", "p_produced_at" timestamp with time zone, "p_process_type" "public"."preparation_process" DEFAULT NULL::"public"."preparation_process", "p_labels_count" integer DEFAULT 1) RETURNS TABLE("run_id" "uuid", "batch_id" "uuid", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_org uuid;
  v_default_process public.preparation_process;
  v_shelf_life int;
  v_expires timestamptz;
  v_batch_id uuid;
  v_run_id uuid;
  v_location_org uuid;
  v_process public.preparation_process;
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden';
  end if;

  select org_id, shelf_life_days, default_process_type
    into v_org, v_shelf_life, v_default_process
  from public.preparations
  where id = p_preparation_id;

  if v_org is null then
    raise exception 'preparation not found';
  end if;
  if v_org <> p_org_id then
    raise exception 'org mismatch';
  end if;

  select org_id into v_location_org
  from public.inventory_locations
  where id = p_location_id;

  if v_location_org is null then
    raise exception 'location not found';
  end if;
  if v_location_org <> p_org_id then
    raise exception 'location org mismatch';
  end if;

  v_process := coalesce(p_process_type, v_default_process, 'cooked');

  select shelf_life_days
    into v_shelf_life
  from public.preparation_process_rules
  where org_id = p_org_id
    and process_type = v_process;

  if v_shelf_life is null then
    select shelf_life_days into v_shelf_life
    from public.preparations
    where id = p_preparation_id;
  end if;

  if v_shelf_life is null then
    v_expires := null;
  else
    v_expires := p_produced_at + (v_shelf_life || ' days')::interval;
  end if;

  insert into public.stock_batches (
    org_id,
    location_id,
    supplier_item_id,
    preparation_id,
    qty,
    unit,
    expires_at,
    lot_code,
    source,
    created_by
  ) values (
    p_org_id,
    p_location_id,
    null,
    p_preparation_id,
    p_produced_qty,
    p_produced_unit,
    v_expires,
    null,
    'prep',
    auth.uid()
  )
  returning id into v_batch_id;

  insert into public.stock_movements (
    org_id,
    batch_id,
    delta_qty,
    reason,
    note,
    created_by
  ) values (
    p_org_id,
    v_batch_id,
    p_produced_qty,
    'prep',
    'Elaboracion',
    auth.uid()
  );

  insert into public.preparation_runs (
    org_id,
    preparation_id,
    produced_qty,
    produced_unit,
    produced_at,
    expires_at,
    location_id,
    stock_batch_id,
    labels_count,
    process_type,
    created_by
  ) values (
    p_org_id,
    p_preparation_id,
    p_produced_qty,
    p_produced_unit,
    p_produced_at,
    v_expires,
    p_location_id,
    v_batch_id,
    coalesce(p_labels_count, 1),
    v_process,
    auth.uid()
  )
  returning id into v_run_id;

  return query select v_run_id, v_batch_id, v_expires;
end;
$$;


ALTER FUNCTION "public"."create_preparation_run"("p_org_id" "uuid", "p_preparation_id" "uuid", "p_location_id" "uuid", "p_produced_qty" numeric, "p_produced_unit" "text", "p_produced_at" timestamp with time zone, "p_process_type" "public"."preparation_process", "p_labels_count" integer) OWNER TO "postgres";

--
-- Name: dashboard_briefing("uuid", "uuid", "date", integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."dashboard_briefing"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer DEFAULT 7) RETURNS TABLE("deadline_day" "date", "event_purchase_order_id" "uuid", "order_number" "text", "status" "public"."purchase_order_status", "product_type" "public"."product_type", "supplier_name" "text", "event_title" "text", "lead_time_days" integer, "order_deadline_at" timestamp with time zone, "reminder_end_at" timestamp with time zone, "reminder_active" boolean)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  return query
  select
    date_trunc('day', d.order_deadline_at)::date as deadline_day,
    d.event_purchase_order_id,
    d.order_number,
    d.status,
    d.product_type,
    s.name as supplier_name,
    e.title as event_title,
    d.lead_time_days,
    d.order_deadline_at,
    d.reminder_end_at,
    d.reminder_active
  from public.event_purchase_order_deadlines d
  join public.events e on e.id = d.event_id
  join public.suppliers s on s.id = d.supplier_id
  where d.org_id = p_org_id
    and d.hotel_id = p_hotel_id
    and d.order_deadline_at >= p_start
    and d.order_deadline_at < (p_start + (p_days) * interval '1 day')
  order by d.order_deadline_at asc;
end;
$$;


ALTER FUNCTION "public"."dashboard_briefing"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) OWNER TO "postgres";

--
-- Name: dashboard_event_highlights("uuid", "uuid", "date", integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."dashboard_event_highlights"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer DEFAULT 7) RETURNS TABLE("event_id" "uuid", "title" "text", "starts_at" timestamp with time zone, "status" "text", "pax_total" numeric, "services_count" integer, "production_status" "public"."production_plan_status")
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  return query
  select
    e.id as event_id,
    e.title,
    e.starts_at,
    e.status,
    coalesce(sum(es.pax), 0) as pax_total,
    count(es.id)::int as services_count,
    max(pp.status) as production_status
  from public.events e
  left join public.event_services es on es.event_id = e.id
  left join public.production_plans pp on pp.event_id = e.id and pp.is_current = true
  where e.org_id = p_org_id
    and e.hotel_id = p_hotel_id
    and e.starts_at >= p_start
    and e.starts_at < (p_start + (p_days) * interval '1 day')
  group by e.id, e.title, e.starts_at, e.status
  order by pax_total desc, e.starts_at asc
  limit 5;
end;
$$;


ALTER FUNCTION "public"."dashboard_event_highlights"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) OWNER TO "postgres";

--
-- Name: dashboard_rolling_grid("uuid", "uuid", "date", integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."dashboard_rolling_grid"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer DEFAULT 7) RETURNS TABLE("day" "date", "events_count" integer, "purchase_pending" integer, "purchase_ordered" integer, "purchase_received" integer, "production_draft" integer, "production_in_progress" integer, "production_done" integer, "staff_required" integer, "staff_assigned" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;

  return query
  with days as (
    select generate_series(p_start, p_start + (p_days - 1), interval '1 day')::date as day
  ),
  event_counts as (
    select
      date_trunc('day', e.starts_at)::date as day,
      count(*)::int as events_count
    from public.events e
    where e.org_id = p_org_id
      and e.hotel_id = p_hotel_id
      and e.starts_at >= p_start
      and e.starts_at < (p_start + (p_days) * interval '1 day')
    group by date_trunc('day', e.starts_at)::date
  ),
  purchase_counts as (
    select
      date_trunc('day', e.starts_at)::date as day,
      count(*) filter (where epo.status in ('draft', 'approved'))::int as purchase_pending,
      count(*) filter (where epo.status = 'ordered')::int as purchase_ordered,
      count(*) filter (where epo.status = 'received')::int as purchase_received
    from public.event_purchase_orders epo
    join public.events e on e.id = epo.event_id
    where epo.org_id = p_org_id
      and e.hotel_id = p_hotel_id
      and e.starts_at >= p_start
      and e.starts_at < (p_start + (p_days) * interval '1 day')
    group by date_trunc('day', e.starts_at)::date
  ),
  production_counts as (
    select
      date_trunc('day', e.starts_at)::date as day,
      count(*) filter (where pp.status = 'draft')::int as production_draft,
      count(*) filter (where pp.status = 'in_progress')::int as production_in_progress,
      count(*) filter (where pp.status = 'done')::int as production_done
    from public.production_plans pp
    join public.events e on e.id = pp.event_id
    where pp.org_id = p_org_id
      and pp.hotel_id = p_hotel_id
      and e.starts_at >= p_start
      and e.starts_at < (p_start + (p_days) * interval '1 day')
    group by date_trunc('day', e.starts_at)::date
  ),
  staff_counts as (
    select
      s.shift_date as day,
      sum(s.required_count)::int as staff_required,
      count(sa.id)::int as staff_assigned
    from public.shifts s
    left join public.staff_assignments sa on sa.shift_id = s.id
    where s.hotel_id = p_hotel_id
      and s.shift_date >= p_start
      and s.shift_date < (p_start + (p_days) * interval '1 day')
    group by s.shift_date
  )
  select
    d.day,
    coalesce(ec.events_count, 0) as events_count,
    coalesce(pc.purchase_pending, 0) as purchase_pending,
    coalesce(pc.purchase_ordered, 0) as purchase_ordered,
    coalesce(pc.purchase_received, 0) as purchase_received,
    coalesce(pr.production_draft, 0) as production_draft,
    coalesce(pr.production_in_progress, 0) as production_in_progress,
    coalesce(pr.production_done, 0) as production_done,
    coalesce(sc.staff_required, 0) as staff_required,
    coalesce(sc.staff_assigned, 0) as staff_assigned
  from days d
  left join event_counts ec on ec.day = d.day
  left join purchase_counts pc on pc.day = d.day
  left join production_counts pr on pr.day = d.day
  left join staff_counts sc on sc.day = d.day
  order by d.day;
end;
$$;


ALTER FUNCTION "public"."dashboard_rolling_grid"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) OWNER TO "postgres";

--
-- Name: event_service_menus_fill_org(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."event_service_menus_fill_org"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.org_id is null then
    select org_id into new.org_id from public.event_services where id = new.event_service_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."event_service_menus_fill_org"() OWNER TO "postgres";

--
-- Name: event_services_fill_defaults(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."event_services_fill_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.starts_at is null then
    new.starts_at := timezone('utc', now());
  end if;
  if new.format is not null and lower(new.format) in ('cocktail', 'coctel') then
    new.format := 'de_pie';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."event_services_fill_defaults"() OWNER TO "postgres";

--
-- Name: events_fill_title(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."events_fill_title"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.title is null then
    new.title := coalesce(new.name, 'Evento');
  end if;
  if new.name is null then
    new.name := new.title;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."events_fill_title"() OWNER TO "postgres";

--
-- Name: generate_daily_brief("uuid", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."generate_daily_brief"("p_org_id" "uuid", "p_period" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_brief_id uuid;
  v_user_id uuid;
  v_range_start timestamptz;
  v_range_end timestamptz;
  v_event_count int;
  v_pax_total int;
  v_pending_orders int;
  v_content text;
begin
  v_user_id := auth.uid();
  -- Auth check membership
  if not exists (select 1 from public.org_memberships where org_id = p_org_id and user_id = v_user_id) then
    raise exception 'Access denied: User is not a member of this organization';
  end if;
  -- Auth check feature
  if not public.can_use_feature('daily_brief', p_org_id) then
    raise exception 'Feature denied: daily_brief requires PRO plan';
  end if;
  -- Determine time range
  if p_period = 'today' then
    v_range_start := current_date;
    v_range_end := current_date + interval '1 day';
  elsif p_period = 'tomorrow' then
    v_range_start := current_date + interval '1 day';
    v_range_end := current_date + interval '2 days';
  else -- week
    v_range_start := current_date;
    v_range_end := current_date + interval '7 days';
  end if;
  -- Collect Data (Mock logic if tables missing, simplistic logic otherwise)
  -- Events summary
  select 
    count(*), 
    coalesce(sum((data->>'pax')::int), 0)
  into v_event_count, v_pax_total
  from public.events 
  where org_id = p_org_id 
    and date >= v_range_start 
    and date < v_range_end;
  -- Mock Orders (assuming table exists or defaulting to 0 if not robustly queried)
  -- Para AI0 asumimos que 'purchase_orders' existe si Batch 4 pasó. Si no, 0.
  begin
    select count(*) into v_pending_orders 
    from public.purchase_orders 
    where org_id = p_org_id and status = 'pending';
  exception when others then
    v_pending_orders := 0;
  end;
  -- Generate Markdown
  v_content := E'# Brief Operativo: ' || p_period || E'\n\n' ||
               E'Generado el ' || to_char(now(), 'DD/MM/YYYY HH24:MI') || E'\n\n' ||
               E'## Resumen\n' ||
               E'- **Eventos**: ' || v_event_count || E'\n' ||
               E'- **PAX Total**: ' || v_pax_total || E'\n' ||
               E'- **Pedidos Pendientes**: ' || v_pending_orders || E'\n\n';
  if v_event_count = 0 then
     v_content := v_content || E'> [!NOTE]\n> No hay eventos programados para este periodo.\n\n';
  else
     v_content := v_content || E'## Acciones Recomendadas\n' ||
                  E'- [ ] Revisar mise en place para ' || v_pax_total || E' pax.\n' ||
                  E'- [ ] Confirmar personal para los ' || v_event_count || E' servicios.\n';
  end if;
  
  if v_pending_orders > 0 then
      v_content := v_content || E'## Bloqueos\n' ||
                   E'> [!WARNING]\n> Hay ' || v_pending_orders || E' pedidos pendientes de revisión.\n';
  end if;
  -- Insert
  insert into public.ai_briefs (org_id, created_by, period, content_md, sources)
  values (p_org_id, v_user_id, p_period, v_content, jsonb_build_object('events', v_event_count, 'orders', v_pending_orders))
  returning id into v_brief_id;
  return v_brief_id;
end;
$$;


ALTER FUNCTION "public"."generate_daily_brief"("p_org_id" "uuid", "p_period" "text") OWNER TO "postgres";

--
-- Name: generate_event_purchase_orders("uuid", "text", "text", boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."generate_event_purchase_orders"("p_event_service_id" "uuid", "p_version_reason" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text", "p_strict" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."generate_event_purchase_orders"("p_event_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean) OWNER TO "postgres";

--
-- Name: generate_production_plan("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."generate_production_plan"("p_service_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_service public.event_services%rowtype;
  v_plan_id uuid;
  v_org_id uuid;
  v_item record;
  v_recipe_id uuid;
  v_meta record;
  v_total_qty numeric;
  v_created_count int := 0;
  v_station public.production_station;
  v_event_id uuid;
  v_missing_items text[] := array[]::text[];
begin
  select * into v_service from public.event_services where id = p_service_id;
  if not found then raise exception 'Service not found'; end if;
  
  v_org_id := v_service.org_id;
  v_event_id := v_service.event_id;

  -- Ensure Plan Exists
  insert into public.production_plans (org_id, hotel_id, event_id, event_service_id, status, generated_from)
  values (
    v_org_id, 
    (select hotel_id from public.events where id = v_event_id),
    v_event_id, 
    p_service_id, 
    'draft', 
    'menu'
  )
  on conflict (event_service_id) do update
  set generated_from = 'menu'
  returning id into v_plan_id;

  -- Loop through Menu Items for this Service
  for v_item in (
    select 
      mti.name, 
      mti.unit, 
      mti.qty_per_pax_seated, 
      mti.qty_per_pax_standing
    from public.event_service_menus esm
    join public.menu_template_items mti on mti.template_id = esm.template_id
    where esm.event_service_id = p_service_id
  ) loop
    -- Calculate Quantity
    if v_service.format = 'sentado' then
       v_total_qty := v_service.pax * coalesce(v_item.qty_per_pax_seated, 0);
    else
       v_total_qty := v_service.pax * coalesce(v_item.qty_per_pax_standing, 0);
    end if;

    if v_total_qty <= 0 then continue; end if;

    -- Lookup Alias
    select recipe_id into v_recipe_id
    from public.menu_item_recipe_aliases
    where org_id = v_org_id and lower(alias_name) = lower(v_item.name)
    limit 1;

    if v_recipe_id is not null then
       -- Get Meta
       select * into v_meta 
       from public.recipe_production_meta 
       where recipe_id = v_recipe_id;
       
       v_station := coalesce(v_meta.station, 'caliente');

       if not exists (
         select 1 from public.production_tasks 
         where plan_id = v_plan_id and title = v_item.name and recipe_id = v_recipe_id
       ) then
           insert into public.production_tasks (
             org_id, plan_id, station, title, 
             planned_qty, unit, recipe_id, 
             priority, status, notes
           ) values (
             v_org_id, v_plan_id, v_station, v_item.name,
             v_total_qty, v_item.unit, v_recipe_id,
             3, 'todo', 'Generated from Menu'
           );
           v_created_count := v_created_count + 1;
       end if;
    else
       v_missing_items := array_append(v_missing_items, v_item.name);
    end if;
  end loop;

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'created', v_created_count,
    'missing_count', array_length(v_missing_items, 1),
    'missing_items', v_missing_items
  );
end;
$$;


ALTER FUNCTION "public"."generate_production_plan"("p_service_id" "uuid") OWNER TO "postgres";

--
-- Name: generate_production_plan("uuid", "text", "text", boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."generate_production_plan"("p_service_id" "uuid", "p_version_reason" "text" DEFAULT NULL::"text", "p_idempotency_key" "text" DEFAULT NULL::"text", "p_strict" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_service record;
  v_requirements jsonb;
  v_missing_items text[] := array[]::text[];
  v_version_id uuid;
  v_existing_version_id uuid;
  v_version_num int;
  v_plan_id uuid;
  v_created_count int := 0;
  v_recipe jsonb;
  v_recipe_id uuid;
  v_servings numeric;
  v_meta record;
begin
  select es.id, es.org_id, es.event_id, ev.hotel_id, es.pax, es.format
  into v_service
  from public.event_services es
  join public.events ev on ev.id = es.event_id
  where es.id = p_service_id;
  if not found then
    raise exception 'service not found';
  end if;

  if not public.has_org_role(v_service.org_id, array['owner', 'admin', 'manager']) then
    raise exception 'insufficient permissions';
  end if;

  perform pg_advisory_xact_lock(hashtext('production:' || p_service_id::text));

  if p_idempotency_key is not null then
    select id into v_existing_version_id
    from public.order_versions
    where event_service_id = p_service_id
      and entity_type = 'production'
      and idempotency_key = p_idempotency_key
    limit 1;
    if v_existing_version_id is not null then
      select id into v_plan_id from public.production_plans where order_version_id = v_existing_version_id;
      return jsonb_build_object('plan_id', v_plan_id, 'created', 0, 'missing_items', to_jsonb(array[]::text[]), 'version_num', null);
    end if;
  end if;

  select public.compute_service_requirements(p_service_id, false) into v_requirements;
  select coalesce(array_agg(value), array[]::text[]) into v_missing_items
  from jsonb_array_elements_text(coalesce(v_requirements->'missing_items', '[]'::jsonb)) as value;

  if p_strict and array_length(v_missing_items, 1) > 0 then
    return jsonb_build_object(
      'status', 'blocked',
      'missing_items', to_jsonb(v_missing_items),
      'created', 0
    );
  end if;

  select coalesce(max(version_num), 0) + 1
  into v_version_num
  from public.order_versions
  where event_service_id = p_service_id
    and entity_type = 'production';

  insert into public.order_versions (
    org_id, event_id, event_service_id, entity_type, version_num, version_reason, idempotency_key, created_by, is_current
  )
  values (
    v_service.org_id, v_service.event_id, p_service_id, 'production', v_version_num, p_version_reason, p_idempotency_key, auth.uid(), true
  )
  returning id into v_version_id;

  update public.order_versions
  set is_current = false
  where event_service_id = p_service_id
    and entity_type = 'production'
    and id <> v_version_id;

  insert into public.production_plans (
    org_id, hotel_id, event_id, event_service_id, status, generated_from,
    order_version_id, version_num, version_reason, idempotency_key, is_current
  )
  values (
    v_service.org_id,
    v_service.hotel_id,
    v_service.event_id,
    p_service_id,
    'draft',
    'menu',
    v_version_id,
    v_version_num,
    p_version_reason,
    p_idempotency_key,
    true
  )
  returning id into v_plan_id;

  update public.production_plans
  set is_current = false
  where event_service_id = p_service_id
    and id <> v_plan_id;

  for v_recipe in
    select * from jsonb_array_elements(coalesce(v_requirements->'recipes', '[]'::jsonb))
  loop
    v_recipe_id := (v_recipe->>'recipe_id')::uuid;
    v_servings := (v_recipe->>'servings')::numeric;
    if v_recipe_id is null or v_servings is null or v_servings <= 0 then
      continue;
    end if;
    select * into v_meta from public.recipe_production_meta where recipe_id = v_recipe_id;
    insert into public.production_tasks (
      org_id, plan_id, station, title, planned_qty, unit, recipe_id, priority, status, notes
    ) values (
      v_service.org_id,
      v_plan_id,
      coalesce(v_meta.station, 'caliente'),
      (v_recipe->>'name'),
      v_servings,
      'ud',
      v_recipe_id,
      3,
      'todo',
      'Generado desde menu'
    );
    v_created_count := v_created_count + 1;
  end loop;

  return jsonb_build_object(
    'plan_id', v_plan_id,
    'created', v_created_count,
    'missing_items', to_jsonb(coalesce(v_missing_items, array[]::text[])),
    'version_num', v_version_num
  );
end;
$$;


ALTER FUNCTION "public"."generate_production_plan"("p_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean) OWNER TO "postgres";

--
-- Name: generate_week_roster_v2("uuid", "date", boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."generate_week_roster_v2"("p_hotel_id" "uuid", "week_start" "date", "dry_run" boolean DEFAULT true) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  org uuid;
  rules record;
  staff_list json;
  shifts_out json := '[]'::json;
  assigns_out json := '[]'::json;
  warnings json := '[]'::json;
  d date;
  shift_type text;
  need int;
  day_assign json;
  staff_rec record;
  assigned_week jsonb := '[]'::jsonb;
begin
  select org_id into org from public.hotels where id = p_hotel_id;
  if org is null then
    raise exception 'hotel not found';
  end if;

  select * into rules from public.scheduling_rules where hotel_id = p_hotel_id;
  if rules is null then
    rules.morning_required_weekday := 1;
    rules.morning_required_weekend := 2;
    rules.afternoon_required_daily := 1;
  end if;

  for d in select week_start + offs from generate_series(0,6) as offs loop
    -- morning
    if extract(isodow from d) in (6,7) then
      need := coalesce(rules.morning_required_weekend,1);
    else
      need := coalesce(rules.morning_required_weekday,1);
    end if;
    shifts_out := shifts_out || json_build_object('shift_date', d, 'shift_type', 'mañana', 'required_count', need);
    -- afternoon
    shifts_out := shifts_out || json_build_object('shift_date', d, 'shift_type', 'tarde', 'required_count', coalesce(rules.afternoon_required_daily,1));
  end loop;

  for staff_rec in
    select s.*, coalesce(v.days_total,47) as allowance_days
    from public.staff_members s
    where s.org_id = org and s.active = true
  loop
    assigned_week := jsonb_set(assigned_week, ('{'||staff_rec.id||'}')::text[], '0'::jsonb, true);
  end loop;

  -- simple greedy
  for d in select week_start + offs as day from generate_series(0,6) as offs loop
    for shift_type in select unnest(array['mañana','tarde']) loop
      need := (select (elem->>'required_count')::int from json_array_elements(shifts_out) elem where elem->>'shift_date' = d::text and elem->>'shift_type' = shift_type limit 1);
      if need is null then need := 0; end if;
      while need > 0 loop
        select * into staff_rec
        from public.staff_members s
        where s.org_id = org
          and s.active = true
          and (s.shift_pattern = shift_type or s.shift_pattern = 'rotativo')
          and coalesce((assigned_week ->> s.id)::int,0) < s.max_shifts_per_week
          and not exists (
            select 1 from public.staff_assignments sa
            join public.shifts sh on sh.id = sa.shift_id
            where sa.staff_member_id = s.id and sh.hotel_id = hotel_id and sh.shift_date = d
          )
          and not exists (
            select 1 from public.staff_time_off t
            where t.staff_member_id = s.id and t.approved = true and d between t.start_date and t.end_date
          )
          and (shift_type <> 'mañana' or not exists (
            select 1 from public.staff_assignments sa
            join public.shifts sh on sh.id = sa.shift_id
            where sa.staff_member_id = s.id and sh.hotel_id = hotel_id and sh.shift_date = d - interval '1 day' and sh.shift_type = 'tarde'
          ))
        order by coalesce((assigned_week ->> s.id)::int,0), s.full_name
        limit 1;

        if staff_rec.id is null then
          warnings := warnings || json_build_object('code','coverage_shortfall','message', format('Sin candidatos %s %s', shift_type, d));
          exit;
        end if;

        assigns_out := assigns_out || json_build_object('shift_date', d, 'shift_type', shift_type, 'staff_member_id', staff_rec.id);
        assigned_week := jsonb_set(assigned_week, ('{'||staff_rec.id||'}')::text[], to_jsonb(coalesce((assigned_week ->> staff_rec.id)::int,0) + 1), true);
        need := need - 1;
      end loop;
    end loop;
  end loop;

  if dry_run = false then
    -- upsert shifts and assignments
    for day_assign in select * from json_array_elements(shifts_out) loop
      insert into public.shifts (org_id, hotel_id, shift_date, shift_type, starts_at, ends_at, required_count)
      values (org, p_hotel_id, (day_assign->>'shift_date')::date, day_assign->>'shift_type', '07:00', '15:00', (day_assign->>'required_count')::int)
      on conflict (hotel_id, shift_date, shift_type) do update
      set required_count = excluded.required_count;
    end loop;
    for day_assign in select * from json_array_elements(assigns_out) loop
      insert into public.staff_assignments (org_id, shift_id, staff_member_id)
      select org, sh.id, (day_assign->>'staff_member_id')::uuid
      from public.shifts sh
      where sh.hotel_id = p_hotel_id and sh.shift_date = (day_assign->>'shift_date')::date and sh.shift_type = (day_assign->>'shift_type')
      on conflict do nothing;
    end loop;
  end if;

  return json_build_object('shifts', shifts_out, 'assignments', assigns_out, 'warnings', warnings, 'stats', json_build_object());
end;
$$;


ALTER FUNCTION "public"."generate_week_roster_v2"("p_hotel_id" "uuid", "week_start" "date", "dry_run" boolean) OWNER TO "postgres";

--
-- Name: has_org_role("uuid", "text"[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
      and m.role = any(p_roles)
  );
$$;


ALTER FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_roles" "text"[]) OWNER TO "postgres";

--
-- Name: import_commit("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."import_commit"("p_job_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_job public.import_jobs%rowtype;
  v_row public.import_rows%rowtype;
  v_org_id uuid;
  v_event_id uuid;
  v_touched_ids uuid[] := '{}';
  v_min_date timestamptz;
  v_max_date timestamptz;
  v_hotel_id uuid;
  v_product_id uuid;
  v_supplier_id uuid;
  v_supplier_name text;
  v_purchase_unit text;
  v_rounding_rule text;
  v_is_primary boolean;
begin
  select * into v_job from public.import_jobs where id = p_job_id;
  v_org_id := v_job.org_id;

  if v_job.status <> 'validated' then raise exception 'Job must be validated'; end if;
  if (v_job.summary->>'errors')::int > 0 then raise exception 'Cannot commit with errors'; end if;

  for v_row in select * from public.import_rows where job_id = p_job_id order by row_number
  loop
    if v_job.entity = 'suppliers' then
      insert into public.suppliers (org_id, name)
      values (v_org_id, v_row.normalized->>'name')
      on conflict (org_id, name) do nothing;

    elsif v_job.entity = 'supplier_items' then
      insert into public.supplier_items (
        supplier_id,
        name,
        purchase_unit,
        pack_size,
        rounding_rule,
        price_per_unit,
        notes,
        product_id,
        is_primary
      )
      values (
        (v_row.normalized->>'supplier_id')::uuid,
        v_row.normalized->>'name',
        v_row.normalized->>'purchase_unit',
        (nullif(v_row.normalized->>'pack_size', ''))::numeric,
        coalesce(v_row.normalized->>'rounding_rule', 'none'),
        (nullif(v_row.normalized->>'price', ''))::numeric,
        v_row.normalized->>'notes',
        (v_row.normalized->>'product_id')::uuid,
        coalesce((v_row.normalized->>'is_primary')::boolean, false)
      )
      on conflict (supplier_id, name) do update
      set purchase_unit = excluded.purchase_unit,
          price_per_unit = excluded.price_per_unit,
          pack_size = excluded.pack_size,
          rounding_rule = excluded.rounding_rule,
          product_id = coalesce(supplier_items.product_id, excluded.product_id),
          is_primary = case when supplier_items.is_primary then true else excluded.is_primary end;

    elsif v_job.entity = 'events' then
      v_hotel_id := (v_row.normalized->>'hotel_id')::uuid;

      insert into public.events (org_id, hotel_id, title, starts_at, ends_at, status, notes)
      values (
        v_org_id,
        v_hotel_id,
        v_row.normalized->>'title',
        (v_row.normalized->>'starts_at')::timestamptz,
        coalesce((v_row.normalized->>'ends_at')::timestamptz, (v_row.normalized->>'starts_at')::timestamptz + interval '1 hour'),
        coalesce(v_row.normalized->>'status', 'confirmed'),
        v_row.normalized->>'notes'
      )
      on conflict (org_id, hotel_id, title, starts_at) do update
      set notes = excluded.notes,
          ends_at = excluded.ends_at
      returning id into v_event_id;

      v_touched_ids := array_append(v_touched_ids, v_event_id);

      if v_row.normalized->>'space_id' is not null then
        update public.space_bookings
        set starts_at = (v_row.normalized->>'starts_at')::timestamptz,
            ends_at = coalesce((v_row.normalized->>'ends_at')::timestamptz, (v_row.normalized->>'starts_at')::timestamptz + interval '1 hour')
        where event_id = v_event_id
          and space_id = (v_row.normalized->>'space_id')::uuid;

        if not found then
          insert into public.space_bookings (id, org_id, event_id, space_id, starts_at, ends_at)
          values (
            gen_random_uuid(),
            v_org_id,
            v_event_id,
            (v_row.normalized->>'space_id')::uuid,
            (v_row.normalized->>'starts_at')::timestamptz,
            coalesce((v_row.normalized->>'ends_at')::timestamptz, (v_row.normalized->>'starts_at')::timestamptz + interval '1 hour')
          );
        end if;
      end if;

    elsif v_job.entity = 'products' then
      insert into public.products (org_id, name, base_unit, category, active)
      values (
        v_org_id,
        v_row.normalized->>'name',
        v_row.normalized->>'base_unit',
        v_row.normalized->>'category',
        coalesce((v_row.normalized->>'active')::boolean, true)
      )
      on conflict (org_id, name) do update
      set base_unit = excluded.base_unit,
          category = excluded.category,
          active = excluded.active
      returning id into v_product_id;

      v_supplier_name := trim(coalesce(v_row.normalized->>'supplier_name', ''));
      if v_supplier_name <> '' then
        v_supplier_id := (v_row.normalized->>'supplier_id')::uuid;
        if v_supplier_id is null then
          insert into public.suppliers (org_id, name)
          values (v_org_id, v_supplier_name)
          on conflict (org_id, name) do nothing;

          select id into v_supplier_id
          from public.suppliers
          where org_id = v_org_id and name = v_supplier_name;
        end if;

        if v_supplier_id is not null then
          v_purchase_unit := coalesce(v_row.normalized->>'purchase_unit', v_row.normalized->>'base_unit', 'ud');
          v_rounding_rule := coalesce(v_row.normalized->>'rounding_rule', 'none');
          v_is_primary := coalesce((v_row.normalized->>'is_primary')::boolean, false);
          if not v_is_primary then
            perform 1 from public.supplier_items where product_id = v_product_id and is_primary = true;
            if not found then v_is_primary := true; end if;
          end if;

          insert into public.supplier_items (
            supplier_id,
            name,
            purchase_unit,
            pack_size,
            rounding_rule,
            price_per_unit,
            notes,
            product_id,
            is_primary
          )
          values (
            v_supplier_id,
            v_row.normalized->>'name',
            v_purchase_unit,
            (nullif(v_row.normalized->>'pack_size', ''))::numeric,
            v_rounding_rule,
            coalesce(
              (nullif(v_row.normalized->>'price', ''))::numeric,
              (nullif(v_row.normalized->>'price_per_unit', ''))::numeric,
              (nullif(v_row.normalized->>'precio', ''))::numeric
            ),
            v_row.normalized->>'notes',
            v_product_id,
            v_is_primary
          )
          on conflict (supplier_id, name) do update
          set purchase_unit = excluded.purchase_unit,
              price_per_unit = excluded.price_per_unit,
              pack_size = excluded.pack_size,
              rounding_rule = excluded.rounding_rule,
              product_id = coalesce(supplier_items.product_id, excluded.product_id),
              is_primary = case when supplier_items.is_primary then true else excluded.is_primary end;
        end if;
      end if;

    elsif v_job.entity = 'staff' then
      insert into public.staff_members (
        org_id,
        full_name,
        role,
        employment_type,
        home_hotel_id,
        notes,
        shift_pattern,
        max_shifts_per_week,
        active
      )
      values (
        v_org_id,
        v_row.normalized->>'full_name',
        coalesce(v_row.normalized->>'role', 'cocinero'),
        coalesce(v_row.normalized->>'employment_type', 'fijo'),
        (v_row.normalized->>'home_hotel_id')::uuid,
        v_row.normalized->>'notes',
        coalesce(v_row.normalized->>'shift_pattern', 'rotativo'),
        coalesce((v_row.normalized->>'max_shifts')::int, 5),
        coalesce((v_row.normalized->>'active')::boolean, true)
      )
      on conflict (org_id, full_name) do update
      set role = excluded.role,
          employment_type = excluded.employment_type,
          active = excluded.active;
    end if;
  end loop;

  if v_job.entity = 'events' and array_length(v_touched_ids, 1) > 0 then
    select min((normalized->>'starts_at')::timestamptz), max((normalized->>'starts_at')::timestamptz)
    into v_min_date, v_max_date
    from public.import_rows
    where job_id = p_job_id;

    delete from public.events
    where org_id = v_org_id
      and hotel_id = v_hotel_id
      and starts_at >= date_trunc('day', v_min_date)
      and starts_at < date_trunc('day', v_max_date) + interval '1 day'
      and id <> all(v_touched_ids);
  end if;

  update public.import_jobs set status = 'committed' where id = p_job_id;

  return v_job.summary;
end;
$$;


ALTER FUNCTION "public"."import_commit"("p_job_id" "uuid") OWNER TO "postgres";

--
-- Name: import_stage_data("uuid", "text", "text", "jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."import_stage_data"("p_org_id" "uuid", "p_entity" "text", "p_filename" "text", "p_rows" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_job_id uuid;
  v_user_id uuid;
  v_row jsonb;
  v_idx int := 1;
begin
  v_user_id := auth.uid();
  
  -- Auth check
  if not exists (select 1 from public.org_memberships where org_id = p_org_id and user_id = v_user_id) then
    raise exception 'Access denied to org';
  end if;
  -- Create Job
  insert into public.import_jobs (org_id, created_by, entity, filename, status, summary)
  values (p_org_id, v_user_id, p_entity, p_filename, 'staged', jsonb_build_object('total', jsonb_array_length(p_rows)))
  returning id into v_job_id;
  -- Insert Rows (Bulk insert optimization possible, but loop is safer for row_number tracking for now)
  -- For strict ordering, we iterate.
  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    insert into public.import_rows (job_id, row_number, raw)
    values (v_job_id, v_idx, v_row);
    v_idx := v_idx + 1;
  end loop;
  return v_job_id;
end;
$$;


ALTER FUNCTION "public"."import_stage_data"("p_org_id" "uuid", "p_entity" "text", "p_filename" "text", "p_rows" "jsonb") OWNER TO "postgres";

--
-- Name: import_validate("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."import_validate"("p_job_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_job public.import_jobs%rowtype;
  v_row public.import_rows%rowtype;
  v_errors text[];
  v_normalized jsonb;
  v_action text;
  v_target_id uuid;
  v_space_id uuid;
  v_org_id uuid;
  v_supplier_id uuid;
  v_name text;
  v_base_unit text;
  v_purchase_unit text;
  v_supplier_name text;

  c_ok int := 0;
  c_error int := 0;
  c_insert int := 0;
  c_update int := 0;
begin
  select * into v_job from public.import_jobs where id = p_job_id;
  v_org_id := v_job.org_id;

  if v_job.created_by <> auth.uid() then
    -- Optional: keep creator check soft to match current behavior.
  end if;

  for v_row in select * from public.import_rows where job_id = p_job_id order by row_number
  loop
    v_errors := '{}';
    v_normalized := v_row.raw;
    v_action := 'insert';

    if v_job.entity = 'suppliers' then
      if trim(coalesce(v_row.raw->>'name', '')) = '' then
        v_errors := array_append(v_errors, 'Missing name');
      end if;
      if v_errors = '{}' then
        select id into v_target_id
        from public.suppliers
        where org_id = v_org_id and name = (v_row.raw->>'name');
        if v_target_id is not null then
          v_action := 'update';
          v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
        end if;
      end if;

    elsif v_job.entity = 'supplier_items' then
      v_supplier_name := trim(coalesce(v_row.raw->>'supplier_name', v_row.raw->>'proveedor', v_row.raw->>'supplier', ''));
      if v_supplier_name = '' then
        v_errors := array_append(v_errors, 'Missing supplier_name');
      end if;
      if trim(coalesce(v_row.raw->>'name', '')) = '' then
        v_errors := array_append(v_errors, 'Missing name');
      end if;

      if v_supplier_name <> '' then
        select id into v_target_id
        from public.suppliers
        where org_id = v_org_id and name = v_supplier_name;
        if v_target_id is null then
          v_errors := array_append(v_errors, 'Supplier not found: ' || v_supplier_name);
        else
          v_normalized := v_normalized || jsonb_build_object('supplier_id', v_target_id, 'supplier_name', v_supplier_name);
          perform 1 from public.supplier_items where supplier_id = v_target_id and name = (v_row.raw->>'name');
          if found then v_action := 'update'; end if;
        end if;
      end if;

      v_purchase_unit := lower(trim(coalesce(v_row.raw->>'purchase_unit', v_row.raw->>'purchaseUnit', v_row.raw->>'unidad_compra', v_row.raw->>'unidad compra', '')));
      if v_purchase_unit in ('kg', 'kgs', 'kilo', 'kilogramo', 'kilogramos') then
        v_purchase_unit := 'kg';
      elsif v_purchase_unit in ('ud', 'uds', 'unidad', 'unidades', 'unit', 'units', 'pcs', 'pieza', 'pzas') then
        v_purchase_unit := 'ud';
      end if;
      if v_purchase_unit not in ('kg', 'ud') then
        v_errors := array_append(v_errors, 'Invalid unit (must be kg or ud)');
      else
        v_normalized := v_normalized || jsonb_build_object('purchase_unit', v_purchase_unit);
      end if;

    elsif v_job.entity = 'events' then
      if v_row.raw->>'hotel_id' is null then v_errors := array_append(v_errors, 'Missing hotel_id'); end if;
      if trim(coalesce(v_row.raw->>'title', '')) = '' then v_errors := array_append(v_errors, 'Missing title'); end if;
      if v_row.raw->>'starts_at' is null then v_errors := array_append(v_errors, 'Missing starts_at'); end if;

      if v_row.raw->>'hotel_id' is not null then
        perform 1 from public.hotels where id = (v_row.raw->>'hotel_id')::uuid and org_id = v_org_id;
        if not found then v_errors := array_append(v_errors, 'Invalid hotel_id'); end if;
      end if;

      if v_row.raw->>'space_name' is not null and v_row.raw->>'hotel_id' is not null then
        select id into v_space_id
        from public.spaces
        where org_id = v_org_id
          and hotel_id = (v_row.raw->>'hotel_id')::uuid
          and lower(name) = lower(v_row.raw->>'space_name');
        if v_space_id is null then
          v_errors := array_append(v_errors, 'Space not found: ' || (v_row.raw->>'space_name'));
        else
          v_normalized := v_normalized || jsonb_build_object('space_id', v_space_id);
        end if;
      end if;

      if v_errors = '{}' then
        select id into v_target_id
        from public.events
        where org_id = v_org_id
          and hotel_id = (v_row.raw->>'hotel_id')::uuid
          and title = (v_row.raw->>'title')
          and starts_at = (v_row.raw->>'starts_at')::timestamptz;
        if v_target_id is not null then
          v_action := 'update';
          v_normalized := v_normalized || jsonb_build_object('event_id', v_target_id);
        end if;
      end if;

    elsif v_job.entity = 'products' then
      v_name := trim(coalesce(v_row.raw->>'name', v_row.raw->>'nombre', ''));
      if v_name = '' then
        v_errors := array_append(v_errors, 'Missing name');
      end if;

      v_base_unit := lower(trim(coalesce(
        v_row.raw->>'base_unit',
        v_row.raw->>'baseUnit',
        v_row.raw->>'unidad',
        v_row.raw->>'unidad_base',
        v_row.raw->>'unit',
        ''
      )));
      if v_base_unit in ('kg', 'kgs', 'kilo', 'kilogramo', 'kilogramos') then
        v_base_unit := 'kg';
      elsif v_base_unit in ('ud', 'uds', 'unidad', 'unidades', 'unit', 'units', 'pcs', 'pieza', 'pzas') then
        v_base_unit := 'ud';
      end if;

      if v_base_unit not in ('kg', 'ud') then
        v_errors := array_append(v_errors, 'Invalid base_unit (must be kg or ud)');
      end if;

      v_supplier_name := trim(coalesce(
        v_row.raw->>'supplier_name',
        v_row.raw->>'proveedor',
        v_row.raw->>'supplier',
        v_row.raw->>'provider',
        ''
      ));
      if v_supplier_name <> '' then
        select id into v_supplier_id
        from public.suppliers
        where org_id = v_org_id and name = v_supplier_name;
        v_normalized := v_normalized || jsonb_build_object('supplier_name', v_supplier_name);
        if v_supplier_id is not null then
          v_normalized := v_normalized || jsonb_build_object('supplier_id', v_supplier_id);
        end if;
      end if;

      v_purchase_unit := lower(trim(coalesce(
        v_row.raw->>'purchase_unit',
        v_row.raw->>'purchaseUnit',
        v_row.raw->>'unidad_compra',
        v_row.raw->>'unidad compra',
        ''
      )));
      if v_purchase_unit in ('kg', 'kgs', 'kilo', 'kilogramo', 'kilogramos') then
        v_purchase_unit := 'kg';
      elsif v_purchase_unit in ('ud', 'uds', 'unidad', 'unidades', 'unit', 'units', 'pcs', 'pieza', 'pzas') then
        v_purchase_unit := 'ud';
      elsif v_purchase_unit = '' then
        v_purchase_unit := v_base_unit;
      end if;

      if v_purchase_unit not in ('kg', 'ud') then
        v_errors := array_append(v_errors, 'Invalid purchase_unit (must be kg or ud)');
      end if;

      v_normalized := v_normalized || jsonb_build_object(
        'name', v_name,
        'base_unit', v_base_unit,
        'purchase_unit', v_purchase_unit
      );

      if v_errors = '{}' then
        select id into v_target_id
        from public.products
        where org_id = v_org_id and name = v_name;
        if v_target_id is not null then
          v_action := 'update';
          v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
        end if;
      end if;

    elsif v_job.entity = 'staff' then
      if trim(coalesce(v_row.raw->>'full_name', '')) = '' then
        v_errors := array_append(v_errors, 'Missing full_name');
      end if;
      if v_errors = '{}' then
        select id into v_target_id
        from public.staff_members
        where org_id = v_org_id and full_name = (v_row.raw->>'full_name');
        if v_target_id is not null then
          v_action := 'update';
          v_normalized := v_normalized || jsonb_build_object('id', v_target_id);
        end if;
      end if;
    end if;

    update public.import_rows
    set errors = v_errors, normalized = v_normalized, action = v_action
    where id = v_row.id;

    if array_length(v_errors, 1) > 0 then
      c_error := c_error + 1;
    else
      c_ok := c_ok + 1;
      if v_action = 'insert' then c_insert := c_insert + 1; else c_update := c_update + 1; end if;
    end if;
  end loop;

  update public.import_jobs
  set status = 'validated',
      summary = jsonb_build_object(
        'total', (c_ok + c_error),
        'ok', c_ok,
        'errors', c_error,
        'inserted', c_insert,
        'updated', c_update
      )
  where id = p_job_id
  returning summary into v_job.summary;

  return v_job.summary;
end;
$$;


ALTER FUNCTION "public"."import_validate"("p_job_id" "uuid") OWNER TO "postgres";

--
-- Name: is_event_service_member("uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_event_service_member"("p_org" "uuid", "p_service" "uuid") RETURNS boolean
    LANGUAGE "sql"
    AS $$
  select public.is_org_member(p_org) and exists (
    select 1 from public.event_services es where es.id = p_service and es.org_id = p_org
  );
$$;


ALTER FUNCTION "public"."is_event_service_member"("p_org" "uuid", "p_service" "uuid") OWNER TO "postgres";

--
-- Name: is_org_member("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."is_org_member"("p_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id = p_org_id
      and m.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_org_member"("p_org_id" "uuid") OWNER TO "postgres";

--
-- Name: join_hotel_atlantico(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."join_hotel_atlantico"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Hotel Atlantico ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
  INSERT INTO public.org_memberships (org_id, user_id, role)
  VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', auth.uid(), 'owner')
  ON CONFLICT (org_id, user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."join_hotel_atlantico"() OWNER TO "postgres";

--
-- Name: list_expiry_alerts("uuid", "public"."expiry_alert_status"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."list_expiry_alerts"("p_org_id" "uuid", "p_status" "public"."expiry_alert_status" DEFAULT 'open'::"public"."expiry_alert_status") RETURNS TABLE("id" "uuid", "batch_id" "uuid", "rule_id" "uuid", "status" "public"."expiry_alert_status", "created_at" timestamp with time zone, "sent_at" timestamp with time zone, "days_before" integer, "expires_at" timestamp with time zone, "qty" numeric, "unit" "text", "product_name" "text", "location_id" "uuid", "location_name" "text", "hotel_id" "uuid", "lot_code" "text", "source" "public"."stock_batch_source")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden';
  end if;

  with rules as (
    select id, days_before, product_type
    from public.expiry_rules
    where org_id = p_org_id
      and is_enabled = true
  ),
  batches as (
    select
      b.id,
      b.expires_at,
      b.qty,
      b.unit,
      b.lot_code,
      b.source,
      b.location_id,
      si.name as supplier_item_name,
      prep.name as preparation_name,
      coalesce(
        case
          when b.preparation_id is not null then
            case pr.process_type
              when 'frozen' then 'frozen'::public.product_type
              when 'pasteurized_frozen' then 'frozen'::public.product_type
              when 'pasteurized' then 'pasteurized'::public.product_type
              when 'vacuum' then 'pasteurized'::public.product_type
              else 'fresh'::public.product_type
            end
          else null
        end,
        si.product_type_override,
        p.product_type,
        'fresh'::public.product_type
      ) as product_type
    from public.stock_batches b
    left join public.supplier_items si on si.id = b.supplier_item_id
    left join public.products p on p.id = si.product_id
    left join public.preparations prep on prep.id = b.preparation_id
    left join public.preparation_runs pr on pr.stock_batch_id = b.id
    where b.org_id = p_org_id
      and b.expires_at is not null
      and b.qty > 0
  ),
  applied_rules as (
    select b.id as batch_id, r.id as rule_id, r.days_before
    from batches b
    join rules r on r.product_type is not distinct from b.product_type
    union all
    select b.id as batch_id, r.id as rule_id, r.days_before
    from batches b
    join rules r on r.product_type is null
    where not exists (
      select 1 from rules r2 where r2.product_type is not distinct from b.product_type
    )
  ),
  due as (
    select ar.batch_id, ar.rule_id
    from applied_rules ar
    join batches b on b.id = ar.batch_id
    where b.expires_at <= (now() + (ar.days_before || ' days')::interval)
  )
  insert into public.expiry_alerts (org_id, batch_id, rule_id, status)
  select p_org_id, d.batch_id, d.rule_id, 'open'::public.expiry_alert_status
  from due d
  on conflict (org_id, batch_id, rule_id) do nothing;

  return query
  select
    ea.id,
    ea.batch_id,
    ea.rule_id,
    ea.status,
    ea.created_at,
    ea.sent_at,
    r.days_before,
    b.expires_at,
    b.qty,
    b.unit,
    coalesce(si.name, prep.name, 'Lote') as product_name,
    loc.id as location_id,
    loc.name as location_name,
    loc.hotel_id,
    b.lot_code,
    b.source
  from public.expiry_alerts ea
  join public.expiry_rules r on r.id = ea.rule_id
  join public.stock_batches b on b.id = ea.batch_id
  left join public.supplier_items si on si.id = b.supplier_item_id
  left join public.preparations prep on prep.id = b.preparation_id
  left join public.inventory_locations loc on loc.id = b.location_id
  where ea.org_id = p_org_id
    and ea.status = p_status
  order by ea.created_at desc;
end;
$$;


ALTER FUNCTION "public"."list_expiry_alerts"("p_org_id" "uuid", "p_status" "public"."expiry_alert_status") OWNER TO "postgres";

--
-- Name: list_inbound_missing_expiry("uuid", "uuid", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."list_inbound_missing_expiry"("p_org_id" "uuid", "p_hotel_id" "uuid" DEFAULT NULL::"uuid", "p_location_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("line_id" "uuid", "shipment_id" "uuid", "location_id" "uuid", "hotel_id" "uuid", "location_name" "text", "supplier_name" "text", "description" "text", "qty" numeric, "unit" "text", "delivered_at" "date", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'forbidden';
  end if;

  if p_produced_qty is null or p_produced_qty <= 0 then
    raise exception 'produced qty must be > 0';
  end if;

  if p_labels_count is not null and p_labels_count < 1 then
    raise exception 'labels_count must be >= 1';
  end if;

  if p_produced_unit not in ('kg', 'ud') then
    raise exception 'invalid produced unit';
  end if;

  if p_produced_at is null then
    raise exception 'produced_at required';
  end if;

  return query
  select
    l.id as line_id,
    l.shipment_id,
    s.location_id,
    loc.hotel_id,
    loc.name as location_name,
    coalesce(s.supplier_name, 'Sin proveedor') as supplier_name,
    l.description,
    l.qty,
    l.unit,
    s.delivered_at,
    l.created_at
  from public.inbound_shipment_lines l
  join public.inbound_shipments s on s.id = l.shipment_id
  join public.inventory_locations loc on loc.id = s.location_id
  where l.org_id = p_org_id
    and l.expires_at is null
    and l.status = 'ready'
    and (p_hotel_id is null or loc.hotel_id = p_hotel_id)
    and (p_location_id is null or s.location_id = p_location_id)
  order by l.created_at desc;
end;
$$;


ALTER FUNCTION "public"."list_inbound_missing_expiry"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_location_id" "uuid") OWNER TO "postgres";

--
-- Name: log_event("uuid", "text", "text", "jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."log_event"("p_org_id" "uuid", "p_level" "text", "p_event" "text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.audit_logs (org_id, user_id, level, event, metadata)
  values (p_org_id, auth.uid(), p_level, p_event, p_metadata);
end;
$$;


ALTER FUNCTION "public"."log_event"("p_org_id" "uuid", "p_level" "text", "p_event" "text", "p_metadata" "jsonb") OWNER TO "postgres";

--
-- Name: menu_template_items_fill_defaults(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."menu_template_items_fill_defaults"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.org_id is null then
    select org_id into new.org_id from public.menu_templates where id = new.template_id;
  end if;
  if new.rounding_rule is null then
    new.rounding_rule := 'none';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."menu_template_items_fill_defaults"() OWNER TO "postgres";

--
-- Name: org_list_members("uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."org_list_members"("p_org_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "role" "text", "is_active" boolean, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  if not public.has_org_role(p_org_id, array['admin','manager']) then
    raise exception 'not authorized';
  end if;

  return query
  select
    m.user_id,
    u.email,
    m.role,
    coalesce(m.is_active, false) as is_active,
    m.created_at
  from public.org_memberships m
  join auth.users u on u.id = m.user_id
  where m.org_id = p_org_id
  order by m.created_at asc;
end;
$$;


ALTER FUNCTION "public"."org_list_members"("p_org_id" "uuid") OWNER TO "postgres";

--
-- Name: recalc_event_po_total(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."recalc_event_po_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update public.event_purchase_orders po
    set total_estimated = coalesce(sub.total,0)
  from (
    select event_purchase_order_id, sum(line_total) as total
    from public.event_purchase_order_lines
    where event_purchase_order_id = coalesce(new.event_purchase_order_id, old.event_purchase_order_id)
    group by event_purchase_order_id
  ) sub
  where po.id = sub.event_purchase_order_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."recalc_event_po_total"() OWNER TO "postgres";

--
-- Name: receive_purchase_order("uuid", "jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."receive_purchase_order"("p_order_id" "uuid", "p_lines" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."receive_purchase_order"("p_order_id" "uuid", "p_lines" "jsonb") OWNER TO "postgres";

--
-- Name: refresh_po_total(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."refresh_po_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  po_id uuid;
begin
  po_id := coalesce(new.purchase_order_id, old.purchase_order_id);
  update public.purchase_orders
  set total_estimated = coalesce((
    select sum(line_total) from public.purchase_order_lines where purchase_order_id = po_id
  ), 0)
  where id = po_id;
  return null;
end;
$$;


ALTER FUNCTION "public"."refresh_po_total"() OWNER TO "postgres";

--
-- Name: register_extra_shift("uuid", "uuid", "date", numeric, "text", "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."register_extra_shift"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_shift_date" "date", "p_hours" numeric, "p_reason" "text" DEFAULT NULL::"text", "p_shift_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_staff_org uuid;
  v_extra_id uuid;
begin
  select org_id into v_staff_org from public.staff_members where id = p_staff_member_id;
  if v_staff_org is null then raise exception 'staff not found'; end if;
  if v_staff_org <> p_org_id then raise exception 'org mismatch'; end if;
  if not public.is_org_member(p_org_id) then raise exception 'not authorized'; end if;
  if p_hours <= 0 then raise exception 'invalid hours'; end if;

  insert into public.staff_extra_shifts (
    org_id,
    staff_member_id,
    shift_id,
    shift_date,
    hours,
    reason,
    created_by
  ) values (
    p_org_id,
    p_staff_member_id,
    p_shift_id,
    p_shift_date,
    p_hours,
    p_reason,
    auth.uid()
  )
  returning id into v_extra_id;

  insert into public.staff_compensations (
    org_id,
    staff_member_id,
    extra_shift_id,
    hours,
    status,
    created_by
  ) values (
    p_org_id,
    p_staff_member_id,
    v_extra_id,
    p_hours,
    'open',
    auth.uid()
  );

  return v_extra_id;
end;
$$;


ALTER FUNCTION "public"."register_extra_shift"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_shift_date" "date", "p_hours" numeric, "p_reason" "text", "p_shift_id" "uuid") OWNER TO "postgres";

--
-- Name: request_time_off("uuid", "uuid", "date", "date", "text", "text", boolean); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."request_time_off"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_notes" "text" DEFAULT NULL::"text", "p_approved" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_staff_org uuid;
  v_id uuid;
begin
  select org_id into v_staff_org from public.staff_members where id = p_staff_member_id;
  if v_staff_org is null then raise exception 'staff not found'; end if;
  if v_staff_org <> p_org_id then raise exception 'org mismatch'; end if;
  if p_end_date < p_start_date then raise exception 'invalid date range'; end if;
  if not public.is_org_member(p_org_id) then raise exception 'not authorized'; end if;

  insert into public.staff_time_off (
    org_id,
    staff_member_id,
    start_date,
    end_date,
    type,
    notes,
    approved,
    created_by,
    approved_by,
    approved_at
  ) values (
    p_org_id,
    p_staff_member_id,
    p_start_date,
    p_end_date,
    p_type,
    p_notes,
    p_approved,
    auth.uid(),
    case when p_approved then auth.uid() else null end,
    case when p_approved then timezone('utc', now()) else null end
  )
  returning id into v_id;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."request_time_off"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_notes" "text", "p_approved" boolean) OWNER TO "postgres";

--
-- Name: reserved_qty_by_window("uuid", "uuid", "uuid"[], timestamp with time zone, timestamp with time zone, "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."reserved_qty_by_window"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_item_ids" "uuid"[], "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone, "p_exclude_event_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("supplier_item_id" "uuid", "reserved_qty" numeric)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  with windows as (
    select
      sr.id,
      srl.supplier_item_id,
      srl.qty,
      es.starts_at,
      coalesce(es.ends_at, es.starts_at + interval '2 hours') as ends_at
    from public.stock_reservations sr
    join public.stock_reservation_lines srl on srl.reservation_id = sr.id
    join public.event_services es on es.id = sr.event_service_id or es.event_id = sr.event_id
    where sr.org_id = p_org_id
      and sr.hotel_id = p_hotel_id
      and sr.status = 'active'
      and srl.supplier_item_id = any(p_item_ids)
      and (p_exclude_event_id is null or sr.event_id <> p_exclude_event_id)
  )
  select supplier_item_id, sum(qty) as reserved_qty
  from windows
  where tstzrange(windows.starts_at, windows.ends_at, '[)') && tstzrange(p_window_start, p_window_end, '[)')
  group by supplier_item_id;
$$;


ALTER FUNCTION "public"."reserved_qty_by_window"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_item_ids" "uuid"[], "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone, "p_exclude_event_id" "uuid") OWNER TO "postgres";

--
-- Name: round_qty(numeric, "text", numeric); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."round_qty"("p_qty" numeric, "p_rounding_rule" "text", "p_pack_size" numeric) RETURNS numeric
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select case
    when p_rounding_rule = 'ceil_pack' and p_pack_size is not null and p_pack_size > 0
      then ceil(p_qty / p_pack_size) * p_pack_size
    when p_rounding_rule = 'ceil_unit'
      then ceil(p_qty)
    else p_qty
  end;
$$;


ALTER FUNCTION "public"."round_qty"("p_qty" numeric, "p_rounding_rule" "text", "p_pack_size" numeric) OWNER TO "postgres";

--
-- Name: set_created_by_and_validate_attachment(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."set_created_by_and_validate_attachment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  ev_org uuid;
begin
  select org_id into ev_org from public.events where id = new.event_id;
  if ev_org is null then
    raise exception 'event not found';
  end if;
  if ev_org <> new.org_id then
    raise exception 'attachment org mismatch';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_created_by_and_validate_attachment"() OWNER TO "postgres";

--
-- Name: set_created_by_and_validate_ocr_job(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."set_created_by_and_validate_ocr_job"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  att_org uuid;
begin
  select org_id into att_org from public.event_attachments where id = new.attachment_id;
  if att_org is null then
    raise exception 'attachment not found';
  end if;
  if att_org <> new.org_id then
    raise exception 'ocr job org mismatch';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_created_by_and_validate_ocr_job"() OWNER TO "postgres";

--
-- Name: space_booking_overlaps("uuid", timestamp with time zone, timestamp with time zone, "uuid"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."space_booking_overlaps"("p_space_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_exclude_booking_id" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "sql"
    AS $$
  select exists (
    select 1 from public.space_bookings b
    where b.space_id = p_space_id
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and not (b.ends_at <= p_starts_at or b.starts_at >= p_ends_at)
  );
$$;


ALTER FUNCTION "public"."space_booking_overlaps"("p_space_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_exclude_booking_id" "uuid") OWNER TO "postgres";

--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";

--
-- Name: update_line_total(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."update_line_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.line_total := coalesce(new.requested_qty, 0) * coalesce(new.unit_price, 0);
  return new;
end;
$$;


ALTER FUNCTION "public"."update_line_total"() OWNER TO "postgres";

--
-- Name: validate_added_item(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_added_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  svc_org uuid;
begin
  select org_id into svc_org from public.event_services where id = new.event_service_id;
  if svc_org is null then
    raise exception 'event service not found';
  end if;
  if svc_org <> new.org_id then
    raise exception 'added item org mismatch';
  end if;
  if new.rounding_rule = 'ceil_pack' and (new.pack_size is null or new.pack_size <= 0) then
    raise exception 'pack_size required for ceil_pack';
  end if;
  if coalesce(new.qty_per_pax_seated,0) = 0 and coalesce(new.qty_per_pax_standing,0) = 0 then
    raise exception 'at least one qty_per_pax > 0';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_added_item"() OWNER TO "postgres";

--
-- Name: validate_booking_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_booking_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  ev_org uuid;
  ev_hotel uuid;
  space_org uuid;
  space_hotel uuid;
begin
  select org_id, hotel_id into ev_org, ev_hotel from public.events where id = new.event_id;
  if ev_org is null then
    raise exception 'event not found';
  end if;
  if new.org_id <> ev_org then
    raise exception 'booking org mismatch with event';
  end if;

  select org_id, hotel_id into space_org, space_hotel from public.spaces where id = new.space_id;
  if space_org is null then
    raise exception 'space not found';
  end if;
  if space_org <> ev_org then
    raise exception 'booking space org mismatch';
  end if;
  if space_hotel <> ev_hotel then
    raise exception 'booking must use space from same hotel as event';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_booking_consistency"() OWNER TO "postgres";

--
-- Name: validate_event_org_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_event_org_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  hotel_org uuid;
begin
  select org_id into hotel_org from public.hotels where id = new.hotel_id;
  if hotel_org is null then
    raise exception 'hotel not found';
  end if;
  if hotel_org <> new.org_id then
    raise exception 'event org mismatch with hotel';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_event_org_consistency"() OWNER TO "postgres";

--
-- Name: validate_event_po_line(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_event_po_line"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  po_org uuid;
  sup_org uuid;
begin
  select org_id into po_org from public.event_purchase_orders where id = new.event_purchase_order_id;
  select org_id into sup_org from public.suppliers s join public.supplier_items si on si.supplier_id = s.id where si.id = new.supplier_item_id;
  if po_org is null or sup_org is null then
    raise exception 'order or supplier item missing';
  end if;
  if po_org <> new.org_id or sup_org <> new.org_id then
    raise exception 'org mismatch in order lines';
  end if;
  if new.unit_price is null then
    new.line_total := 0;
  else
    new.line_total := coalesce(new.qty,0) * new.unit_price;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_event_po_line"() OWNER TO "postgres";

--
-- Name: validate_event_purchase_order(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_event_purchase_order"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  ev_org uuid;
  sup_org uuid;
  hotel_org uuid;
  svc_org uuid;
  svc_event uuid;
begin
  select org_id into ev_org from public.events where id = new.event_id;
  select org_id into sup_org from public.suppliers where id = new.supplier_id;
  select org_id into hotel_org from public.hotels where id = new.hotel_id;
  if ev_org is null or sup_org is null or hotel_org is null then
    raise exception 'event/supplier/hotel not found';
  end if;
  if ev_org <> new.org_id or sup_org <> new.org_id or hotel_org <> new.org_id then
    raise exception 'org mismatch in event_purchase_orders';
  end if;
  if new.event_service_id is not null then
    select org_id, event_id into svc_org, svc_event from public.event_services where id = new.event_service_id;
    if svc_org is null then
      raise exception 'event service not found';
    end if;
    if svc_org <> new.org_id then
      raise exception 'event service org mismatch';
    end if;
    if svc_event <> new.event_id then
      raise exception 'event service mismatch with event';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_event_purchase_order"() OWNER TO "postgres";

--
-- Name: validate_event_service(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_event_service"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  ev_org uuid;
begin
  select org_id into ev_org from public.events where id = new.event_id;
  if ev_org is null then
    raise exception 'event not found';
  end if;
  if new.org_id <> ev_org then
    raise exception 'event service org mismatch';
  end if;
  if new.ends_at is not null and new.ends_at <= new.starts_at then
    raise exception 'service end must be after start';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_event_service"() OWNER TO "postgres";

--
-- Name: validate_event_service_menu(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_event_service_menu"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  service_org uuid;
  template_org uuid;
begin
  select org_id into service_org from public.event_services where id = new.event_service_id;
  if service_org is null then
    raise exception 'event service not found';
  end if;
  if new.org_id <> service_org then
    raise exception 'service menu org mismatch';
  end if;
  select org_id into template_org from public.menu_templates where id = new.template_id;
  if template_org is null then
    raise exception 'template not found';
  end if;
  if template_org <> service_org then
    raise exception 'template org mismatch with service';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_event_service_menu"() OWNER TO "postgres";

--
-- Name: validate_ingredient_product(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_ingredient_product"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  prod_org uuid;
begin
  if new.product_id is null then
    return new;
  end if;
  select org_id into prod_org from public.products where id = new.product_id;
  if prod_org is null then
    raise exception 'product not found for ingredient';
  end if;
  if prod_org <> new.org_id then
    raise exception 'org mismatch between ingredient and product';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_ingredient_product"() OWNER TO "postgres";

--
-- Name: validate_menu_item_alias(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_menu_item_alias"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  sup_org uuid;
begin
  select s.org_id into sup_org from public.suppliers s join public.supplier_items si on si.supplier_id = s.id where si.id = new.supplier_item_id;
  if sup_org is null then
    raise exception 'supplier item not found';
  end if;
  if sup_org <> new.org_id then
    raise exception 'org mismatch in alias';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_menu_item_alias"() OWNER TO "postgres";

--
-- Name: validate_menu_template_item(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_menu_template_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  tmpl_org uuid;
begin
  select org_id into tmpl_org from public.menu_templates where id = new.template_id;
  if tmpl_org is null then
    raise exception 'template not found';
  end if;
  if tmpl_org <> new.org_id then
    raise exception 'template item org mismatch';
  end if;
  if new.rounding_rule = 'ceil_pack' and (new.pack_size is null or new.pack_size <= 0) then
    raise exception 'pack_size required for ceil_pack';
  end if;
  if coalesce(new.qty_per_pax_seated,0) = 0 and coalesce(new.qty_per_pax_standing,0) = 0 then
    raise exception 'at least one qty_per_pax must be > 0';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_menu_template_item"() OWNER TO "postgres";

--
-- Name: validate_note_service(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_note_service"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  svc_org uuid;
begin
  select org_id into svc_org from public.event_services where id = new.event_service_id;
  if svc_org is null then
    raise exception 'event service not found';
  end if;
  if svc_org <> new.org_id then
    raise exception 'note org mismatch';
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_note_service"() OWNER TO "postgres";

--
-- Name: validate_override_service_and_template(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_override_service_and_template"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  svc_org uuid;
  tmpl_org uuid;
begin
  select org_id into svc_org from public.event_services where id = new.event_service_id;
  if svc_org is null then
    raise exception 'event service not found';
  end if;
  if svc_org <> new.org_id then
    raise exception 'override org mismatch with service';
  end if;
  if tg_table_name in ('event_service_excluded_items', 'event_service_replaced_items') then
    select org_id into tmpl_org from public.menu_template_items where id = new.template_item_id;
    if tmpl_org is null then
      raise exception 'template item not found';
    end if;
    if tmpl_org <> svc_org then
      raise exception 'template item org mismatch';
    end if;
  end if;
  if tg_op = 'INSERT' and new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_override_service_and_template"() OWNER TO "postgres";

--
-- Name: validate_po_org_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_po_org_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if not exists (select 1 from public.hotels h where h.id = new.hotel_id and h.org_id = new.org_id) then
    raise exception 'hotel/org mismatch';
  end if;
  if not exists (select 1 from public.suppliers s where s.id = new.supplier_id and s.org_id = new.org_id) then
    raise exception 'supplier/org mismatch';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_po_org_consistency"() OWNER TO "postgres";

--
-- Name: validate_pol_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_pol_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  po_org uuid;
  po_hotel uuid;
  ing_org uuid;
  ing_hotel uuid;
begin
  select org_id, hotel_id into po_org, po_hotel from public.purchase_orders where id = new.purchase_order_id;
  if po_org is null then
    raise exception 'purchase order missing';
  end if;
  if new.org_id <> po_org then
    raise exception 'line org mismatch with PO';
  end if;
  select org_id, hotel_id into ing_org, ing_hotel from public.ingredients where id = new.ingredient_id;
  if ing_org is null then
    raise exception 'ingredient missing';
  end if;
  if ing_org <> po_org then
    raise exception 'ingredient org mismatch';
  end if;
  if ing_hotel <> po_hotel then
    raise exception 'ingredient hotel must match PO hotel';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_pol_consistency"() OWNER TO "postgres";

--
-- Name: validate_production_plan(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_production_plan"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  svc_org uuid;
  svc_event uuid;
  ev_hotel uuid;
begin
  select org_id, event_id into svc_org, svc_event from public.event_services where id = new.event_service_id;
  if svc_org is null then
    raise exception 'event service not found';
  end if;
  select hotel_id into ev_hotel from public.events where id = svc_event;
  if svc_event <> new.event_id or svc_org <> new.org_id then
    raise exception 'production plan org/event mismatch';
  end if;
  if new.hotel_id is null then
    new.hotel_id := ev_hotel;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_production_plan"() OWNER TO "postgres";

--
-- Name: validate_recipe_line(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_recipe_line"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  recipe_org uuid;
  product_org uuid;
  product_unit text;
begin
  select org_id into recipe_org from public.recipes where id = new.recipe_id;
  select org_id, base_unit into product_org, product_unit from public.products where id = new.product_id;
  if recipe_org is null or product_org is null then
    raise exception 'recipe or product missing for recipe_line';
  end if;
  if recipe_org <> new.org_id or product_org <> new.org_id then
    raise exception 'org mismatch in recipe_line';
  end if;
  if product_unit is not null and product_unit <> new.unit then
    raise exception 'unit must match product base_unit';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_recipe_line"() OWNER TO "postgres";

--
-- Name: validate_service_menu_item(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_service_menu_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  sec_org uuid;
  rec_org uuid;
begin
  select org_id into sec_org from public.event_service_menu_sections where id = new.section_id;
  if sec_org is null then
    raise exception 'menu section not found';
  end if;
  if sec_org <> new.org_id then
    raise exception 'menu item org mismatch';
  end if;
  if new.recipe_id is not null then
    select org_id into rec_org from public.recipes where id = new.recipe_id;
    if rec_org is null then
      raise exception 'recipe not found';
    end if;
    if rec_org <> new.org_id then
      raise exception 'recipe org mismatch';
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_service_menu_item"() OWNER TO "postgres";

--
-- Name: validate_service_menu_section(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_service_menu_section"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  svc_org uuid;
begin
  select org_id into svc_org from public.event_services where id = new.event_service_id;
  if svc_org is null then
    raise exception 'event service not found';
  end if;
  if svc_org <> new.org_id then
    raise exception 'menu section org mismatch';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_service_menu_section"() OWNER TO "postgres";

--
-- Name: validate_shift_org(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_shift_org"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  hotel_org uuid;
begin
  select org_id into hotel_org from public.hotels where id = new.hotel_id;
  if hotel_org is null then
    raise exception 'hotel not found for shift';
  end if;
  if hotel_org <> new.org_id then
    raise exception 'org mismatch between shift and hotel';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_shift_org"() OWNER TO "postgres";

--
-- Name: validate_space_org_consistency(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_space_org_consistency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  hotel_org uuid;
begin
  select org_id into hotel_org from public.hotels where id = new.hotel_id;
  if hotel_org is null then
    raise exception 'hotel not found';
  end if;
  if hotel_org <> new.org_id then
    raise exception 'space org mismatch with hotel';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_space_org_consistency"() OWNER TO "postgres";

--
-- Name: validate_staff_assignment(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_staff_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  shift_rec record;
  staff_org uuid;
  exists_same_day uuid;
  has_timeoff uuid;
  prev_tarde uuid;
begin
  select org_id, hotel_id, shift_date, shift_type into shift_rec from public.shifts where id = coalesce(new.shift_id, old.shift_id);
  if shift_rec is null then
    raise exception 'shift not found';
  end if;
  if shift_rec.org_id <> new.org_id then
    raise exception 'org mismatch between assignment and shift';
  end if;
  select org_id into staff_org from public.staff_members where id = new.staff_member_id;
  if staff_org is null then
    raise exception 'staff not found';
  end if;
  if staff_org <> new.org_id then
    raise exception 'org mismatch between assignment and staff';
  end if;

  select sa.id
  into exists_same_day
  from public.staff_assignments sa
  join public.shifts s on s.id = sa.shift_id
  where sa.staff_member_id = new.staff_member_id
    and s.hotel_id = shift_rec.hotel_id
    and s.shift_date = shift_rec.shift_date
    and sa.id <> coalesce(new.id, old.id)
  limit 1;

  if exists_same_day is not null then
    raise exception 'staff already assigned that day';
  end if;

  select id
  into has_timeoff
  from public.staff_time_off t
  where t.staff_member_id = new.staff_member_id
    and t.approved = true
    and shift_rec.shift_date between t.start_date and t.end_date
  limit 1;
  if has_timeoff is not null then
    raise exception 'staff unavailable (time off)';
  end if;

  if shift_rec.shift_type = 'mañana' then
    select sa.id
    into prev_tarde
    from public.staff_assignments sa
    join public.shifts s on s.id = sa.shift_id
    where sa.staff_member_id = new.staff_member_id
      and s.hotel_id = shift_rec.hotel_id
      and s.shift_date = shift_rec.shift_date - interval '1 day'
      and s.shift_type = 'tarde'
    limit 1;
    if prev_tarde is not null then
      raise exception 'rest violation: tarde->mañana';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_staff_assignment"() OWNER TO "postgres";

--
-- Name: validate_staff_member(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_staff_member"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  hotel_org uuid;
begin
  if new.home_hotel_id is null then
    return new;
  end if;
  select org_id into hotel_org from public.hotels where id = new.home_hotel_id;
  if hotel_org is null then
    raise exception 'hotel not found for staff';
  end if;
  if hotel_org <> new.org_id then
    raise exception 'org mismatch between staff and hotel';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_staff_member"() OWNER TO "postgres";

--
-- Name: validate_stock_reservation(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_stock_reservation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  ev_org uuid;
  ev_hotel uuid;
begin
  select org_id, hotel_id into ev_org, ev_hotel from public.events where id = new.event_id;
  if ev_org is null then
    raise exception 'event not found';
  end if;
  if new.org_id <> ev_org then
    raise exception 'org mismatch for reservation';
  end if;
  if new.hotel_id is null then
    new.hotel_id := ev_hotel;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_stock_reservation"() OWNER TO "postgres";

--
-- Name: validate_supplier_item_product(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_supplier_item_product"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  sup_org uuid;
  prod_org uuid;
begin
  if new.product_id is null then
    return new;
  end if;
  select s.org_id into sup_org from public.suppliers s where s.id = new.supplier_id;
  select org_id into prod_org from public.products where id = new.product_id;
  if sup_org is null or prod_org is null then
    raise exception 'supplier or product not found';
  end if;
  if sup_org <> prod_org then
    raise exception 'org mismatch between supplier_item and product';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_supplier_item_product"() OWNER TO "postgres";

--
-- Name: validate_supplier_lead_time(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."validate_supplier_lead_time"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."validate_supplier_lead_time"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: ai_briefs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."ai_briefs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "period" "text" NOT NULL,
    "content_md" "text" NOT NULL,
    "sources" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_briefs_period_check" CHECK (("period" = ANY (ARRAY['today'::"text", 'tomorrow'::"text", 'week'::"text"])))
);


ALTER TABLE "public"."ai_briefs" OWNER TO "postgres";

--
-- Name: ai_features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."ai_features" (
    "key" "text" NOT NULL,
    "min_plan" "text" NOT NULL,
    "min_role" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_features_min_plan_check" CHECK (("min_plan" = ANY (ARRAY['basic'::"text", 'pro'::"text", 'vip'::"text"]))),
    CONSTRAINT "ai_features_min_role_check" CHECK (("min_role" = ANY (ARRAY['staff'::"text", 'manager'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."ai_features" OWNER TO "postgres";

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid",
    "user_id" "uuid",
    "level" "text" NOT NULL,
    "event" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";

--
-- Name: dashboard_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."dashboard_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "week_start" "date" NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."dashboard_notes" OWNER TO "postgres";

--
-- Name: event_service_menus; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_service_menus" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_service_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."event_service_menus" OWNER TO "postgres";

--
-- Name: event_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "service_type" "text" NOT NULL,
    "format" "text" NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "ends_at" timestamp with time zone,
    "pax" integer NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "event_services_format_check" CHECK (("format" = ANY (ARRAY['sentado'::"text", 'de_pie'::"text"]))),
    CONSTRAINT "event_services_pax_check" CHECK (("pax" >= 0)),
    CONSTRAINT "event_services_service_type_check" CHECK (("service_type" = ANY (ARRAY['desayuno'::"text", 'coffee_break'::"text", 'comida'::"text", 'merienda'::"text", 'cena'::"text", 'coctel'::"text", 'otros'::"text"])))
);


ALTER TABLE "public"."event_services" OWNER TO "postgres";

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "client_name" "text",
    "status" "text" NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "name" "text",
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'confirmed'::"text", 'in_production'::"text", 'closed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "status" "public"."purchase_order_status" NOT NULL,
    "order_number" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "confirmed_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "total_estimated" numeric DEFAULT 0 NOT NULL,
    "approval_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approved_at" timestamp with time zone,
    "ordered_at" timestamp with time zone,
    "received_state" "public"."purchase_order_received_state" DEFAULT 'none'::"public"."purchase_order_received_state" NOT NULL
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";

--
-- Name: dashboard_purchase_event_metrics; Type: VIEW; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW "public"."dashboard_purchase_event_metrics" WITH ("security_invoker"='true') AS
 WITH "event_metrics" AS (
         SELECT "e"."org_id",
            "e"."hotel_id",
            ("date_trunc"('day'::"text", "e"."starts_at"))::"date" AS "day",
            "count"(DISTINCT "e"."id") AS "events_count",
            "count"(DISTINCT "e"."id") FILTER (WHERE ("esm"."event_service_id" IS NOT NULL)) AS "confirmed_menus"
           FROM (("public"."events" "e"
             LEFT JOIN "public"."event_services" "es" ON (("es"."event_id" = "e"."id")))
             LEFT JOIN "public"."event_service_menus" "esm" ON (("esm"."event_service_id" = "es"."id")))
          WHERE ("e"."starts_at" IS NOT NULL)
          GROUP BY "e"."org_id", "e"."hotel_id", (("date_trunc"('day'::"text", "e"."starts_at"))::"date")
        ), "purchase_metrics" AS (
         SELECT "po"."org_id",
            "po"."hotel_id",
            ("date_trunc"('day'::"text", "po"."created_at"))::"date" AS "day",
            "count"(*) FILTER (WHERE ("po"."status" = ANY (ARRAY['draft'::"public"."purchase_order_status", 'approved'::"public"."purchase_order_status", 'ordered'::"public"."purchase_order_status"]))) AS "pending_orders",
            "count"(*) FILTER (WHERE ("po"."status" = 'received'::"public"."purchase_order_status")) AS "received_orders",
            COALESCE("sum"("po"."total_estimated"), (0)::numeric) AS "total_order_value",
            COALESCE("sum"("po"."total_estimated") FILTER (WHERE ("po"."status" = ANY (ARRAY['draft'::"public"."purchase_order_status", 'approved'::"public"."purchase_order_status", 'ordered'::"public"."purchase_order_status"]))), (0)::numeric) AS "pending_value",
            COALESCE("sum"("po"."total_estimated") FILTER (WHERE ("po"."status" = 'received'::"public"."purchase_order_status")), (0)::numeric) AS "received_value"
           FROM "public"."purchase_orders" "po"
          GROUP BY "po"."org_id", "po"."hotel_id", (("date_trunc"('day'::"text", "po"."created_at"))::"date")
        )
 SELECT COALESCE("pm"."org_id", "em"."org_id") AS "org_id",
    COALESCE("pm"."hotel_id", "em"."hotel_id") AS "hotel_id",
    COALESCE("pm"."day", "em"."day") AS "day",
    COALESCE("em"."events_count", (0)::bigint) AS "events_count",
    COALESCE("em"."confirmed_menus", (0)::bigint) AS "confirmed_menus",
    COALESCE("pm"."pending_orders", (0)::bigint) AS "pending_orders",
    COALESCE("pm"."received_orders", (0)::bigint) AS "received_orders",
    COALESCE("pm"."total_order_value", (0)::numeric) AS "total_order_value",
    COALESCE("pm"."pending_value", (0)::numeric) AS "pending_value",
    COALESCE("pm"."received_value", (0)::numeric) AS "received_value"
   FROM ("purchase_metrics" "pm"
     FULL JOIN "event_metrics" "em" ON ((("em"."org_id" = "pm"."org_id") AND ("em"."hotel_id" = "pm"."hotel_id") AND ("em"."day" = "pm"."day"))))
  WHERE "public"."is_org_member"(COALESCE("pm"."org_id", "em"."org_id"));


ALTER VIEW "public"."dashboard_purchase_event_metrics" OWNER TO "postgres";

--
-- Name: event_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "storage_bucket" "text" DEFAULT 'event-attachments'::"text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "original_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."event_attachments" OWNER TO "postgres";

--
-- Name: event_purchase_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_purchase_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "status" "public"."purchase_order_status" NOT NULL,
    "order_number" "text" NOT NULL,
    "total_estimated" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "approval_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "event_service_id" "uuid",
    "order_version_id" "uuid",
    "version_num" integer DEFAULT 1 NOT NULL,
    "version_reason" "text",
    "idempotency_key" "text",
    "is_current" boolean DEFAULT true NOT NULL,
    "product_type" "public"."product_type" DEFAULT 'fresh'::"public"."product_type" NOT NULL,
    "approved_at" timestamp with time zone,
    "ordered_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "received_state" "public"."purchase_order_received_state" DEFAULT 'none'::"public"."purchase_order_received_state" NOT NULL
);


ALTER TABLE "public"."event_purchase_orders" OWNER TO "postgres";

--
-- Name: supplier_lead_times; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."supplier_lead_times" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "product_type" "public"."product_type" NOT NULL,
    "lead_time_days" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "supplier_lead_times_lead_time_days_check" CHECK (("lead_time_days" >= 0))
);


ALTER TABLE "public"."supplier_lead_times" OWNER TO "postgres";

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "lead_time_days" integer DEFAULT 2 NOT NULL,
    CONSTRAINT "suppliers_lead_time_chk" CHECK (("lead_time_days" >= 0))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";

--
-- Name: event_purchase_order_deadlines; Type: VIEW; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW "public"."event_purchase_order_deadlines" AS
 SELECT "epo"."id" AS "event_purchase_order_id",
    "epo"."org_id",
    "epo"."hotel_id",
    "epo"."event_id",
    "epo"."supplier_id",
    "epo"."product_type",
    "epo"."status",
    "epo"."order_number",
    "ev"."starts_at",
    COALESCE("slt"."lead_time_days", "s"."lead_time_days", 2) AS "lead_time_days",
    ("ev"."starts_at" - "make_interval"("days" => COALESCE("slt"."lead_time_days", "s"."lead_time_days", 2))) AS "order_deadline_at",
    ("ev"."starts_at" - "make_interval"("days" => (COALESCE("slt"."lead_time_days", "s"."lead_time_days", 2) + 2))) AS "reminder_end_at",
    ("now"() <= ("ev"."starts_at" - "make_interval"("days" => (COALESCE("slt"."lead_time_days", "s"."lead_time_days", 2) + 2)))) AS "reminder_active"
   FROM ((("public"."event_purchase_orders" "epo"
     JOIN "public"."events" "ev" ON (("ev"."id" = "epo"."event_id")))
     JOIN "public"."suppliers" "s" ON (("s"."id" = "epo"."supplier_id")))
     LEFT JOIN "public"."supplier_lead_times" "slt" ON ((("slt"."supplier_id" = "epo"."supplier_id") AND ("slt"."product_type" = "epo"."product_type"))))
  WHERE ("epo"."status" = ANY (ARRAY['draft'::"public"."purchase_order_status", 'approved'::"public"."purchase_order_status", 'ordered'::"public"."purchase_order_status"]));


ALTER VIEW "public"."event_purchase_order_deadlines" OWNER TO "postgres";

--
-- Name: event_purchase_order_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_purchase_order_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_purchase_order_id" "uuid" NOT NULL,
    "supplier_item_id" "uuid" NOT NULL,
    "item_label" "text" NOT NULL,
    "qty" numeric NOT NULL,
    "purchase_unit" "text" NOT NULL,
    "unit_price" numeric,
    "line_total" numeric DEFAULT 0 NOT NULL,
    "freeze" boolean DEFAULT false NOT NULL,
    "buffer_percent" numeric DEFAULT 0 NOT NULL,
    "buffer_qty" numeric DEFAULT 0 NOT NULL,
    "gross_qty" numeric DEFAULT 0 NOT NULL,
    "on_hand_qty" numeric DEFAULT 0 NOT NULL,
    "on_order_qty" numeric DEFAULT 0 NOT NULL,
    "net_qty" numeric DEFAULT 0 NOT NULL,
    "rounded_qty" numeric DEFAULT 0 NOT NULL,
    "unit_mismatch" boolean DEFAULT false NOT NULL,
    CONSTRAINT "event_purchase_order_lines_purchase_unit_check" CHECK (("purchase_unit" = ANY (ARRAY['kg'::"text", 'ud'::"text"]))),
    CONSTRAINT "event_purchase_order_lines_qty_check" CHECK (("qty" >= (0)::numeric))
);


ALTER TABLE "public"."event_purchase_order_lines" OWNER TO "postgres";

--
-- Name: space_bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."space_bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "group_label" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "space_bookings_check" CHECK (("ends_at" > "starts_at"))
);


ALTER TABLE "public"."space_bookings" OWNER TO "postgres";

--
-- Name: spaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "capacity" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "spaces_capacity_check" CHECK (("capacity" >= 0))
);


ALTER TABLE "public"."spaces" OWNER TO "postgres";

--
-- Name: event_room_schedule; Type: VIEW; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW "public"."event_room_schedule" WITH ("security_invoker"='true') AS
 SELECT "e"."org_id",
    "e"."hotel_id",
    ("date_trunc"('day'::"text", "sb"."starts_at"))::"date" AS "event_date",
    "s"."name" AS "room_name",
    "count"(*) AS "event_count",
    "count"(*) FILTER (WHERE ("e"."status" <> ALL (ARRAY['cancelled'::"text", 'draft'::"text"]))) AS "confirmed_events",
    COALESCE("jsonb_agg"("jsonb_build_object"('event_id', "e"."id", 'title', "e"."title", 'status', "e"."status") ORDER BY "sb"."starts_at", "e"."title"), '[]'::"jsonb") AS "events"
   FROM (("public"."space_bookings" "sb"
     JOIN "public"."spaces" "s" ON ((("s"."id" = "sb"."space_id") AND ("s"."org_id" = "sb"."org_id"))))
     JOIN "public"."events" "e" ON ((("e"."id" = "sb"."event_id") AND ("e"."org_id" = "sb"."org_id"))))
  WHERE (("sb"."starts_at" IS NOT NULL) AND "public"."is_org_member"("e"."org_id"))
  GROUP BY "e"."org_id", "e"."hotel_id", (("date_trunc"('day'::"text", "sb"."starts_at"))::"date"), "s"."name";


ALTER VIEW "public"."event_room_schedule" OWNER TO "postgres";

--
-- Name: event_service_added_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_service_added_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_service_id" "uuid" NOT NULL,
    "section" "text",
    "name" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "qty_per_pax_seated" numeric DEFAULT 0 NOT NULL,
    "qty_per_pax_standing" numeric DEFAULT 0 NOT NULL,
    "rounding_rule" "text" NOT NULL,
    "pack_size" numeric,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "event_service_added_items_qty_per_pax_seated_check" CHECK (("qty_per_pax_seated" >= (0)::numeric)),
    CONSTRAINT "event_service_added_items_qty_per_pax_standing_check" CHECK (("qty_per_pax_standing" >= (0)::numeric)),
    CONSTRAINT "event_service_added_items_rounding_rule_check" CHECK (("rounding_rule" = ANY (ARRAY['ceil_unit'::"text", 'ceil_pack'::"text", 'none'::"text"]))),
    CONSTRAINT "event_service_added_items_unit_check" CHECK (("unit" = ANY (ARRAY['ud'::"text", 'kg'::"text"])))
);


ALTER TABLE "public"."event_service_added_items" OWNER TO "postgres";

--
-- Name: event_service_excluded_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_service_excluded_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_service_id" "uuid" NOT NULL,
    "template_item_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."event_service_excluded_items" OWNER TO "postgres";

--
-- Name: event_service_menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_service_menu_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "section_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "recipe_id" "uuid",
    "requires_review" boolean DEFAULT true NOT NULL,
    "portion_multiplier" numeric DEFAULT 1 NOT NULL,
    CONSTRAINT "event_service_menu_items_portion_multiplier_check" CHECK (("portion_multiplier" > (0)::numeric))
);


ALTER TABLE "public"."event_service_menu_items" OWNER TO "postgres";

--
-- Name: event_service_menu_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_service_menu_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_service_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."event_service_menu_sections" OWNER TO "postgres";

--
-- Name: event_service_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_service_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_service_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."event_service_notes" OWNER TO "postgres";

--
-- Name: event_service_replaced_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."event_service_replaced_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_service_id" "uuid" NOT NULL,
    "template_item_id" "uuid" NOT NULL,
    "section" "text",
    "name" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "qty_per_pax_seated" numeric DEFAULT 0 NOT NULL,
    "qty_per_pax_standing" numeric DEFAULT 0 NOT NULL,
    "rounding_rule" "text" NOT NULL,
    "pack_size" numeric,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "event_service_replaced_items_qty_per_pax_seated_check" CHECK (("qty_per_pax_seated" >= (0)::numeric)),
    CONSTRAINT "event_service_replaced_items_qty_per_pax_standing_check" CHECK (("qty_per_pax_standing" >= (0)::numeric)),
    CONSTRAINT "event_service_replaced_items_rounding_rule_check" CHECK (("rounding_rule" = ANY (ARRAY['ceil_unit'::"text", 'ceil_pack'::"text", 'none'::"text"]))),
    CONSTRAINT "event_service_replaced_items_unit_check" CHECK (("unit" = ANY (ARRAY['ud'::"text", 'kg'::"text"])))
);


ALTER TABLE "public"."event_service_replaced_items" OWNER TO "postgres";

--
-- Name: expiry_alerts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."expiry_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "rule_id" "uuid" NOT NULL,
    "status" "public"."expiry_alert_status" DEFAULT 'open'::"public"."expiry_alert_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "sent_at" timestamp with time zone
);


ALTER TABLE "public"."expiry_alerts" OWNER TO "postgres";

--
-- Name: expiry_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."expiry_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "days_before" integer NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "product_type" "public"."product_type",
    CONSTRAINT "expiry_rules_days_before_check" CHECK (("days_before" >= 0))
);


ALTER TABLE "public"."expiry_rules" OWNER TO "postgres";

--
-- Name: hotels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."hotels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "city" "text",
    "country" "text",
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "hotels_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text"))
);


ALTER TABLE "public"."hotels" OWNER TO "postgres";

--
-- Name: import_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."import_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "entity" "text" NOT NULL,
    "status" "text" DEFAULT 'staged'::"text" NOT NULL,
    "filename" "text" NOT NULL,
    "summary" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "import_jobs_entity_check" CHECK (("entity" = ANY (ARRAY['suppliers'::"text", 'supplier_items'::"text", 'events'::"text"]))),
    CONSTRAINT "import_jobs_status_check" CHECK (("status" = ANY (ARRAY['staged'::"text", 'validated'::"text", 'committed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."import_jobs" OWNER TO "postgres";

--
-- Name: import_rows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."import_rows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "row_number" integer NOT NULL,
    "raw" "jsonb" NOT NULL,
    "normalized" "jsonb",
    "errors" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "action" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "import_rows_action_check" CHECK (("action" = ANY (ARRAY['insert'::"text", 'update'::"text", 'skip'::"text"])))
);


ALTER TABLE "public"."import_rows" OWNER TO "postgres";

--
-- Name: inbound_shipment_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."inbound_shipment_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "shipment_id" "uuid" NOT NULL,
    "supplier_item_id" "uuid",
    "description" "text" NOT NULL,
    "qty" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "lot_code" "text",
    "status" "public"."inbound_line_status" DEFAULT 'ready'::"public"."inbound_line_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "inbound_shipment_lines_qty_check" CHECK (("qty" >= (0)::numeric))
);


ALTER TABLE "public"."inbound_shipment_lines" OWNER TO "postgres";

--
-- Name: inbound_shipments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."inbound_shipments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "supplier_id" "uuid",
    "supplier_name" "text",
    "delivery_note_number" "text",
    "delivered_at" "date",
    "source" "public"."inbound_source" DEFAULT 'manual'::"public"."inbound_source" NOT NULL,
    "raw_ocr_text" "text",
    "file_url" "text",
    "dedupe_key" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."inbound_shipments" OWNER TO "postgres";

--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "base_unit" "text" NOT NULL,
    "stock" numeric DEFAULT 0 NOT NULL,
    "par_level" numeric,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "product_id" "uuid",
    CONSTRAINT "ingredients_base_unit_check" CHECK (("base_unit" = ANY (ARRAY['kg'::"text", 'ud'::"text"])))
);


ALTER TABLE "public"."ingredients" OWNER TO "postgres";

--
-- Name: inventory_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."inventory_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."inventory_locations" OWNER TO "postgres";

--
-- Name: menu_item_aliases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."menu_item_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "alias_text" "text" NOT NULL,
    "normalized" "text" NOT NULL,
    "supplier_item_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."menu_item_aliases" OWNER TO "postgres";

--
-- Name: menu_item_recipe_aliases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."menu_item_recipe_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "alias_name" "text" NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."menu_item_recipe_aliases" OWNER TO "postgres";

--
-- Name: menu_template_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."menu_template_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "section" "text",
    "name" "text" NOT NULL,
    "unit" "text" NOT NULL,
    "qty_per_pax_seated" numeric DEFAULT 0 NOT NULL,
    "qty_per_pax_standing" numeric DEFAULT 0 NOT NULL,
    "rounding_rule" "text" DEFAULT 'none'::"text" NOT NULL,
    "pack_size" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "menu_template_items_qty_per_pax_seated_check" CHECK (("qty_per_pax_seated" >= (0)::numeric)),
    CONSTRAINT "menu_template_items_qty_per_pax_standing_check" CHECK (("qty_per_pax_standing" >= (0)::numeric)),
    CONSTRAINT "menu_template_items_rounding_rule_check" CHECK (("rounding_rule" = ANY (ARRAY['ceil_unit'::"text", 'ceil_pack'::"text", 'none'::"text"]))),
    CONSTRAINT "menu_template_items_unit_check" CHECK (("unit" = ANY (ARRAY['ud'::"text", 'kg'::"text"])))
);


ALTER TABLE "public"."menu_template_items" OWNER TO "postgres";

--
-- Name: menu_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."menu_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" DEFAULT 'otros'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "type" "text",
    CONSTRAINT "menu_templates_category_check" CHECK (("category" = ANY (ARRAY['deportivo'::"text", 'turistico'::"text", 'empresa'::"text", 'coffee_break'::"text", 'coctel'::"text", 'otros'::"text"])))
);


ALTER TABLE "public"."menu_templates" OWNER TO "postgres";

--
-- Name: ocr_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."ocr_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "attachment_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "provider" "text" DEFAULT 'mock'::"text" NOT NULL,
    "extracted_text" "text",
    "draft_json" "jsonb",
    "error" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "ocr_jobs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'done'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."ocr_jobs" OWNER TO "postgres";

--
-- Name: order_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."order_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "event_service_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "version_num" integer NOT NULL,
    "version_reason" "text",
    "idempotency_key" "text",
    "is_current" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "order_versions_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['production'::"text", 'purchase'::"text"])))
);


ALTER TABLE "public"."order_versions" OWNER TO "postgres";

--
-- Name: org_memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."org_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'manager'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    CONSTRAINT "org_memberships_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'staff'::"text"])))
);


ALTER TABLE "public"."org_memberships" OWNER TO "postgres";

--
-- Name: org_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."org_plans" (
    "org_id" "uuid" NOT NULL,
    "plan" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "org_plans_plan_check" CHECK (("plan" = ANY (ARRAY['basic'::"text", 'pro'::"text", 'vip'::"text"])))
);


ALTER TABLE "public"."org_plans" OWNER TO "postgres";

--
-- Name: orgs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."orgs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."orgs" OWNER TO "postgres";

--
-- Name: preparation_process_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."preparation_process_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "process_type" "public"."preparation_process" NOT NULL,
    "shelf_life_days" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "preparation_process_rules_shelf_life_days_check" CHECK (("shelf_life_days" >= 0))
);


ALTER TABLE "public"."preparation_process_rules" OWNER TO "postgres";

--
-- Name: preparation_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."preparation_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "preparation_id" "uuid" NOT NULL,
    "produced_qty" numeric NOT NULL,
    "produced_unit" "text" NOT NULL,
    "produced_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "expires_at" timestamp with time zone,
    "location_id" "uuid" NOT NULL,
    "stock_batch_id" "uuid",
    "labels_count" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "process_type" "public"."preparation_process" DEFAULT 'cooked'::"public"."preparation_process" NOT NULL
);


ALTER TABLE "public"."preparation_runs" OWNER TO "postgres";

--
-- Name: preparations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."preparations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "default_yield_qty" numeric DEFAULT 0 NOT NULL,
    "default_yield_unit" "text" DEFAULT 'kg'::"text" NOT NULL,
    "shelf_life_days" integer DEFAULT 0 NOT NULL,
    "storage" "public"."storage_type" DEFAULT 'fridge'::"public"."storage_type" NOT NULL,
    "allergens" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "default_process_type" "public"."preparation_process" DEFAULT 'cooked'::"public"."preparation_process" NOT NULL
);


ALTER TABLE "public"."preparations" OWNER TO "postgres";

--
-- Name: product_barcodes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."product_barcodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "supplier_item_id" "uuid" NOT NULL,
    "barcode" "text" NOT NULL,
    "symbology" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."product_barcodes" OWNER TO "postgres";

--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "base_unit" "text" NOT NULL,
    "category" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "product_type" "public"."product_type" DEFAULT 'fresh'::"public"."product_type" NOT NULL,
    "lead_time_days" integer DEFAULT 2 NOT NULL,
    CONSTRAINT "products_base_unit_check" CHECK (("base_unit" = ANY (ARRAY['kg'::"text", 'ud'::"text"]))),
    CONSTRAINT "products_lead_time_chk" CHECK (("lead_time_days" >= 0))
);


ALTER TABLE "public"."products" OWNER TO "postgres";

--
-- Name: purchase_order_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."purchase_order_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "purchase_order_id" "uuid" NOT NULL,
    "supplier_item_id" "uuid" NOT NULL,
    "ingredient_id" "uuid" NOT NULL,
    "requested_qty" numeric NOT NULL,
    "received_qty" numeric DEFAULT 0 NOT NULL,
    "purchase_unit" "text" NOT NULL,
    "rounding_rule" "text" NOT NULL,
    "pack_size" numeric,
    "unit_price" numeric,
    "line_total" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "purchase_order_lines_purchase_unit_check" CHECK (("purchase_unit" = ANY (ARRAY['kg'::"text", 'ud'::"text"]))),
    CONSTRAINT "purchase_order_lines_received_qty_check" CHECK (("received_qty" >= (0)::numeric)),
    CONSTRAINT "purchase_order_lines_requested_qty_check" CHECK (("requested_qty" >= (0)::numeric)),
    CONSTRAINT "purchase_order_lines_rounding_rule_check" CHECK (("rounding_rule" = ANY (ARRAY['ceil_pack'::"text", 'ceil_unit'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."purchase_order_lines" OWNER TO "postgres";

--
-- Name: supplier_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."supplier_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "purchase_unit" "text" NOT NULL,
    "pack_size" numeric,
    "rounding_rule" "text" NOT NULL,
    "price_per_unit" numeric,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "product_id" "uuid",
    "is_primary" boolean DEFAULT false NOT NULL,
    "product_type_override" "public"."product_type",
    "lead_time_days_override" integer,
    CONSTRAINT "pack_rounding_check" CHECK (((("rounding_rule" = 'ceil_pack'::"text") AND ("pack_size" IS NOT NULL) AND ("pack_size" > (0)::numeric)) OR ("rounding_rule" <> 'ceil_pack'::"text"))),
    CONSTRAINT "supplier_items_lead_time_override_chk" CHECK ((("lead_time_days_override" IS NULL) OR ("lead_time_days_override" >= 0))),
    CONSTRAINT "supplier_items_primary_requires_product" CHECK ((("is_primary" = false) OR ("product_id" IS NOT NULL))),
    CONSTRAINT "supplier_items_purchase_unit_check" CHECK (("purchase_unit" = ANY (ARRAY['kg'::"text", 'ud'::"text"]))),
    CONSTRAINT "supplier_items_rounding_rule_check" CHECK (("rounding_rule" = ANY (ARRAY['ceil_pack'::"text", 'ceil_unit'::"text", 'none'::"text"])))
);


ALTER TABLE "public"."supplier_items" OWNER TO "postgres";

--
-- Name: product_weighted_costs; Type: VIEW; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW "public"."product_weighted_costs" WITH ("security_invoker"='true') AS
 SELECT "p"."org_id",
    "p"."id" AS "product_id",
    "p"."base_unit",
        CASE
            WHEN ("sum"("pol"."received_qty") FILTER (WHERE (("po"."status" = 'received'::"public"."purchase_order_status") AND ("pol"."unit_price" IS NOT NULL) AND ("pol"."received_qty" > (0)::numeric) AND ("pol"."purchase_unit" = "p"."base_unit"))) > (0)::numeric) THEN ("sum"(("pol"."received_qty" * "pol"."unit_price")) FILTER (WHERE (("po"."status" = 'received'::"public"."purchase_order_status") AND ("pol"."unit_price" IS NOT NULL) AND ("pol"."received_qty" > (0)::numeric) AND ("pol"."purchase_unit" = "p"."base_unit"))) / NULLIF("sum"("pol"."received_qty") FILTER (WHERE (("po"."status" = 'received'::"public"."purchase_order_status") AND ("pol"."unit_price" IS NOT NULL) AND ("pol"."received_qty" > (0)::numeric) AND ("pol"."purchase_unit" = "p"."base_unit"))), (0)::numeric))
            ELSE NULL::numeric
        END AS "unit_cost",
    "max"("pol"."unit_price") FILTER (WHERE (("po"."status" = 'received'::"public"."purchase_order_status") AND ("pol"."unit_price" IS NOT NULL) AND ("pol"."purchase_unit" = "p"."base_unit"))) AS "last_unit_price",
    "max"("po"."received_at") FILTER (WHERE ("po"."status" = 'received'::"public"."purchase_order_status")) AS "last_received_at"
   FROM ((("public"."products" "p"
     LEFT JOIN "public"."supplier_items" "si" ON (("si"."product_id" = "p"."id")))
     LEFT JOIN "public"."purchase_order_lines" "pol" ON (("pol"."supplier_item_id" = "si"."id")))
     LEFT JOIN "public"."purchase_orders" "po" ON (("po"."id" = "pol"."purchase_order_id")))
  WHERE "public"."is_org_member"("p"."org_id")
  GROUP BY "p"."org_id", "p"."id", "p"."base_unit";


ALTER VIEW "public"."product_weighted_costs" OWNER TO "postgres";

--
-- Name: production_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."production_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "event_id" "uuid" NOT NULL,
    "event_service_id" "uuid" NOT NULL,
    "status" "public"."production_plan_status" DEFAULT 'draft'::"public"."production_plan_status" NOT NULL,
    "generated_from" "public"."production_plan_source" DEFAULT 'manual'::"public"."production_plan_source" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "order_version_id" "uuid",
    "version_num" integer DEFAULT 1 NOT NULL,
    "version_reason" "text",
    "idempotency_key" "text",
    "is_current" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."production_plans" OWNER TO "postgres";

--
-- Name: production_tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."production_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "station" "public"."production_station" NOT NULL,
    "title" "text" NOT NULL,
    "due_at" timestamp with time zone,
    "assignee_staff_id" "uuid",
    "priority" integer DEFAULT 3 NOT NULL,
    "status" "public"."production_task_status" DEFAULT 'todo'::"public"."production_task_status" NOT NULL,
    "blocked_reason" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "planned_qty" numeric,
    "unit" "text",
    "recipe_id" "uuid",
    CONSTRAINT "production_tasks_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 5)))
);


ALTER TABLE "public"."production_tasks" OWNER TO "postgres";

--
-- Name: purchasing_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."purchasing_settings" (
    "org_id" "uuid" NOT NULL,
    "default_buffer_percent" numeric DEFAULT 0 NOT NULL,
    "default_buffer_qty" numeric DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "consider_reservations" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."purchasing_settings" OWNER TO "postgres";

--
-- Name: recipe_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."recipe_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "qty" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "recipe_lines_qty_check" CHECK (("qty" >= (0)::numeric)),
    CONSTRAINT "recipe_lines_unit_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'ud'::"text"])))
);


ALTER TABLE "public"."recipe_lines" OWNER TO "postgres";

--
-- Name: recipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "default_servings" integer DEFAULT 1 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    CONSTRAINT "recipes_default_servings_check" CHECK (("default_servings" > 0))
);


ALTER TABLE "public"."recipes" OWNER TO "postgres";

--
-- Name: recipe_cost_breakdown; Type: VIEW; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW "public"."recipe_cost_breakdown" WITH ("security_invoker"='true') AS
 SELECT "r"."org_id",
    "r"."id" AS "recipe_id",
    "rl"."id" AS "line_id",
    "rl"."product_id",
    "p"."name" AS "product_name",
    "rl"."qty",
    "rl"."unit",
    "si"."id" AS "supplier_item_id",
    COALESCE("si"."purchase_unit", "p"."base_unit") AS "purchase_unit",
    COALESCE("pwc"."unit_cost", "si"."price_per_unit") AS "price_per_unit",
    (COALESCE("pwc"."unit_cost", "si"."price_per_unit") IS NULL) AS "missing_price",
    (("p"."base_unit" IS NULL) OR ("p"."base_unit" <> "rl"."unit")) AS "unit_mismatch",
        CASE
            WHEN (("p"."base_unit" IS NULL) OR ("p"."base_unit" <> "rl"."unit")) THEN NULL::numeric
            WHEN (COALESCE("pwc"."unit_cost", "si"."price_per_unit") IS NULL) THEN NULL::numeric
            ELSE ("rl"."qty" * COALESCE("pwc"."unit_cost", "si"."price_per_unit"))
        END AS "line_cost"
   FROM (((("public"."recipes" "r"
     JOIN "public"."recipe_lines" "rl" ON (("rl"."recipe_id" = "r"."id")))
     JOIN "public"."products" "p" ON (("p"."id" = "rl"."product_id")))
     LEFT JOIN "public"."product_weighted_costs" "pwc" ON (("pwc"."product_id" = "rl"."product_id")))
     LEFT JOIN "public"."supplier_items" "si" ON ((("si"."product_id" = "rl"."product_id") AND ("si"."is_primary" = true))))
  WHERE "public"."is_org_member"("r"."org_id");


ALTER VIEW "public"."recipe_cost_breakdown" OWNER TO "postgres";

--
-- Name: recipe_cost_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW "public"."recipe_cost_summary" WITH ("security_invoker"='true') AS
 SELECT "r"."org_id",
    "r"."id" AS "recipe_id",
    "r"."default_servings",
    COALESCE("sum"("b"."line_cost"), (0)::numeric) AS "total_cost",
        CASE
            WHEN ("r"."default_servings" > 0) THEN (COALESCE("sum"("b"."line_cost"), (0)::numeric) / ("r"."default_servings")::numeric)
            ELSE (0)::numeric
        END AS "cost_per_serving",
    "count"(*) FILTER (WHERE "b"."missing_price") AS "missing_prices",
    "count"(*) FILTER (WHERE "b"."unit_mismatch") AS "unit_mismatches"
   FROM ("public"."recipes" "r"
     LEFT JOIN "public"."recipe_cost_breakdown" "b" ON (("b"."recipe_id" = "r"."id")))
  WHERE "public"."is_org_member"("r"."org_id")
  GROUP BY "r"."org_id", "r"."id", "r"."default_servings";


ALTER VIEW "public"."recipe_cost_summary" OWNER TO "postgres";

--
-- Name: recipe_production_meta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."recipe_production_meta" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "station" "public"."production_station" NOT NULL,
    "lead_time_minutes" integer DEFAULT 0 NOT NULL,
    "default_batch_size" numeric,
    "shelf_life_days" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."recipe_production_meta" OWNER TO "postgres";

--
-- Name: reporting_generated_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."reporting_generated_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "metrics_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "report_md" "text",
    "status" "text" DEFAULT 'generated'::"text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "reporting_generated_reports_status_check" CHECK (("status" = ANY (ARRAY['generating'::"text", 'generated'::"text", 'failed'::"text"]))),
    CONSTRAINT "reporting_generated_reports_type_check" CHECK (("type" = ANY (ARRAY['weekly'::"text", 'monthly'::"text", 'on_demand'::"text"])))
);


ALTER TABLE "public"."reporting_generated_reports" OWNER TO "postgres";

--
-- Name: scheduling_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."scheduling_rules" (
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "morning_required_weekday" integer DEFAULT 1 NOT NULL,
    "morning_required_weekend" integer DEFAULT 2 NOT NULL,
    "afternoon_required_daily" integer DEFAULT 1 NOT NULL,
    "enforce_two_consecutive_days_off" boolean DEFAULT true NOT NULL,
    "enforce_one_weekend_off_per_30d" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."scheduling_rules" OWNER TO "postgres";

--
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "shift_date" "date" NOT NULL,
    "shift_type" "text" NOT NULL,
    "starts_at" time without time zone NOT NULL,
    "ends_at" time without time zone NOT NULL,
    "required_count" integer DEFAULT 1 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "shifts_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "shifts_required_count_check" CHECK (("required_count" >= 0)),
    CONSTRAINT "shifts_shift_type_check" CHECK (("shift_type" = ANY (ARRAY['desayuno'::"text", 'bar_tarde'::"text", 'eventos'::"text", 'produccion'::"text", 'libre'::"text", 'mañana'::"text", 'tarde'::"text"])))
);


ALTER TABLE "public"."shifts" OWNER TO "postgres";

--
-- Name: staff_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."staff_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "shift_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."staff_assignments" OWNER TO "postgres";

--
-- Name: staff_compensations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."staff_compensations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "extra_shift_id" "uuid",
    "hours" numeric(6,2) NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "applied_at" "date",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "staff_compensations_hours_check" CHECK (("hours" > (0)::numeric)),
    CONSTRAINT "staff_compensations_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'applied'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."staff_compensations" OWNER TO "postgres";

--
-- Name: staff_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."staff_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "home_hotel_id" "uuid",
    "full_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "employment_type" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "shift_pattern" "text" DEFAULT 'rotativo'::"text" NOT NULL,
    "max_shifts_per_week" integer DEFAULT 5 NOT NULL,
    CONSTRAINT "staff_members_employment_type_check" CHECK (("employment_type" = ANY (ARRAY['fijo'::"text", 'eventual'::"text", 'extra'::"text"]))),
    CONSTRAINT "staff_members_max_shifts_per_week_check" CHECK ((("max_shifts_per_week" >= 0) AND ("max_shifts_per_week" <= 7))),
    CONSTRAINT "staff_members_role_check" CHECK (("role" = ANY (ARRAY['jefe_cocina'::"text", 'cocinero'::"text", 'ayudante'::"text", 'pasteleria'::"text", 'office'::"text", 'otros'::"text"]))),
    CONSTRAINT "staff_shift_pattern_chk" CHECK (("shift_pattern" = ANY (ARRAY['mañana'::"text", 'tarde'::"text", 'rotativo'::"text"])))
);


ALTER TABLE "public"."staff_members" OWNER TO "postgres";

--
-- Name: staff_compensation_balances; Type: VIEW; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW "public"."staff_compensation_balances" WITH ("security_invoker"='true') AS
 SELECT "s"."org_id",
    "s"."id" AS "staff_member_id",
    COALESCE("sum"("c"."hours") FILTER (WHERE ("c"."status" = 'open'::"text")), (0)::numeric) AS "hours_open"
   FROM ("public"."staff_members" "s"
     LEFT JOIN "public"."staff_compensations" "c" ON (("c"."staff_member_id" = "s"."id")))
  WHERE "public"."is_org_member"("s"."org_id")
  GROUP BY "s"."org_id", "s"."id";


ALTER VIEW "public"."staff_compensation_balances" OWNER TO "postgres";

--
-- Name: staff_extra_shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."staff_extra_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "shift_id" "uuid",
    "shift_date" "date" NOT NULL,
    "hours" numeric(6,2) NOT NULL,
    "reason" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "staff_extra_shifts_hours_check" CHECK (("hours" > (0)::numeric))
);


ALTER TABLE "public"."staff_extra_shifts" OWNER TO "postgres";

--
-- Name: staff_time_off; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."staff_time_off" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "type" "text" NOT NULL,
    "approved" boolean DEFAULT true NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    CONSTRAINT "staff_time_off_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "staff_time_off_type_check" CHECK (("type" = ANY (ARRAY['vacaciones'::"text", 'permiso'::"text", 'baja'::"text", 'otros'::"text"])))
);


ALTER TABLE "public"."staff_time_off" OWNER TO "postgres";

--
-- Name: staff_vacation_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."staff_vacation_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "delta_days" integer NOT NULL,
    "reason" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."staff_vacation_adjustments" OWNER TO "postgres";

--
-- Name: staff_vacation_allowance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."staff_vacation_allowance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "days_total" integer DEFAULT 47 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "staff_vacation_allowance_days_total_check" CHECK (("days_total" >= 0))
);


ALTER TABLE "public"."staff_vacation_allowance" OWNER TO "postgres";

--
-- Name: staff_vacation_balances; Type: VIEW; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW "public"."staff_vacation_balances" WITH ("security_invoker"='true') AS
 WITH "vac_days" AS (
         SELECT "t"."staff_member_id",
            (EXTRACT(year FROM "d"."d"))::integer AS "year",
            ("count"(*))::integer AS "used_days"
           FROM ("public"."staff_time_off" "t"
             JOIN LATERAL "generate_series"(("t"."start_date")::timestamp with time zone, ("t"."end_date")::timestamp with time zone, '1 day'::interval) "d"("d") ON (true))
          WHERE (("t"."approved" = true) AND ("t"."type" = 'vacaciones'::"text"))
          GROUP BY "t"."staff_member_id", ((EXTRACT(year FROM "d"."d"))::integer)
        ), "adj" AS (
         SELECT "staff_vacation_adjustments"."staff_member_id",
            "staff_vacation_adjustments"."year",
            ("sum"("staff_vacation_adjustments"."delta_days"))::integer AS "delta_days"
           FROM "public"."staff_vacation_adjustments"
          GROUP BY "staff_vacation_adjustments"."staff_member_id", "staff_vacation_adjustments"."year"
        )
 SELECT "s"."org_id",
    "s"."id" AS "staff_member_id",
    COALESCE("a"."year", (EXTRACT(year FROM CURRENT_DATE))::integer) AS "year",
    (COALESCE("a"."days_total", 47) + COALESCE("adj"."delta_days", 0)) AS "days_total",
    COALESCE("vac_days"."used_days", 0) AS "days_used",
    ((COALESCE("a"."days_total", 47) + COALESCE("adj"."delta_days", 0)) - COALESCE("vac_days"."used_days", 0)) AS "days_remaining"
   FROM ((("public"."staff_members" "s"
     LEFT JOIN "public"."staff_vacation_allowance" "a" ON ((("a"."staff_member_id" = "s"."id") AND ("a"."year" = (EXTRACT(year FROM CURRENT_DATE))::integer))))
     LEFT JOIN "vac_days" ON ((("vac_days"."staff_member_id" = "s"."id") AND ("vac_days"."year" = (EXTRACT(year FROM CURRENT_DATE))::integer))))
     LEFT JOIN "adj" ON ((("adj"."staff_member_id" = "s"."id") AND ("adj"."year" = (EXTRACT(year FROM CURRENT_DATE))::integer))))
  WHERE "public"."is_org_member"("s"."org_id");


ALTER VIEW "public"."staff_vacation_balances" OWNER TO "postgres";

--
-- Name: stock_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."stock_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "supplier_item_id" "uuid",
    "qty" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "lot_code" "text",
    "source" "public"."stock_batch_source" DEFAULT 'purchase'::"public"."stock_batch_source" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid",
    "preparation_id" "uuid",
    CONSTRAINT "stock_batches_product_or_prep" CHECK ((("supplier_item_id" IS NOT NULL) OR ("preparation_id" IS NOT NULL))),
    CONSTRAINT "stock_batches_qty_check" CHECK (("qty" >= (0)::numeric)),
    CONSTRAINT "stock_batches_unit_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'ud'::"text"])))
);


ALTER TABLE "public"."stock_batches" OWNER TO "postgres";

--
-- Name: stock_levels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."stock_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "supplier_item_id" "uuid" NOT NULL,
    "on_hand_qty" numeric DEFAULT 0 NOT NULL,
    "unit" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "stock_levels_on_hand_qty_check" CHECK (("on_hand_qty" >= (0)::numeric)),
    CONSTRAINT "stock_levels_unit_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'ud'::"text"])))
);


ALTER TABLE "public"."stock_levels" OWNER TO "postgres";

--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "delta_qty" numeric NOT NULL,
    "reason" "public"."stock_movement_reason" DEFAULT 'adjustment'::"public"."stock_movement_reason" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";

--
-- Name: stock_reservation_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."stock_reservation_lines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "supplier_item_id" "uuid" NOT NULL,
    "qty" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "source" "public"."reservation_source" DEFAULT 'gross_need'::"public"."reservation_source" NOT NULL,
    "note" "text",
    CONSTRAINT "stock_reservation_lines_qty_check" CHECK (("qty" >= (0)::numeric)),
    CONSTRAINT "stock_reservation_lines_unit_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'ud'::"text"])))
);


ALTER TABLE "public"."stock_reservation_lines" OWNER TO "postgres";

--
-- Name: stock_reservations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."stock_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid",
    "location_id" "uuid",
    "event_id" "uuid" NOT NULL,
    "event_service_id" "uuid",
    "status" "public"."reservation_status" DEFAULT 'active'::"public"."reservation_status" NOT NULL,
    "reserved_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "released_at" timestamp with time zone,
    "created_by" "uuid"
);


ALTER TABLE "public"."stock_reservations" OWNER TO "postgres";

--
-- Name: waste_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."waste_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "hotel_id" "uuid" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "unit" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "reason_id" "uuid" NOT NULL,
    "unit_cost" numeric DEFAULT 0 NOT NULL,
    "total_cost" numeric GENERATED ALWAYS AS ("round"(("quantity" * "unit_cost"), 2)) STORED,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "waste_entries_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "waste_entries_unit_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'ud'::"text", 'l'::"text"]))),
    CONSTRAINT "waste_entries_unit_cost_check" CHECK (("unit_cost" >= (0)::numeric))
);


ALTER TABLE "public"."waste_entries" OWNER TO "postgres";

--
-- Name: waste_reasons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."waste_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."waste_reasons" OWNER TO "postgres";

--
-- Name: ai_briefs ai_briefs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_briefs"
    ADD CONSTRAINT "ai_briefs_pkey" PRIMARY KEY ("id");


--
-- Name: ai_features ai_features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_features"
    ADD CONSTRAINT "ai_features_pkey" PRIMARY KEY ("key");


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");


--
-- Name: dashboard_notes dashboard_notes_org_id_user_id_week_start_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."dashboard_notes"
    ADD CONSTRAINT "dashboard_notes_org_id_user_id_week_start_key" UNIQUE ("org_id", "user_id", "week_start");


--
-- Name: dashboard_notes dashboard_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."dashboard_notes"
    ADD CONSTRAINT "dashboard_notes_pkey" PRIMARY KEY ("id");


--
-- Name: event_attachments event_attachments_event_id_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_attachments"
    ADD CONSTRAINT "event_attachments_event_id_storage_path_key" UNIQUE ("event_id", "storage_path");


--
-- Name: event_attachments event_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_attachments"
    ADD CONSTRAINT "event_attachments_pkey" PRIMARY KEY ("id");


--
-- Name: event_purchase_order_lines event_purchase_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_order_lines"
    ADD CONSTRAINT "event_purchase_order_lines_pkey" PRIMARY KEY ("id");


--
-- Name: event_purchase_orders event_purchase_orders_org_id_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_orders"
    ADD CONSTRAINT "event_purchase_orders_org_id_order_number_key" UNIQUE ("org_id", "order_number");


--
-- Name: event_purchase_orders event_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_orders"
    ADD CONSTRAINT "event_purchase_orders_pkey" PRIMARY KEY ("id");


--
-- Name: event_service_added_items event_service_added_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_added_items"
    ADD CONSTRAINT "event_service_added_items_pkey" PRIMARY KEY ("id");


--
-- Name: event_service_excluded_items event_service_excluded_items_event_service_id_template_item_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_excluded_items"
    ADD CONSTRAINT "event_service_excluded_items_event_service_id_template_item_key" UNIQUE ("event_service_id", "template_item_id");


--
-- Name: event_service_excluded_items event_service_excluded_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_excluded_items"
    ADD CONSTRAINT "event_service_excluded_items_pkey" PRIMARY KEY ("id");


--
-- Name: event_service_menu_items event_service_menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menu_items"
    ADD CONSTRAINT "event_service_menu_items_pkey" PRIMARY KEY ("id");


--
-- Name: event_service_menu_sections event_service_menu_sections_event_service_id_title_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menu_sections"
    ADD CONSTRAINT "event_service_menu_sections_event_service_id_title_key" UNIQUE ("event_service_id", "title");


--
-- Name: event_service_menu_sections event_service_menu_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menu_sections"
    ADD CONSTRAINT "event_service_menu_sections_pkey" PRIMARY KEY ("id");


--
-- Name: event_service_menus event_service_menus_event_service_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menus"
    ADD CONSTRAINT "event_service_menus_event_service_id_key" UNIQUE ("event_service_id");


--
-- Name: event_service_menus event_service_menus_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menus"
    ADD CONSTRAINT "event_service_menus_pkey" PRIMARY KEY ("id");


--
-- Name: event_service_notes event_service_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_notes"
    ADD CONSTRAINT "event_service_notes_pkey" PRIMARY KEY ("id");


--
-- Name: event_service_replaced_items event_service_replaced_items_event_service_id_template_item_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_replaced_items"
    ADD CONSTRAINT "event_service_replaced_items_event_service_id_template_item_key" UNIQUE ("event_service_id", "template_item_id");


--
-- Name: event_service_replaced_items event_service_replaced_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_replaced_items"
    ADD CONSTRAINT "event_service_replaced_items_pkey" PRIMARY KEY ("id");


--
-- Name: event_services event_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_services"
    ADD CONSTRAINT "event_services_pkey" PRIMARY KEY ("id");


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");


--
-- Name: expiry_alerts expiry_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expiry_alerts"
    ADD CONSTRAINT "expiry_alerts_pkey" PRIMARY KEY ("id");


--
-- Name: expiry_alerts expiry_alerts_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expiry_alerts"
    ADD CONSTRAINT "expiry_alerts_unique" UNIQUE ("org_id", "batch_id", "rule_id");


--
-- Name: expiry_rules expiry_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expiry_rules"
    ADD CONSTRAINT "expiry_rules_pkey" PRIMARY KEY ("id");


--
-- Name: hotels hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_pkey" PRIMARY KEY ("id");


--
-- Name: import_jobs import_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."import_jobs"
    ADD CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id");


--
-- Name: import_rows import_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."import_rows"
    ADD CONSTRAINT "import_rows_pkey" PRIMARY KEY ("id");


--
-- Name: inbound_shipment_lines inbound_shipment_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inbound_shipment_lines"
    ADD CONSTRAINT "inbound_shipment_lines_pkey" PRIMARY KEY ("id");


--
-- Name: inbound_shipments inbound_shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inbound_shipments"
    ADD CONSTRAINT "inbound_shipments_pkey" PRIMARY KEY ("id");


--
-- Name: ingredients ingredients_hotel_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_hotel_id_name_key" UNIQUE ("hotel_id", "name");


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id");


--
-- Name: inventory_locations inventory_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inventory_locations"
    ADD CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id");


--
-- Name: menu_item_aliases menu_item_aliases_org_id_normalized_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_item_aliases"
    ADD CONSTRAINT "menu_item_aliases_org_id_normalized_key" UNIQUE ("org_id", "normalized");


--
-- Name: menu_item_aliases menu_item_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_item_aliases"
    ADD CONSTRAINT "menu_item_aliases_pkey" PRIMARY KEY ("id");


--
-- Name: menu_item_recipe_aliases menu_item_recipe_aliases_org_id_alias_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_item_recipe_aliases"
    ADD CONSTRAINT "menu_item_recipe_aliases_org_id_alias_name_key" UNIQUE ("org_id", "alias_name");


--
-- Name: menu_item_recipe_aliases menu_item_recipe_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_item_recipe_aliases"
    ADD CONSTRAINT "menu_item_recipe_aliases_pkey" PRIMARY KEY ("id");


--
-- Name: menu_template_items menu_template_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_template_items"
    ADD CONSTRAINT "menu_template_items_pkey" PRIMARY KEY ("id");


--
-- Name: menu_template_items menu_template_items_template_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_template_items"
    ADD CONSTRAINT "menu_template_items_template_id_name_key" UNIQUE ("template_id", "name");


--
-- Name: menu_templates menu_templates_org_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_templates"
    ADD CONSTRAINT "menu_templates_org_id_name_key" UNIQUE ("org_id", "name");


--
-- Name: menu_templates menu_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_templates"
    ADD CONSTRAINT "menu_templates_pkey" PRIMARY KEY ("id");


--
-- Name: ocr_jobs ocr_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ocr_jobs"
    ADD CONSTRAINT "ocr_jobs_pkey" PRIMARY KEY ("id");


--
-- Name: order_versions order_versions_event_service_id_entity_type_version_num_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."order_versions"
    ADD CONSTRAINT "order_versions_event_service_id_entity_type_version_num_key" UNIQUE ("event_service_id", "entity_type", "version_num");


--
-- Name: order_versions order_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."order_versions"
    ADD CONSTRAINT "order_versions_pkey" PRIMARY KEY ("id");


--
-- Name: org_memberships org_memberships_org_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."org_memberships"
    ADD CONSTRAINT "org_memberships_org_id_user_id_key" UNIQUE ("org_id", "user_id");


--
-- Name: org_memberships org_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."org_memberships"
    ADD CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id");


--
-- Name: org_plans org_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."org_plans"
    ADD CONSTRAINT "org_plans_pkey" PRIMARY KEY ("org_id");


--
-- Name: orgs orgs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_pkey" PRIMARY KEY ("id");


--
-- Name: orgs orgs_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."orgs"
    ADD CONSTRAINT "orgs_slug_key" UNIQUE ("slug");


--
-- Name: preparation_process_rules preparation_process_rules_org_id_process_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparation_process_rules"
    ADD CONSTRAINT "preparation_process_rules_org_id_process_type_key" UNIQUE ("org_id", "process_type");


--
-- Name: preparation_process_rules preparation_process_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparation_process_rules"
    ADD CONSTRAINT "preparation_process_rules_pkey" PRIMARY KEY ("id");


--
-- Name: preparation_runs preparation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparation_runs"
    ADD CONSTRAINT "preparation_runs_pkey" PRIMARY KEY ("id");


--
-- Name: preparations preparations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparations"
    ADD CONSTRAINT "preparations_pkey" PRIMARY KEY ("id");


--
-- Name: product_barcodes product_barcodes_org_id_barcode_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_barcodes"
    ADD CONSTRAINT "product_barcodes_org_id_barcode_key" UNIQUE ("org_id", "barcode");


--
-- Name: product_barcodes product_barcodes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_barcodes"
    ADD CONSTRAINT "product_barcodes_pkey" PRIMARY KEY ("id");


--
-- Name: production_plans production_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_plans"
    ADD CONSTRAINT "production_plans_pkey" PRIMARY KEY ("id");


--
-- Name: production_tasks production_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_pkey" PRIMARY KEY ("id");


--
-- Name: products products_org_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_org_id_name_key" UNIQUE ("org_id", "name");


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");


--
-- Name: purchase_order_lines purchase_order_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_order_lines"
    ADD CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id");


--
-- Name: purchase_order_lines purchase_order_lines_purchase_order_id_supplier_item_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_order_lines"
    ADD CONSTRAINT "purchase_order_lines_purchase_order_id_supplier_item_id_key" UNIQUE ("purchase_order_id", "supplier_item_id");


--
-- Name: purchase_orders purchase_orders_org_id_order_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_org_id_order_number_key" UNIQUE ("org_id", "order_number");


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");


--
-- Name: purchasing_settings purchasing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchasing_settings"
    ADD CONSTRAINT "purchasing_settings_pkey" PRIMARY KEY ("org_id");


--
-- Name: recipe_lines recipe_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipe_lines"
    ADD CONSTRAINT "recipe_lines_pkey" PRIMARY KEY ("id");


--
-- Name: recipe_lines recipe_lines_recipe_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipe_lines"
    ADD CONSTRAINT "recipe_lines_recipe_id_product_id_key" UNIQUE ("recipe_id", "product_id");


--
-- Name: recipe_production_meta recipe_production_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipe_production_meta"
    ADD CONSTRAINT "recipe_production_meta_pkey" PRIMARY KEY ("id");


--
-- Name: recipe_production_meta recipe_production_meta_recipe_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipe_production_meta"
    ADD CONSTRAINT "recipe_production_meta_recipe_id_key" UNIQUE ("recipe_id");


--
-- Name: recipes recipes_category_check; Type: CHECK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE "public"."recipes"
    ADD CONSTRAINT "recipes_category_check" CHECK ((("category" IS NULL) OR ("category" = ANY (ARRAY['bases'::"text", 'salsas'::"text", 'platos'::"text", 'quinta_gama'::"text"])))) NOT VALID;


--
-- Name: recipes recipes_org_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_org_id_name_key" UNIQUE ("org_id", "name");


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_pkey" PRIMARY KEY ("id");


--
-- Name: reporting_generated_reports reporting_generated_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reporting_generated_reports"
    ADD CONSTRAINT "reporting_generated_reports_pkey" PRIMARY KEY ("id");


--
-- Name: scheduling_rules scheduling_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."scheduling_rules"
    ADD CONSTRAINT "scheduling_rules_pkey" PRIMARY KEY ("org_id", "hotel_id");


--
-- Name: shifts shifts_hotel_id_shift_date_shift_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_hotel_id_shift_date_shift_type_key" UNIQUE ("hotel_id", "shift_date", "shift_type");


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_pkey" PRIMARY KEY ("id");


--
-- Name: space_bookings space_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."space_bookings"
    ADD CONSTRAINT "space_bookings_pkey" PRIMARY KEY ("id");


--
-- Name: spaces spaces_hotel_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_hotel_id_name_key" UNIQUE ("hotel_id", "name");


--
-- Name: spaces spaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_pkey" PRIMARY KEY ("id");


--
-- Name: staff_assignments staff_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_assignments"
    ADD CONSTRAINT "staff_assignments_pkey" PRIMARY KEY ("id");


--
-- Name: staff_assignments staff_assignments_shift_id_staff_member_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_assignments"
    ADD CONSTRAINT "staff_assignments_shift_id_staff_member_id_key" UNIQUE ("shift_id", "staff_member_id");


--
-- Name: staff_compensations staff_compensations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_compensations"
    ADD CONSTRAINT "staff_compensations_pkey" PRIMARY KEY ("id");


--
-- Name: staff_extra_shifts staff_extra_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_extra_shifts"
    ADD CONSTRAINT "staff_extra_shifts_pkey" PRIMARY KEY ("id");


--
-- Name: staff_members staff_members_org_id_full_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_org_id_full_name_key" UNIQUE ("org_id", "full_name");


--
-- Name: staff_members staff_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id");


--
-- Name: staff_time_off staff_time_off_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_time_off"
    ADD CONSTRAINT "staff_time_off_pkey" PRIMARY KEY ("id");


--
-- Name: staff_vacation_adjustments staff_vacation_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_vacation_adjustments"
    ADD CONSTRAINT "staff_vacation_adjustments_pkey" PRIMARY KEY ("id");


--
-- Name: staff_vacation_allowance staff_vacation_allowance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_vacation_allowance"
    ADD CONSTRAINT "staff_vacation_allowance_pkey" PRIMARY KEY ("id");


--
-- Name: staff_vacation_allowance staff_vacation_allowance_staff_member_id_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_vacation_allowance"
    ADD CONSTRAINT "staff_vacation_allowance_staff_member_id_year_key" UNIQUE ("staff_member_id", "year");


--
-- Name: stock_batches stock_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id");


--
-- Name: stock_levels stock_levels_location_id_supplier_item_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_location_id_supplier_item_id_key" UNIQUE ("location_id", "supplier_item_id");


--
-- Name: stock_levels stock_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id");


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");


--
-- Name: stock_reservation_lines stock_reservation_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservation_lines"
    ADD CONSTRAINT "stock_reservation_lines_pkey" PRIMARY KEY ("id");


--
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id");


--
-- Name: supplier_items supplier_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_items"
    ADD CONSTRAINT "supplier_items_pkey" PRIMARY KEY ("id");


--
-- Name: supplier_items supplier_items_supplier_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_items"
    ADD CONSTRAINT "supplier_items_supplier_id_name_key" UNIQUE ("supplier_id", "name");


--
-- Name: supplier_lead_times supplier_lead_times_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_lead_times"
    ADD CONSTRAINT "supplier_lead_times_pkey" PRIMARY KEY ("id");


--
-- Name: supplier_lead_times supplier_lead_times_supplier_id_product_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_lead_times"
    ADD CONSTRAINT "supplier_lead_times_supplier_id_product_type_key" UNIQUE ("supplier_id", "product_type");


--
-- Name: suppliers suppliers_org_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_org_id_name_key" UNIQUE ("org_id", "name");


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");


--
-- Name: waste_entries waste_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waste_entries"
    ADD CONSTRAINT "waste_entries_pkey" PRIMARY KEY ("id");


--
-- Name: waste_reasons waste_reasons_org_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waste_reasons"
    ADD CONSTRAINT "waste_reasons_org_id_name_key" UNIQUE ("org_id", "name");


--
-- Name: waste_reasons waste_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waste_reasons"
    ADD CONSTRAINT "waste_reasons_pkey" PRIMARY KEY ("id");


--
-- Name: audit_logs_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_event_idx" ON "public"."audit_logs" USING "btree" ("event");


--
-- Name: audit_logs_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "audit_logs_org_idx" ON "public"."audit_logs" USING "btree" ("org_id");


--
-- Name: dashboard_notes_org_week_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "dashboard_notes_org_week_idx" ON "public"."dashboard_notes" USING "btree" ("org_id", "week_start");


--
-- Name: event_attachments_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_attachments_event_idx" ON "public"."event_attachments" USING "btree" ("event_id");


--
-- Name: event_attachments_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_attachments_org_idx" ON "public"."event_attachments" USING "btree" ("org_id");


--
-- Name: event_po_lines_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_po_lines_order_idx" ON "public"."event_purchase_order_lines" USING "btree" ("event_purchase_order_id");


--
-- Name: event_po_lines_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_po_lines_org_idx" ON "public"."event_purchase_order_lines" USING "btree" ("org_id");


--
-- Name: event_purchase_orders_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_purchase_orders_event_idx" ON "public"."event_purchase_orders" USING "btree" ("event_id");


--
-- Name: event_purchase_orders_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_purchase_orders_org_idx" ON "public"."event_purchase_orders" USING "btree" ("org_id");


--
-- Name: event_purchase_orders_service_version_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "event_purchase_orders_service_version_uniq" ON "public"."event_purchase_orders" USING "btree" ("event_service_id", "version_num", "supplier_id", "product_type");


--
-- Name: event_purchase_orders_supplier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_purchase_orders_supplier_idx" ON "public"."event_purchase_orders" USING "btree" ("supplier_id");


--
-- Name: event_service_added_items_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_added_items_org_idx" ON "public"."event_service_added_items" USING "btree" ("org_id");


--
-- Name: event_service_added_items_service_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_added_items_service_idx" ON "public"."event_service_added_items" USING "btree" ("event_service_id");


--
-- Name: event_service_excluded_items_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_excluded_items_org_idx" ON "public"."event_service_excluded_items" USING "btree" ("org_id");


--
-- Name: event_service_excluded_items_service_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_excluded_items_service_idx" ON "public"."event_service_excluded_items" USING "btree" ("event_service_id");


--
-- Name: event_service_menu_items_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_menu_items_org_idx" ON "public"."event_service_menu_items" USING "btree" ("org_id");


--
-- Name: event_service_menu_items_recipe_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_menu_items_recipe_idx" ON "public"."event_service_menu_items" USING "btree" ("recipe_id");


--
-- Name: event_service_menu_items_section_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_menu_items_section_idx" ON "public"."event_service_menu_items" USING "btree" ("section_id");


--
-- Name: event_service_menu_sections_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_menu_sections_org_idx" ON "public"."event_service_menu_sections" USING "btree" ("org_id");


--
-- Name: event_service_menu_sections_service_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_menu_sections_service_idx" ON "public"."event_service_menu_sections" USING "btree" ("event_service_id");


--
-- Name: event_service_menus_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_menus_org_idx" ON "public"."event_service_menus" USING "btree" ("org_id");


--
-- Name: event_service_menus_service_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_menus_service_idx" ON "public"."event_service_menus" USING "btree" ("event_service_id");


--
-- Name: event_service_notes_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_notes_org_idx" ON "public"."event_service_notes" USING "btree" ("org_id");


--
-- Name: event_service_notes_service_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_notes_service_idx" ON "public"."event_service_notes" USING "btree" ("event_service_id");


--
-- Name: event_service_replaced_items_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_replaced_items_org_idx" ON "public"."event_service_replaced_items" USING "btree" ("org_id");


--
-- Name: event_service_replaced_items_service_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_service_replaced_items_service_idx" ON "public"."event_service_replaced_items" USING "btree" ("event_service_id");


--
-- Name: event_services_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_services_event_idx" ON "public"."event_services" USING "btree" ("event_id");


--
-- Name: event_services_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_services_org_idx" ON "public"."event_services" USING "btree" ("org_id");


--
-- Name: event_services_starts_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "event_services_starts_idx" ON "public"."event_services" USING "btree" ("starts_at");


--
-- Name: events_hotel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "events_hotel_idx" ON "public"."events" USING "btree" ("hotel_id");


--
-- Name: events_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "events_org_idx" ON "public"."events" USING "btree" ("org_id");


--
-- Name: events_upsert_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "events_upsert_idx" ON "public"."events" USING "btree" ("org_id", "hotel_id", "title", "starts_at");


--
-- Name: expiry_alerts_batch_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "expiry_alerts_batch_idx" ON "public"."expiry_alerts" USING "btree" ("batch_id");


--
-- Name: expiry_alerts_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "expiry_alerts_org_idx" ON "public"."expiry_alerts" USING "btree" ("org_id", "status");


--
-- Name: expiry_rules_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "expiry_rules_org_idx" ON "public"."expiry_rules" USING "btree" ("org_id", "is_enabled");


--
-- Name: expiry_rules_org_type_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "expiry_rules_org_type_uniq" ON "public"."expiry_rules" USING "btree" ("org_id", "product_type") WHERE ("product_type" IS NOT NULL);


--
-- Name: idx_reporting_generated_reports_org_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_reporting_generated_reports_org_date" ON "public"."reporting_generated_reports" USING "btree" ("org_id", "created_at" DESC);


--
-- Name: idx_reporting_generated_reports_period; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "idx_reporting_generated_reports_period" ON "public"."reporting_generated_reports" USING "btree" ("org_id", "period_start");


--
-- Name: import_rows_job_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "import_rows_job_idx" ON "public"."import_rows" USING "btree" ("job_id");


--
-- Name: inbound_lines_item_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inbound_lines_item_idx" ON "public"."inbound_shipment_lines" USING "btree" ("supplier_item_id");


--
-- Name: inbound_lines_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inbound_lines_org_idx" ON "public"."inbound_shipment_lines" USING "btree" ("org_id");


--
-- Name: inbound_lines_shipment_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inbound_lines_shipment_idx" ON "public"."inbound_shipment_lines" USING "btree" ("shipment_id");


--
-- Name: inbound_shipments_dedupe_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inbound_shipments_dedupe_idx" ON "public"."inbound_shipments" USING "btree" ("org_id", "dedupe_key");


--
-- Name: inbound_shipments_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inbound_shipments_location_idx" ON "public"."inbound_shipments" USING "btree" ("location_id");


--
-- Name: inbound_shipments_org_dedupe_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "inbound_shipments_org_dedupe_uniq" ON "public"."inbound_shipments" USING "btree" ("org_id", COALESCE("supplier_name", ''::"text"), COALESCE("delivery_note_number", ''::"text"), COALESCE("delivered_at", '0001-01-01'::"date"));


--
-- Name: inbound_shipments_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inbound_shipments_org_idx" ON "public"."inbound_shipments" USING "btree" ("org_id");


--
-- Name: ingredients_hotel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ingredients_hotel_idx" ON "public"."ingredients" USING "btree" ("hotel_id");


--
-- Name: ingredients_hotel_product_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ingredients_hotel_product_uniq" ON "public"."ingredients" USING "btree" ("hotel_id", "product_id") WHERE ("product_id" IS NOT NULL);


--
-- Name: ingredients_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ingredients_org_idx" ON "public"."ingredients" USING "btree" ("org_id");


--
-- Name: inventory_locations_hotel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inventory_locations_hotel_idx" ON "public"."inventory_locations" USING "btree" ("hotel_id");


--
-- Name: inventory_locations_org_hotel_name_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "inventory_locations_org_hotel_name_uniq" ON "public"."inventory_locations" USING "btree" ("org_id", COALESCE("hotel_id", '00000000-0000-0000-0000-000000000000'::"uuid"), "name");


--
-- Name: inventory_locations_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "inventory_locations_org_idx" ON "public"."inventory_locations" USING "btree" ("org_id");


--
-- Name: menu_item_aliases_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "menu_item_aliases_org_idx" ON "public"."menu_item_aliases" USING "btree" ("org_id");


--
-- Name: menu_item_aliases_supplier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "menu_item_aliases_supplier_idx" ON "public"."menu_item_aliases" USING "btree" ("supplier_item_id");


--
-- Name: menu_template_items_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "menu_template_items_org_idx" ON "public"."menu_template_items" USING "btree" ("org_id");


--
-- Name: menu_template_items_template_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "menu_template_items_template_idx" ON "public"."menu_template_items" USING "btree" ("template_id");


--
-- Name: menu_templates_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "menu_templates_category_idx" ON "public"."menu_templates" USING "btree" ("category");


--
-- Name: menu_templates_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "menu_templates_org_idx" ON "public"."menu_templates" USING "btree" ("org_id");


--
-- Name: ocr_jobs_attachment_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ocr_jobs_attachment_idx" ON "public"."ocr_jobs" USING "btree" ("attachment_id");


--
-- Name: ocr_jobs_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ocr_jobs_org_idx" ON "public"."ocr_jobs" USING "btree" ("org_id");


--
-- Name: ocr_jobs_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ocr_jobs_status_idx" ON "public"."ocr_jobs" USING "btree" ("status");


--
-- Name: order_versions_idempotency_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "order_versions_idempotency_uniq" ON "public"."order_versions" USING "btree" ("event_service_id", "entity_type", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);


--
-- Name: order_versions_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_versions_org_idx" ON "public"."order_versions" USING "btree" ("org_id");


--
-- Name: order_versions_service_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "order_versions_service_idx" ON "public"."order_versions" USING "btree" ("event_service_id");


--
-- Name: org_memberships_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "org_memberships_active_idx" ON "public"."org_memberships" USING "btree" ("user_id") WHERE ("is_active" = true);


--
-- Name: org_memberships_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "org_memberships_role_idx" ON "public"."org_memberships" USING "btree" ("org_id", "user_id", "role");


--
-- Name: org_memberships_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "org_memberships_user_idx" ON "public"."org_memberships" USING "btree" ("user_id");


--
-- Name: prep_process_rules_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "prep_process_rules_org_idx" ON "public"."preparation_process_rules" USING "btree" ("org_id");


--
-- Name: prep_runs_batch_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "prep_runs_batch_idx" ON "public"."preparation_runs" USING "btree" ("stock_batch_id");


--
-- Name: prep_runs_process_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "prep_runs_process_idx" ON "public"."preparation_runs" USING "btree" ("process_type");


--
-- Name: preparation_runs_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "preparation_runs_location_idx" ON "public"."preparation_runs" USING "btree" ("location_id");


--
-- Name: preparation_runs_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "preparation_runs_org_idx" ON "public"."preparation_runs" USING "btree" ("org_id");


--
-- Name: preparation_runs_prep_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "preparation_runs_prep_idx" ON "public"."preparation_runs" USING "btree" ("preparation_id");


--
-- Name: preparations_name_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "preparations_name_trgm_idx" ON "public"."preparations" USING "gin" ("name" "public"."gin_trgm_ops");


--
-- Name: preparations_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "preparations_org_idx" ON "public"."preparations" USING "btree" ("org_id");


--
-- Name: preparations_org_name_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "preparations_org_name_uniq" ON "public"."preparations" USING "btree" ("org_id", "lower"("name"));


--
-- Name: product_barcodes_item_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_barcodes_item_idx" ON "public"."product_barcodes" USING "btree" ("supplier_item_id");


--
-- Name: product_barcodes_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "product_barcodes_org_idx" ON "public"."product_barcodes" USING "btree" ("org_id");


--
-- Name: production_plans_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_plans_event_idx" ON "public"."production_plans" USING "btree" ("event_id");


--
-- Name: production_plans_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_plans_org_idx" ON "public"."production_plans" USING "btree" ("org_id");


--
-- Name: production_plans_service_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_plans_service_idx" ON "public"."production_plans" USING "btree" ("event_service_id");


--
-- Name: production_plans_service_version_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "production_plans_service_version_uniq" ON "public"."production_plans" USING "btree" ("event_service_id", "version_num");


--
-- Name: production_tasks_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_tasks_org_idx" ON "public"."production_tasks" USING "btree" ("org_id");


--
-- Name: production_tasks_plan_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_tasks_plan_idx" ON "public"."production_tasks" USING "btree" ("plan_id");


--
-- Name: production_tasks_station_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "production_tasks_station_idx" ON "public"."production_tasks" USING "btree" ("station");


--
-- Name: products_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "products_category_idx" ON "public"."products" USING "btree" ("category");


--
-- Name: products_name_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "products_name_trgm_idx" ON "public"."products" USING "gin" ("name" "public"."gin_trgm_ops");


--
-- Name: products_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "products_org_idx" ON "public"."products" USING "btree" ("org_id");


--
-- Name: products_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "products_type_idx" ON "public"."products" USING "btree" ("product_type");


--
-- Name: purchase_order_lines_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "purchase_order_lines_org_idx" ON "public"."purchase_order_lines" USING "btree" ("org_id");


--
-- Name: purchase_order_lines_po_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "purchase_order_lines_po_idx" ON "public"."purchase_order_lines" USING "btree" ("purchase_order_id");


--
-- Name: purchase_orders_hotel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "purchase_orders_hotel_idx" ON "public"."purchase_orders" USING "btree" ("hotel_id");


--
-- Name: purchase_orders_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "purchase_orders_org_idx" ON "public"."purchase_orders" USING "btree" ("org_id");


--
-- Name: purchase_orders_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "purchase_orders_status_idx" ON "public"."purchase_orders" USING "btree" ("status");


--
-- Name: purchase_orders_supplier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "purchase_orders_supplier_idx" ON "public"."purchase_orders" USING "btree" ("supplier_id");


--
-- Name: recipe_lines_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "recipe_lines_org_idx" ON "public"."recipe_lines" USING "btree" ("org_id");


--
-- Name: recipe_lines_recipe_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "recipe_lines_recipe_idx" ON "public"."recipe_lines" USING "btree" ("recipe_id");


--
-- Name: recipes_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "recipes_category_idx" ON "public"."recipes" USING "btree" ("category");


--
-- Name: recipes_name_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "recipes_name_trgm_idx" ON "public"."recipes" USING "gin" ("lower"("name") "public"."gin_trgm_ops");


--
-- Name: recipes_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "recipes_org_idx" ON "public"."recipes" USING "btree" ("org_id");


--
-- Name: shifts_hotel_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "shifts_hotel_date_idx" ON "public"."shifts" USING "btree" ("hotel_id", "shift_date");


--
-- Name: shifts_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "shifts_org_idx" ON "public"."shifts" USING "btree" ("org_id");


--
-- Name: space_bookings_event_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "space_bookings_event_idx" ON "public"."space_bookings" USING "btree" ("event_id");


--
-- Name: space_bookings_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "space_bookings_org_idx" ON "public"."space_bookings" USING "btree" ("org_id");


--
-- Name: space_bookings_space_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "space_bookings_space_idx" ON "public"."space_bookings" USING "btree" ("space_id", "starts_at");


--
-- Name: spaces_hotel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "spaces_hotel_idx" ON "public"."spaces" USING "btree" ("hotel_id");


--
-- Name: spaces_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "spaces_org_idx" ON "public"."spaces" USING "btree" ("org_id");


--
-- Name: staff_assignments_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_assignments_org_idx" ON "public"."staff_assignments" USING "btree" ("org_id");


--
-- Name: staff_assignments_shift_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_assignments_shift_idx" ON "public"."staff_assignments" USING "btree" ("shift_id");


--
-- Name: staff_comp_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_comp_org_idx" ON "public"."staff_compensations" USING "btree" ("org_id");


--
-- Name: staff_comp_staff_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_comp_staff_idx" ON "public"."staff_compensations" USING "btree" ("staff_member_id");


--
-- Name: staff_extra_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_extra_org_idx" ON "public"."staff_extra_shifts" USING "btree" ("org_id");


--
-- Name: staff_extra_staff_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_extra_staff_idx" ON "public"."staff_extra_shifts" USING "btree" ("staff_member_id");


--
-- Name: staff_members_active_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_members_active_idx" ON "public"."staff_members" USING "btree" ("active");


--
-- Name: staff_members_home_hotel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_members_home_hotel_idx" ON "public"."staff_members" USING "btree" ("home_hotel_id");


--
-- Name: staff_members_org_email_uidx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "staff_members_org_email_uidx" ON "public"."staff_members" USING "btree" ("org_id", "email") WHERE ("email" IS NOT NULL);


--
-- Name: staff_members_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_members_org_idx" ON "public"."staff_members" USING "btree" ("org_id");


--
-- Name: staff_time_off_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_time_off_org_idx" ON "public"."staff_time_off" USING "btree" ("org_id");


--
-- Name: staff_time_off_staff_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_time_off_staff_idx" ON "public"."staff_time_off" USING "btree" ("staff_member_id");


--
-- Name: staff_time_off_start_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_time_off_start_idx" ON "public"."staff_time_off" USING "btree" ("start_date");


--
-- Name: staff_vac_adj_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_vac_adj_org_idx" ON "public"."staff_vacation_adjustments" USING "btree" ("org_id");


--
-- Name: staff_vac_adj_staff_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_vac_adj_staff_idx" ON "public"."staff_vacation_adjustments" USING "btree" ("staff_member_id");


--
-- Name: staff_vacation_allowance_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "staff_vacation_allowance_org_idx" ON "public"."staff_vacation_allowance" USING "btree" ("org_id");


--
-- Name: stock_batches_org_expiry_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_batches_org_expiry_idx" ON "public"."stock_batches" USING "btree" ("org_id", "expires_at");


--
-- Name: stock_batches_org_item_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_batches_org_item_idx" ON "public"."stock_batches" USING "btree" ("org_id", "supplier_item_id");


--
-- Name: stock_batches_org_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_batches_org_location_idx" ON "public"."stock_batches" USING "btree" ("org_id", "location_id");


--
-- Name: stock_levels_item_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_levels_item_idx" ON "public"."stock_levels" USING "btree" ("supplier_item_id");


--
-- Name: stock_levels_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_levels_location_idx" ON "public"."stock_levels" USING "btree" ("location_id");


--
-- Name: stock_levels_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_levels_org_idx" ON "public"."stock_levels" USING "btree" ("org_id");


--
-- Name: stock_movements_batch_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_movements_batch_idx" ON "public"."stock_movements" USING "btree" ("batch_id");


--
-- Name: stock_movements_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_movements_created_idx" ON "public"."stock_movements" USING "btree" ("created_at");


--
-- Name: stock_movements_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_movements_org_idx" ON "public"."stock_movements" USING "btree" ("org_id");


--
-- Name: stock_reservation_lines_item_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_reservation_lines_item_idx" ON "public"."stock_reservation_lines" USING "btree" ("supplier_item_id");


--
-- Name: stock_reservation_lines_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_reservation_lines_org_idx" ON "public"."stock_reservation_lines" USING "btree" ("org_id");


--
-- Name: stock_reservation_lines_res_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_reservation_lines_res_idx" ON "public"."stock_reservation_lines" USING "btree" ("reservation_id");


--
-- Name: stock_reservations_active_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "stock_reservations_active_uniq" ON "public"."stock_reservations" USING "btree" ("event_id", "event_service_id", "status") WHERE ("status" = 'active'::"public"."reservation_status");


--
-- Name: stock_reservations_hotel_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_reservations_hotel_idx" ON "public"."stock_reservations" USING "btree" ("hotel_id");


--
-- Name: stock_reservations_location_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_reservations_location_idx" ON "public"."stock_reservations" USING "btree" ("location_id");


--
-- Name: stock_reservations_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_reservations_org_idx" ON "public"."stock_reservations" USING "btree" ("org_id");


--
-- Name: stock_reservations_service_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_reservations_service_idx" ON "public"."stock_reservations" USING "btree" ("event_service_id");


--
-- Name: stock_reservations_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "stock_reservations_status_idx" ON "public"."stock_reservations" USING "btree" ("status");


--
-- Name: supplier_items_name_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "supplier_items_name_trgm_idx" ON "public"."supplier_items" USING "gin" ("name" "public"."gin_trgm_ops");


--
-- Name: supplier_items_primary_product_uniq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "supplier_items_primary_product_uniq" ON "public"."supplier_items" USING "btree" ("product_id") WHERE ("is_primary" = true);


--
-- Name: supplier_items_product_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "supplier_items_product_idx" ON "public"."supplier_items" USING "btree" ("product_id");


--
-- Name: supplier_items_supplier_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "supplier_items_supplier_id_idx" ON "public"."supplier_items" USING "btree" ("supplier_id");


--
-- Name: supplier_items_type_override_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "supplier_items_type_override_idx" ON "public"."supplier_items" USING "btree" ("product_type_override");


--
-- Name: supplier_lead_times_org_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "supplier_lead_times_org_idx" ON "public"."supplier_lead_times" USING "btree" ("org_id");


--
-- Name: supplier_lead_times_supplier_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "supplier_lead_times_supplier_idx" ON "public"."supplier_lead_times" USING "btree" ("supplier_id");


--
-- Name: suppliers_org_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "suppliers_org_id_idx" ON "public"."suppliers" USING "btree" ("org_id");


--
-- Name: dashboard_notes dashboard_notes_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "dashboard_notes_touch" BEFORE UPDATE ON "public"."dashboard_notes" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();


--
-- Name: event_attachments event_attachments_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_attachments_validate" BEFORE INSERT OR UPDATE ON "public"."event_attachments" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by_and_validate_attachment"();


--
-- Name: event_purchase_order_lines event_purchase_order_lines_total; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_purchase_order_lines_total" AFTER INSERT OR DELETE OR UPDATE ON "public"."event_purchase_order_lines" FOR EACH ROW EXECUTE FUNCTION "public"."recalc_event_po_total"();


--
-- Name: event_purchase_order_lines event_purchase_order_lines_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_purchase_order_lines_validate" BEFORE INSERT OR UPDATE ON "public"."event_purchase_order_lines" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_po_line"();


--
-- Name: event_purchase_orders event_purchase_orders_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_purchase_orders_validate" BEFORE INSERT OR UPDATE ON "public"."event_purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_purchase_order"();


--
-- Name: event_service_added_items event_service_added_items_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_service_added_items_validate" BEFORE INSERT OR UPDATE ON "public"."event_service_added_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_added_item"();


--
-- Name: event_service_excluded_items event_service_excluded_items_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_service_excluded_items_validate" BEFORE INSERT OR UPDATE ON "public"."event_service_excluded_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_override_service_and_template"();


--
-- Name: event_service_menus event_service_menus_fill_org; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_service_menus_fill_org" BEFORE INSERT OR UPDATE ON "public"."event_service_menus" FOR EACH ROW EXECUTE FUNCTION "public"."event_service_menus_fill_org"();


--
-- Name: event_service_menus event_service_menus_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_service_menus_validate" BEFORE INSERT OR UPDATE ON "public"."event_service_menus" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_service_menu"();


--
-- Name: event_service_notes event_service_notes_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_service_notes_validate" BEFORE INSERT OR UPDATE ON "public"."event_service_notes" FOR EACH ROW EXECUTE FUNCTION "public"."validate_note_service"();


--
-- Name: event_service_replaced_items event_service_replaced_items_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_service_replaced_items_validate" BEFORE INSERT OR UPDATE ON "public"."event_service_replaced_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_override_service_and_template"();


--
-- Name: event_services event_services_fill_defaults; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_services_fill_defaults" BEFORE INSERT OR UPDATE ON "public"."event_services" FOR EACH ROW EXECUTE FUNCTION "public"."event_services_fill_defaults"();


--
-- Name: event_services event_services_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "event_services_validate" BEFORE INSERT OR UPDATE ON "public"."event_services" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_service"();


--
-- Name: events events_fill_title; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "events_fill_title" BEFORE INSERT OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."events_fill_title"();


--
-- Name: events events_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "events_validate" BEFORE INSERT OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."validate_event_org_consistency"();


--
-- Name: ingredients ingredients_validate_product; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "ingredients_validate_product" BEFORE INSERT OR UPDATE ON "public"."ingredients" FOR EACH ROW EXECUTE FUNCTION "public"."validate_ingredient_product"();


--
-- Name: menu_item_aliases menu_item_aliases_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "menu_item_aliases_validate" BEFORE INSERT OR UPDATE ON "public"."menu_item_aliases" FOR EACH ROW EXECUTE FUNCTION "public"."validate_menu_item_alias"();


--
-- Name: menu_template_items menu_template_items_fill_defaults; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "menu_template_items_fill_defaults" BEFORE INSERT OR UPDATE ON "public"."menu_template_items" FOR EACH ROW EXECUTE FUNCTION "public"."menu_template_items_fill_defaults"();


--
-- Name: menu_template_items menu_template_items_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "menu_template_items_validate" BEFORE INSERT OR UPDATE ON "public"."menu_template_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_menu_template_item"();


--
-- Name: ocr_jobs ocr_jobs_touch; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "ocr_jobs_touch" BEFORE UPDATE ON "public"."ocr_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();


--
-- Name: ocr_jobs ocr_jobs_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "ocr_jobs_validate" BEFORE INSERT OR UPDATE ON "public"."ocr_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_by_and_validate_ocr_job"();


--
-- Name: production_plans production_plans_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "production_plans_validate" BEFORE INSERT OR UPDATE ON "public"."production_plans" FOR EACH ROW EXECUTE FUNCTION "public"."validate_production_plan"();


--
-- Name: purchase_order_lines purchase_order_lines_total; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "purchase_order_lines_total" BEFORE INSERT OR UPDATE ON "public"."purchase_order_lines" FOR EACH ROW EXECUTE FUNCTION "public"."update_line_total"();


--
-- Name: purchase_order_lines purchase_order_lines_total_refresh; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "purchase_order_lines_total_refresh" AFTER INSERT OR DELETE OR UPDATE ON "public"."purchase_order_lines" FOR EACH ROW EXECUTE FUNCTION "public"."refresh_po_total"();


--
-- Name: purchase_order_lines purchase_order_lines_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "purchase_order_lines_validate" BEFORE INSERT OR UPDATE ON "public"."purchase_order_lines" FOR EACH ROW EXECUTE FUNCTION "public"."validate_pol_consistency"();


--
-- Name: purchase_orders purchase_orders_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "purchase_orders_validate" BEFORE INSERT OR UPDATE ON "public"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."validate_po_org_consistency"();


--
-- Name: recipe_lines recipe_lines_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "recipe_lines_validate" BEFORE INSERT OR UPDATE ON "public"."recipe_lines" FOR EACH ROW EXECUTE FUNCTION "public"."validate_recipe_line"();


--
-- Name: event_service_menu_items service_menu_items_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "service_menu_items_validate" BEFORE INSERT OR UPDATE ON "public"."event_service_menu_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_service_menu_item"();


--
-- Name: event_service_menu_sections service_menu_sections_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "service_menu_sections_validate" BEFORE INSERT OR UPDATE ON "public"."event_service_menu_sections" FOR EACH ROW EXECUTE FUNCTION "public"."validate_service_menu_section"();


--
-- Name: shifts shifts_validate_org; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "shifts_validate_org" BEFORE INSERT OR UPDATE ON "public"."shifts" FOR EACH ROW EXECUTE FUNCTION "public"."validate_shift_org"();


--
-- Name: space_bookings space_bookings_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "space_bookings_validate" BEFORE INSERT OR UPDATE ON "public"."space_bookings" FOR EACH ROW EXECUTE FUNCTION "public"."validate_booking_consistency"();


--
-- Name: spaces spaces_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "spaces_validate" BEFORE INSERT OR UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."validate_space_org_consistency"();


--
-- Name: staff_assignments staff_assignments_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "staff_assignments_validate" BEFORE INSERT OR UPDATE ON "public"."staff_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."validate_staff_assignment"();


--
-- Name: staff_members staff_members_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "staff_members_validate" BEFORE INSERT OR UPDATE ON "public"."staff_members" FOR EACH ROW EXECUTE FUNCTION "public"."validate_staff_member"();


--
-- Name: stock_reservations stock_reservations_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "stock_reservations_validate" BEFORE INSERT OR UPDATE ON "public"."stock_reservations" FOR EACH ROW EXECUTE FUNCTION "public"."validate_stock_reservation"();


--
-- Name: supplier_items supplier_items_validate_product; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "supplier_items_validate_product" BEFORE INSERT OR UPDATE ON "public"."supplier_items" FOR EACH ROW EXECUTE FUNCTION "public"."validate_supplier_item_product"();


--
-- Name: supplier_lead_times supplier_lead_times_validate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "supplier_lead_times_validate" BEFORE INSERT OR UPDATE ON "public"."supplier_lead_times" FOR EACH ROW EXECUTE FUNCTION "public"."validate_supplier_lead_time"();


--
-- Name: waste_entries trg_waste_org_consistency; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "trg_waste_org_consistency" BEFORE INSERT OR UPDATE ON "public"."waste_entries" FOR EACH ROW EXECUTE FUNCTION "public"."check_waste_org_consistency"();


--
-- Name: ai_briefs ai_briefs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_briefs"
    ADD CONSTRAINT "ai_briefs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: ai_briefs ai_briefs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ai_briefs"
    ADD CONSTRAINT "ai_briefs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: dashboard_notes dashboard_notes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."dashboard_notes"
    ADD CONSTRAINT "dashboard_notes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_attachments event_attachments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_attachments"
    ADD CONSTRAINT "event_attachments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: event_attachments event_attachments_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_attachments"
    ADD CONSTRAINT "event_attachments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_purchase_order_lines event_purchase_order_lines_event_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_order_lines"
    ADD CONSTRAINT "event_purchase_order_lines_event_purchase_order_id_fkey" FOREIGN KEY ("event_purchase_order_id") REFERENCES "public"."event_purchase_orders"("id") ON DELETE CASCADE;


--
-- Name: event_purchase_order_lines event_purchase_order_lines_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_order_lines"
    ADD CONSTRAINT "event_purchase_order_lines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_purchase_order_lines event_purchase_order_lines_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_order_lines"
    ADD CONSTRAINT "event_purchase_order_lines_supplier_item_id_fkey" FOREIGN KEY ("supplier_item_id") REFERENCES "public"."supplier_items"("id") ON DELETE RESTRICT;


--
-- Name: event_purchase_orders event_purchase_orders_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_orders"
    ADD CONSTRAINT "event_purchase_orders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: event_purchase_orders event_purchase_orders_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_orders"
    ADD CONSTRAINT "event_purchase_orders_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE SET NULL;


--
-- Name: event_purchase_orders event_purchase_orders_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_orders"
    ADD CONSTRAINT "event_purchase_orders_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;


--
-- Name: event_purchase_orders event_purchase_orders_order_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_orders"
    ADD CONSTRAINT "event_purchase_orders_order_version_id_fkey" FOREIGN KEY ("order_version_id") REFERENCES "public"."order_versions"("id") ON DELETE SET NULL;


--
-- Name: event_purchase_orders event_purchase_orders_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_orders"
    ADD CONSTRAINT "event_purchase_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_purchase_orders event_purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_purchase_orders"
    ADD CONSTRAINT "event_purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;


--
-- Name: event_service_added_items event_service_added_items_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_added_items"
    ADD CONSTRAINT "event_service_added_items_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE CASCADE;


--
-- Name: event_service_added_items event_service_added_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_added_items"
    ADD CONSTRAINT "event_service_added_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_service_excluded_items event_service_excluded_items_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_excluded_items"
    ADD CONSTRAINT "event_service_excluded_items_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE CASCADE;


--
-- Name: event_service_excluded_items event_service_excluded_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_excluded_items"
    ADD CONSTRAINT "event_service_excluded_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_service_excluded_items event_service_excluded_items_template_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_excluded_items"
    ADD CONSTRAINT "event_service_excluded_items_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "public"."menu_template_items"("id") ON DELETE RESTRICT;


--
-- Name: event_service_menu_items event_service_menu_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menu_items"
    ADD CONSTRAINT "event_service_menu_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_service_menu_items event_service_menu_items_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menu_items"
    ADD CONSTRAINT "event_service_menu_items_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;


--
-- Name: event_service_menu_items event_service_menu_items_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menu_items"
    ADD CONSTRAINT "event_service_menu_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."event_service_menu_sections"("id") ON DELETE CASCADE;


--
-- Name: event_service_menu_sections event_service_menu_sections_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menu_sections"
    ADD CONSTRAINT "event_service_menu_sections_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE CASCADE;


--
-- Name: event_service_menu_sections event_service_menu_sections_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menu_sections"
    ADD CONSTRAINT "event_service_menu_sections_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_service_menus event_service_menus_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menus"
    ADD CONSTRAINT "event_service_menus_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE CASCADE;


--
-- Name: event_service_menus event_service_menus_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menus"
    ADD CONSTRAINT "event_service_menus_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_service_menus event_service_menus_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_menus"
    ADD CONSTRAINT "event_service_menus_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."menu_templates"("id") ON DELETE RESTRICT;


--
-- Name: event_service_notes event_service_notes_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_notes"
    ADD CONSTRAINT "event_service_notes_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE CASCADE;


--
-- Name: event_service_notes event_service_notes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_notes"
    ADD CONSTRAINT "event_service_notes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_service_replaced_items event_service_replaced_items_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_replaced_items"
    ADD CONSTRAINT "event_service_replaced_items_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE CASCADE;


--
-- Name: event_service_replaced_items event_service_replaced_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_replaced_items"
    ADD CONSTRAINT "event_service_replaced_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: event_service_replaced_items event_service_replaced_items_template_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_service_replaced_items"
    ADD CONSTRAINT "event_service_replaced_items_template_item_id_fkey" FOREIGN KEY ("template_item_id") REFERENCES "public"."menu_template_items"("id") ON DELETE RESTRICT;


--
-- Name: event_services event_services_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_services"
    ADD CONSTRAINT "event_services_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: event_services event_services_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."event_services"
    ADD CONSTRAINT "event_services_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: events events_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;


--
-- Name: events events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: expiry_alerts expiry_alerts_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expiry_alerts"
    ADD CONSTRAINT "expiry_alerts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE CASCADE;


--
-- Name: expiry_alerts expiry_alerts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expiry_alerts"
    ADD CONSTRAINT "expiry_alerts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: expiry_alerts expiry_alerts_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expiry_alerts"
    ADD CONSTRAINT "expiry_alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."expiry_rules"("id") ON DELETE CASCADE;


--
-- Name: expiry_rules expiry_rules_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."expiry_rules"
    ADD CONSTRAINT "expiry_rules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: hotels hotels_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."hotels"
    ADD CONSTRAINT "hotels_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: import_jobs import_jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."import_jobs"
    ADD CONSTRAINT "import_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: import_jobs import_jobs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."import_jobs"
    ADD CONSTRAINT "import_jobs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: import_rows import_rows_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."import_rows"
    ADD CONSTRAINT "import_rows_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."import_jobs"("id") ON DELETE CASCADE;


--
-- Name: inbound_shipment_lines inbound_shipment_lines_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inbound_shipment_lines"
    ADD CONSTRAINT "inbound_shipment_lines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: inbound_shipment_lines inbound_shipment_lines_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inbound_shipment_lines"
    ADD CONSTRAINT "inbound_shipment_lines_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "public"."inbound_shipments"("id") ON DELETE CASCADE;


--
-- Name: inbound_shipment_lines inbound_shipment_lines_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inbound_shipment_lines"
    ADD CONSTRAINT "inbound_shipment_lines_supplier_item_id_fkey" FOREIGN KEY ("supplier_item_id") REFERENCES "public"."supplier_items"("id") ON DELETE SET NULL;


--
-- Name: inbound_shipments inbound_shipments_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inbound_shipments"
    ADD CONSTRAINT "inbound_shipments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE CASCADE;


--
-- Name: inbound_shipments inbound_shipments_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inbound_shipments"
    ADD CONSTRAINT "inbound_shipments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: inbound_shipments inbound_shipments_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inbound_shipments"
    ADD CONSTRAINT "inbound_shipments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;


--
-- Name: ingredients ingredients_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;


--
-- Name: ingredients ingredients_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: ingredients ingredients_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;


--
-- Name: inventory_locations inventory_locations_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inventory_locations"
    ADD CONSTRAINT "inventory_locations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE SET NULL;


--
-- Name: inventory_locations inventory_locations_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."inventory_locations"
    ADD CONSTRAINT "inventory_locations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: menu_item_aliases menu_item_aliases_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_item_aliases"
    ADD CONSTRAINT "menu_item_aliases_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: menu_item_aliases menu_item_aliases_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_item_aliases"
    ADD CONSTRAINT "menu_item_aliases_supplier_item_id_fkey" FOREIGN KEY ("supplier_item_id") REFERENCES "public"."supplier_items"("id") ON DELETE RESTRICT;


--
-- Name: menu_item_recipe_aliases menu_item_recipe_aliases_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_item_recipe_aliases"
    ADD CONSTRAINT "menu_item_recipe_aliases_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: menu_item_recipe_aliases menu_item_recipe_aliases_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_item_recipe_aliases"
    ADD CONSTRAINT "menu_item_recipe_aliases_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;


--
-- Name: menu_template_items menu_template_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_template_items"
    ADD CONSTRAINT "menu_template_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: menu_template_items menu_template_items_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_template_items"
    ADD CONSTRAINT "menu_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."menu_templates"("id") ON DELETE CASCADE;


--
-- Name: menu_templates menu_templates_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."menu_templates"
    ADD CONSTRAINT "menu_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: ocr_jobs ocr_jobs_attachment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ocr_jobs"
    ADD CONSTRAINT "ocr_jobs_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "public"."event_attachments"("id") ON DELETE CASCADE;


--
-- Name: ocr_jobs ocr_jobs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."ocr_jobs"
    ADD CONSTRAINT "ocr_jobs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: order_versions order_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."order_versions"
    ADD CONSTRAINT "order_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: order_versions order_versions_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."order_versions"
    ADD CONSTRAINT "order_versions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: order_versions order_versions_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."order_versions"
    ADD CONSTRAINT "order_versions_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE CASCADE;


--
-- Name: order_versions order_versions_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."order_versions"
    ADD CONSTRAINT "order_versions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: org_memberships org_memberships_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."org_memberships"
    ADD CONSTRAINT "org_memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: org_plans org_plans_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."org_plans"
    ADD CONSTRAINT "org_plans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: preparation_process_rules preparation_process_rules_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparation_process_rules"
    ADD CONSTRAINT "preparation_process_rules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: preparation_runs preparation_runs_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparation_runs"
    ADD CONSTRAINT "preparation_runs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE CASCADE;


--
-- Name: preparation_runs preparation_runs_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparation_runs"
    ADD CONSTRAINT "preparation_runs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: preparation_runs preparation_runs_preparation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparation_runs"
    ADD CONSTRAINT "preparation_runs_preparation_id_fkey" FOREIGN KEY ("preparation_id") REFERENCES "public"."preparations"("id") ON DELETE CASCADE;


--
-- Name: preparation_runs preparation_runs_stock_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparation_runs"
    ADD CONSTRAINT "preparation_runs_stock_batch_id_fkey" FOREIGN KEY ("stock_batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE SET NULL;


--
-- Name: preparations preparations_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."preparations"
    ADD CONSTRAINT "preparations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: product_barcodes product_barcodes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_barcodes"
    ADD CONSTRAINT "product_barcodes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: product_barcodes product_barcodes_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."product_barcodes"
    ADD CONSTRAINT "product_barcodes_supplier_item_id_fkey" FOREIGN KEY ("supplier_item_id") REFERENCES "public"."supplier_items"("id") ON DELETE RESTRICT;


--
-- Name: production_plans production_plans_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_plans"
    ADD CONSTRAINT "production_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: production_plans production_plans_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_plans"
    ADD CONSTRAINT "production_plans_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: production_plans production_plans_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_plans"
    ADD CONSTRAINT "production_plans_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE CASCADE;


--
-- Name: production_plans production_plans_order_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_plans"
    ADD CONSTRAINT "production_plans_order_version_id_fkey" FOREIGN KEY ("order_version_id") REFERENCES "public"."order_versions"("id") ON DELETE SET NULL;


--
-- Name: production_plans production_plans_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_plans"
    ADD CONSTRAINT "production_plans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: production_tasks production_tasks_assignee_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_assignee_staff_id_fkey" FOREIGN KEY ("assignee_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;


--
-- Name: production_tasks production_tasks_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: production_tasks production_tasks_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."production_plans"("id") ON DELETE CASCADE;


--
-- Name: production_tasks production_tasks_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."production_tasks"
    ADD CONSTRAINT "production_tasks_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE SET NULL;


--
-- Name: products products_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: purchase_order_lines purchase_order_lines_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_order_lines"
    ADD CONSTRAINT "purchase_order_lines_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE RESTRICT;


--
-- Name: purchase_order_lines purchase_order_lines_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_order_lines"
    ADD CONSTRAINT "purchase_order_lines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: purchase_order_lines purchase_order_lines_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_order_lines"
    ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE;


--
-- Name: purchase_order_lines purchase_order_lines_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_order_lines"
    ADD CONSTRAINT "purchase_order_lines_supplier_item_id_fkey" FOREIGN KEY ("supplier_item_id") REFERENCES "public"."supplier_items"("id") ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE RESTRICT;


--
-- Name: purchase_orders purchase_orders_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;


--
-- Name: purchasing_settings purchasing_settings_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."purchasing_settings"
    ADD CONSTRAINT "purchasing_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: recipe_lines recipe_lines_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipe_lines"
    ADD CONSTRAINT "recipe_lines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: recipe_lines recipe_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipe_lines"
    ADD CONSTRAINT "recipe_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;


--
-- Name: recipe_lines recipe_lines_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipe_lines"
    ADD CONSTRAINT "recipe_lines_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;


--
-- Name: recipe_production_meta recipe_production_meta_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipe_production_meta"
    ADD CONSTRAINT "recipe_production_meta_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: recipe_production_meta recipe_production_meta_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipe_production_meta"
    ADD CONSTRAINT "recipe_production_meta_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE CASCADE;


--
-- Name: recipes recipes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."recipes"
    ADD CONSTRAINT "recipes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: reporting_generated_reports reporting_generated_reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reporting_generated_reports"
    ADD CONSTRAINT "reporting_generated_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: reporting_generated_reports reporting_generated_reports_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."reporting_generated_reports"
    ADD CONSTRAINT "reporting_generated_reports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: scheduling_rules scheduling_rules_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."scheduling_rules"
    ADD CONSTRAINT "scheduling_rules_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;


--
-- Name: scheduling_rules scheduling_rules_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."scheduling_rules"
    ADD CONSTRAINT "scheduling_rules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: shifts shifts_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;


--
-- Name: shifts shifts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."shifts"
    ADD CONSTRAINT "shifts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: space_bookings space_bookings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."space_bookings"
    ADD CONSTRAINT "space_bookings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: space_bookings space_bookings_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."space_bookings"
    ADD CONSTRAINT "space_bookings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: space_bookings space_bookings_space_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."space_bookings"
    ADD CONSTRAINT "space_bookings_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE RESTRICT;


--
-- Name: spaces spaces_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE CASCADE;


--
-- Name: spaces spaces_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: staff_assignments staff_assignments_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_assignments"
    ADD CONSTRAINT "staff_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: staff_assignments staff_assignments_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_assignments"
    ADD CONSTRAINT "staff_assignments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE CASCADE;


--
-- Name: staff_assignments staff_assignments_staff_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_assignments"
    ADD CONSTRAINT "staff_assignments_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT;


--
-- Name: staff_compensations staff_compensations_extra_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_compensations"
    ADD CONSTRAINT "staff_compensations_extra_shift_id_fkey" FOREIGN KEY ("extra_shift_id") REFERENCES "public"."staff_extra_shifts"("id") ON DELETE SET NULL;


--
-- Name: staff_compensations staff_compensations_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_compensations"
    ADD CONSTRAINT "staff_compensations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: staff_compensations staff_compensations_staff_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_compensations"
    ADD CONSTRAINT "staff_compensations_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;


--
-- Name: staff_extra_shifts staff_extra_shifts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_extra_shifts"
    ADD CONSTRAINT "staff_extra_shifts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: staff_extra_shifts staff_extra_shifts_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_extra_shifts"
    ADD CONSTRAINT "staff_extra_shifts_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."shifts"("id") ON DELETE SET NULL;


--
-- Name: staff_extra_shifts staff_extra_shifts_staff_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_extra_shifts"
    ADD CONSTRAINT "staff_extra_shifts_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;


--
-- Name: staff_members staff_members_home_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_home_hotel_id_fkey" FOREIGN KEY ("home_hotel_id") REFERENCES "public"."hotels"("id") ON DELETE SET NULL;


--
-- Name: staff_members staff_members_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: staff_time_off staff_time_off_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_time_off"
    ADD CONSTRAINT "staff_time_off_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: staff_time_off staff_time_off_staff_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_time_off"
    ADD CONSTRAINT "staff_time_off_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;


--
-- Name: staff_vacation_adjustments staff_vacation_adjustments_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_vacation_adjustments"
    ADD CONSTRAINT "staff_vacation_adjustments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: staff_vacation_adjustments staff_vacation_adjustments_staff_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_vacation_adjustments"
    ADD CONSTRAINT "staff_vacation_adjustments_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;


--
-- Name: staff_vacation_allowance staff_vacation_allowance_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_vacation_allowance"
    ADD CONSTRAINT "staff_vacation_allowance_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: staff_vacation_allowance staff_vacation_allowance_staff_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."staff_vacation_allowance"
    ADD CONSTRAINT "staff_vacation_allowance_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;


--
-- Name: stock_batches stock_batches_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE CASCADE;


--
-- Name: stock_batches stock_batches_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: stock_batches stock_batches_preparation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_preparation_id_fkey" FOREIGN KEY ("preparation_id") REFERENCES "public"."preparations"("id") ON DELETE SET NULL;


--
-- Name: stock_batches stock_batches_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_batches"
    ADD CONSTRAINT "stock_batches_supplier_item_id_fkey" FOREIGN KEY ("supplier_item_id") REFERENCES "public"."supplier_items"("id") ON DELETE RESTRICT;


--
-- Name: stock_levels stock_levels_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: stock_levels stock_levels_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_levels"
    ADD CONSTRAINT "stock_levels_supplier_item_id_fkey" FOREIGN KEY ("supplier_item_id") REFERENCES "public"."supplier_items"("id") ON DELETE RESTRICT;


--
-- Name: stock_movements stock_movements_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: stock_reservation_lines stock_reservation_lines_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservation_lines"
    ADD CONSTRAINT "stock_reservation_lines_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: stock_reservation_lines stock_reservation_lines_reservation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservation_lines"
    ADD CONSTRAINT "stock_reservation_lines_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "public"."stock_reservations"("id") ON DELETE CASCADE;


--
-- Name: stock_reservation_lines stock_reservation_lines_supplier_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservation_lines"
    ADD CONSTRAINT "stock_reservation_lines_supplier_item_id_fkey" FOREIGN KEY ("supplier_item_id") REFERENCES "public"."supplier_items"("id") ON DELETE RESTRICT;


--
-- Name: stock_reservations stock_reservations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_event_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_event_service_id_fkey" FOREIGN KEY ("event_service_id") REFERENCES "public"."event_services"("id") ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE SET NULL;


--
-- Name: stock_reservations stock_reservations_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE SET NULL;


--
-- Name: stock_reservations stock_reservations_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: supplier_items supplier_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_items"
    ADD CONSTRAINT "supplier_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;


--
-- Name: supplier_items supplier_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_items"
    ADD CONSTRAINT "supplier_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;


--
-- Name: supplier_lead_times supplier_lead_times_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_lead_times"
    ADD CONSTRAINT "supplier_lead_times_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: supplier_lead_times supplier_lead_times_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."supplier_lead_times"
    ADD CONSTRAINT "supplier_lead_times_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE CASCADE;


--
-- Name: suppliers suppliers_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE CASCADE;


--
-- Name: waste_entries waste_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waste_entries"
    ADD CONSTRAINT "waste_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");


--
-- Name: waste_entries waste_entries_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waste_entries"
    ADD CONSTRAINT "waste_entries_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id");


--
-- Name: waste_entries waste_entries_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waste_entries"
    ADD CONSTRAINT "waste_entries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id");


--
-- Name: waste_entries waste_entries_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waste_entries"
    ADD CONSTRAINT "waste_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");


--
-- Name: waste_entries waste_entries_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waste_entries"
    ADD CONSTRAINT "waste_entries_reason_id_fkey" FOREIGN KEY ("reason_id") REFERENCES "public"."waste_reasons"("id");


--
-- Name: waste_reasons waste_reasons_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."waste_reasons"
    ADD CONSTRAINT "waste_reasons_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id");


--
-- Name: event_service_added_items Added by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Added by membership" ON "public"."event_service_added_items" USING ("public"."is_event_service_member"("org_id", "event_service_id")) WITH CHECK ("public"."is_event_service_member"("org_id", "event_service_id"));


--
-- Name: menu_item_aliases Aliases by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Aliases by membership" ON "public"."menu_item_aliases" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: staff_vacation_allowance Allowance by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allowance by membership" ON "public"."staff_vacation_allowance" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: staff_assignments Assignments by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Assignments by membership" ON "public"."staff_assignments" USING (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM "public"."shifts" "s"
  WHERE (("s"."id" = "staff_assignments"."shift_id") AND ("s"."org_id" = "s"."org_id")))))) WITH CHECK (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM "public"."shifts" "s"
  WHERE (("s"."id" = "staff_assignments"."shift_id") AND ("s"."org_id" = "s"."org_id"))))));


--
-- Name: event_attachments Attachments by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Attachments by membership" ON "public"."event_attachments" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: space_bookings Bookings by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Bookings by membership" ON "public"."space_bookings" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: staff_compensations Compensations by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Compensations by membership" ON "public"."staff_compensations" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: dashboard_notes Dashboard notes by owner and membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Dashboard notes by owner and membership" ON "public"."dashboard_notes" USING (("public"."is_org_member"("org_id") AND ("auth"."uid"() = "user_id"))) WITH CHECK (("public"."is_org_member"("org_id") AND ("auth"."uid"() = "user_id")));


--
-- Name: event_purchase_order_lines Event order lines by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event order lines by membership" ON "public"."event_purchase_order_lines" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: event_purchase_orders Event orders by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event orders by membership" ON "public"."event_purchase_orders" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: event_services Event services by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Event services by membership" ON "public"."event_services" USING (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "e"."org_id")))
  WHERE (("e"."id" = "event_services"."event_id") AND ("m"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM ("public"."events" "e"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "e"."org_id")))
  WHERE (("e"."id" = "event_services"."event_id") AND ("m"."user_id" = "auth"."uid"()))))));


--
-- Name: events Events by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Events by membership" ON "public"."events" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: event_service_excluded_items Excluded by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Excluded by membership" ON "public"."event_service_excluded_items" USING ("public"."is_event_service_member"("org_id", "event_service_id")) WITH CHECK ("public"."is_event_service_member"("org_id", "event_service_id"));


--
-- Name: staff_extra_shifts Extra shifts by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Extra shifts by membership" ON "public"."staff_extra_shifts" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: hotels Hotels delete by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Hotels delete by membership" ON "public"."hotels" FOR DELETE USING ("public"."has_org_role"("org_id", ARRAY['admin'::"text", 'manager'::"text"]));


--
-- Name: hotels Hotels insert by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Hotels insert by membership" ON "public"."hotels" FOR INSERT WITH CHECK ("public"."has_org_role"("org_id", ARRAY['admin'::"text", 'manager'::"text"]));


--
-- Name: hotels Hotels update by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Hotels update by membership" ON "public"."hotels" FOR UPDATE USING ("public"."has_org_role"("org_id", ARRAY['admin'::"text", 'manager'::"text"])) WITH CHECK ("public"."has_org_role"("org_id", ARRAY['admin'::"text", 'manager'::"text"]));


--
-- Name: ingredients Ingredients select by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Ingredients select by membership" ON "public"."ingredients" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: ingredients Ingredients write by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Ingredients write by membership" ON "public"."ingredients" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: import_jobs Jobs insert member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Jobs insert member" ON "public"."import_jobs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_memberships" "m"
  WHERE (("m"."org_id" = "import_jobs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: import_jobs Jobs select member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Jobs select member" ON "public"."import_jobs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."org_memberships" "m"
  WHERE (("m"."org_id" = "import_jobs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: import_jobs Jobs update creator; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Jobs update creator" ON "public"."import_jobs" FOR UPDATE USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));


--
-- Name: audit_logs Logs select member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Logs select member" ON "public"."audit_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."org_memberships" "m"
  WHERE (("m"."org_id" = "audit_logs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: hotels Members can select hotels; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can select hotels" ON "public"."hotels" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: orgs Members can select orgs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Members can select orgs" ON "public"."orgs" FOR SELECT USING ("public"."is_org_member"("id"));


--
-- Name: event_service_menu_items Menu items by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Menu items by membership" ON "public"."event_service_menu_items" USING (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM ("public"."event_service_menu_sections" "sec"
     JOIN "public"."event_services" "es" ON (("es"."id" = "sec"."event_service_id")))
  WHERE (("sec"."id" = "event_service_menu_items"."section_id") AND ("sec"."org_id" = "event_service_menu_items"."org_id") AND ("es"."org_id" = "event_service_menu_items"."org_id")))))) WITH CHECK (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM ("public"."event_service_menu_sections" "sec"
     JOIN "public"."event_services" "es" ON (("es"."id" = "sec"."event_service_id")))
  WHERE (("sec"."id" = "event_service_menu_items"."section_id") AND ("sec"."org_id" = "event_service_menu_items"."org_id") AND ("es"."org_id" = "event_service_menu_items"."org_id"))))));


--
-- Name: event_service_menu_sections Menu sections by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Menu sections by membership" ON "public"."event_service_menu_sections" USING (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM "public"."event_services" "es"
  WHERE (("es"."id" = "event_service_menu_sections"."event_service_id") AND ("es"."org_id" = "es"."org_id")))))) WITH CHECK (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM "public"."event_services" "es"
  WHERE (("es"."id" = "event_service_menu_sections"."event_service_id") AND ("es"."org_id" = "es"."org_id"))))));


--
-- Name: menu_template_items Menu template items by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Menu template items by membership" ON "public"."menu_template_items" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: menu_templates Menu templates by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Menu templates by membership" ON "public"."menu_templates" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: event_service_notes Notes by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Notes by membership" ON "public"."event_service_notes" USING ("public"."is_event_service_member"("org_id", "event_service_id")) WITH CHECK ("public"."is_event_service_member"("org_id", "event_service_id"));


--
-- Name: ocr_jobs OCR jobs by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "OCR jobs by membership" ON "public"."ocr_jobs" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: purchase_orders PO delete by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "PO delete by membership" ON "public"."purchase_orders" FOR DELETE USING ("public"."is_org_member"("org_id"));


--
-- Name: purchase_orders PO insert by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "PO insert by membership" ON "public"."purchase_orders" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: purchase_orders PO select by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "PO select by membership" ON "public"."purchase_orders" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: purchase_orders PO update by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "PO update by membership" ON "public"."purchase_orders" FOR UPDATE USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: purchase_order_lines POL delete by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "POL delete by membership" ON "public"."purchase_order_lines" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."purchase_orders" "po"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "po"."org_id")))
  WHERE (("po"."id" = "purchase_order_lines"."purchase_order_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: purchase_order_lines POL insert by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "POL insert by membership" ON "public"."purchase_order_lines" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."purchase_orders" "po"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "po"."org_id")))
  WHERE (("po"."id" = "purchase_order_lines"."purchase_order_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: purchase_order_lines POL select by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "POL select by membership" ON "public"."purchase_order_lines" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."purchase_orders" "po"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "po"."org_id")))
  WHERE (("po"."id" = "purchase_order_lines"."purchase_order_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: purchase_order_lines POL update by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "POL update by membership" ON "public"."purchase_order_lines" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."purchase_orders" "po"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "po"."org_id")))
  WHERE (("po"."id" = "purchase_order_lines"."purchase_order_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."purchase_orders" "po"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "po"."org_id")))
  WHERE (("po"."id" = "purchase_order_lines"."purchase_order_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: products Products by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Products by membership" ON "public"."products" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: recipe_lines Recipe lines by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Recipe lines by membership" ON "public"."recipe_lines" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: recipes Recipes by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Recipes by membership" ON "public"."recipes" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: event_service_replaced_items Replaced by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Replaced by membership" ON "public"."event_service_replaced_items" USING ("public"."is_event_service_member"("org_id", "event_service_id")) WITH CHECK ("public"."is_event_service_member"("org_id", "event_service_id"));


--
-- Name: import_rows Rows select member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Rows select member" ON "public"."import_rows" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."import_jobs" "j"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "j"."org_id")))
  WHERE (("j"."id" = "import_rows"."job_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: scheduling_rules Scheduling rules by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Scheduling rules by membership" ON "public"."scheduling_rules" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: org_memberships Self can see own memberships; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Self can see own memberships" ON "public"."org_memberships" FOR SELECT USING (("auth"."uid"() = "user_id"));


--
-- Name: event_service_menus Service menus by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service menus by membership" ON "public"."event_service_menus" USING (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM ("public"."event_services" "es"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "es"."org_id")))
  WHERE (("es"."id" = "event_service_menus"."event_service_id") AND ("m"."user_id" = "auth"."uid"())))))) WITH CHECK (("public"."is_org_member"("org_id") AND (EXISTS ( SELECT 1
   FROM ("public"."event_services" "es"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "es"."org_id")))
  WHERE (("es"."id" = "event_service_menus"."event_service_id") AND ("m"."user_id" = "auth"."uid"()))))));


--
-- Name: shifts Shifts by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Shifts by membership" ON "public"."shifts" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: spaces Spaces by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Spaces by membership" ON "public"."spaces" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: staff_members Staff by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Staff by membership" ON "public"."staff_members" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: supplier_items Supplier items delete by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Supplier items delete by membership" ON "public"."supplier_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."suppliers" "s"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "s"."org_id")))
  WHERE (("s"."id" = "supplier_items"."supplier_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: supplier_items Supplier items insert by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Supplier items insert by membership" ON "public"."supplier_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."suppliers" "s"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "s"."org_id")))
  WHERE (("s"."id" = "supplier_items"."supplier_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: supplier_items Supplier items select by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Supplier items select by membership" ON "public"."supplier_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."suppliers" "s"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "s"."org_id")))
  WHERE (("s"."id" = "supplier_items"."supplier_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: supplier_items Supplier items update by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Supplier items update by membership" ON "public"."supplier_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."suppliers" "s"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "s"."org_id")))
  WHERE (("s"."id" = "supplier_items"."supplier_id") AND ("m"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."suppliers" "s"
     JOIN "public"."org_memberships" "m" ON (("m"."org_id" = "s"."org_id")))
  WHERE (("s"."id" = "supplier_items"."supplier_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: supplier_lead_times Supplier lead times delete by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Supplier lead times delete by membership" ON "public"."supplier_lead_times" FOR DELETE USING ("public"."is_org_member"("org_id"));


--
-- Name: supplier_lead_times Supplier lead times insert by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Supplier lead times insert by membership" ON "public"."supplier_lead_times" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: supplier_lead_times Supplier lead times select by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Supplier lead times select by membership" ON "public"."supplier_lead_times" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: supplier_lead_times Supplier lead times update by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Supplier lead times update by membership" ON "public"."supplier_lead_times" FOR UPDATE USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: suppliers Suppliers delete by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Suppliers delete by membership" ON "public"."suppliers" FOR DELETE USING ("public"."is_org_member"("org_id"));


--
-- Name: suppliers Suppliers insert by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Suppliers insert by membership" ON "public"."suppliers" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: suppliers Suppliers select by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Suppliers select by membership" ON "public"."suppliers" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: suppliers Suppliers update by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Suppliers update by membership" ON "public"."suppliers" FOR UPDATE USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: staff_time_off Time off by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Time off by membership" ON "public"."staff_time_off" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: waste_entries Users can delete waste entries for their org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete waste entries for their org" ON "public"."waste_entries" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."org_id" = "waste_entries"."org_id") AND ("org_memberships"."user_id" = "auth"."uid"())))));


--
-- Name: reporting_generated_reports Users can insert reports for their orgs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert reports for their orgs" ON "public"."reporting_generated_reports" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "org_memberships"."org_id"
   FROM "public"."org_memberships"
  WHERE ("org_memberships"."user_id" = "auth"."uid"()))));


--
-- Name: waste_entries Users can insert waste entries for their org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert waste entries for their org" ON "public"."waste_entries" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."org_id" = "waste_entries"."org_id") AND ("org_memberships"."user_id" = "auth"."uid"())))));


--
-- Name: waste_entries Users can update waste entries for their org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update waste entries for their org" ON "public"."waste_entries" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."org_id" = "waste_entries"."org_id") AND ("org_memberships"."user_id" = "auth"."uid"())))));


--
-- Name: reporting_generated_reports Users can view reports for their orgs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view reports for their orgs" ON "public"."reporting_generated_reports" FOR SELECT USING (("org_id" IN ( SELECT "org_memberships"."org_id"
   FROM "public"."org_memberships"
  WHERE ("org_memberships"."user_id" = "auth"."uid"()))));


--
-- Name: waste_entries Users can view waste entries from their org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view waste entries from their org" ON "public"."waste_entries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."org_id" = "waste_entries"."org_id") AND ("org_memberships"."user_id" = "auth"."uid"())))));


--
-- Name: waste_reasons Users can view waste reasons from their org; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view waste reasons from their org" ON "public"."waste_reasons" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."org_id" = "waste_reasons"."org_id") AND ("org_memberships"."user_id" = "auth"."uid"())))));


--
-- Name: waste_reasons Users with permission can manage waste reasons; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users with permission can manage waste reasons" ON "public"."waste_reasons" USING ((EXISTS ( SELECT 1
   FROM "public"."org_memberships"
  WHERE (("org_memberships"."org_id" = "waste_reasons"."org_id") AND ("org_memberships"."user_id" = "auth"."uid"())))));


--
-- Name: staff_vacation_adjustments Vacation adjustments by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Vacation adjustments by membership" ON "public"."staff_vacation_adjustments" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: ai_briefs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."ai_briefs" ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_features; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."ai_features" ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_features ai_features select authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ai_features select authenticated" ON "public"."ai_features" FOR SELECT USING (("auth"."uid"() IS NOT NULL));


--
-- Name: ai_features ai_features write service role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ai_features write service role" ON "public"."ai_features" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));


--
-- Name: menu_item_recipe_aliases aliases_delete_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "aliases_delete_member" ON "public"."menu_item_recipe_aliases" FOR DELETE USING ("public"."is_org_member"("org_id"));


--
-- Name: menu_item_recipe_aliases aliases_read_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "aliases_read_member" ON "public"."menu_item_recipe_aliases" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: menu_item_recipe_aliases aliases_update_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "aliases_update_member" ON "public"."menu_item_recipe_aliases" FOR UPDATE USING ("public"."is_org_member"("org_id"));


--
-- Name: menu_item_recipe_aliases aliases_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "aliases_write_member" ON "public"."menu_item_recipe_aliases" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: ai_briefs briefs insert with feature; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "briefs insert with feature" ON "public"."ai_briefs" FOR INSERT WITH CHECK (("public"."can_use_feature"('daily_brief'::"text", "org_id") AND (EXISTS ( SELECT 1
   FROM "public"."org_memberships" "m"
  WHERE (("m"."org_id" = "ai_briefs"."org_id") AND ("m"."user_id" = "auth"."uid"()))))));


--
-- Name: ai_briefs briefs select member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "briefs select member" ON "public"."ai_briefs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."org_memberships" "m"
  WHERE (("m"."org_id" = "ai_briefs"."org_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: dashboard_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."dashboard_notes" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_attachments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_attachments" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_purchase_order_lines; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_purchase_order_lines" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_purchase_orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_purchase_orders" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_service_added_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_service_added_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_service_excluded_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_service_excluded_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_service_menu_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_service_menu_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_service_menu_sections; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_service_menu_sections" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_service_menus; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_service_menus" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_service_notes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_service_notes" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_service_replaced_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_service_replaced_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: event_services; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."event_services" ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;

--
-- Name: expiry_alerts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."expiry_alerts" ENABLE ROW LEVEL SECURITY;

--
-- Name: expiry_alerts expiry_alerts_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "expiry_alerts_select_member" ON "public"."expiry_alerts" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: expiry_alerts expiry_alerts_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "expiry_alerts_write_member" ON "public"."expiry_alerts" FOR UPDATE USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: expiry_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."expiry_rules" ENABLE ROW LEVEL SECURITY;

--
-- Name: expiry_rules expiry_rules_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "expiry_rules_select_member" ON "public"."expiry_rules" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: expiry_rules expiry_rules_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "expiry_rules_write_member" ON "public"."expiry_rules" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: hotels; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."hotels" ENABLE ROW LEVEL SECURITY;

--
-- Name: import_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."import_jobs" ENABLE ROW LEVEL SECURITY;

--
-- Name: import_rows; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."import_rows" ENABLE ROW LEVEL SECURITY;

--
-- Name: inbound_shipment_lines inbound_lines_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "inbound_lines_select_member" ON "public"."inbound_shipment_lines" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: inbound_shipment_lines inbound_lines_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "inbound_lines_write_member" ON "public"."inbound_shipment_lines" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: inbound_shipment_lines; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."inbound_shipment_lines" ENABLE ROW LEVEL SECURITY;

--
-- Name: inbound_shipments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."inbound_shipments" ENABLE ROW LEVEL SECURITY;

--
-- Name: inbound_shipments inbound_shipments_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "inbound_shipments_select_member" ON "public"."inbound_shipments" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: inbound_shipments inbound_shipments_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "inbound_shipments_write_member" ON "public"."inbound_shipments" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: ingredients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."ingredients" ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_locations inv_loc_select_members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "inv_loc_select_members" ON "public"."inventory_locations" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: inventory_locations inv_loc_write_members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "inv_loc_write_members" ON "public"."inventory_locations" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: inventory_locations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."inventory_locations" ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_item_aliases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."menu_item_aliases" ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_item_recipe_aliases; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."menu_item_recipe_aliases" ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_template_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."menu_template_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."menu_templates" ENABLE ROW LEVEL SECURITY;

--
-- Name: recipe_production_meta meta_delete_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "meta_delete_member" ON "public"."recipe_production_meta" FOR DELETE USING ("public"."is_org_member"("org_id"));


--
-- Name: recipe_production_meta meta_read_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "meta_read_member" ON "public"."recipe_production_meta" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: recipe_production_meta meta_update_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "meta_update_member" ON "public"."recipe_production_meta" FOR UPDATE USING ("public"."is_org_member"("org_id"));


--
-- Name: recipe_production_meta meta_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "meta_write_member" ON "public"."recipe_production_meta" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: ocr_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."ocr_jobs" ENABLE ROW LEVEL SECURITY;

--
-- Name: order_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."order_versions" ENABLE ROW LEVEL SECURITY;

--
-- Name: order_versions order_versions_by_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "order_versions_by_member" ON "public"."order_versions" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: org_memberships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."org_memberships" ENABLE ROW LEVEL SECURITY;

--
-- Name: org_plans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."org_plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: org_plans org_plans select by membership; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "org_plans select by membership" ON "public"."org_plans" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."org_memberships" "m"
  WHERE (("m"."org_id" = "org_plans"."org_id") AND ("m"."user_id" = "auth"."uid"())))));


--
-- Name: org_plans org_plans write service role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "org_plans write service role" ON "public"."org_plans" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));


--
-- Name: orgs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."orgs" ENABLE ROW LEVEL SECURITY;

--
-- Name: preparation_process_rules prep_process_rules_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "prep_process_rules_select_member" ON "public"."preparation_process_rules" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: preparation_process_rules prep_process_rules_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "prep_process_rules_write_member" ON "public"."preparation_process_rules" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: preparation_runs prep_runs_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "prep_runs_select_member" ON "public"."preparation_runs" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: preparation_runs prep_runs_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "prep_runs_write_member" ON "public"."preparation_runs" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: preparation_process_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."preparation_process_rules" ENABLE ROW LEVEL SECURITY;

--
-- Name: preparation_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."preparation_runs" ENABLE ROW LEVEL SECURITY;

--
-- Name: preparations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."preparations" ENABLE ROW LEVEL SECURITY;

--
-- Name: preparations preparations_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "preparations_select_member" ON "public"."preparations" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: preparations preparations_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "preparations_write_member" ON "public"."preparations" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: product_barcodes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."product_barcodes" ENABLE ROW LEVEL SECURITY;

--
-- Name: product_barcodes product_barcodes_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_barcodes_select_member" ON "public"."product_barcodes" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: product_barcodes product_barcodes_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "product_barcodes_write_member" ON "public"."product_barcodes" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: production_plans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."production_plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: production_plans production_plans_delete_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_plans_delete_member" ON "public"."production_plans" FOR DELETE USING ("public"."is_org_member"("org_id"));


--
-- Name: production_plans production_plans_read_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_plans_read_member" ON "public"."production_plans" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: production_plans production_plans_update_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_plans_update_member" ON "public"."production_plans" FOR UPDATE USING ("public"."is_org_member"("org_id"));


--
-- Name: production_plans production_plans_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_plans_write_member" ON "public"."production_plans" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: production_tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."production_tasks" ENABLE ROW LEVEL SECURITY;

--
-- Name: production_tasks production_tasks_delete_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_tasks_delete_member" ON "public"."production_tasks" FOR DELETE USING ("public"."is_org_member"("org_id"));


--
-- Name: production_tasks production_tasks_read_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_tasks_read_member" ON "public"."production_tasks" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: production_tasks production_tasks_update_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_tasks_update_member" ON "public"."production_tasks" FOR UPDATE USING ("public"."is_org_member"("org_id"));


--
-- Name: production_tasks production_tasks_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "production_tasks_write_member" ON "public"."production_tasks" FOR INSERT WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_order_lines; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."purchase_order_lines" ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;

--
-- Name: purchasing_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."purchasing_settings" ENABLE ROW LEVEL SECURITY;

--
-- Name: purchasing_settings purchasing_settings_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "purchasing_settings_select" ON "public"."purchasing_settings" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: purchasing_settings purchasing_settings_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "purchasing_settings_write" ON "public"."purchasing_settings" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: recipe_lines; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."recipe_lines" ENABLE ROW LEVEL SECURITY;

--
-- Name: recipe_production_meta; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."recipe_production_meta" ENABLE ROW LEVEL SECURITY;

--
-- Name: recipes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."recipes" ENABLE ROW LEVEL SECURITY;

--
-- Name: reporting_generated_reports; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."reporting_generated_reports" ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduling_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."scheduling_rules" ENABLE ROW LEVEL SECURITY;

--
-- Name: shifts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."shifts" ENABLE ROW LEVEL SECURITY;

--
-- Name: space_bookings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."space_bookings" ENABLE ROW LEVEL SECURITY;

--
-- Name: spaces; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."spaces" ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_assignments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."staff_assignments" ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_compensations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."staff_compensations" ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_extra_shifts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."staff_extra_shifts" ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."staff_members" ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_time_off; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."staff_time_off" ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_vacation_adjustments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."staff_vacation_adjustments" ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_vacation_allowance; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."staff_vacation_allowance" ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_batches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."stock_batches" ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_batches stock_batches_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_batches_select_member" ON "public"."stock_batches" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: stock_batches stock_batches_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_batches_write_member" ON "public"."stock_batches" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: stock_levels; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."stock_levels" ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_levels stock_levels_select_members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_levels_select_members" ON "public"."stock_levels" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: stock_levels stock_levels_write_members; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_levels_write_members" ON "public"."stock_levels" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: stock_movements; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements stock_movements_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_movements_select_member" ON "public"."stock_movements" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: stock_movements stock_movements_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_movements_write_member" ON "public"."stock_movements" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: stock_reservation_lines stock_res_lines_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_res_lines_select_member" ON "public"."stock_reservation_lines" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: stock_reservation_lines stock_res_lines_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_res_lines_write_member" ON "public"."stock_reservation_lines" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: stock_reservations stock_res_select_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_res_select_member" ON "public"."stock_reservations" FOR SELECT USING ("public"."is_org_member"("org_id"));


--
-- Name: stock_reservations stock_res_write_member; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "stock_res_write_member" ON "public"."stock_reservations" USING ("public"."is_org_member"("org_id")) WITH CHECK ("public"."is_org_member"("org_id"));


--
-- Name: stock_reservation_lines; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."stock_reservation_lines" ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_reservations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."stock_reservations" ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_items; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."supplier_items" ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_lead_times; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."supplier_lead_times" ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;

--
-- Name: waste_entries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."waste_entries" ENABLE ROW LEVEL SECURITY;

--
-- Name: waste_reasons; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."waste_reasons" ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "apply_compensation"("p_compensation_id" "uuid", "p_applied_at" "date"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."apply_compensation"("p_compensation_id" "uuid", "p_applied_at" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_compensation"("p_compensation_id" "uuid", "p_applied_at" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_compensation"("p_compensation_id" "uuid", "p_applied_at" "date") TO "service_role";


--
-- Name: FUNCTION "approve_time_off"("p_time_off_id" "uuid", "p_approved" boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."approve_time_off"("p_time_off_id" "uuid", "p_approved" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."approve_time_off"("p_time_off_id" "uuid", "p_approved" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_time_off"("p_time_off_id" "uuid", "p_approved" boolean) TO "service_role";


--
-- Name: FUNCTION "can_use_feature"("feature_key" "text", "p_org_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."can_use_feature"("feature_key" "text", "p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_use_feature"("feature_key" "text", "p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_use_feature"("feature_key" "text", "p_org_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "check_waste_org_consistency"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."check_waste_org_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_waste_org_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_waste_org_consistency"() TO "service_role";


--
-- Name: FUNCTION "compute_recipe_mise_en_place"("p_recipe_id" "uuid", "p_servings" numeric, "p_packs" numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."compute_recipe_mise_en_place"("p_recipe_id" "uuid", "p_servings" numeric, "p_packs" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_recipe_mise_en_place"("p_recipe_id" "uuid", "p_servings" numeric, "p_packs" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_recipe_mise_en_place"("p_recipe_id" "uuid", "p_servings" numeric, "p_packs" numeric) TO "service_role";


--
-- Name: FUNCTION "compute_service_requirements"("p_event_service_id" "uuid", "p_strict" boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."compute_service_requirements"("p_event_service_id" "uuid", "p_strict" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_service_requirements"("p_event_service_id" "uuid", "p_strict" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_service_requirements"("p_event_service_id" "uuid", "p_strict" boolean) TO "service_role";


--
-- Name: FUNCTION "create_preparation_run"("p_org_id" "uuid", "p_preparation_id" "uuid", "p_location_id" "uuid", "p_produced_qty" numeric, "p_produced_unit" "text", "p_produced_at" timestamp with time zone, "p_process_type" "public"."preparation_process", "p_labels_count" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."create_preparation_run"("p_org_id" "uuid", "p_preparation_id" "uuid", "p_location_id" "uuid", "p_produced_qty" numeric, "p_produced_unit" "text", "p_produced_at" timestamp with time zone, "p_process_type" "public"."preparation_process", "p_labels_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_preparation_run"("p_org_id" "uuid", "p_preparation_id" "uuid", "p_location_id" "uuid", "p_produced_qty" numeric, "p_produced_unit" "text", "p_produced_at" timestamp with time zone, "p_process_type" "public"."preparation_process", "p_labels_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_preparation_run"("p_org_id" "uuid", "p_preparation_id" "uuid", "p_location_id" "uuid", "p_produced_qty" numeric, "p_produced_unit" "text", "p_produced_at" timestamp with time zone, "p_process_type" "public"."preparation_process", "p_labels_count" integer) TO "service_role";


--
-- Name: FUNCTION "dashboard_briefing"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."dashboard_briefing"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_briefing"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_briefing"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) TO "service_role";


--
-- Name: FUNCTION "dashboard_event_highlights"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."dashboard_event_highlights"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_event_highlights"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_event_highlights"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) TO "service_role";


--
-- Name: FUNCTION "dashboard_rolling_grid"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."dashboard_rolling_grid"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."dashboard_rolling_grid"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_rolling_grid"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_start" "date", "p_days" integer) TO "service_role";


--
-- Name: FUNCTION "event_service_menus_fill_org"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."event_service_menus_fill_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_service_menus_fill_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_service_menus_fill_org"() TO "service_role";


--
-- Name: FUNCTION "event_services_fill_defaults"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."event_services_fill_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."event_services_fill_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."event_services_fill_defaults"() TO "service_role";


--
-- Name: FUNCTION "events_fill_title"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."events_fill_title"() TO "anon";
GRANT ALL ON FUNCTION "public"."events_fill_title"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."events_fill_title"() TO "service_role";


--
-- Name: FUNCTION "generate_daily_brief"("p_org_id" "uuid", "p_period" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."generate_daily_brief"("p_org_id" "uuid", "p_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_daily_brief"("p_org_id" "uuid", "p_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_daily_brief"("p_org_id" "uuid", "p_period" "text") TO "service_role";


--
-- Name: FUNCTION "generate_event_purchase_orders"("p_event_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."generate_event_purchase_orders"("p_event_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_event_purchase_orders"("p_event_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_event_purchase_orders"("p_event_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean) TO "service_role";


--
-- Name: FUNCTION "generate_production_plan"("p_service_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."generate_production_plan"("p_service_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_production_plan"("p_service_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_production_plan"("p_service_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "generate_production_plan"("p_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."generate_production_plan"("p_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_production_plan"("p_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_production_plan"("p_service_id" "uuid", "p_version_reason" "text", "p_idempotency_key" "text", "p_strict" boolean) TO "service_role";


--
-- Name: FUNCTION "generate_week_roster_v2"("p_hotel_id" "uuid", "week_start" "date", "dry_run" boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."generate_week_roster_v2"("p_hotel_id" "uuid", "week_start" "date", "dry_run" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_week_roster_v2"("p_hotel_id" "uuid", "week_start" "date", "dry_run" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_week_roster_v2"("p_hotel_id" "uuid", "week_start" "date", "dry_run" boolean) TO "service_role";


--
-- Name: FUNCTION "has_org_role"("p_org_id" "uuid", "p_roles" "text"[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_org_role"("p_org_id" "uuid", "p_roles" "text"[]) TO "service_role";


--
-- Name: FUNCTION "import_commit"("p_job_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."import_commit"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."import_commit"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_commit"("p_job_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "import_stage_data"("p_org_id" "uuid", "p_entity" "text", "p_filename" "text", "p_rows" "jsonb"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."import_stage_data"("p_org_id" "uuid", "p_entity" "text", "p_filename" "text", "p_rows" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."import_stage_data"("p_org_id" "uuid", "p_entity" "text", "p_filename" "text", "p_rows" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_stage_data"("p_org_id" "uuid", "p_entity" "text", "p_filename" "text", "p_rows" "jsonb") TO "service_role";


--
-- Name: FUNCTION "import_validate"("p_job_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."import_validate"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."import_validate"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_validate"("p_job_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "is_event_service_member"("p_org" "uuid", "p_service" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_event_service_member"("p_org" "uuid", "p_service" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_event_service_member"("p_org" "uuid", "p_service" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_event_service_member"("p_org" "uuid", "p_service" "uuid") TO "service_role";


--
-- Name: FUNCTION "is_org_member"("p_org_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("p_org_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "join_hotel_atlantico"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."join_hotel_atlantico"() TO "anon";
GRANT ALL ON FUNCTION "public"."join_hotel_atlantico"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_hotel_atlantico"() TO "service_role";


--
-- Name: FUNCTION "list_expiry_alerts"("p_org_id" "uuid", "p_status" "public"."expiry_alert_status"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."list_expiry_alerts"("p_org_id" "uuid", "p_status" "public"."expiry_alert_status") TO "anon";
GRANT ALL ON FUNCTION "public"."list_expiry_alerts"("p_org_id" "uuid", "p_status" "public"."expiry_alert_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_expiry_alerts"("p_org_id" "uuid", "p_status" "public"."expiry_alert_status") TO "service_role";


--
-- Name: FUNCTION "list_inbound_missing_expiry"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_location_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."list_inbound_missing_expiry"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."list_inbound_missing_expiry"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_inbound_missing_expiry"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_location_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "log_event"("p_org_id" "uuid", "p_level" "text", "p_event" "text", "p_metadata" "jsonb"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."log_event"("p_org_id" "uuid", "p_level" "text", "p_event" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_event"("p_org_id" "uuid", "p_level" "text", "p_event" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_event"("p_org_id" "uuid", "p_level" "text", "p_event" "text", "p_metadata" "jsonb") TO "service_role";


--
-- Name: FUNCTION "menu_template_items_fill_defaults"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."menu_template_items_fill_defaults"() TO "anon";
GRANT ALL ON FUNCTION "public"."menu_template_items_fill_defaults"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."menu_template_items_fill_defaults"() TO "service_role";


--
-- Name: FUNCTION "org_list_members"("p_org_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."org_list_members"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."org_list_members"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."org_list_members"("p_org_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "recalc_event_po_total"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."recalc_event_po_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_event_po_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_event_po_total"() TO "service_role";


--
-- Name: FUNCTION "receive_purchase_order"("p_order_id" "uuid", "p_lines" "jsonb"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."receive_purchase_order"("p_order_id" "uuid", "p_lines" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."receive_purchase_order"("p_order_id" "uuid", "p_lines" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."receive_purchase_order"("p_order_id" "uuid", "p_lines" "jsonb") TO "service_role";


--
-- Name: FUNCTION "refresh_po_total"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."refresh_po_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_po_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_po_total"() TO "service_role";


--
-- Name: FUNCTION "register_extra_shift"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_shift_date" "date", "p_hours" numeric, "p_reason" "text", "p_shift_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."register_extra_shift"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_shift_date" "date", "p_hours" numeric, "p_reason" "text", "p_shift_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."register_extra_shift"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_shift_date" "date", "p_hours" numeric, "p_reason" "text", "p_shift_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_extra_shift"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_shift_date" "date", "p_hours" numeric, "p_reason" "text", "p_shift_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "request_time_off"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_notes" "text", "p_approved" boolean); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."request_time_off"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_notes" "text", "p_approved" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."request_time_off"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_notes" "text", "p_approved" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_time_off"("p_org_id" "uuid", "p_staff_member_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_type" "text", "p_notes" "text", "p_approved" boolean) TO "service_role";


--
-- Name: FUNCTION "reserved_qty_by_window"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_item_ids" "uuid"[], "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone, "p_exclude_event_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."reserved_qty_by_window"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_item_ids" "uuid"[], "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone, "p_exclude_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reserved_qty_by_window"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_item_ids" "uuid"[], "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone, "p_exclude_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reserved_qty_by_window"("p_org_id" "uuid", "p_hotel_id" "uuid", "p_item_ids" "uuid"[], "p_window_start" timestamp with time zone, "p_window_end" timestamp with time zone, "p_exclude_event_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "round_qty"("p_qty" numeric, "p_rounding_rule" "text", "p_pack_size" numeric); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."round_qty"("p_qty" numeric, "p_rounding_rule" "text", "p_pack_size" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."round_qty"("p_qty" numeric, "p_rounding_rule" "text", "p_pack_size" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."round_qty"("p_qty" numeric, "p_rounding_rule" "text", "p_pack_size" numeric) TO "service_role";


--
-- Name: FUNCTION "set_created_by_and_validate_attachment"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_created_by_and_validate_attachment"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_created_by_and_validate_attachment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_created_by_and_validate_attachment"() TO "service_role";


--
-- Name: FUNCTION "set_created_by_and_validate_ocr_job"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."set_created_by_and_validate_ocr_job"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_created_by_and_validate_ocr_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_created_by_and_validate_ocr_job"() TO "service_role";


--
-- Name: FUNCTION "space_booking_overlaps"("p_space_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_exclude_booking_id" "uuid"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."space_booking_overlaps"("p_space_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_exclude_booking_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."space_booking_overlaps"("p_space_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_exclude_booking_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."space_booking_overlaps"("p_space_id" "uuid", "p_starts_at" timestamp with time zone, "p_ends_at" timestamp with time zone, "p_exclude_booking_id" "uuid") TO "service_role";


--
-- Name: FUNCTION "touch_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";


--
-- Name: FUNCTION "update_line_total"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."update_line_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_line_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_line_total"() TO "service_role";


--
-- Name: FUNCTION "validate_added_item"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_added_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_added_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_added_item"() TO "service_role";


--
-- Name: FUNCTION "validate_booking_consistency"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_booking_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_booking_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_booking_consistency"() TO "service_role";


--
-- Name: FUNCTION "validate_event_org_consistency"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_event_org_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_event_org_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_org_consistency"() TO "service_role";


--
-- Name: FUNCTION "validate_event_po_line"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_event_po_line"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_event_po_line"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_po_line"() TO "service_role";


--
-- Name: FUNCTION "validate_event_purchase_order"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_event_purchase_order"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_event_purchase_order"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_purchase_order"() TO "service_role";


--
-- Name: FUNCTION "validate_event_service"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_event_service"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_event_service"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_service"() TO "service_role";


--
-- Name: FUNCTION "validate_event_service_menu"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_event_service_menu"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_event_service_menu"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_event_service_menu"() TO "service_role";


--
-- Name: FUNCTION "validate_ingredient_product"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_ingredient_product"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_ingredient_product"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_ingredient_product"() TO "service_role";


--
-- Name: FUNCTION "validate_menu_item_alias"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_menu_item_alias"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_menu_item_alias"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_menu_item_alias"() TO "service_role";


--
-- Name: FUNCTION "validate_menu_template_item"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_menu_template_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_menu_template_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_menu_template_item"() TO "service_role";


--
-- Name: FUNCTION "validate_note_service"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_note_service"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_note_service"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_note_service"() TO "service_role";


--
-- Name: FUNCTION "validate_override_service_and_template"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_override_service_and_template"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_override_service_and_template"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_override_service_and_template"() TO "service_role";


--
-- Name: FUNCTION "validate_po_org_consistency"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_po_org_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_po_org_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_po_org_consistency"() TO "service_role";


--
-- Name: FUNCTION "validate_pol_consistency"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_pol_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_pol_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_pol_consistency"() TO "service_role";


--
-- Name: FUNCTION "validate_production_plan"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_production_plan"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_production_plan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_production_plan"() TO "service_role";


--
-- Name: FUNCTION "validate_recipe_line"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_recipe_line"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_recipe_line"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_recipe_line"() TO "service_role";


--
-- Name: FUNCTION "validate_service_menu_item"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_service_menu_item"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_service_menu_item"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_service_menu_item"() TO "service_role";


--
-- Name: FUNCTION "validate_service_menu_section"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_service_menu_section"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_service_menu_section"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_service_menu_section"() TO "service_role";


--
-- Name: FUNCTION "validate_shift_org"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_shift_org"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_shift_org"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_shift_org"() TO "service_role";


--
-- Name: FUNCTION "validate_space_org_consistency"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_space_org_consistency"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_space_org_consistency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_space_org_consistency"() TO "service_role";


--
-- Name: FUNCTION "validate_staff_assignment"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_staff_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_staff_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_staff_assignment"() TO "service_role";


--
-- Name: FUNCTION "validate_staff_member"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_staff_member"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_staff_member"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_staff_member"() TO "service_role";


--
-- Name: FUNCTION "validate_stock_reservation"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_stock_reservation"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_stock_reservation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_stock_reservation"() TO "service_role";


--
-- Name: FUNCTION "validate_supplier_item_product"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_supplier_item_product"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_supplier_item_product"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_supplier_item_product"() TO "service_role";


--
-- Name: FUNCTION "validate_supplier_lead_time"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."validate_supplier_lead_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_supplier_lead_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_supplier_lead_time"() TO "service_role";


--
-- Name: TABLE "ai_briefs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."ai_briefs" TO "anon";
GRANT ALL ON TABLE "public"."ai_briefs" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_briefs" TO "service_role";


--
-- Name: TABLE "ai_features"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."ai_features" TO "anon";
GRANT ALL ON TABLE "public"."ai_features" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_features" TO "service_role";


--
-- Name: TABLE "audit_logs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";


--
-- Name: TABLE "dashboard_notes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."dashboard_notes" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_notes" TO "service_role";


--
-- Name: TABLE "event_service_menus"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_service_menus" TO "anon";
GRANT ALL ON TABLE "public"."event_service_menus" TO "authenticated";
GRANT ALL ON TABLE "public"."event_service_menus" TO "service_role";


--
-- Name: TABLE "event_services"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_services" TO "anon";
GRANT ALL ON TABLE "public"."event_services" TO "authenticated";
GRANT ALL ON TABLE "public"."event_services" TO "service_role";


--
-- Name: TABLE "events"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";


--
-- Name: TABLE "purchase_orders"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";


--
-- Name: TABLE "dashboard_purchase_event_metrics"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."dashboard_purchase_event_metrics" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_purchase_event_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_purchase_event_metrics" TO "service_role";


--
-- Name: TABLE "event_attachments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_attachments" TO "anon";
GRANT ALL ON TABLE "public"."event_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attachments" TO "service_role";


--
-- Name: TABLE "event_purchase_orders"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."event_purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."event_purchase_orders" TO "service_role";


--
-- Name: TABLE "supplier_lead_times"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."supplier_lead_times" TO "anon";
GRANT ALL ON TABLE "public"."supplier_lead_times" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_lead_times" TO "service_role";


--
-- Name: TABLE "suppliers"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";


--
-- Name: TABLE "event_purchase_order_deadlines"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_purchase_order_deadlines" TO "anon";
GRANT ALL ON TABLE "public"."event_purchase_order_deadlines" TO "authenticated";
GRANT ALL ON TABLE "public"."event_purchase_order_deadlines" TO "service_role";


--
-- Name: TABLE "event_purchase_order_lines"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_purchase_order_lines" TO "anon";
GRANT ALL ON TABLE "public"."event_purchase_order_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."event_purchase_order_lines" TO "service_role";


--
-- Name: TABLE "space_bookings"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."space_bookings" TO "anon";
GRANT ALL ON TABLE "public"."space_bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."space_bookings" TO "service_role";


--
-- Name: TABLE "spaces"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."spaces" TO "anon";
GRANT ALL ON TABLE "public"."spaces" TO "authenticated";
GRANT ALL ON TABLE "public"."spaces" TO "service_role";


--
-- Name: TABLE "event_room_schedule"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_room_schedule" TO "anon";
GRANT ALL ON TABLE "public"."event_room_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."event_room_schedule" TO "service_role";


--
-- Name: TABLE "event_service_added_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_service_added_items" TO "anon";
GRANT ALL ON TABLE "public"."event_service_added_items" TO "authenticated";
GRANT ALL ON TABLE "public"."event_service_added_items" TO "service_role";


--
-- Name: TABLE "event_service_excluded_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_service_excluded_items" TO "anon";
GRANT ALL ON TABLE "public"."event_service_excluded_items" TO "authenticated";
GRANT ALL ON TABLE "public"."event_service_excluded_items" TO "service_role";


--
-- Name: TABLE "event_service_menu_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_service_menu_items" TO "anon";
GRANT ALL ON TABLE "public"."event_service_menu_items" TO "authenticated";
GRANT ALL ON TABLE "public"."event_service_menu_items" TO "service_role";


--
-- Name: TABLE "event_service_menu_sections"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_service_menu_sections" TO "anon";
GRANT ALL ON TABLE "public"."event_service_menu_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."event_service_menu_sections" TO "service_role";


--
-- Name: TABLE "event_service_notes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_service_notes" TO "anon";
GRANT ALL ON TABLE "public"."event_service_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."event_service_notes" TO "service_role";


--
-- Name: TABLE "event_service_replaced_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."event_service_replaced_items" TO "anon";
GRANT ALL ON TABLE "public"."event_service_replaced_items" TO "authenticated";
GRANT ALL ON TABLE "public"."event_service_replaced_items" TO "service_role";


--
-- Name: TABLE "expiry_alerts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."expiry_alerts" TO "anon";
GRANT ALL ON TABLE "public"."expiry_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."expiry_alerts" TO "service_role";


--
-- Name: TABLE "expiry_rules"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."expiry_rules" TO "anon";
GRANT ALL ON TABLE "public"."expiry_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."expiry_rules" TO "service_role";


--
-- Name: TABLE "hotels"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."hotels" TO "anon";
GRANT ALL ON TABLE "public"."hotels" TO "authenticated";
GRANT ALL ON TABLE "public"."hotels" TO "service_role";


--
-- Name: TABLE "import_jobs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."import_jobs" TO "anon";
GRANT ALL ON TABLE "public"."import_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."import_jobs" TO "service_role";


--
-- Name: TABLE "import_rows"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."import_rows" TO "anon";
GRANT ALL ON TABLE "public"."import_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."import_rows" TO "service_role";


--
-- Name: TABLE "inbound_shipment_lines"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."inbound_shipment_lines" TO "anon";
GRANT ALL ON TABLE "public"."inbound_shipment_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."inbound_shipment_lines" TO "service_role";


--
-- Name: TABLE "inbound_shipments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."inbound_shipments" TO "anon";
GRANT ALL ON TABLE "public"."inbound_shipments" TO "authenticated";
GRANT ALL ON TABLE "public"."inbound_shipments" TO "service_role";


--
-- Name: TABLE "ingredients"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."ingredients" TO "anon";
GRANT ALL ON TABLE "public"."ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredients" TO "service_role";


--
-- Name: TABLE "inventory_locations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."inventory_locations" TO "anon";
GRANT ALL ON TABLE "public"."inventory_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_locations" TO "service_role";


--
-- Name: TABLE "menu_item_aliases"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."menu_item_aliases" TO "anon";
GRANT ALL ON TABLE "public"."menu_item_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_item_aliases" TO "service_role";


--
-- Name: TABLE "menu_item_recipe_aliases"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."menu_item_recipe_aliases" TO "anon";
GRANT ALL ON TABLE "public"."menu_item_recipe_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_item_recipe_aliases" TO "service_role";


--
-- Name: TABLE "menu_template_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."menu_template_items" TO "anon";
GRANT ALL ON TABLE "public"."menu_template_items" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_template_items" TO "service_role";


--
-- Name: TABLE "menu_templates"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."menu_templates" TO "anon";
GRANT ALL ON TABLE "public"."menu_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."menu_templates" TO "service_role";


--
-- Name: TABLE "ocr_jobs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."ocr_jobs" TO "anon";
GRANT ALL ON TABLE "public"."ocr_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."ocr_jobs" TO "service_role";


--
-- Name: TABLE "order_versions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."order_versions" TO "anon";
GRANT ALL ON TABLE "public"."order_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."order_versions" TO "service_role";


--
-- Name: TABLE "org_memberships"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."org_memberships" TO "anon";
GRANT ALL ON TABLE "public"."org_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."org_memberships" TO "service_role";


--
-- Name: TABLE "org_plans"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."org_plans" TO "anon";
GRANT ALL ON TABLE "public"."org_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."org_plans" TO "service_role";


--
-- Name: TABLE "orgs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."orgs" TO "anon";
GRANT ALL ON TABLE "public"."orgs" TO "authenticated";
GRANT ALL ON TABLE "public"."orgs" TO "service_role";


--
-- Name: TABLE "preparation_process_rules"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."preparation_process_rules" TO "anon";
GRANT ALL ON TABLE "public"."preparation_process_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."preparation_process_rules" TO "service_role";


--
-- Name: TABLE "preparation_runs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."preparation_runs" TO "anon";
GRANT ALL ON TABLE "public"."preparation_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."preparation_runs" TO "service_role";


--
-- Name: TABLE "preparations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."preparations" TO "anon";
GRANT ALL ON TABLE "public"."preparations" TO "authenticated";
GRANT ALL ON TABLE "public"."preparations" TO "service_role";


--
-- Name: TABLE "product_barcodes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."product_barcodes" TO "anon";
GRANT ALL ON TABLE "public"."product_barcodes" TO "authenticated";
GRANT ALL ON TABLE "public"."product_barcodes" TO "service_role";


--
-- Name: TABLE "products"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";


--
-- Name: TABLE "purchase_order_lines"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."purchase_order_lines" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_lines" TO "service_role";


--
-- Name: TABLE "supplier_items"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."supplier_items" TO "anon";
GRANT ALL ON TABLE "public"."supplier_items" TO "authenticated";
GRANT ALL ON TABLE "public"."supplier_items" TO "service_role";


--
-- Name: TABLE "product_weighted_costs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."product_weighted_costs" TO "anon";
GRANT ALL ON TABLE "public"."product_weighted_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."product_weighted_costs" TO "service_role";


--
-- Name: TABLE "production_plans"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."production_plans" TO "anon";
GRANT ALL ON TABLE "public"."production_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."production_plans" TO "service_role";


--
-- Name: TABLE "production_tasks"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."production_tasks" TO "anon";
GRANT ALL ON TABLE "public"."production_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."production_tasks" TO "service_role";


--
-- Name: TABLE "purchasing_settings"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."purchasing_settings" TO "anon";
GRANT ALL ON TABLE "public"."purchasing_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."purchasing_settings" TO "service_role";


--
-- Name: TABLE "recipe_lines"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."recipe_lines" TO "anon";
GRANT ALL ON TABLE "public"."recipe_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_lines" TO "service_role";


--
-- Name: TABLE "recipes"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."recipes" TO "anon";
GRANT ALL ON TABLE "public"."recipes" TO "authenticated";
GRANT ALL ON TABLE "public"."recipes" TO "service_role";


--
-- Name: TABLE "recipe_cost_breakdown"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."recipe_cost_breakdown" TO "anon";
GRANT ALL ON TABLE "public"."recipe_cost_breakdown" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_cost_breakdown" TO "service_role";


--
-- Name: TABLE "recipe_cost_summary"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."recipe_cost_summary" TO "anon";
GRANT ALL ON TABLE "public"."recipe_cost_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_cost_summary" TO "service_role";


--
-- Name: TABLE "recipe_production_meta"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."recipe_production_meta" TO "anon";
GRANT ALL ON TABLE "public"."recipe_production_meta" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_production_meta" TO "service_role";


--
-- Name: TABLE "reporting_generated_reports"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."reporting_generated_reports" TO "anon";
GRANT ALL ON TABLE "public"."reporting_generated_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reporting_generated_reports" TO "service_role";


--
-- Name: TABLE "scheduling_rules"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."scheduling_rules" TO "anon";
GRANT ALL ON TABLE "public"."scheduling_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduling_rules" TO "service_role";


--
-- Name: TABLE "shifts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."shifts" TO "anon";
GRANT ALL ON TABLE "public"."shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."shifts" TO "service_role";


--
-- Name: TABLE "staff_assignments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."staff_assignments" TO "anon";
GRANT ALL ON TABLE "public"."staff_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_assignments" TO "service_role";


--
-- Name: TABLE "staff_compensations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."staff_compensations" TO "anon";
GRANT ALL ON TABLE "public"."staff_compensations" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_compensations" TO "service_role";


--
-- Name: TABLE "staff_members"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."staff_members" TO "anon";
GRANT ALL ON TABLE "public"."staff_members" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_members" TO "service_role";


--
-- Name: TABLE "staff_compensation_balances"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."staff_compensation_balances" TO "anon";
GRANT ALL ON TABLE "public"."staff_compensation_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_compensation_balances" TO "service_role";


--
-- Name: TABLE "staff_extra_shifts"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."staff_extra_shifts" TO "anon";
GRANT ALL ON TABLE "public"."staff_extra_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_extra_shifts" TO "service_role";


--
-- Name: TABLE "staff_time_off"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."staff_time_off" TO "anon";
GRANT ALL ON TABLE "public"."staff_time_off" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_time_off" TO "service_role";


--
-- Name: TABLE "staff_vacation_adjustments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."staff_vacation_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."staff_vacation_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_vacation_adjustments" TO "service_role";


--
-- Name: TABLE "staff_vacation_allowance"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."staff_vacation_allowance" TO "anon";
GRANT ALL ON TABLE "public"."staff_vacation_allowance" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_vacation_allowance" TO "service_role";


--
-- Name: TABLE "staff_vacation_balances"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."staff_vacation_balances" TO "anon";
GRANT ALL ON TABLE "public"."staff_vacation_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_vacation_balances" TO "service_role";


--
-- Name: TABLE "stock_batches"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."stock_batches" TO "anon";
GRANT ALL ON TABLE "public"."stock_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_batches" TO "service_role";


--
-- Name: TABLE "stock_levels"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."stock_levels" TO "anon";
GRANT ALL ON TABLE "public"."stock_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_levels" TO "service_role";


--
-- Name: TABLE "stock_movements"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";


--
-- Name: TABLE "stock_reservation_lines"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."stock_reservation_lines" TO "anon";
GRANT ALL ON TABLE "public"."stock_reservation_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_reservation_lines" TO "service_role";


--
-- Name: TABLE "stock_reservations"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."stock_reservations" TO "anon";
GRANT ALL ON TABLE "public"."stock_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_reservations" TO "service_role";


--
-- Name: TABLE "waste_entries"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."waste_entries" TO "anon";
GRANT ALL ON TABLE "public"."waste_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."waste_entries" TO "service_role";


--
-- Name: TABLE "waste_reasons"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."waste_reasons" TO "anon";
GRANT ALL ON TABLE "public"."waste_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."waste_reasons" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--

-- \unrestrict 0zXg1OPQf2NAbkfZm9Y3w3O3b5mleXIpUngKP3e5dJqjxFi0rUOmSAXNZsBH1yo

