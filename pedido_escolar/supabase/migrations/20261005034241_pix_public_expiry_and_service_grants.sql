grant update (pix_txid, pix_code, payment_status, pix_expires_at) on table public.orders to service_role;

create or replace function public.rpc_get_public_order_by_qr(p_qr_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
    v_order record;
    v_school record;
    v_campaign record;
    v_items jsonb;
    v_masked_phone text;
    v_len integer;
begin
    select * into v_order from orders where qr_token = p_qr_token;
    if not found then return null; end if;

    select * into v_campaign from campaigns where id = v_order.campaign_id;
    select * into v_school from schools where id = v_campaign.school_id;

    select jsonb_agg(
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
                select coalesce(jsonb_agg(
                    jsonb_build_object(
                        'piece_index', ip.piece_index,
                        'student_name', ip.student_name,
                        'custom_name', ip.custom_name,
                        'custom_number', ip.custom_number
                    ) order by ip.piece_index
                ), '[]'::jsonb)
                from item_personalizations ip
                where ip.order_item_id = oi.id
            )
        )
    ) into v_items
    from order_items oi
    where oi.order_id = v_order.id;

    v_len := length(v_order.customer_whatsapp);
    if v_len >= 8 then
        v_masked_phone := substr(v_order.customer_whatsapp, 1, 5) || '****' || substr(v_order.customer_whatsapp, v_len - 3, 4);
    else
        v_masked_phone := '****';
    end if;

    return jsonb_build_object(
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
        'pix_expires_at', v_order.pix_expires_at,
        'created_at', v_order.created_at,
        'school', jsonb_build_object('name', v_school.name),
        'campaign', jsonb_build_object('name', v_campaign.name, 'delivery_estimate', v_campaign.delivery_estimate),
        'items', coalesce(v_items, '[]'::jsonb)
    );
end;
$function$;
