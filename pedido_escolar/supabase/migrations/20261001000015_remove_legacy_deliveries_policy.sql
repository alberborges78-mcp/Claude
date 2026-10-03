-- ==============================================================================
-- SEVEN PEDIDOS ESCOLARES — REMOVE LEGACY DELIVERIES POLICY
-- Migration: 20261001000015_remove_legacy_deliveries_policy.sql
-- Objetivo: Remover policy legada "Admin full deliveries" que anula a proteção admin-only
-- ==============================================================================

DROP POLICY IF EXISTS "Admin full deliveries" ON public.deliveries;