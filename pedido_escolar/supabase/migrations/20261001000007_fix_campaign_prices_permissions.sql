-- ======================================================================
-- SEVEN PEDIDOS ESCOLARES – FIX CAMPAIGN_PRICES PERMISSIONS (IDEMPOTENT)
-- Migration: 20261001000007_fix_campaign_prices_permissions.sql
-- ======================================================================

-- Ensure Row Level Security is enabled (idempotent)
ALTER TABLE public.campaign_prices ENABLE ROW LEVEL SECURITY;

-- Grant read‑only access to anonymous (public) role
GRANT SELECT ON public.campaign_prices TO anon;

-- Grant read + update access to authenticated (admin) role
GRANT SELECT, UPDATE ON public.campaign_prices TO authenticated;

-- Re‑create the public SELECT RLS policy idempotently
DROP POLICY IF EXISTS "Public read campaign_prices" ON public.campaign_prices;
CREATE POLICY "Public read campaign_prices"
    ON public.campaign_prices
    FOR SELECT
    TO anon
    USING (true);

-- NOTE: No INSERT or DELETE privileges are granted.
-- Existing admin‑only policies (e.g., UPDATE) remain unchanged.
