-- ==============================================================================
-- SEVEN PEDIDOS ESCOLARES — CATALOG INITIAL SEED (STORES, SCHOOLS, CAMPAIGNS, CLASSES, PRICES)
-- File: supabase/seed_catalog_only.sql
-- ==============================================================================

-- 1. STORE
INSERT INTO stores (id, name, address, whatsapp, maps_url)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'SEVEN MALHARIA',
    'Avenida Professora Cora de Carvalho, 2042-B, Centro, atrás do SENAI',
    '+5596991605151',
    'https://maps.google.com/?q=Avenida+Professora+Cora+de+Carvalho,+2042-B,+Centro,+Macapa+-+AP'
) ON CONFLICT (id) DO NOTHING;

-- 2. SCHOOL
INSERT INTO schools (id, store_id, name, logo_url, address, is_active)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'COLÉGIO CONCEITO',
    NULL,
    'Macapá - AP',
    true
) ON CONFLICT (id) DO NOTHING;

-- 3. CAMPAIGN
INSERT INTO campaigns (id, school_id, name, starts_at, ends_at, delivery_estimate, is_active)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'Campanha de Uniformes 2026',
    '2026-09-01T00:00:00Z',
    '2026-10-07T23:59:59Z',
    '20 a 25 dias após o fechamento da campanha',
    true
) ON CONFLICT (id) DO NOTHING;

-- 4. CLASSES (TURMAS)
INSERT INTO classes (id, campaign_id, name, image_url, order_index, is_active) VALUES
('44444444-0001-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Maternal Baby', NULL, 1, true),
('44444444-0002-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'Maternal Kids', NULL, 2, true),
('44444444-0003-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', '1º Período', NULL, 3, true),
('44444444-0004-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', '2º Período', NULL, 4, true),
('44444444-0005-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', '1º Ano', NULL, 5, true),
('44444444-0006-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333', '2º Ano', NULL, 6, true),
('44444444-0007-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', '3º Ano', NULL, 7, true),
('44444444-0008-0000-0000-000000000008', '33333333-3333-3333-3333-333333333333', '4º Ano', NULL, 8, true),
('44444444-0009-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333', '5º Ano', NULL, 9, true)
ON CONFLICT (id) DO NOTHING;

-- 5. CAMPAIGN PRICES
INSERT INTO campaign_prices (campaign_id, size_label, category, price_cents, order_index) VALUES
('33333333-3333-3333-3333-333333333333', '2', 'infantil', 3000, 1),
('33333333-3333-3333-3333-333333333333', '4', 'infantil', 3000, 2),
('33333333-3333-3333-3333-333333333333', '6', 'infantil', 3000, 3),
('33333333-3333-3333-3333-333333333333', '8', 'infantil', 3000, 4),
('33333333-3333-3333-3333-333333333333', '10', 'infantil', 3000, 5),
('33333333-3333-3333-3333-333333333333', '12', 'infantil', 3000, 6),
('33333333-3333-3333-3333-333333333333', '14', 'infantil', 3000, 7),
('33333333-3333-3333-3333-333333333333', '16', 'infantil', 3000, 8),
('33333333-3333-3333-3333-333333333333', 'PP', 'adulto_padrao', 4000, 9),
('33333333-3333-3333-3333-333333333333', 'P', 'adulto_padrao', 4000, 10),
('33333333-3333-3333-3333-333333333333', 'M', 'adulto_padrao', 4000, 11),
('33333333-3333-3333-3333-333333333333', 'G', 'adulto_padrao', 4000, 12),
('33333333-3333-3333-3333-333333333333', 'GG', 'adulto_padrao', 4000, 13),
('33333333-3333-3333-3333-333333333333', 'XG', 'adulto_especial', 5000, 14),
('33333333-3333-3333-3333-333333333333', 'XXG', 'adulto_especial', 5000, 15),
('33333333-3333-3333-3333-333333333333', 'XXXG', 'adulto_especial', 5000, 16)
ON CONFLICT (campaign_id, size_label) DO NOTHING;
