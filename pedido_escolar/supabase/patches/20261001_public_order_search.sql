-- ==============================================================================
-- PATCH: Public Order Search, Capability Tokens & Protected Details RPCs
-- File: supabase/patches/20261001_public_order_search.sql
-- Description: Allows searching orders by Order Number, Customer Name, or WhatsApp,
-- generating short-lived cryptographic lookup tokens for safe detail retrieval.
-- ==============================================================================

-- 1. Ephemeral public lookup tokens table
CREATE TABLE IF NOT EXISTS public_order_lookup_tokens (
    id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
    token_hash TEXT NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token validation
CREATE INDEX IF NOT EXISTS idx_lookup_tokens_hash_exp ON public_order_lookup_tokens (token_hash, expires_at);
CREATE INDEX IF NOT EXISTS idx_lookup_tokens_order_id ON public_order_lookup_tokens (order_id);

-- Enable RLS (locked down: zero direct public access)
ALTER TABLE public_order_lookup_tokens ENABLE ROW LEVEL SECURITY;

-- 2. SEARCH RPC: rpc_search_public_orders
CREATE OR REPLACE FUNCTION rpc_search_public_orders(
    p_order_number TEXT DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_whatsapp TEXT DEFAULT NULL,
    p_page INTEGER DEFAULT 1,
    p_page_size INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean_order_number TEXT;
    v_clean_customer_name TEXT;
    v_clean_phone TEXT;
    v_param_count INTEGER := 0;
    v_limit INTEGER;
    v_offset INTEGER;
    v_total_count INTEGER := 0;
    v_order_rec RECORD;
    v_raw_token TEXT;
    v_token_hash TEXT;
    v_expires_at TIMESTAMPTZ;
    v_masked_phone TEXT;
    v_items_list JSONB := '[]'::jsonb;
    v_len INTEGER;
BEGIN
    -- Normalize inputs
    v_clean_order_number := upper(trim(coalesce(p_order_number, '')));
    v_clean_customer_name := lower(trim(coalesce(p_customer_name, '')));
    v_clean_phone := regexp_replace(coalesce(p_customer_whatsapp, ''), '\D', '', 'g');

    -- Prepend Brazil country code 55 if standard 10 or 11 digits
    IF length(v_clean_phone) IN (10, 11) AND NOT (v_clean_phone LIKE '55%') THEN
        v_clean_phone := '55' || v_clean_phone;
    END IF;

    -- Count valid criteria
    IF v_clean_order_number <> '' THEN
        v_param_count := v_param_count + 1;
    END IF;
    IF length(v_clean_customer_name) >= 3 THEN
        v_param_count := v_param_count + 1;
    END IF;
    IF length(v_clean_phone) >= 8 THEN
        v_param_count := v_param_count + 1;
    END IF;

    -- Strict single criterion rule: exactly ONE criterion must be present
    IF v_param_count <> 1 THEN
        RETURN jsonb_build_object(
            'items', '[]'::jsonb,
            'total_count', 0,
            'page', GREATEST(1, coalesce(p_page, 1)),
            'page_size', GREATEST(1, LEAST(coalesce(p_page_size, 10), 50)),
            'has_more', false
        );
    END IF;

    -- Pagination bounds
    v_limit := GREATEST(1, LEAST(coalesce(p_page_size, 10), 50));
    v_offset := (GREATEST(1, coalesce(p_page, 1)) - 1) * v_limit;

    -- Periodic cleanup of expired lookup tokens
    DELETE FROM public_order_lookup_tokens WHERE expires_at < now();

    -- Count total matching rows (exact normalized matches)
    IF v_clean_order_number <> '' THEN
        SELECT count(*) INTO v_total_count 
        FROM orders 
        WHERE upper(trim(order_number)) = v_clean_order_number;
    ELSIF length(v_clean_phone) >= 8 THEN
        SELECT count(*) INTO v_total_count 
        FROM orders 
        WHERE regexp_replace(customer_whatsapp, '\D', '', 'g') = v_clean_phone;
    ELSIF length(v_clean_customer_name) >= 3 THEN
        SELECT count(*) INTO v_total_count 
        FROM orders 
        WHERE lower(trim(customer_name)) = v_clean_customer_name;
    END IF;

    -- Fetch paginated orders (without exposing internal UUID)
    FOR v_order_rec IN
        SELECT 
            o.id AS order_id,
            o.order_number,
            o.customer_name,
            o.customer_whatsapp,
            o.total_amount_cents,
            o.total_items,
            o.payment_method,
            o.order_status,
            o.payment_status,
            o.production_status,
            o.delivery_status,
            o.created_at,
            s.name AS school_name,
            c.name AS campaign_name
        FROM orders o
        JOIN campaigns c ON c.id = o.campaign_id
        JOIN schools s ON s.id = c.school_id
        WHERE 
            (v_clean_order_number <> '' AND upper(trim(o.order_number)) = v_clean_order_number)
            OR (v_clean_order_number = '' AND length(v_clean_phone) >= 8 AND (
                regexp_replace(o.customer_whatsapp, '\D', '', 'g') = v_clean_phone
            ))
            OR (v_clean_order_number = '' AND length(v_clean_phone) < 8 AND length(v_clean_customer_name) >= 3 AND (
                lower(trim(o.customer_name)) = v_clean_customer_name
            ))
        ORDER BY o.created_at DESC
        LIMIT v_limit OFFSET v_offset
    LOOP
        -- Generate cryptographically random 256-bit token (64 hex chars) via extensions.gen_random_bytes
        v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
        v_token_hash := encode(extensions.digest(v_raw_token, 'sha256'), 'hex');
        v_expires_at := now() + interval '15 minutes';

        -- Store only token hash in lookup tokens table
        INSERT INTO public_order_lookup_tokens (token_hash, order_id, expires_at)
        VALUES (v_token_hash, v_order_rec.order_id, v_expires_at);

        -- Privacy phone masking (+5596****1859)
        v_len := length(v_order_rec.customer_whatsapp);
        IF v_len >= 8 THEN
            v_masked_phone := substr(v_order_rec.customer_whatsapp, 1, 5) || '****' || substr(v_order_rec.customer_whatsapp, v_len - 3, 4);
        ELSE
            v_masked_phone := '****';
        END IF;

        -- Append item to list (NO internal order UUID is exposed)
        v_items_list := v_items_list || jsonb_build_object(
            'order_number', v_order_rec.order_number,
            'customer_name', v_order_rec.customer_name,
            'customer_whatsapp_masked', v_masked_phone,
            'total_amount_cents', v_order_rec.total_amount_cents,
            'total_items', v_order_rec.total_items,
            'payment_method', v_order_rec.payment_method,
            'order_status', v_order_rec.order_status,
            'payment_status', v_order_rec.payment_status,
            'production_status', v_order_rec.production_status,
            'delivery_status', v_order_rec.delivery_status,
            'created_at', v_order_rec.created_at,
            'school_name', v_order_rec.school_name,
            'campaign_name', v_order_rec.campaign_name,
            'lookup_token', v_raw_token,
            'lookup_token_expires_at', v_expires_at
        );
    END LOOP;

    RETURN jsonb_build_object(
        'items', v_items_list,
        'total_count', v_total_count,
        'page', GREATEST(1, coalesce(p_page, 1)),
        'page_size', v_limit,
        'has_more', (v_offset + v_limit) < v_total_count
    );
END;
$$;

-- 3. DETAILS RPC: rpc_get_public_order_details
CREATE OR REPLACE FUNCTION rpc_get_public_order_details(
    p_lookup_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token_hash TEXT;
    v_order_id UUID;
    v_order RECORD;
    v_campaign RECORD;
    v_school RECORD;
    v_items JSONB;
    v_masked_phone TEXT;
    v_len INTEGER;
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
        'items', coalesce(v_items, '[]'::jsonb)
    );
END;
$$;

-- 4. PERMISSIONS & SECURITY
REVOKE ALL ON TABLE public_order_lookup_tokens FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION rpc_search_public_orders(TEXT, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_search_public_orders(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION rpc_get_public_order_details(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION rpc_get_public_order_details(TEXT) TO anon, authenticated;
