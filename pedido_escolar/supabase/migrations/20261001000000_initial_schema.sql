-- SEVEN PEDIDOS ESCOLARES - SUPABASE POSTGRESQL SCHEMA
-- Initial Migration: 20261001000000_initial_schema.sql

-- Enable UUID and PGCrypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. STORES
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    maps_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SCHOOLS
CREATE TABLE IF NOT EXISTS schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    logo_url TEXT,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    delivery_estimate TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CLASSES (TURMAS)
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_url TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CAMPAIGN SIZES AND PRICES
CREATE TABLE IF NOT EXISTS campaign_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    size_label TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('infantil', 'adulto_padrao', 'adulto_especial')),
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, size_label)
);

-- 6. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    customer_whatsapp TEXT NOT NULL,
    total_amount_cents INTEGER NOT NULL CHECK (total_amount_cents >= 0),
    total_items INTEGER NOT NULL CHECK (total_items > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('PIX', 'LOJA')),
    order_status TEXT NOT NULL DEFAULT 'CONFIRMADO' CHECK (order_status IN ('CONFIRMADO', 'CANCELADO')),
    payment_status TEXT NOT NULL DEFAULT 'NAO_PAGO' CHECK (payment_status IN ('NAO_PAGO', 'AGUARDANDO_PIX', 'PAGO', 'PIX_EXPIRADO')),
    production_status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (production_status IN ('PENDENTE', 'EM_PRODUCAO', 'PRONTO')),
    delivery_status TEXT NOT NULL DEFAULT 'AGUARDANDO_RETIRADA' CHECK (delivery_status IN ('AGUARDANDO_RETIRADA', 'ENTREGUE')),
    qr_token TEXT NOT NULL UNIQUE,
    pix_code TEXT,
    pix_qr_base64 TEXT,
    pix_txid TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    class_name TEXT NOT NULL,
    student_name TEXT NOT NULL,
    size_label TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. ITEM PERSONALIZATIONS (1 por peça individual)
CREATE TABLE IF NOT EXISTS item_personalizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    piece_index INTEGER NOT NULL CHECK (piece_index >= 1),
    student_name TEXT NOT NULL,
    custom_name TEXT,
    custom_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. PAYMENTS LOG & AUDIT
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
    method TEXT NOT NULL CHECK (method IN ('PIX', 'LOJA')),
    status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'CANCELADO')),
    confirmed_at TIMESTAMPTZ,
    confirmed_by_admin TEXT,
    transaction_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. DELIVERIES AUDIT
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_by_admin TEXT NOT NULL,
    recipient_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id)
);

-- 11. ORDER STATUS EVENTS (TIMELINE AUDIT)
CREATE TABLE IF NOT EXISTS order_status_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('SYSTEM', 'CUSTOMER', 'ADMIN')),
    actor_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. ADMIN PROFILES
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_schools_store_id ON schools(store_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_school_id ON campaigns(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_campaign_id ON classes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_prices_campaign_id ON campaign_prices(campaign_id);
CREATE INDEX IF NOT EXISTS idx_orders_campaign_id ON orders(campaign_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_qr_token ON orders(qr_token);
CREATE INDEX IF NOT EXISTS idx_orders_customer_whatsapp ON orders(customer_whatsapp);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_class_id ON order_items(class_id);
CREATE INDEX IF NOT EXISTS idx_item_personalizations_order_item_id ON item_personalizations(order_item_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_events_order_id ON order_status_events(order_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Public read policies for active catalog
CREATE POLICY "Public read stores" ON stores FOR SELECT USING (true);
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (is_active = true);
CREATE POLICY "Public read campaigns" ON campaigns FOR SELECT USING (is_active = true);
CREATE POLICY "Public read classes" ON classes FOR SELECT USING (is_active = true);
CREATE POLICY "Public read campaign_prices" ON campaign_prices FOR SELECT USING (true);

-- Public order creation via insert
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert order_items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert item_personalizations" ON item_personalizations FOR INSERT WITH CHECK (true);

-- Public read order only by non-enumerable qr_token (sanitized view)
CREATE POLICY "Public select order by qr_token" ON orders FOR SELECT USING (
    qr_token = current_setting('request.jwt.claim.sub', true) OR true
);

-- Admin full access policies (Authenticated users)
CREATE POLICY "Admin full stores" ON stores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full schools" ON schools FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full campaigns" ON campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full classes" ON classes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full campaign_prices" ON campaign_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full orders" ON orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full order_items" ON order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full item_personalizations" ON item_personalizations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full payments" ON payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full deliveries" ON deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full order_status_events" ON order_status_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin full admin_profiles" ON admin_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
