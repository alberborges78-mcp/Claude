// supabase/functions/send-whatsapp/index.ts
// Seven Pedidos Escolares — Evolution API v2.3.6 WhatsApp Gateway
// Escopo: envio transacional de confirmação de pedido
// NÃO expõe secrets, NÃO loga credenciais, NÃO altera banco/schema.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface SendRequest {
  phone?: string;
  message?: string;
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

serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Read secrets from Deno.env (Supabase Edge Functions runtime)
  const apiUrl = Deno.env.get("EVOLUTION_API_URL");
  const apiKey = Deno.env.get("EVOLUTION_API_KEY");
  const instance = Deno.env.get("EVOLUTION_INSTANCE");

  if (!apiUrl || !apiKey || !instance) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing server-side secrets" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse request body
  let body: SendRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const phone = body.phone?.trim();
  const message = body.message?.trim();

  if (!phone || !message) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing phone or message" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Normalize phone to digits only with country code
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid phone number" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Call Evolution API v2.3.6 sendText endpoint
  const evolutionUrl = `${apiUrl}/message/sendText/${encodeURIComponent(instance)}`;

  try {
    const res = await fetch(evolutionUrl, {
      method: "POST",
      headers: {
        "apikey": apiKey,
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
      // Sanitize: never include apikey in error
      const sanitizedBody = responseText.substring(0, 300);
      return new Response(
        JSON.stringify({
          success: false,
          http_status: res.status,
          error: `Evolution API HTTP ${res.status}: ${sanitizedBody}`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Success — return sanitized confirmation
    return new Response(
      JSON.stringify({
        success: true,
        message_id: data.key?.id || null,
        provider: "evolution-api",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Evolution API exception: ${sanitizeError(err)}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
});