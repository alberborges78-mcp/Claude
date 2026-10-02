-- ==============================================================================
-- FIX: Authenticated admin read access to catalog tables
-- Migration: 20261001000008_fix_authenticated_catalog_read.sql
-- Reason: Security hardening migration (20261001000001) dropped and recreated
-- catalog SELECT policies only for 'anon'. The original 'Admin full' policies
-- from initial_schema were also dropped by migration 000006 (classes) or
-- implicitly lost for schools/campaigns/campaign_prices. This caused 403
-- errors when the admin panel queries these tables with a valid JWT session.
-- ==============================================================================

-- Ensure authenticated role has SELECT privilege on catalog tables
GRANT SELECT ON schools TO authenticated;
GRANT SELECT ON campaigns TO authenticated;
GRANT SELECT ON campaign_prices TO authenticated;
-- Note: classes already has GRANT SELECT TO authenticated from migration 000006

-- Recreate SELECT policies for authenticated role (idempotent)
DO $$
BEGIN
    -- Schools: authenticated can read all schools
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'schools' AND policyname = 'Admin read schools'
    ) THEN
        CREATE POLICY "Admin read schools" ON schools FOR SELECT TO authenticated USING (true);
    END IF;

    -- Campaigns: authenticated can read all campaigns
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'campaigns' AND policyname = 'Admin read campaigns'
    ) THEN
        CREATE POLICY "Admin read campaigns" ON campaigns FOR SELECT TO authenticated USING (true);
    END IF;

    -- Classes: migration 000006 already created "Admin select classes" with admin_profiles check.
    -- We do NOT recreate it here to avoid conflicts. If it was somehow lost, re-run 000006.

    -- Campaign prices: authenticated can read all prices
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'campaign_prices' AND policyname = 'Admin read campaign_prices'
    ) THEN
        CREATE POLICY "Admin read campaign_prices" ON campaign_prices FOR SELECT TO authenticated USING (true);
    END IF;
END $$;