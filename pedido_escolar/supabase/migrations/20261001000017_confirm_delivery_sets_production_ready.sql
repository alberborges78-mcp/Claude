-- ==============================================================================
-- SEVEN PEDIDOS ESCOLARES — CONFIRM DELIVERY SETS PRODUCTION READY
-- Migration: 20261001000017_confirm_delivery_sets_production_ready.sql
-- Objetivo: Quando a retirada é confirmada, production_status deve virar PRONTO
--           atomicamente junto com delivery_status = ENTREGUE.
-- Regra: NÃO bloquear retirada se production_status ainda estiver PENDENTE ou EM_PRODUCAO.
--        A confirmação da retirada sincroniza ambos os status.
-- Segurança: Preserva SECURITY DEFINER, search_path, auth admin, RLS, grants/revokes,
--            validações financeiras e idempotência existentes.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rpc_confirm_delivery(
    p_order_id UUID,
    p_admin_user TEXT,
    p_recipient_name TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT 'Retirado na loja'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
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

    -- Concurrency Guard: strictly reject duplicate delivery
    IF v_order.delivery_status = 'ENTREGUE' THEN
        RAISE EXCEPTION 'ORDER_ALREADY_DELIVERED: Este pedido já foi retirado anteriormente. Segunda entrega bloqueada!';
    END IF;

    -- Financial Guard: block delivery if not paid
    IF v_order.payment_status != 'PAGO' THEN
        RAISE EXCEPTION 'PAYMENT_REQUIRED: Pagamento pendente. Libere financeiramente antes de entregar.';
    END IF;

    -- Atomically update BOTH statuses: delivery + production
    -- Rule: confirming pickup always sets production to PRONTO regardless of prior state
    UPDATE orders
    SET delivery_status = 'ENTREGUE',
        production_status = 'PRONTO',
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
        gen_random_uuid(),
        p_order_id,
        NOW(),
        p_admin_user,
        COALESCE(p_recipient_name, v_order.customer_name),
        p_notes,
        NOW()
    );

    -- Log Timeline Event
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
        gen_random_uuid(),
        p_order_id,
        'DELIVERY_UPDATED',
        v_order.delivery_status,
        'ENTREGUE',
        'ADMIN',
        p_admin_user,
        'Entrega realizada por ' || p_admin_user || ' para ' || COALESCE(p_recipient_name, v_order.customer_name) || '. Produção sincronizada para PRONTO.',
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'delivery_status', 'ENTREGUE', 'production_status', 'PRONTO');
END;
$function$;

-- Preserve existing grants (no REVOKE needed; CREATE OR REPLACE keeps them)
GRANT EXECUTE ON FUNCTION rpc_confirm_delivery(UUID, TEXT, TEXT, TEXT) TO authenticated;