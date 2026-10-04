-- Migration: 20261001000018_grant_service_role_orders_read.sql
-- Documenta permissões já aplicadas manualmente no Supabase para a Edge Function send-whatsapp.
-- NÃO executar remotamente se os GRANTs já foram aplicados via SQL Editor.
-- Objetivo: garantir que o role service_role possa ler orders e order_items
--           para validação server-side anti-relay na Edge Function send-whatsapp.

GRANT SELECT ON TABLE public.orders TO service_role;
GRANT SELECT ON TABLE public.order_items TO service_role;