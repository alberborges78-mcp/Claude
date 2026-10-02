-- ==============================================================================
-- SEVEN PEDIDOS ESCOLARES — SECURE MANUAL ORDER LOOKUP (CREDENTIALS-BASED)
-- Migration: 20261001000002_order_lookup_credentials.sql
-- ==============================================================================

CREATE OR REPLACE FUNCTION rpc_lookup_order_by_credentials(
    p_order_number TEXT,
    p_student_name TEXT,
    p_customer_name TEXT,
    p_customer_whatsapp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_order_number TEXT;
    v_clean_student_name TEXT;
    v_clean_customer_name TEXT;
    v_clean_phone TEXT;
    v_order RECORD;
    v_school RECORD;
    v_campaign RECORD;
    v_items JSONB;
    v_masked_phone TEXT;
    v_len INTEGER;
BEGIN
    -- 1. All four parameters are mandatory
    IF p_order_number IS NULL OR trim(p_order_number) = '' OR
       p_student_name IS NULL OR trim(p_student_name) = '' OR
       p_customer_name IS NULL OR trim(p_customer_name) = '' OR
       p_customer_whatsapp IS NULL OR trim(p_customer_whatsapp) = '' THEN
        RETURN NULL;
    END IF;

    -- 2. Normalization
    v_clean_order_number := upper(trim(p_order_number));
    v_clean_student_name := lower(trim(p_student_name));
    v_clean_customer_name := lower(trim(p_customer_name));
    
    -- Extract only digits from phone
    v_clean_phone := regexp_replace(trim(p_customer_whatsapp), '\D', '', 'g');
    
    -- If phone provided without Brazilian country code (10 or 11 digits), prepend 55 for E.164 parity
    IF length(v_clean_phone) IN (10, 11) AND NOT (v_clean_phone LIKE '55%') THEN
        v_clean_phone := '55' || v_clean_phone;
    END IF;

    -- 3. Match Order by order_number, customer_name, and phone
    SELECT * INTO v_order 
    FROM orders 
    WHERE upper(trim(order_number)) = v_clean_order_number
      AND lower(trim(customer_name)) = v_clean_customer_name
      AND regexp_replace(customer_whatsapp, '\D', '', 'g') = v_clean_phone;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- 4. Validate that student_name exists on at least one item of THIS exact order
    IF NOT EXISTS (
        SELECT 1 
        FROM order_items oi 
        WHERE oi.order_id = v_order.id 
          AND lower(trim(oi.student_name)) = v_clean_student_name
    ) THEN
        RETURN NULL;
    END IF;

    -- 5. Fetch Campaign and School info
    SELECT * INTO v_campaign FROM campaigns WHERE id = v_order.campaign_id;
    SELECT * INTO v_school FROM schools WHERE id = v_campaign.school_id;

    -- 6. Aggregate items & personalizations
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', oi.id,
            'class_id', oi.class_id,
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

    -- 7. Privacy phone masking (same pattern as rpc_get_public_order_by_qr)
    v_len := length(v_order.customer_whatsapp);
    IF v_len >= 8 THEN
        v_masked_phone := substr(v_order.customer_whatsapp, 1, 5) || '****' || substr(v_order.customer_whatsapp, v_len - 3, 4);
    ELSE
        v_masked_phone := '****';
    END IF;

    -- 8. Return secure JSON payload (Omit qr_token and unmasked phone)
    RETURN jsonb_build_object(
        'id', v_order.id,
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
        'items', coalesce(v_items, '[]'::jsonb)
    );
END;
$$;

-- Permissions: Executable by public anon and authenticated users
GRANT EXECUTE ON FUNCTION rpc_lookup_order_by_credentials(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
