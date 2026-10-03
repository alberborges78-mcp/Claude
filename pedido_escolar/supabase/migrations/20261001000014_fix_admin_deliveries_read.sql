-- ==============================================================================
-- SEVEN PEDIDOS ESCOLARES — ADMIN READ ACCESS TO DELIVERIES
-- Migration: 20261001000014_fix_admin_deliveries_read.sql
-- Objetivo: Permitir SOMENTE admin autenticado e ativo ler public.deliveries
-- ==============================================================================

-- 1. Conceder privilégio SELECT ao role authenticated
GRANT SELECT ON TABLE public.deliveries TO authenticated;

-- 2. Criar policy restrita a administradores ativos
CREATE POLICY "Admin select deliveries"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM admin_profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND is_active = true
    )
);