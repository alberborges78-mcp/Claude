-- ==============================================================================
-- RPC: ATOMIC UPDATE PRODUCTION STATUS
-- Migration: 20261001000012_rpc_update_production_status.sql
-- Reason: Persist production_status changes securely with admin validation,
--         row-level locking, cancellation guard, idempotency and audit trail.
-- NOTE: actor_id is derived EXCLUSIVELY from auth.uid(). No client-supplied
--       identity is accepted for audit purposes.
-- ==============================================================================

CREATE OR REPLACE FUNCTION rpc_update_production_status(
    p_order_id UUID,
    p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_actor_id TEXT;
BEGIN
    -- 1. Authentication & Authorization (exclusively via auth.uid())
    IF NOT EXISTS (
        SELECT 1 FROM admin_profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Acesso restrito a administradores autorizados.';
    END IF;

    v_actor_id := auth.uid()::TEXT;

    -- 2. Validate new status
    IF p_new_status NOT IN ('PENDENTE', 'EM_PRODUCAO', 'PRONTO') THEN
        RAISE EXCEPTION 'INVALID_STATUS: Status de produção inválido. Valores aceitos: PENDENTE, EM_PRODUCAO, PRONTO.';
    END IF;

    -- 3. Row-level lock
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Pedido não encontrado.';
    END IF;

    -- 4. Block cancelled orders
    IF v_order.order_status = 'CANCELADO' THEN
        RAISE EXCEPTION 'ORDER_CANCELLED: Não é possível alterar produção de um pedido cancelado.';
    END IF;

    -- 5. Idempotency: no-op if status unchanged
    IF v_order.production_status = p_new_status THEN
        RETURN jsonb_build_object(
            'success', true,
            'order_id', p_order_id,
            'production_status', p_new_status,
            'changed', false
        );
    END IF;

    -- 6. Update production_status and updated_at ONLY
    UPDATE orders
    SET production_status = p_new_status,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 7. Audit event with actor_id from auth.uid() exclusively
    INSERT INTO order_status_events (
        order_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_id,
        notes,
        created_at
    ) VALUES (
        p_order_id,
        'PRODUCTION_UPDATED',
        v_order.production_status,
        p_new_status,
        'ADMIN',
        v_actor_id,
        'Status de produção alterado de ' || v_order.production_status || ' para ' || p_new_status,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'production_status', p_new_status,
        'changed', true
    );
END;
$$;

-- Revoke public execution; only authenticated admins can call via RPC
REVOKE ALL ON FUNCTION rpc_update_production_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_update_production_status(UUID, TEXT) TO authenticated;