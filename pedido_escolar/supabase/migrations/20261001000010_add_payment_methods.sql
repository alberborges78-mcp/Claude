-- ==============================================================================
-- FIX: Expand payment methods for in-store payments
-- Migration: 20261001000010_add_payment_methods.sql
-- Reason: Support DEBITO, CREDITO, and DINHEIRO in addition to existing PIX/LOJA
-- for in-store manual payment confirmation via rpc_confirm_payment.
-- ==============================================================================
-- Drop the old constraint if it exists (idempotent)
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_method_check;

-- Add the new constraint with all allowed values
ALTER TABLE public.payments
ADD CONSTRAINT payments_method_check
CHECK (method IN ('PIX', 'LOJA', 'DEBITO', 'CREDITO', 'DINHEIRO'));