-- ==============================================================================
-- FIX: Authenticated admin read access to orders tables
-- Migration: 20261001000009_fix_authenticated_orders_read.sql
-- Reason: Security hardening migration (20261001000001) revoked all privileges
-- from anon on orders/order_items/item_personalizations but did not explicitly
-- grant SELECT to authenticated. While "Admin full" policies exist in
-- initial_schema, PostgreSQL requires both GRANT and POLICY for access.
-- This caused 42501 errors when the admin panel queries these tables.
-- ==============================================================================

-- Grant SELECT privilege on order tables to authenticated role
GRANT SELECT ON orders TO authenticated;
GRANT SELECT ON order_items TO authenticated;
GRANT SELECT ON item_personalizations TO authenticated;

-- Verify idempotent policy creation for SELECT (in case Admin full was lost)
DO $$
BEGIN
    -- Orders: authenticated can read all orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Admin select orders'
    ) THEN
        CREATE POLICY "Admin select orders" ON orders FOR SELECT TO authenticated USING (true);
    END IF;

    -- Order items: authenticated can read all order items
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'order_items' AND policyname = 'Admin select order_items'
    ) THEN
        CREATE POLICY "Admin select order_items" ON order_items FOR SELECT TO authenticated USING (true);
    END IF;

    -- Item personalizations: authenticated can read all personalizations
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'item_personalizations' AND policyname = 'Admin select item_personalizations'
    ) THEN
        CREATE POLICY "Admin select item_personalizations" ON item_personalizations FOR SELECT TO authenticated USING (true);
    END IF;
END $$;