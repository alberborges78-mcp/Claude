-- ==============================================================================
-- FIX: Block delivery of unpaid orders in rpc_confirm_delivery
-- Migration: 20261001000011_block_delivery_unpaid.sql
-- Reason: Prevent administrative error or fraud by ensuring payment_status = 'PAGO'
-- before allowing delivery confirmation. This adds a database-level guard
-- in addition to the frontend UI check.
-- ==============================================================================
-- Read the current function source and add the payment check after the FOR UPDATE lock
-- We will recreate the function with the additional validation
CREATE OR REPLACE FUNCTION rpc_confirm_delivery(
    p_order_id UUID,
    p_admin_user TEXT,
    p_recipient_name TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT 'Retirado na loja'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
BEGIN
    -- Authentication & Authorization validation for admin delivery action
    IF NOT EXISTS (
        SELECT 1 FROM admin_profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Acesso restrito a administradores autorizados.';
    END IF;

    -- Strict row-level lock
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Pedido não encontrado.';
    END IF;

    -- NEW: Block delivery if payment is not confirmed
    IF v_order.payment_status != 'PAGO' THEN
        RAISE EXCEPTION 'PAYMENT_REQUIRED: Pagamento pendente. Confirme o pagamento antes de entregar o pedido.';
    END IF;

    -- Concurrency Guard: strictly reject duplicate delivery
    IF v_order.delivery_status = 'ENTREGUE' THEN
        RAISE EXCEPTION 'ORDER_ALREADY_DELIVERED: Este pedido já foi retirado anteriormente. Segunda entrega bloqueada!';
    END IF;

    -- Atomically update status
    UPDATE orders
    SET delivery_status = 'ENTREGUE',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Record in deliveries table
    INSERT INTO deliveries (
        id,
        order_id,
        delivered_at,
        delivered_by_admin,
        recipient_name,
        notes,
        created_at
    ) VALUES (
        uuid_generate_v4(),
        p_order_id,
        NOW(),
        p_admin_user,
        COALESCE(p_recipient_name, v_order.customer_name),
        p_notes,
        NOW()
    );

    -- Timeline event
    INSERT INTO order_status_events (
        id,
        order_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_id,
        notes,
        created_at
    ) VALUES (
        uuid_generate_v4(),
        p_order_id,
        'DELIVERY_CONFIRMED',
        v_order.delivery_status,
        'ENTREGUE',
        'ADMIN',
        p_admin_user,
        'Pedido entregue para ' || COALESCE(p_recipient_name, v_order.customer_name) || '. Obs: ' || p_notes,
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'delivery_status', 'ENTREGUE');
END;
$$;

-- Ensure GRANTs are preserved
REVOKE EXECUTE ON FUNCTION rpc_confirm_delivery(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rpc_confirm_delivery(UUID, TEXT, TEXT, TEXT) TO authenticated;