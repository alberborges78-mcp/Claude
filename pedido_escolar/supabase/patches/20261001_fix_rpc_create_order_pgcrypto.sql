-- ==============================================================================
-- PATCH: Fix pgcrypto schema qualification & pre-calculate totals for rpc_create_order
-- File: supabase/patches/20261001_fix_rpc_create_order_pgcrypto.sql
-- ==============================================================================

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

-- Permissions
GRANT EXECUTE ON FUNCTION rpc_create_order TO anon, authenticated;
