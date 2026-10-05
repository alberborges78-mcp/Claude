// supabase/functions/bb-pix-create/index.ts
// Seven Pedidos Escolares — Banco do Brasil Pix v2 (Sandbox & Production)
// Escopo: OAuth2 client_credentials + PUT /cob/{txid}
// Modo diagnóstico: ?test=oauth (somente OAuth, sem /cob)
// NÃO expõe secrets, NÃO loga credenciais, NÃO altera banco/schema.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// URLs are resolved dynamically based on BB_PIX_ENV inside the handler.
// sandbox:    oauth.hm.bb.com.br / api-pix.hm.bb.com.br
// production: oauth.bb.com.br    / api-pix.bb.com.br

// mTLS configuration - loaded from environment variables
const BB_MTLS_CERT = Deno.env.get("BB_MTLS_CERT");
const BB_MTLS_KEY = Deno.env.get("BB_MTLS_KEY");

if (!BB_MTLS_CERT || !BB_MTLS_KEY) {
  throw new Error(
    "Missing required mTLS credentials: BB_MTLS_CERT and BB_MTLS_KEY must be set"
  );
}

// Reusable mTLS HTTP client for all Banco do Brasil API calls.
// Applied to both OAuth and PIX endpoints — BB sandbox requires mTLS on all.
const mtlsClient = Deno.createHttpClient({
  cert: BB_MTLS_CERT,
  key: BB_MTLS_KEY,
});

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

interface BbCobResponse {
  txid?: string;
  status?: string;
  pixCopiaECola?: string;
  loc?: { id?: string; location?: string };
  calendario?: { expiracao?: number; criacao?: string };
  valor?: { original?: string };
  chave?: string;
  [key: string]: unknown;
}

function sanitizeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

async function getOAuthToken(
  clientId: string,
  clientSecret: string,
  oauthUrl: string
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "cob.write cob.read",
    });

    const res = await fetch(oauthUrl, {
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
      // Sanitize: never include credentials in error
      return {
        ok: false,
        error: `OAuth HTTP ${res.status}: ${text.substring(0, 200)}`,
      };
    }

    const data = (await res.json()) as OAuthTokenResponse;
    if (!data.access_token) {
      return { ok: false, error: "OAuth response missing access_token" };
    }

    return { ok: true, token: data.access_token };
  } catch (err) {
    return { ok: false, error: `OAuth exception: ${sanitizeError(err)}` };
  }
}

async function createCobranca(
  accessToken: string,
  appKey: string,
  pixKey: string,
  txid: string,
  valorOriginal: string,
  pixBaseUrl: string
): Promise<
  | { ok: true; data: BbCobResponse; httpStatus: number }
  | { ok: false; error: string; httpStatus: number }
> {
  try {
    const url = `${pixBaseUrl}/cob/${encodeURIComponent(txid)}?gw-dev-app-key=${encodeURIComponent(appKey)}`;

    const payload = {
      calendario: { expiracao: 3600 },
      valor: { original: valorOriginal },
      chave: pixKey,
      solicitacaoPagador: "Pedido teste Seven",
    };

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      client: mtlsClient,
    });

    const text = await res.text();
    let data: BbCobResponse = {};
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response
    }

    if (!res.ok) {
      return {
        ok: false,
        error: `BB API HTTP ${res.status}: ${text.substring(0, 300)}`,
        httpStatus: res.status,
      };
    }

    return { ok: true, data, httpStatus: res.status };
  } catch (err) {
    return {
      ok: false,
      error: `BB API exception: ${sanitizeError(err)}`,
      httpStatus: 0,
    };
  }
}

async function getCobranca(
  accessToken: string,
  appKey: string,
  txid: string,
  pixBaseUrl: string
): Promise<
  | { ok: true; data: BbCobResponse; httpStatus: number }
  | { ok: false; error: string; httpStatus: number }
> {
  try {
    const url = `${pixBaseUrl}/cob/${encodeURIComponent(txid)}?gw-dev-app-key=${encodeURIComponent(appKey)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      client: mtlsClient,
    });

    const text = await res.text();
    let data: BbCobResponse = {};
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response
    }

    if (!res.ok) {
      return {
        ok: false,
        error: `BB GET /cob HTTP ${res.status}: ${text.substring(0, 300)}`,
        httpStatus: res.status,
      };
    }

    return { ok: true, data, httpStatus: res.status };
  } catch (err) {
    return {
      ok: false,
      error: `BB GET /cob exception: ${sanitizeError(err)}`,
      httpStatus: 0,
    };
  }
}

function generateTxid(): string {
  // BB txid: max 35 chars, alphanumeric + some special chars
  // Format: SEV + timestamp hex + random suffix
  const ts = Date.now().toString(36);
  const rand = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
  return `SEV${ts}${rand}`.substring(0, 35);
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
  const clientId = Deno.env.get("BB_CLIENT_ID");
  const clientSecret = Deno.env.get("BB_CLIENT_SECRET");
  const appKey = Deno.env.get("BB_APP_KEY");
  const pixKey = Deno.env.get("BB_PIX_KEY");
  const pixEnv = Deno.env.get("BB_PIX_ENV");

  if (!clientId || !clientSecret || !appKey || !pixKey) {
    return new Response(
      JSON.stringify({ error: "Missing required server-side secrets" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Resolve environment-specific URLs and validate BB_PIX_ENV
  let oauthUrl: string;
  let pixBaseUrl: string;
  if (pixEnv === "sandbox") {
    oauthUrl = "https://oauth.hm.bb.com.br/oauth/token";
    pixBaseUrl = "https://api-pix.hm.bb.com.br/pix/v2";
  } else if (pixEnv === "production") {
    oauthUrl = "https://oauth.bb.com.br/oauth/token";
    pixBaseUrl = "https://api-pix.bb.com.br/pix/v2";
  } else {
    return new Response(
      JSON.stringify({
        error: "Invalid BB_PIX_ENV: must be 'sandbox' or 'production'",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Diagnostic mode: ?test=oauth
  // Executes ONLY getOAuthToken() and returns sanitized result.
  // NEVER reaches createCobranca(), /cob, or order lookup.
  const url = new URL(req.url);
  if (url.searchParams.get("test") === "oauth") {
    const oauthResult = await getOAuthToken(clientId, clientSecret, oauthUrl);
    if (!oauthResult.ok) {
      return new Response(
        JSON.stringify({ oauth: "FAIL", error: oauthResult.error }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ oauth: "ok" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse request body — MUST contain a valid order_id (UUID).
  // The value is NEVER trusted from the client; it is fetched server-side.
  let orderId: string | null = null;
  let recoverTxid: string | null = null;
  try {
    const body = await req.json().catch(() => null);
    if (body && typeof body.order_id === "string") {
      orderId = body.order_id;
    }
    if (body && typeof body.recover_txid === "string") {
      recoverTxid = body.recover_txid;
    }
  } catch {
    // Invalid JSON
  }

  // Validate UUID format
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!orderId || !uuidRegex.test(orderId)) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid order_id (UUID required)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch order server-side using service role key
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let totalAmountCents: number;
  let existingPixTxid: string | null = null;
  let existingPixCode: string | null = null;
  try {
    const orderRes = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=total_amount_cents,payment_status,pix_txid,pix_code`,
      {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      }
    );

    if (!orderRes.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch order: HTTP ${orderRes.status}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const rows = (await orderRes.json()) as Array<{
      total_amount_cents: number;
      payment_status: string;
      pix_txid: string | null;
      pix_code: string | null;
    }>;

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    totalAmountCents = rows[0].total_amount_cents;
    existingPixTxid = rows[0].pix_txid;
    existingPixCode = rows[0].pix_code;

    if (typeof totalAmountCents !== "number" || totalAmountCents <= 0) {
      return new Response(
        JSON.stringify({ error: "Order has invalid or zero total_amount_cents" }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Order lookup exception: ${sanitizeError(err)}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Idempotency: if order already has a persisted PIX cobrança, return it
  // without calling OAuth or /cob again.
  if (existingPixTxid && existingPixCode) {
    return new Response(
      JSON.stringify({
        oauth: "SKIP",
        cob: "REUSED",
        reused: true,
        txid: existingPixTxid,
        pixCopiaECola: existingPixCode,
        valor: (totalAmountCents / 100).toFixed(2),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Convert cents to BRL decimal string (e.g., 4550 → "45.50")
  const valorOriginal = (totalAmountCents / 100).toFixed(2);

  // Recovery mode: retrieve existing BB cobrança by txid without creating a new one.
  // Only runs when recover_txid is provided AND order has no persisted PIX data yet.
  if (recoverTxid) {
    // Validate recover_txid format: alphanumeric, 26-35 chars per BB spec
    if (!/^[A-Za-z0-9]{26,35}$/.test(recoverTxid)) {
      return new Response(
        JSON.stringify({ error: "Invalid recover_txid format" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // OAuth for recovery GET
    const oauthRecovery = await getOAuthToken(clientId, clientSecret, oauthUrl);
    if (!oauthRecovery.ok) {
      return new Response(
        JSON.stringify({ recover: "FAIL", error: oauthRecovery.error }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // GET /cob/{recover_txid} — read-only, never modifies BB state
    const getCobResult = await getCobranca(
      oauthRecovery.token,
      appKey,
      recoverTxid,
      pixBaseUrl
    );

    if (!getCobResult.ok) {
      return new Response(
        JSON.stringify({ recover: "FAIL", error: getCobResult.error }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate txid matches
    const bbTxid = getCobResult.data.txid;
    if (bbTxid !== recoverTxid) {
      return new Response(
        JSON.stringify({
          recover: "FAIL",
          error: `txid mismatch: expected ${recoverTxid}, got ${bbTxid || "null"}`,
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate valor matches order total exactly
    const bbValor = getCobResult.data.valor?.original;
    if (bbValor !== valorOriginal) {
      return new Response(
        JSON.stringify({
          recover: "FAIL",
          error: `valor mismatch: order=${valorOriginal}, BB=${bbValor || "null"}`,
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // Require pixCopiaECola
    const recoveredPixCode = getCobResult.data.pixCopiaECola;
    if (!recoveredPixCode) {
      return new Response(
        JSON.stringify({
          recover: "FAIL",
          error: "BB response missing pixCopiaECola",
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    // Persist recovered data — same PATCH as normal flow
    try {
      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            pix_txid: recoverTxid,
            pix_code: recoveredPixCode,
            payment_status: "AGUARDANDO_PIX",
          }),
        }
      );

      if (!updateRes.ok) {
        return new Response(
          JSON.stringify({
            recover: "PASS",
            persist: "FAIL",
            error: `Failed to persist recovered PIX: HTTP ${updateRes.status}`,
            txid: recoverTxid,
            pixCopiaECola: recoveredPixCode,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (err) {
      return new Response(
        JSON.stringify({
          recover: "PASS",
          persist: "FAIL",
          error: `Recovery persistence exception: ${sanitizeError(err)}`,
          txid: recoverTxid,
          pixCopiaECola: recoveredPixCode,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        recover: true,
        txid: recoverTxid,
        pixCopiaECola: recoveredPixCode,
        status: getCobResult.data.status || null,
        valor: valorOriginal,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 1: OAuth2 token
  const oauthResult = await getOAuthToken(clientId, clientSecret, oauthUrl);
  if (!oauthResult.ok) {
    return new Response(
      JSON.stringify({
        oauth: "FAIL",
        cob: "SKIP",
        error: oauthResult.error,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Step 2: Create cobrança
  const txid = generateTxid();
  const cobResult = await createCobranca(
    oauthResult.token,
    appKey,
    pixKey,
    txid,
    valorOriginal,
    pixBaseUrl
  );

  if (!cobResult.ok) {
    return new Response(
      JSON.stringify({
        oauth: "PASS",
        cob: "FAIL",
        http_status: cobResult.httpStatus,
        txid,
        error: cobResult.error,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  // Persist PIX data to the order after successful BB response.
  // Uses PATCH via Supabase REST with service role key.
  const finalTxid = cobResult.data.txid || txid;
  const finalPixCode = cobResult.data.pixCopiaECola || null;

  if (finalPixCode) {
    try {
      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`,
        {
          method: "PATCH",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            pix_txid: finalTxid,
            pix_code: finalPixCode,
            payment_status: "AGUARDANDO_PIX",
          }),
        }
      );

      if (!updateRes.ok) {
        // BB succeeded but persistence failed — report explicitly.
        // Do NOT retry /cob.
        return new Response(
          JSON.stringify({
            oauth: "PASS",
            cob: "PASS",
            persist: "FAIL",
            error: `Failed to persist PIX data: HTTP ${updateRes.status}`,
            txid: finalTxid,
            pixCopiaECola: finalPixCode,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (err) {
      return new Response(
        JSON.stringify({
          oauth: "PASS",
          cob: "PASS",
          persist: "FAIL",
          error: `Persistence exception: ${sanitizeError(err)}`,
          txid: finalTxid,
          pixCopiaECola: finalPixCode,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Sanitized success response — NO secrets exposed
  return new Response(
    JSON.stringify({
      oauth: "PASS",
      cob: "PASS",
      http_status: cobResult.httpStatus,
      txid: finalTxid,
      status: cobResult.data.status || null,
      pixCopiaECola: finalPixCode,
      location: cobResult.data.loc?.location || null,
      expiracao: cobResult.data.calendario?.expiracao || null,
      valor: cobResult.data.valor?.original || valorOriginal,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});