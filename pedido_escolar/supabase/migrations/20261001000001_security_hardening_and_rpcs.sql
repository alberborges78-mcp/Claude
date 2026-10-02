-- ==============================================================================
-- SEVEN PEDIDOS ESCOLARES — HARDENING & SERVER-SIDE RPCs
-- Migration: 20261001000001_security_hardening_and_rpcs.sql
-- ==============================================================================

-- 1. WHATSAPP OUTBOX TABLE (Idempotent asynchronous messaging queue)
CREATE TABLE IF NOT EXISTS whatsapp_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('ORDER_CREATED', 'PAYMENT_CONFIRMED')),
    recipient_whatsapp TEXT NOT NULL,
    payload_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_status ON whatsapp_outbox(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_order_id ON whatsapp_outbox(order_id);

-- 2. HARDENED CONSTRAINTS ON PAYMENTS
ALTER TABLE payments ADD CONSTRAINT uq_payments_tx_reference UNIQUE (transaction_reference);

-- 3. RLS HARDENING: Anonymous / Public role can NEVER directly insert/update/delete/select sensitive tables
-- Revoke all direct mutations and direct access from anon
REVOKE ALL ON orders FROM anon;
REVOKE ALL ON order_items FROM anon;
REVOKE ALL ON item_personalizations FROM anon;
REVOKE ALL ON payments FROM anon;
REVOKE ALL ON deliveries FROM anon;
REVOKE ALL ON order_status_events FROM anon;
REVOKE ALL ON whatsapp_outbox FROM anon;
REVOKE ALL ON admin_profiles FROM anon;

-- Grant strictly read-only catalog access to anon
GRANT SELECT ON stores TO anon;
GRANT SELECT ON schools TO anon;
GRANT SELECT ON campaigns TO anon;
GRANT SELECT ON classes TO anon;
GRANT SELECT ON campaign_prices TO anon;

-- Drop permissive public select/insert policies on orders
DROP POLICY IF EXISTS "Public select order by qr_token" ON orders;
DROP POLICY IF EXISTS "Public insert orders" ON orders;
DROP POLICY IF EXISTS "Public insert order_items" ON order_items;
DROP POLICY IF EXISTS "Public insert item_personalizations" ON item_personalizations;

-- Drop previous catalog public read policies before recreating
DROP POLICY IF EXISTS "Public read stores" ON stores;
DROP POLICY IF EXISTS "Public read schools" ON schools;
DROP POLICY IF EXISTS "Public read campaigns" ON campaigns;
DROP POLICY IF EXISTS "Public read classes" ON classes;
DROP POLICY IF EXISTS "Public read campaign_prices" ON campaign_prices;
DROP POLICY IF EXISTS "Public read active stores" ON stores;
DROP POLICY IF EXISTS "Public read active schools" ON schools;
DROP POLICY IF EXISTS "Public read active campaigns" ON campaigns;
DROP POLICY IF EXISTS "Public read active classes" ON classes;
DROP POLICY IF EXISTS "Public read campaign prices" ON campaign_prices;

-- Public can ONLY read active campaigns, classes and prices
CREATE POLICY "Public read active stores" ON stores FOR SELECT TO anon USING (true);
CREATE POLICY "Public read active schools" ON schools FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public read active campaigns" ON campaigns FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public read active classes" ON classes FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public read campaign prices" ON campaign_prices FOR SELECT TO anon USING (true);

-- 4. RPC: CREATE ORDER (SERVER-SIDE PRICE RECALCULATION & SNAPSHOT)
CREATE OR REPLACE FUNCTION rpc_create_order(
    p_campaign_id UUID,
    p_customer_name TEXT,
    p_customer_whatsapp TEXT,
    p_payment_method TEXT,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_campaign RECORD;
    v_item JSONB;
    v_class RECORD;
    v_price_cents INTEGER;
    v_subtotal_cents INTEGER;
    v_total_amount_cents INTEGER := 0;
    v_total_items INTEGER := 0;
    v_order_id UUID;
    v_order_number TEXT;
    v_qr_token TEXT;
    v_order_item_id UUID;
    v_order_seq INTEGER;
    v_year TEXT;
    v_piece JSONB;
    v_piece_idx INTEGER;
    v_custom_name TEXT;
    v_custom_number TEXT;
    v_item_qty INTEGER;
    v_payment_status TEXT;
    v_result JSONB;
BEGIN
    -- 1. Validate Campaign
    SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'CAMPAIGN_NOT_FOUND: Campanha não encontrada ou inativa.';
    END IF;

    IF NOW() > v_campaign.ends_at THEN
        RAISE EXCEPTION 'CAMPAIGN_CLOSED: Esta campanha já encerrou o período de pedidos.';
    END IF;

    -- 2. Validate WhatsApp Phone Format (E.164)
    IF p_customer_whatsapp !~ '^\+[1-9][0-9]{9,14}$' THEN
        RAISE EXCEPTION 'INVALID_PHONE: Número de WhatsApp inválido no formato E.164 (+55...).';
    END IF;

    -- 3. Validate Payment Method
    IF p_payment_method NOT IN ('PIX', 'LOJA') THEN
        RAISE EXCEPTION 'INVALID_PAYMENT_METHOD: Forma de pagamento inválida.';
    END IF;

    v_payment_status := CASE WHEN p_payment_method = 'PIX' THEN 'AGUARDANDO_PIX' ELSE 'NAO_PAGO' END;

    -- 4. Validate Items Array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_ORDER: O pedido deve conter pelo menos um item.';
    END IF;

    -- 5. Pre-validation & Pre-calculation loop (NO DB writes)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Verify Class belongs to this campaign
        IF NOT EXISTS (
            SELECT 1 FROM classes 
            WHERE id = (v_item->>'class_id')::UUID AND campaign_id = p_campaign_id
        ) THEN
            RAISE EXCEPTION 'CLASS_NOT_FOUND: Turma % não pertence a esta campanha.', v_item->>'class_id';
        END IF;

        -- Strictly lookup official price in database
        SELECT price_cents INTO v_price_cents
        FROM campaign_prices
        WHERE campaign_id = p_campaign_id AND size_label = (v_item->>'size_label');

        IF v_price_cents IS NULL OR v_price_cents <= 0 THEN
            RAISE EXCEPTION 'PRICE_NOT_FOUND: Preço não configurado para o tamanho %.', v_item->>'size_label';
        END IF;

        v_item_qty := (v_item->>'quantity')::INTEGER;
        IF v_item_qty <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Quantidade deve ser maior que zero.';
        END IF;

        v_subtotal_cents := v_price_cents * v_item_qty;
        v_total_amount_cents := v_total_amount_cents + v_subtotal_cents;
        v_total_items := v_total_items + v_item_qty;
    END LOOP;

    -- Ensure total_items > 0
    IF v_total_items <= 0 THEN
        RAISE EXCEPTION 'EMPTY_ORDER: O pedido deve conter pelo menos um item válido.';
    END IF;

    -- 6. Generate sequential friendly order number & secure token
    v_year := to_char(NOW(), 'YYYY');
    SELECT COUNT(*) + 1 INTO v_order_seq FROM orders WHERE to_char(created_at, 'YYYY') = v_year;
    v_order_number := 'SEV-' || v_year || '-' || lpad(v_order_seq::TEXT, 4, '0');
    v_qr_token := encode(extensions.gen_random_bytes(24), 'hex');
    v_order_id := extensions.uuid_generate_v4();

    -- 7. Insert Order Header directly with verified calculated totals
    INSERT INTO orders (
        id,
        order_number,
        campaign_id,
        customer_name,
        customer_whatsapp,
        total_amount_cents,
        total_items,
        payment_method,
        order_status,
        payment_status,
        production_status,
        delivery_status,
        qr_token,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        v_order_number,
        p_campaign_id,
        trim(p_customer_name),
        trim(p_customer_whatsapp),
        v_total_amount_cents,
        v_total_items,
        p_payment_method,
        'CONFIRMADO',
        v_payment_status,
        'PENDENTE',
        'AGUARDANDO_RETIRADA',
        v_qr_token,
        NOW(),
        NOW()
    );

    -- 8. Insert Order Items & Personalizations
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_class FROM classes 
        WHERE id = (v_item->>'class_id')::UUID AND campaign_id = p_campaign_id;

        SELECT price_cents INTO v_price_cents
        FROM campaign_prices
        WHERE campaign_id = p_campaign_id AND size_label = (v_item->>'size_label');

        v_item_qty := (v_item->>'quantity')::INTEGER;
        v_subtotal_cents := v_price_cents * v_item_qty;
        v_order_item_id := extensions.uuid_generate_v4();

        -- Insert order item with authoritative price snapshot
        INSERT INTO order_items (
            id,
            order_id,
            class_id,
            class_name,
            student_name,
            size_label,
            unit_price_cents,
            quantity,
            subtotal_cents,
            created_at
        ) VALUES (
            v_order_item_id,
            v_order_id,
            v_class.id,
            v_class.name,
            trim(v_item->>'student_name'),
            v_item->>'size_label',
            v_price_cents,
            v_item_qty,
            v_subtotal_cents,
            NOW()
        );

        -- Insert individual piece personalizations if provided
        FOR v_piece_idx IN 1..v_item_qty
        LOOP
            v_custom_name := NULL;
            v_custom_number := NULL;

            IF v_item ? 'personalizations' THEN
                SELECT 
                    nullif(trim(p->>'custom_name'), ''),
                    nullif(trim(p->>'custom_number'), '')
                INTO v_custom_name, v_custom_number
                FROM jsonb_array_elements(v_item->'personalizations') p
                WHERE (p->>'piece_index')::INTEGER = v_piece_idx;
            END IF;

            INSERT INTO item_personalizations (
                id,
                order_item_id,
                piece_index,
                student_name,
                custom_name,
                custom_number,
                created_at
            ) VALUES (
                extensions.uuid_generate_v4(),
                v_order_item_id,
                v_piece_idx,
                trim(v_item->>'student_name'),
                v_custom_name,
                v_custom_number,
                NOW()
            );
        END LOOP;
    END LOOP;

    -- 9. Log Timeline Event
    INSERT INTO order_status_events (
        id,
        order_id,
        event_type,
        to_status,
        actor_type,
        actor_id,
        notes,
        created_at
    ) VALUES (
        extensions.uuid_generate_v4(),
        v_order_id,
        'ORDER_CREATED',
        'CONFIRMADO',
        'CUSTOMER',
        p_customer_name,
        'Pedido criado com recálculo autoritativo server-side.',
        NOW()
    );

    -- 10. Queue message in outbox for asynchronous backend dispatch
    INSERT INTO whatsapp_outbox (
        order_id,
        event_type,
        recipient_whatsapp,
        payload_text,
        status,
        created_at
    ) VALUES (
        v_order_id,
        'ORDER_CREATED',
        p_customer_whatsapp,
        'Pedido ' || v_order_number || ' registrado com sucesso.',
        'PENDING',
        NOW()
    );

    -- 11. Return JSON summary
    SELECT jsonb_build_object(
        'id', v_order_id,
        'order_number', v_order_number,
        'qr_token', v_qr_token,
        'total_amount_cents', v_total_amount_cents,
        'total_items', v_total_items,
        'payment_status', v_payment_status,
        'created_at', NOW()
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 5. RPC: ATOMIC CONFIRM PAYMENT
CREATE OR REPLACE FUNCTION rpc_confirm_payment(
    p_order_id UUID,
    p_admin_user TEXT,
    p_method TEXT DEFAULT 'LOJA',
    p_tx_reference TEXT DEFAULT NULL
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
    -- Authentication & Authorization validation for admin actions
    IF NOT EXISTS (
        SELECT 1 FROM admin_profiles 
        WHERE id = auth.uid() 
          AND role = 'admin' 
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Acesso restrito a administradores autorizados.';
    END IF;

    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Pedido não encontrado.';
    END IF;

    -- Idempotency check: If already paid, return safely without duplicated events
    IF v_order.payment_status = 'PAGO' THEN
        RETURN jsonb_build_object('success', true, 'already_paid', true, 'order_id', p_order_id);
    END IF;

    v_ref := COALESCE(p_tx_reference, 'MANUAL_' || to_char(NOW(), 'YYYYMMDDHH24MISS') || '_' || substr(p_order_id::TEXT, 1, 8));

    -- Update Order
    UPDATE orders 
    SET payment_status = 'PAGO',
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Insert Payment Record with idempotency
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
        uuid_generate_v4(),
        p_order_id,
        v_order.total_amount_cents,
        p_method,
        'CONFIRMADO',
        NOW(),
        p_admin_user,
        v_ref,
        NOW()
    ) ON CONFLICT (transaction_reference) DO NOTHING;

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
        'PAYMENT_UPDATED',
        v_order.payment_status,
        'PAGO',
        'ADMIN',
        p_admin_user,
        'Pagamento de R$ ' || (v_order.total_amount_cents / 100.0)::NUMERIC(10,2) || ' confirmado por ' || p_admin_user,
        NOW()
    );

    -- Queue WhatsApp Payment Confirmation
    INSERT INTO whatsapp_outbox (
        order_id,
        event_type,
        recipient_whatsapp,
        payload_text,
        status,
        created_at
    ) VALUES (
        p_order_id,
        'PAYMENT_CONFIRMED',
        v_order.customer_whatsapp,
        'Pagamento confirmado para o pedido ' || v_order.order_number,
        'PENDING',
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'payment_status', 'PAGO');
END;
$$;

-- 6. RPC: ATOMIC CONFIRM DELIVERY (RACE-CONDITION & DOUBLE-PICKUP IMMUNE)
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
        uuid_generate_v4(),
        p_order_id,
        'DELIVERY_UPDATED',
        'AGUARDANDO_RETIRADA',
        'ENTREGUE',
        'ADMIN',
        p_admin_user,
        'Entrega realizada por ' || p_admin_user || ' para ' || COALESCE(p_recipient_name, v_order.customer_name),
        NOW()
    );

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'delivery_status', 'ENTREGUE');
END;
$$;

-- 7. RPC: SAFE PUBLIC QR LOOKUP (NON-ENUMERABLE TOKEN WITH PRIVACY PROTECTION)
CREATE OR REPLACE FUNCTION rpc_get_public_order_by_qr(p_qr_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order RECORD;
    v_school RECORD;
    v_campaign RECORD;
    v_items JSONB;
    v_masked_phone TEXT;
    v_len INTEGER;
BEGIN
    SELECT * INTO v_order FROM orders WHERE qr_token = p_qr_token;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT * INTO v_campaign FROM campaigns WHERE id = v_order.campaign_id;
    SELECT * INTO v_school FROM schools WHERE id = v_campaign.school_id;

    -- Aggregate items & personalizations
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

    -- Privacy phone masking
    v_len := length(v_order.customer_whatsapp);
    IF v_len >= 8 THEN
        v_masked_phone := substr(v_order.customer_whatsapp, 1, 5) || '****' || substr(v_order.customer_whatsapp, v_len - 3, 4);
    ELSE
        v_masked_phone := '****';
    END IF;

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
        'qr_token', v_order.qr_token,
        'pix_code', v_order.pix_code,
        'created_at', v_order.created_at,
        'school', jsonb_build_object('name', v_school.name),
        'campaign', jsonb_build_object('name', v_campaign.name, 'delivery_estimate', v_campaign.delivery_estimate),
        'items', coalesce(v_items, '[]'::jsonb)
    );
END;
$$;

-- 8. EXECUTION PERMISSIONS (LEAST PRIVILEGE)
-- Public RPCs: Callable by anonymous and authenticated users
GRANT EXECUTE ON FUNCTION rpc_create_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_public_order_by_qr TO anon, authenticated;

-- Admin-only RPCs: NEVER executable by anon
REVOKE EXECUTE ON FUNCTION rpc_confirm_payment(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rpc_confirm_payment(UUID, TEXT, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION rpc_confirm_delivery(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rpc_confirm_delivery(UUID, TEXT, TEXT, TEXT) TO authenticated;

