-- RPC para obtener el contexto de un pedido (org_id y hotel_id) de forma segura
-- Esto permite a la UI obtener los IDs necesarios para validaciones sin tener que adivinarlos o usar fallbacks.

CREATE OR REPLACE FUNCTION get_purchase_order_context(p_order_id UUID)
RETURNS TABLE (
  org_id UUID,
  hotel_id UUID,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT po.org_id, po.hotel_id, po.status::TEXT
  FROM purchase_orders po
  WHERE po.id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para Postgraphile/Supabase
COMMENT ON FUNCTION get_purchase_order_context(UUID) IS 'Obtiene org_id y hotel_id de un pedido de compra.';

-- RPC para asertar pertenencia a organización y hotel
-- Útil antes de mutaciones críticas para asegurar que el usuario no está intentando saltarse RLS.
CREATE OR REPLACE FUNCTION assert_membership_and_hotel(p_org_id UUID, p_hotel_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verificar membresía en la organización
  SELECT count(*) INTO v_count
  FROM org_memberships
  WHERE org_id = p_org_id AND user_id = auth.uid();
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'No eres miembro de esta organización' USING ERRCODE = 'P0001';
  END IF;

  -- Verificar que el hotel pertenece a la organización
  SELECT count(*) INTO v_count
  FROM hotels
  WHERE id = p_hotel_id AND org_id = p_org_id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'El hotel no pertenece a la organización especificada' USING ERRCODE = 'P0002';
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER; -- SECURITY INVOKER para que respete RLS si aplica

COMMENT ON FUNCTION assert_membership_and_hotel(UUID, UUID) IS 'Valida que el usuario pertenezca a la org y que el hotel pertenezca a dicha org.';
