-- Migration: 20261001000019_rpc_confirm_pix_payment_bb.sql
-- Reason: Internal RPC for automatic PIX payment confirmation via Banco do Brasil.
-- Called ONLY by server-side Edge Functions (pix-check-status) with service_role.
-- NOT exposed to anon/authenticated users.
-- Idempotent: safe to call multiple times for the same order.
-- Atomic: updates payment_status, inserts payment record and timeline event in one transaction.

CREATE OR REPLACE FUNCTION rpc_confirm_pix_payment_bb(
    p_order_id UUID,
    p_txid TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_ref TEXT;
BEGIN
    -- Lock order row to prevent race conditions with concurrent confirmations or cron jobs
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- Idempotency: already paid → return success without re-processing
    IF v_order.payment_status = 'PAGO' THEN
        RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', p_order_id);
    END IF;

    -- Guard: never confirm payment on a cancelled order
    IF v_order.order_status = 'CANCELADO' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ORDER_CANCELLED',
            'order_id', p_order_id
        );
    END IF;

    -- Validate that the order has a matching pix_txid before confirming
    IF v_order.pix_txid IS NULL OR v_order.pix_txid != p_txid THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'TXID_MISMATCH',
            'expected', v_order.pix_txid,
            'provided', p_txid
        );
    END IF;

    -- Build transaction reference for audit trail
    v_ref := 'BB_AUTO_' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '_' || substr(p_order_id::TEXT, 1, 8);

    -- 1. Update order payment status atomically
    UPDATE orders
    SET payment_status = 'PAGO',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 2. Insert payment record (idempotent via ON CONFLICT)
    INSERT INTO payments (
        id,
        order_id,
        amount_cents,
        method,
        status,
        confirmed_at,
        confirmed_by_admin,
        transaction_reference,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_order_id,
        v_order.total_amount_cents,
        'PIX',
        'CONFIRMADO',
        NOW(),
        'BB_AUTO_CONFIRM',
        v_ref,
        NOW()
    ) ON CONFLICT (transaction_reference) DO NOTHING;

    -- 3. Insert timeline event for audit
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
        'PAYMENT_CONFIRMED',
        v_order.payment_status,
        'PAGO',
        'SYSTEM',
        NULL,
        'Confirmação automática via Banco do Brasil PIX (status CONCLUIDA). TXID: ' || p_txid,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'payment_status', 'PAGO',
        'confirmed_at', NOW(),
        'transaction_reference', v_ref
    );
END;
$$;

-- SECURITY: Revoke from PUBLIC/anon/authenticated. Only service_role can call this.
REVOKE ALL ON FUNCTION rpc_confirm_pix_payment_bb(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_confirm_pix_payment_bb(UUID, TEXT) TO service_role;