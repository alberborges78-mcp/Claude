-- ==============================================================================
-- SEVEN PEDIDOS ESCOLARES — PUBLIC DELIVERY DETAILS IN ORDER LOOKUP
-- Migration: 20261001000016_public_delivery_details.sql
-- Objetivo: Acrescentar recipient_name e delivered_at ao RPC público
--           SOMENTE quando delivery_status = 'ENTREGUE'.
-- Segurança: Não expõe qr_token, delivered_by_admin, telefone completo ou IDs internos.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_public_order_details(p_lookup_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_token_hash TEXT;
    v_order_id UUID;
    v_order RECORD;
    v_campaign RECORD;
    v_school RECORD;
    v_items JSONB;
    v_masked_phone TEXT;
    v_len INTEGER;
    v_delivery RECORD;
BEGIN
    IF p_lookup_token IS NULL OR trim(p_lookup_token) = '' THEN
        RETURN NULL;
    END IF;

    -- Calculate hash of provided token via extensions.digest
    v_token_hash := encode(extensions.digest(trim(p_lookup_token), 'sha256'), 'hex');

    -- Locate valid unexpired token
    SELECT order_id INTO v_order_id
    FROM public_order_lookup_tokens
    WHERE token_hash = v_token_hash
      AND expires_at > now();

    IF NOT FOUND OR v_order_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Fetch order
    SELECT * INTO v_order
    FROM orders
    WHERE id = v_order_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Fetch Campaign and School
    SELECT * INTO v_campaign FROM campaigns WHERE id = v_order.campaign_id;
    SELECT * INTO v_school FROM schools WHERE id = v_campaign.school_id;

    -- Aggregate items and personalizations (internal oi.id and class_id omitted for public privacy)
    SELECT jsonb_agg(
        jsonb_build_object(
            'class_name', oi.class_name,
            'student_name', oi.student_name,
            'size_label', oi.size_label,
            'unit_price_cents', oi.unit_price_cents,
            'quantity', oi.quantity,
            'subtotal_cents', oi.subtotal_cents,
            'personalizations', (
                SELECT coalesce(jsonb_agg(
                    jsonb_build_object(
                        'piece_index', ip.piece_index,
                        'student_name', ip.student_name,
                        'custom_name', ip.custom_name,
                        'custom_number', ip.custom_number
                    ) ORDER BY ip.piece_index
                ), '[]'::jsonb)
                FROM item_personalizations ip
                WHERE ip.order_item_id = oi.id
            )
        )
    ) INTO v_items
    FROM order_items oi
    WHERE oi.order_id = v_order.id;

    -- Privacy phone masking
    v_len := length(v_order.customer_whatsapp);
    IF v_len >= 8 THEN
        v_masked_phone := substr(v_order.customer_whatsapp, 1, 5) || '****' || substr(v_order.customer_whatsapp, v_len - 3, 4);
    ELSE
        v_masked_phone := '****';
    END IF;

    -- Fetch delivery data ONLY when order is marked as delivered
    IF v_order.delivery_status = 'ENTREGUE' THEN
        SELECT recipient_name, delivered_at
        INTO v_delivery
        FROM deliveries
        WHERE order_id = v_order.id
        ORDER BY delivered_at DESC NULLS LAST
        LIMIT 1;
    END IF;

    -- Return full order details (Omit qr_token, unmasked phone, and internal admin data)
    RETURN jsonb_build_object(
        'order_number', v_order.order_number,
        'customer_name', v_order.customer_name,
        'customer_whatsapp_masked', v_masked_phone,
        'total_amount_cents', v_order.total_amount_cents,
        'total_items', v_order.total_items,
        'payment_method', v_order.payment_method,
        'order_status', v_order.order_status,
        'payment_status', v_order.payment_status,
        'production_status', v_order.production_status,
        'delivery_status', v_order.delivery_status,
        'pix_code', v_order.pix_code,
        'created_at', v_order.created_at,
        'school', jsonb_build_object('name', v_school.name),
        'campaign', jsonb_build_object('name', v_campaign.name, 'delivery_estimate', v_campaign.delivery_estimate),
        'items', coalesce(v_items, '[]'::jsonb),
        'delivery_recipient_name', CASE WHEN v_order.delivery_status = 'ENTREGUE' THEN v_delivery.recipient_name ELSE NULL END,
        'delivered_at', CASE WHEN v_order.delivery_status = 'ENTREGUE' THEN v_delivery.delivered_at ELSE NULL END
    );
END;
$function$;