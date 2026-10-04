// supabase/functions/send-whatsapp/index.ts
// Seven Pedidos Escolares — Evolution API v2.3.6 WhatsApp Gateway
// Escopo: envio transacional SEGURO de confirmação de pedido
// Anti-relay: aceita SOMENTE order_id, valida pedido no Supabase,
// monta template server-side, envia exclusivamente para o telefone do pedido.
// NÃO expõe secrets, NÃO loga credenciais, NÃO altera banco/schema.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendRequest {
  order_id?: string;
}

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_whatsapp: string;
  total_amount_cents: number;
  payment_method: string;
  payment_status: string;
  qr_token: string;
  items?: Array<{
    student_name: string;
    class_name: string;
    size_label: string;
    quantity: number;
  }>;
}

interface EvolutionResponse {
  key?: { id?: string };
  message?: Record<string, unknown>;
  [key: string]: unknown;
}

function sanitizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function formatCurrency(cents: number): string {
  const reais = cents / 100;
  return `R$ ${reais.toFixed(2).replace(".", ",")}`;
}

function buildConfirmationMessage(order: OrderRow): string {
  const isPix = order.payment_method === "PIX";
  const paymentStatus =
    order.payment_status === "PAGO"
      ? "✅ Pago"
      : isPix
        ? "⏳ Aguardando PIX"
        : "⏳ Pagar na Loja";

  let itemsSummary = "";
  (order.items || []).forEach((item) => {
    itemsSummary += `\n• ${item.student_name} (${item.class_name}) Tam.${item.size_label} x${item.quantity}`;
  });

  // Link seguro por order_number — NUNCA qr_token
  const publicUrl = `https://pedidoescolar.vercel.app/consulta?pedido=${encodeURIComponent(order.order_number)}`;

  return `🎉 *Seven Pedidos Escolares*
Pedido *${order.order_number}* confirmado!
👤 Responsável: ${order.customer_name}
📦 Itens:${itemsSummary}
💰 Total: ${formatCurrency(order.total_amount_cents)}
💳 Pagamento: ${paymentStatus}
📋 Acompanhe seu pedido:
${publicUrl}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read secrets from Deno.env (Supabase Edge Functions runtime)
  const apiUrl = Deno.env.get("EVOLUTION_API_URL");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");
  const instance = Deno.env.get("EVOLUTION_INSTANCE");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiUrl || !apiKey || !instance) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing Evolution secrets" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing Supabase secrets" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Parse request body — accepts ONLY order_id
  let body: SendRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const orderId = body.order_id?.trim();
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Valid order_id (UUID) is required",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Validate order exists in Supabase using service role (server-side only)
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_whatsapp, total_amount_cents, payment_method, payment_status, qr_token",
    )
    .eq("id", orderId)
    .single();

  if (orderError || !orderData) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Order not found",
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Fetch order items separately
  const { data: itemsData } = await supabase
    .from("order_items")
    .select("student_name, class_name, size_label, quantity")
    .eq("order_id", orderId);

  const order: OrderRow = {
    ...orderData,
    items: itemsData || [],
  };

  // Validate phone number exists on the order
  const cleanPhone = (order.customer_whatsapp || "").replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Order has no valid phone number",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Build message server-side from validated order data
  const message = buildConfirmationMessage(order);

  // Call Evolution API v2.3.6 sendText endpoint
  const evolutionUrl = `${apiUrl}/message/sendText/${encodeURIComponent(instance)}`;

  try {
    const res = await fetch(evolutionUrl, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    });

    const responseText = await res.text();
    let data: EvolutionResponse = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      // Non-JSON response
    }

    if (!res.ok) {
      const sanitizedBody = responseText.substring(0, 300);
      return new Response(
        JSON.stringify({
          success: false,
          http_status: res.status,
          error: `Evolution API HTTP ${res.status}: ${sanitizedBody}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Success — return sanitized confirmation (no secrets, no phone, no full message)
    return new Response(
      JSON.stringify({
        success: true,
        message_id: data.key?.id || null,
        provider: "evolution-api",
        order_number: order.order_number,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Evolution API exception: ${sanitizeError(err)}`,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});