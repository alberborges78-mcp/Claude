// SEVEN PEDIDOS ESCOLARES - CORE DOMAIN TYPES

export type OrderStatus = 'CONFIRMADO' | 'CANCELADO';
export type PaymentStatus = 'NAO_PAGO' | 'AGUARDANDO_PIX' | 'PAGO' | 'PIX_EXPIRADO';
export type ProductionStatus = 'PENDENTE' | 'EM_PRODUCAO' | 'PRONTO';
export type DeliveryStatus = 'AGUARDANDO_RETIRADA' | 'ENTREGUE';
export type PaymentMethod = 'PIX' | 'LOJA';
export type InStorePaymentMethod = 'PIX' | 'LOJA' | 'DEBITO' | 'CREDITO' | 'DINHEIRO';

export type SizeCategory = 'infantil' | 'adulto_padrao' | 'adulto_especial';

export interface Store {
  id: string;
  name: string;
  address: string;
  whatsapp: string;
  maps_url: string;
  created_at: string;
}

export interface School {
  id: string;
  store_id: string;
  name: string;
  logo_url: string | null;
  address?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  school_id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  delivery_estimate: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ClassItem {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface CampaignPrice {
  id: string;
  campaign_id: string;
  size_label: string;
  category: SizeCategory;
  price_cents: number; // in cents, e.g. 3000 = R$ 30,00
  order_index: number;
  created_at: string;
}

export interface ItemPersonalization {
  id: string;
  order_item_id?: string;
  piece_index: number;
  student_name: string;
  custom_name?: string | null;
  custom_number?: string | null;
}

export interface OrderItem {
  id: string;
  order_id?: string;
  class_id: string;
  class_name: string;
  student_name: string;
  size_label: string;
  unit_price_cents: number;
  quantity: number;
  subtotal_cents: number;
  personalizations: ItemPersonalization[];
}

export interface Order {
  id: string;
  order_number: string;
  campaign_id: string;
  customer_name: string;
  customer_whatsapp: string; // E.164
  total_amount_cents: number;
  total_items: number;
  payment_method: PaymentMethod;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  production_status: ProductionStatus;
  delivery_status: DeliveryStatus;
  qr_token: string;
  pix_code?: string | null;
  pix_qr_base64?: string | null;
  pix_txid?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  campaign?: Campaign;
  school?: School;
  // Delivery audit fields (populated only when delivery_status === 'ENTREGUE')
  delivered_at?: string | null;
  delivered_by_admin?: string | null;
  delivery_recipient_name?: string | null;
}

export interface OrderLookupInput {
  order_number: string;
  student_name: string;
  customer_name: string;
  customer_whatsapp: string;
}

export interface PublicOrderSearchParams {
  order_number?: string;
  customer_name?: string;
  customer_whatsapp?: string;
  page?: number;
  page_size?: number;
}

export interface PublicOrderSearchResult {
  order_number: string;
  customer_name: string;
  customer_whatsapp_masked: string;
  total_amount_cents: number;
  total_items: number;
  payment_method: PaymentMethod;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  production_status: ProductionStatus;
  delivery_status: DeliveryStatus;
  created_at: string;
  school_name?: string;
  campaign_name?: string;
  lookup_token: string;
  lookup_token_expires_at?: string;
}

export interface PublicOrderSearchResponse {
  items: PublicOrderSearchResult[];
  total_count: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface PaymentAudit {
  id: string;
  order_id: string;
  amount_cents: number;
  method: InStorePaymentMethod;
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
  confirmed_at: string | null;
  confirmed_by_admin: string | null;
  transaction_reference?: string | null;
  created_at: string;
}

export interface DeliveryAudit {
  id: string;
  order_id: string;
  delivered_at: string;
  delivered_by_admin: string;
  recipient_name?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface OrderStatusEvent {
  id: string;
  order_id: string;
  event_type: 'ORDER_CREATED' | 'PAYMENT_UPDATED' | 'PRODUCTION_UPDATED' | 'DELIVERY_UPDATED';
  from_status?: string | null;
  to_status: string;
  actor_type: 'SYSTEM' | 'CUSTOMER' | 'ADMIN';
  actor_id?: string | null;
  notes?: string | null;
  created_at: string;
}

// Cart Item interface for front-end management
export interface CartItem {
  id: string; // temporary cart uuid
  class_id: string;
  class_name: string;
  student_name: string;
  size_label: string;
  unit_price_cents: number;
  quantity: number;
  subtotal_cents: number;
  personalizations: {
    piece_index: number;
    student_name: string;
    custom_name?: string;
    custom_number?: string;
  }[];
}

// Adapters
export interface PixChargeResult {
  txid: string;
  pixCopiaECola: string;
  qrCodeBase64: string;
  expiresAt: string;
}

export interface PixStatusResult {
  txid: string;
  status: 'NAO_PAGO' | 'PAGO' | 'EXPIRADO';
  paidAt?: string;
  amountCents: number;
}

export interface PixProvider {
  createPixCharge(order: { id: string; order_number: string; total_amount_cents: number; customer_name: string }): Promise<PixChargeResult>;
  getPixStatus(txid: string): Promise<PixStatusResult>;
  processWebhook(payload: Record<string, unknown>): Promise<{ txid: string; paid: boolean }>;
}

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'MOCK_DEV' | 'PRODUCTION_API';
}

export interface WhatsAppProvider {
  sendOrderConfirmation(order: Order): Promise<WhatsAppMessageResult>;
  sendPaymentConfirmation(order: Order): Promise<WhatsAppMessageResult>;
  sendReceipt(order: Order, receiptUrl: string): Promise<WhatsAppMessageResult>;
}

// Report interfaces
export interface ClassReportRow {
  order_number: string;
  order_id: string;
  created_at: string;
  student_name: string;
  customer_name: string;
  customer_whatsapp: string;
  size_label: string;
  custom_name: string;
  custom_number: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  payment_status: PaymentStatus;
  production_status: ProductionStatus;
  delivery_status: DeliveryStatus;
}

export interface ClassReportSummary {
  class_name: string;
  total_orders: number;
  total_items: number;
  paid_items_count: number;
  unpaid_items_count: number;
  total_amount_cents: number;
  paid_amount_cents: number;
  unpaid_amount_cents: number;
  rows: ClassReportRow[];
}

export interface ProductionMapBySize {
  size_label: string;
  category: SizeCategory;
  quantity: number;
  order_index: number;
}

export interface CustomizationItemDetail {
  order_number: string;
  student_name: string;
  class_name: string;
  size_label: string;
  custom_name: string;
  custom_number: string;
  piece_index: number;
}
