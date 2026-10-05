// supabase/functions/pix-check-status/index.ts
// Seven Pedidos Escolares — Consulta real de cobrança PIX no Banco do Brasil
// Escopo: GET /cob/{txid} + confirmação automática server-side quando CONCLUIDA
// FAIL-SAFE: qualquer erro mantém pedido pendente; NENHUM cancelamento/expiração aqui.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BB_CLIENT_ID = Deno.env.get("BB_CLIENT_ID")!;
const BB_CLIENT_SECRET = Deno.env.get("BB_CLIENT_SECRET")!;
const BB_APP_KEY = Deno.env.get("BB_APP_KEY")!;
const BB_MTLS_CERT = Deno.env.get("BB_MTLS_CERT")!;
const BB_MTLS_KEY = Deno.env.get("BB_MTLS_KEY")!;
const BB_PIX_ENV = Deno.env.get("BB_PIX_ENV") || "sandbox";

const OAUTH_URL =
  BB_PIX_ENV === "production"
    ? "https://oauth.bb.com.br/oauth/token"
    : "https://oauth.hm.bb.com.br/oauth/token";

const PIX_BASE_URL =
  BB_PIX_ENV === "production"
    ? "https://api-pix.bb.com.br/pix/v2"
    : "https://api-pix.hm.bb.com.br/pix/v2";

if (!BB_MTLS_CERT || !BB_MTLS_KEY) {
  throw new Error("Missing BB_MTLS_CERT or BB_MTLS_KEY");
}

const mtlsClient = Deno.createHttpClient({
  cert: BB_MTLS_CERT,
  key: BB_MTLS_KEY,
});

interface BbCobResponse {
  txid?: string;
  status?: string;
  pixCopiaECola?: string;
  valor?: { original?: string };
  [key: string]: unknown;
}

function sanitizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

async function getOAuthToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  try {
    const credentials = btoa(`${BB_CLIENT_ID}:${BB_CLIENT_SECRET}`);
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "cob.read",
    });
    const res = await fetch(OAUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      client: mtlsClient,
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `OAuth HTTP ${res.status}: ${text.substring(0, 200)}` };
    }
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) {
      return { ok: false, error: "OAuth response missing access_token" };
    }
    return { ok: true, token: data.access_token };
  } catch (err) {
    return { ok: false, error: `OAuth exception: ${sanitizeError(err)}` };
  }
}

// Maximum candidates to process per batch invocation to prevent timeout
const MAX_BATCH_SIZE = 20;

// Statuses from BB that definitively indicate the charge is no longer payable
const BB_EXPIRED_STATUSES = ["EXPIRADA", "REMOVIDA_PELO_USUARIO_RECEBEDOR", "REMOVIDA_PELO_PSP"];

interface OrderRow {
  id: string;
  pix_txid: string | null;
  total_amount_cents: number;
  payment_status: string;
}

async function processSingleOrder(
  orderId: string,
  oauthToken: string,
  corsHeaders: Record<string, string>,
): Promise<{
  order_id: string;
  action: "confirmed" | "expired" | "pending" | "failed";
  bb_status?: string;
  error?: string;
}> {
  // Load order server-side
  let order: OrderRow;
  try {
    const orderRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,pix_txid,total_amount_cents,payment_status`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Accept: "application/json",
        },
      },
    );
    if (!orderRes.ok) {
      return { order_id: orderId, action: "failed", error: `Order lookup HTTP ${orderRes.status}` };
    }
    const rows = (await orderRes.json()) as OrderRow[];
    if (!rows || rows.length === 0) {
      return { order_id: orderId, action: "failed", error: "Order not found" };
    }
    order = rows[0];
  } catch (err) {
    return { order_id: orderId, action: "failed", error: sanitizeError(err) };
  }

  // Already paid → skip
  if (order.payment_status === "PAGO") {
    return { order_id: orderId, action: "pending", bb_status: "ALREADY_PAID" };
  }

  // No txid → skip
  if (!order.pix_txid) {
    return { order_id: orderId, action: "failed", error: "No pix_txid" };
  }

  // GET /cob/{txid}
  let bbData: BbCobResponse;
  try {
    const url = `${PIX_BASE_URL}/cob/${encodeURIComponent(order.pix_txid)}?gw-dev-app-key=${encodeURIComponent(BB_APP_KEY)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${oauthToken}`,
        Accept: "application/json",
      },
      client: mtlsClient,
    });
    if (!res.ok) {
      const text = await res.text();
      return { order_id: orderId, action: "failed", error: `BB GET /cob HTTP ${res.status}: ${text.substring(0, 200)}` };
    }
    bbData = (await res.json()) as BbCobResponse;
  } catch (err) {
    return { order_id: orderId, action: "failed", error: `BB GET /cob exception: ${sanitizeError(err)}` };
  }

  // Validate txid
  if (bbData.txid !== order.pix_txid) {
    return { order_id: orderId, action: "failed", error: `txid mismatch: expected ${order.pix_txid}, got ${bbData.txid || "null"}` };
  }

  // Validate valor
  const bbValorStr = bbData.valor?.original;
  const expectedValor = (order.total_amount_cents / 100).toFixed(2);
  if (bbValorStr !== expectedValor) {
    return { order_id: orderId, action: "failed", error: `valor mismatch: order=${expectedValor}, BB=${bbValorStr || "null"}` };
  }

  const bbStatus = bbData.status || "DESCONHECIDO";

  // CONCLUIDA → confirm payment
  if (bbStatus === "CONCLUIDA") {
    try {
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_confirm_pix_payment_bb`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_order_id: orderId, p_txid: order.pix_txid }),
      });
      if (!rpcRes.ok) {
        const rpcText = await rpcRes.text();
        return { order_id: orderId, action: "failed", bb_status: bbStatus, error: `Confirm RPC failed: ${rpcText.substring(0, 200)}` };
      }
      return { order_id: orderId, action: "confirmed", bb_status: bbStatus };
    } catch (err) {
      return { order_id: orderId, action: "failed", bb_status: bbStatus, error: `Confirm RPC exception: ${sanitizeError(err)}` };
    }
  }

  // Expired/removed statuses → expire order
  if (BB_EXPIRED_STATUSES.includes(bbStatus)) {
    try {
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_expire_pix_order`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_order_id: orderId, p_txid: order.pix_txid }),
      });
      if (!rpcRes.ok) {
        const rpcText = await rpcRes.text();
        return { order_id: orderId, action: "failed", bb_status: bbStatus, error: `Expire RPC failed: ${rpcText.substring(0, 200)}` };
      }
      return { order_id: orderId, action: "expired", bb_status: bbStatus };
    } catch (err) {
      return { order_id: orderId, action: "failed", bb_status: bbStatus, error: `Expire RPC exception: ${sanitizeError(err)}` };
    }
  }

  // ATIVA or unknown → keep pending (fail-safe)
  return { order_id: orderId, action: "pending", bb_status: bbStatus };
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Parse body
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // MODE: batch expiration check (scheduler mode)
  if (body.mode === "expire_check") {
    // SECURITY: validate scheduler secret against Supabase Vault via an
    // internal service_role-only RPC. The secret itself never lives in source,
    // logs, or a client-visible environment variable.
    const providedSecret = req.headers.get("x-scheduler-secret");
    if (!providedSecret) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED: Invalid or missing scheduler secret" }),
        { status: 403, headers: corsHeaders },
      );
    }

    let schedulerAuthorized = false;
    try {
      const authRes = await fetch(
        `${SUPABASE_URL}/rest/v1/rpc/rpc_validate_pix_scheduler_secret`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_secret: providedSecret }),
        },
      );
      if (authRes.ok) {
        schedulerAuthorized = (await authRes.json()) === true;
      }
    } catch {
      schedulerAuthorized = false;
    }

    if (!schedulerAuthorized) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED: Invalid or missing scheduler secret" }),
        { status: 403, headers: corsHeaders },
      );
    }

    // Query pending PIX candidates from DB before touching BB.
    // If there is nothing to check, return immediately without OAuth/network calls to BB.
    // Check active charges too so a payment can be confirmed promptly instead of
    // waiting until the 6-hour expiry boundary. BB remains the source of truth:
    // CONCLUIDA confirms, definitive expired/removed statuses expire, ATIVA stays pending.
    let candidates: Array<{ id: string }> = [];
    try {
      const queryUrl = `${SUPABASE_URL}/rest/v1/orders?payment_method=eq.PIX&payment_status=eq.AGUARDANDO_PIX&pix_txid=not.is.null&select=id&order=created_at.asc&limit=${MAX_BATCH_SIZE}`;
      const candRes = await fetch(queryUrl, {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Accept: "application/json",
        },
      });
      if (!candRes.ok) {
        return new Response(
          JSON.stringify({ error: `Candidate lookup HTTP ${candRes.status}`, fail_safe: true, checked: 0, results: [] }),
          { status: 502, headers: corsHeaders },
        );
      }
      candidates = (await candRes.json()) as Array<{ id: string }>;
    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Candidate lookup exception: ${sanitizeError(err)}`, fail_safe: true, checked: 0, results: [] }),
        { status: 502, headers: corsHeaders },
      );
    }

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({
          mode: "expire_check",
          checked: 0,
          confirmed: 0,
          expired: 0,
          pending: 0,
          failed: 0,
          results: [],
        }),
        { status: 200, headers: corsHeaders },
      );
    }

    // Only authenticate with BB when there is at least one pending PIX to check.
    const oauthResult = await getOAuthToken();
    if (!oauthResult.ok) {
      return new Response(
        JSON.stringify({ error: oauthResult.error, fail_safe: true, checked: candidates.length, results: [] }),
        { status: 502, headers: corsHeaders },
      );
    }

    const results: Array<{ order_id: string; action: string; bb_status?: string; error?: string }> = [];
    let confirmed = 0;
    let expired = 0;
    let pending = 0;
    let failed = 0;

    for (const candidate of candidates) {
      const result = await processSingleOrder(candidate.id, oauthResult.token, corsHeaders);
      results.push(result);
      if (result.action === "confirmed") confirmed++;
      else if (result.action === "expired") expired++;
      else if (result.action === "pending") pending++;
      else failed++;
    }

    return new Response(
      JSON.stringify({
        mode: "expire_check",
        checked: candidates.length,
        confirmed,
        expired,
        pending,
        failed,
        results,
      }),
      { status: 200, headers: corsHeaders },
    );
  }

  // MODE: single order check (original behavior)
  const orderId = typeof body.order_id === "string" ? body.order_id : null;

  if (!orderId || !isValidUUID(orderId)) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing order_id (UUID required)" }),
      { status: 400, headers: corsHeaders },
    );
  }

  // 2. Load order server-side via service_role (reuses global OrderRow interface)
  let order: OrderRow;
  try {
    const orderRes = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,pix_txid,total_amount_cents,payment_status`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          Accept: "application/json",
        },
      }
    );
    if (!orderRes.ok) {
      return new Response(
        JSON.stringify({ error: `Order lookup failed: HTTP ${orderRes.status}` }),
        { status: 502, headers: corsHeaders }
      );
    }
    const rows = (await orderRes.json()) as OrderRow[];
    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }
    order = rows[0];
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Order lookup exception: ${sanitizeError(err)}` }),
      { status: 502, headers: corsHeaders }
    );
  }

  // 4. Idempotent: already paid
  if (order.payment_status === "PAGO") {
    return new Response(
      JSON.stringify({ status: "PAGO", already_paid: true, order_id: orderId }),
      { status: 200, headers: corsHeaders }
    );
  }

  // 5. No pix_txid → cannot check
  if (!order.pix_txid) {
    return new Response(
      JSON.stringify({
        error: "Order has no pix_txid; create PIX charge first.",
        status: order.payment_status,
      }),
      { status: 422, headers: corsHeaders }
    );
  }

  // 6. OAuth
  const oauthResult = await getOAuthToken();
  if (!oauthResult.ok) {
    // FAIL-SAFE: keep pending on OAuth failure
    return new Response(
      JSON.stringify({
        error: oauthResult.error,
        fail_safe: true,
        status: order.payment_status,
      }),
      { status: 502, headers: corsHeaders }
    );
  }

  // 7. GET /cob/{txid}
  let bbData: BbCobResponse;
  let bbHttpStatus: number;
  try {
    const url = `${PIX_BASE_URL}/cob/${encodeURIComponent(order.pix_txid)}?gw-dev-app-key=${encodeURIComponent(BB_APP_KEY)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${oauthResult.token}`,
        Accept: "application/json",
      },
      client: mtlsClient,
    });
    bbHttpStatus = res.status;
    const text = await res.text();
    try {
      bbData = JSON.parse(text) as BbCobResponse;
    } catch {
      bbData = {};
    }
    if (!res.ok) {
      // FAIL-SAFE: keep pending on BB API error
      return new Response(
        JSON.stringify({
          error: `BB GET /cob HTTP ${bbHttpStatus}: ${text.substring(0, 300)}`,
          fail_safe: true,
          status: order.payment_status,
        }),
        { status: 502, headers: corsHeaders }
      );
    }
  } catch (err) {
    // FAIL-SAFE: network/timeout → keep pending
    return new Response(
      JSON.stringify({
        error: `BB GET /cob exception: ${sanitizeError(err)}`,
        fail_safe: true,
        status: order.payment_status,
      }),
      { status: 502, headers: corsHeaders }
    );
  }

  // 8. Validate txid matches
  const bbTxid = bbData.txid;
  if (bbTxid !== order.pix_txid) {
    return new Response(
      JSON.stringify({
        error: `txid mismatch: expected ${order.pix_txid}, got ${bbTxid || "null"}`,
        bb_status: bbData.status || null,
        status: order.payment_status,
      }),
      { status: 422, headers: corsHeaders }
    );
  }

  // 9. Validate valor matches
  const bbValorStr = bbData.valor?.original;
  const expectedValor = (order.total_amount_cents / 100).toFixed(2);
  if (bbValorStr !== expectedValor) {
    return new Response(
      JSON.stringify({
        error: `valor mismatch: order=${expectedValor}, BB=${bbValorStr || "null"}`,
        bb_status: bbData.status || null,
        status: order.payment_status,
      }),
      { status: 422, headers: corsHeaders }
    );
  }

  const bbStatus = bbData.status || "DESCONHECIDO";

  // 11. Not CONCLUIDA → return current status without altering anything
  if (bbStatus !== "CONCLUIDA") {
    return new Response(
      JSON.stringify({
        status: order.payment_status,
        bb_status: bbStatus,
        confirmed: false,
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  // 10. CONCLUIDA → confirm payment atomically via internal RPC
  try {
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/rpc_confirm_pix_payment_bb`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        p_order_id: orderId,
        p_txid: order.pix_txid,
      }),
    });

    const rpcText = await rpcRes.text();
    let rpcResult: Record<string, unknown> = {};
    try {
      rpcResult = JSON.parse(rpcText);
    } catch {
      // non-JSON response
    }

    if (!rpcRes.ok || (rpcResult && rpcResult.success === false)) {
      const errorCode = (rpcResult?.error as string) || "UNKNOWN_RPC_ERROR";

      // ORDER_CANCELLED is a definitive business rejection, not a transient failure
      if (errorCode === "ORDER_CANCELLED") {
        return new Response(
          JSON.stringify({
            error: "ORDER_CANCELLED",
            bb_status: bbStatus,
            confirmed: false,
            status: order.payment_status,
          }),
          { status: 409, headers: corsHeaders }
        );
      }

      // TXID_MISMATCH is also definitive
      if (errorCode === "TXID_MISMATCH") {
        return new Response(
          JSON.stringify({
            error: "TXID_MISMATCH",
            bb_status: bbStatus,
            confirmed: false,
            status: order.payment_status,
          }),
          { status: 422, headers: corsHeaders }
        );
      }

      // FAIL-SAFE: BB confirmed but our DB update failed → report error, keep pending
      return new Response(
        JSON.stringify({
          error: `Payment confirmation RPC failed: ${errorCode}: ${rpcText.substring(0, 300)}`,
          bb_status: bbStatus,
          fail_safe: true,
          status: order.payment_status,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        status: "PAGO",
        bb_status: bbStatus,
        confirmed: true,
        rpc_result: rpcResult,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    // FAIL-SAFE: RPC exception → keep pending
    return new Response(
      JSON.stringify({
        error: `Payment confirmation exception: ${sanitizeError(err)}`,
        bb_status: bbStatus,
        fail_safe: true,
        status: order.payment_status,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});