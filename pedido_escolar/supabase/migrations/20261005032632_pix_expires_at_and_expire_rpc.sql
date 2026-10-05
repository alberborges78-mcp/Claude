-- Migration: 20261001000020_pix_expires_at_and_expire_rpc.sql
-- Reason: Add pix_expires_at column to orders and create internal RPC for safe PIX expiration.
-- PIX expiration is 6 hours (21600 seconds). Expiration NEVER happens based on local clock alone.
-- The cron/scheduler must consult BB GET /cob/{txid} BEFORE calling this RPC.
-- This RPC only marks PIX_EXPIRADO + CANCELADO when the caller has already verified with BB
-- that the charge is truly unpaid/expired. FAIL-SAFE: if BB is unreachable, do NOT call this RPC.

-- 1. Add pix_expires_at column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pix_expires_at TIMESTAMPTZ;

-- 2. Grant minimum necessary permissions for service_role to update pix_expires_at
-- (bb-pix-create needs to persist this field; other fields were granted in previous migrations)
GRANT UPDATE (pix_expires_at) ON orders TO service_role;

-- 3. Internal RPC for atomic PIX expiration/cancellation
-- Called ONLY by server-side Edge Functions with service_role after BB verification.
-- NOT exposed to anon/authenticated users.
CREATE OR REPLACE FUNCTION rpc_expire_pix_order(
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
BEGIN
    -- Lock order row to prevent race conditions with concurrent confirmations or other expirations
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- Idempotency: already paid → NEVER expire
    IF v_order.payment_status = 'PAGO' THEN
        RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', p_order_id);
    END IF;

    -- Idempotency: already cancelled/expired → no-op
    IF v_order.order_status = 'CANCELADO' THEN
        RETURN jsonb_build_object('success', true, 'already_cancelled', true, 'order_id', p_order_id);
    END IF;

    -- Guard: only PIX orders can be expired via this RPC
    IF v_order.payment_method != 'PIX' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'NOT_PIX_ORDER',
            'order_id', p_order_id
        );
    END IF;

    -- Validate txid matches persisted pix_txid
    IF v_order.pix_txid IS NULL OR v_order.pix_txid != p_txid THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'TXID_MISMATCH',
            'expected', v_order.pix_txid,
            'provided', p_txid
        );
    END IF;

    -- Only expire if payment_status is still AGUARDANDO_PIX
    IF v_order.payment_status != 'AGUARDANDO_PIX' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_PAYMENT_STATUS_FOR_EXPIRATION',
            'current_status', v_order.payment_status,
            'order_id', p_order_id
        );
    END IF;

    -- 1. Update payment_status to PIX_EXPIRADO and order_status to CANCELADO
    UPDATE orders
    SET payment_status = 'PIX_EXPIRADO',
        order_status = 'CANCELADO',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- LACUNA_AUDITORIA_EVENTO_EXPIRACAO: Schema only allows 'ORDER_CREATED' and 'PAYMENT_CONFIRMED'.
    -- Neither is semantically correct for PIX expiration/cancellation.
    -- Event insertion is intentionally OMITTED to avoid false audit records.
    -- A future migration must add a proper event type (e.g., 'PIX_EXPIRED') to order_status_events.

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'payment_status', 'PIX_EXPIRADO',
        'order_status', 'CANCELADO',
        'expired_at', NOW()
    );
END;
$$;

-- SECURITY: Revoke from PUBLIC/anon/authenticated. Only service_role can call this.
REVOKE ALL ON FUNCTION rpc_expire_pix_order(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_expire_pix_order(UUID, TEXT) TO service_role;