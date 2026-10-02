import {
  Campaign,
  CampaignPrice,
  ClassItem,
  ClassReportRow,
  ClassReportSummary,
  CustomizationItemDetail,
  DeliveryAudit,
  InStorePaymentMethod,
  Order,
  OrderItem,
  OrderLookupInput,
  OrderStatusEvent,
  PaymentAudit,
  PaymentMethod,
  PaymentStatus,
  ProductionMapBySize,
  ProductionStatus,
  DeliveryStatus,
  PublicOrderSearchParams,
  PublicOrderSearchResult,
  PublicOrderSearchResponse,
  School,
  Store,
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { getPixProvider } from '../adapters/pix/pixProvider';
import { getWhatsAppProvider } from '../adapters/whatsapp/whatsappProvider';
import { generateOrderNumber, generateSecureToken } from '../utils/security';

// Initial Canonical Database Seeds
const INITIAL_STORE: Store = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'SEVEN MALHARIA',
  address: 'Avenida Professora Cora de Carvalho, 2042-B, Centro, atrás do SENAI',
  whatsapp: '+5596991605151',
  maps_url: 'https://maps.google.com/?q=Avenida+Professora+Cora+de+Carvalho,+2042-B,+Centro,+Macapa+-+AP',
  created_at: '2026-09-01T00:00:00Z',
};

const INITIAL_SCHOOL: School = {
  id: '22222222-2222-2222-2222-222222222222',
  store_id: '11111111-1111-1111-1111-111111111111',
  name: 'COLÉGIO CONCEITO',
  logo_url: null,
  address: 'Macapá - AP',
  is_active: true,
  created_at: '2026-09-01T00:00:00Z',
};

const INITIAL_CAMPAIGN: Campaign = {
  id: '33333333-3333-3333-3333-333333333333',
  school_id: '22222222-2222-2222-2222-222222222222',
  name: 'Campanha de Uniformes 2026',
  starts_at: '2026-09-01T00:00:00Z',
  ends_at: '2026-10-07T23:59:59Z',
  delivery_estimate: '20 a 25 dias após o encerramento da campanha',
  is_active: true,
  created_at: '2026-09-01T00:00:00Z',
};

const INITIAL_CLASSES: ClassItem[] = [
  { id: '44444444-0001-0000-0000-000000000001', campaign_id: '33333333-3333-3333-3333-333333333333', name: 'Maternal Baby', image_url: null, order_index: 1, is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: '44444444-0002-0000-0000-000000000002', campaign_id: '33333333-3333-3333-3333-333333333333', name: 'Maternal Kids', image_url: null, order_index: 2, is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: '44444444-0003-0000-0000-000000000003', campaign_id: '33333333-3333-3333-3333-333333333333', name: '1º Período', image_url: null, order_index: 3, is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: '44444444-0004-0000-0000-000000000004', campaign_id: '33333333-3333-3333-3333-333333333333', name: '2º Período', image_url: null, order_index: 4, is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: '44444444-0005-0000-0000-000000000005', campaign_id: '33333333-3333-3333-3333-333333333333', name: '1º Ano', image_url: null, order_index: 5, is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: '44444444-0006-0000-0000-000000000006', campaign_id: '33333333-3333-3333-3333-333333333333', name: '2º Ano', image_url: null, order_index: 6, is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: '44444444-0007-0000-0000-000000000007', campaign_id: '33333333-3333-3333-3333-333333333333', name: '3º Ano', image_url: null, order_index: 7, is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: '44444444-0008-0000-0000-000000000008', campaign_id: '33333333-3333-3333-3333-333333333333', name: '4º Ano', image_url: null, order_index: 8, is_active: true, created_at: '2026-09-01T00:00:00Z' },
  { id: '44444444-0009-0000-0000-000000000009', campaign_id: '33333333-3333-3333-3333-333333333333', name: '5º Ano', image_url: null, order_index: 9, is_active: true, created_at: '2026-09-01T00:00:00Z' },
];

const INITIAL_PRICES: CampaignPrice[] = [
  { id: 'p-02', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: '2', category: 'infantil', price_cents: 3000, order_index: 1, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-04', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: '4', category: 'infantil', price_cents: 3000, order_index: 2, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-06', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: '6', category: 'infantil', price_cents: 3000, order_index: 3, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-08', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: '8', category: 'infantil', price_cents: 3000, order_index: 4, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-10', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: '10', category: 'infantil', price_cents: 3000, order_index: 5, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-12', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: '12', category: 'infantil', price_cents: 3000, order_index: 6, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-14', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: '14', category: 'infantil', price_cents: 3000, order_index: 7, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-16', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: '16', category: 'infantil', price_cents: 3000, order_index: 8, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-pp', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: 'PP', category: 'adulto_padrao', price_cents: 4000, order_index: 9, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-p', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: 'P', category: 'adulto_padrao', price_cents: 4000, order_index: 10, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-m', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: 'M', category: 'adulto_padrao', price_cents: 4000, order_index: 11, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-g', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: 'G', category: 'adulto_padrao', price_cents: 4000, order_index: 12, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-gg', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: 'GG', category: 'adulto_padrao', price_cents: 4000, order_index: 13, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-xg', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: 'XG', category: 'adulto_especial', price_cents: 5000, order_index: 14, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-xxg', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: 'XXG', category: 'adulto_especial', price_cents: 5000, order_index: 15, created_at: '2026-09-01T00:00:00Z' },
  { id: 'p-xxxg', campaign_id: '33333333-3333-3333-3333-333333333333', size_label: 'XXXG', category: 'adulto_especial', price_cents: 5000, order_index: 16, created_at: '2026-09-01T00:00:00Z' },
];

interface SchemaState {
  store: Store;
  schools: School[];
  campaigns: Campaign[];
  classes: ClassItem[];
  prices: CampaignPrice[];
  orders: Order[];
  payments: PaymentAudit[];
  deliveries: DeliveryAudit[];
  events: OrderStatusEvent[];
}

class DatabaseService {
  // In-memory relational state (authoritative when running in non-Supabase test/dev mode)
  private state: SchemaState;

  constructor() {
    this.state = {
      store: INITIAL_STORE,
      schools: [INITIAL_SCHOOL],
      campaigns: [INITIAL_CAMPAIGN],
      classes: [...INITIAL_CLASSES],
      prices: [...INITIAL_PRICES],
      orders: [],
      payments: [],
      deliveries: [],
      events: [],
    };
  }

  public resetToDefaultSeed(): void {
    this.state = {
      store: INITIAL_STORE,
      schools: [INITIAL_SCHOOL],
      campaigns: [INITIAL_CAMPAIGN],
      classes: [...INITIAL_CLASSES],
      prices: [...INITIAL_PRICES],
      orders: [],
      payments: [],
      deliveries: [],
      events: [],
    };
  }

  // --- STORES ---
  public getStore(): Store {
    return this.state.store;
  }

  public updateStore(storeUpdate: Partial<Store>): Store {
    this.state.store = { ...this.state.store, ...storeUpdate };
    return this.state.store;
  }

  // --- SCHOOLS ---
  public getSchools(): School[] {
    return this.state.schools;
  }

  public async getSchoolsAsync(): Promise<School[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) {
        console.error('Erro ao buscar escolas no Supabase:', error);
        throw new Error(`Falha ao consultar escolas: ${error.message} (code: ${error.code})`);
      }
      return (data || []) as School[];
    }
    return this.state.schools;
  }

  public getSchoolById(id: string): School | undefined {
    return this.state.schools.find((s) => s.id === id);
  }

  public createSchool(name: string, logo_url: string | null = null, address?: string): School {
    const newSchool: School = {
      id: crypto.randomUUID(),
      store_id: this.state.store.id,
      name,
      logo_url,
      address: address || null,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    this.state.schools.push(newSchool);
    return newSchool;
  }

  public updateSchool(id: string, updates: Partial<School>): School | undefined {
    const index = this.state.schools.findIndex((s) => s.id === id);
    if (index === -1) return undefined;
    this.state.schools[index] = { ...this.state.schools[index], ...updates };
    return this.state.schools[index];
  }

  public deleteSchool(id: string): boolean {
    const before = this.state.schools.length;
    this.state.schools = this.state.schools.filter((s) => s.id !== id);
    return this.state.schools.length < before;
  }

  // --- CAMPAIGNS ---
  public getCampaigns(): Campaign[] {
    return this.state.campaigns;
  }

  public getCampaignById(id: string): Campaign | undefined {
    return this.state.campaigns.find((c) => c.id === id);
  }

  public getActiveCampaign(): Campaign | undefined {
    return this.state.campaigns.find((c) => c.is_active);
  }

  public createCampaign(campaign: Omit<Campaign, 'id' | 'created_at'>): Campaign {
    const newCamp: Campaign = {
      ...campaign,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    this.state.campaigns.push(newCamp);
    return newCamp;
  }

  public updateCampaign(id: string, updates: Partial<Campaign>): Campaign | undefined {
    const idx = this.state.campaigns.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.state.campaigns[idx] = { ...this.state.campaigns[idx], ...updates };
    return this.state.campaigns[idx];
  }

  public isCampaignOpen(campaign: Campaign): boolean {
    if (!campaign.is_active) return false;
    const now = new Date().getTime();
    const end = new Date(campaign.ends_at).getTime();
    return now <= end;
  }

  // --- CLASSES ---
  public async getClassesByCampaign(campaignId: string): Promise<ClassItem[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('order_index', { ascending: true });
        
      if (error) {
        console.error('Erro ao buscar turmas no Supabase:', error);
        return [];
      }
      return data as ClassItem[];
    }
    return this.state.classes
      .filter((c) => c.campaign_id === campaignId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  public getClassById(id: string): ClassItem | undefined {
    return this.state.classes.find((c) => c.id === id);
  }

  public async createClass(campaignId: string, name: string, image_url: string | null = null): Promise<ClassItem> {
    if (isSupabaseConfigured) {
      const { data: existing } = await supabase
        .from('classes')
        .select('id')
        .eq('campaign_id', campaignId);
        
      const nextIndex = existing ? existing.length + 1 : 1;
      
      const { data, error } = await supabase
        .from('classes')
        .insert({
          campaign_id: campaignId,
          name,
          image_url,
          order_index: nextIndex,
          is_active: true
        })
        .select()
        .single();
        
      if (error) throw new Error(`Falha ao criar turma: ${error.message}`);
      return data as ClassItem;
    }

    const existing = this.state.classes.filter((c) => c.campaign_id === campaignId);
    const newClass: ClassItem = {
      id: crypto.randomUUID(),
      campaign_id: campaignId,
      name,
      image_url,
      order_index: existing.length + 1,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    this.state.classes.push(newClass);
    return newClass;
  }

  public async updateClass(id: string, updates: Partial<ClassItem>): Promise<ClassItem | undefined> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        throw new Error(`Falha ao atualizar turma: ${error.message}`);
      }
      if (!data) {
        throw new Error('Falha ao atualizar turma: registro não encontrado (0 linhas afetadas)');
      }
      return data as ClassItem;
    }

    const idx = this.state.classes.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.state.classes[idx] = { ...this.state.classes[idx], ...updates };
    return this.state.classes[idx];
  }

  public async deleteClass(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);
        
      if (error) throw new Error(`Falha ao excluir turma: ${error.message}`);
      return true;
    }

    const before = this.state.classes.length;
    this.state.classes = this.state.classes.filter((c) => c.id !== id);
    return this.state.classes.length < before;
  }

  // --- PRICES ---
  public getPricesByCampaign(campaignId: string): CampaignPrice[] {
    return this.state.prices
      .filter((p) => p.campaign_id === campaignId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  public async getPricesByCampaignAsync(campaignId: string): Promise<CampaignPrice[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('campaign_prices')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Erro ao buscar precos da campanha no Supabase:', error);
        throw new Error(`Falha ao carregar precos remotos: ${error.message}`);
      }
      return data as CampaignPrice[];
    }
    return this.getPricesByCampaign(campaignId);
  }

  public async updatePrice(id: string, newPriceCents: number): Promise<CampaignPrice | undefined> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('campaign_prices')
        .update({ price_cents: newPriceCents })
        .eq('id', id);

      if (error) {
        throw new Error(`Erro ao atualizar preco no banco de dados: ${error.message}`);
      }
    }

    const idx = this.state.prices.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.state.prices[idx] = {
      ...this.state.prices[idx],
      price_cents: newPriceCents,
    };
    return this.state.prices[idx];
  }

  // --- ORDERS (AUTHORITATIVE SERVER-SIDE COMPUTATION) ---
  public async createOrder(orderInput: {
    campaign_id: string;
    customer_name: string;
    customer_whatsapp: string;
    payment_method: PaymentMethod;
    items: {
      class_id: string;
      student_name: string;
      size_label: string;
      quantity: number;
      unit_price_cents?: number; // Ignored: recalculated server-side
      personalizations?: {
        piece_index: number;
        student_name: string;
        custom_name?: string;
        custom_number?: string;
      }[];
    }[];
  }): Promise<Order> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('rpc_create_order', {
        p_campaign_id: orderInput.campaign_id,
        p_customer_name: orderInput.customer_name,
        p_customer_whatsapp: orderInput.customer_whatsapp,
        p_payment_method: orderInput.payment_method,
        p_items: orderInput.items,
      });

      if (error) {
        throw new Error(`Erro ao registrar pedido no banco: ${error.message}`);
      }
      return data as Order;
    }

    // Authoritative Server-Side Logic for Local/Testing Engine
    const campaign = this.getCampaignById(orderInput.campaign_id);
    if (!campaign) {
      throw new Error('CAMPAIGN_NOT_FOUND: Campanha não encontrada.');
    }

    if (!this.isCampaignOpen(campaign)) {
      throw new Error('CAMPAIGN_CLOSED: Esta campanha já encerrou o período de pedidos.');
    }

    if (!orderInput.items || orderInput.items.length === 0) {
      throw new Error('EMPTY_ORDER: O pedido deve conter pelo menos um item.');
    }

    // STRICT PRICE CALCULATION FROM DATABASE ONLY
    const campaignPrices = this.getPricesByCampaign(orderInput.campaign_id);
    const priceMap = new Map(campaignPrices.map((p) => [p.size_label, p.price_cents]));

    let totalAmountCents = 0;
    let totalItems = 0;
    const orderItems: OrderItem[] = [];

    for (const rawItem of orderInput.items) {
      const cls = this.getClassById(rawItem.class_id);
      if (!cls) {
        throw new Error(`CLASS_NOT_FOUND: Turma ${rawItem.class_id} não encontrada.`);
      }

      // Server-side lookup: completely disregard any client-provided price
      const authoritativeUnitPrice = priceMap.get(rawItem.size_label);
      if (authoritativeUnitPrice === undefined || authoritativeUnitPrice <= 0) {
        throw new Error(`PRICE_NOT_FOUND: Preço não configurado para o tamanho ${rawItem.size_label}.`);
      }

      if (rawItem.quantity <= 0) {
        throw new Error('INVALID_QUANTITY: Quantidade deve ser maior que zero.');
      }

      const subtotalCents = authoritativeUnitPrice * rawItem.quantity;
      totalAmountCents += subtotalCents;
      totalItems += rawItem.quantity;

      const personalizations = [];
      for (let i = 1; i <= rawItem.quantity; i++) {
        const found = rawItem.personalizations?.find((p) => p.piece_index === i);
        personalizations.push({
          id: crypto.randomUUID(),
          piece_index: i,
          student_name: rawItem.student_name,
          custom_name: found?.custom_name?.trim() || null,
          custom_number: found?.custom_number?.trim() || null,
        });
      }

      orderItems.push({
        id: crypto.randomUUID(),
        class_id: rawItem.class_id,
        class_name: cls.name,
        student_name: rawItem.student_name.trim(),
        size_label: rawItem.size_label,
        unit_price_cents: authoritativeUnitPrice, // Canonical snapshot
        quantity: rawItem.quantity,
        subtotal_cents: subtotalCents,
        personalizations,
      });
    }

    const orderNumber = generateOrderNumber(this.state.orders.length + 1);
    const qrToken = generateSecureToken();
    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    const paymentStatus: PaymentStatus =
      orderInput.payment_method === 'PIX' ? 'AGUARDANDO_PIX' : 'NAO_PAGO';

    let pixCharge = null;
    if (orderInput.payment_method === 'PIX') {
      const pixProvider = getPixProvider();
      pixCharge = await pixProvider.createPixCharge({
        id: orderId,
        order_number: orderNumber,
        total_amount_cents: totalAmountCents,
        customer_name: orderInput.customer_name,
      });
    }

    const school = this.getSchoolById(campaign.school_id);

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      campaign_id: orderInput.campaign_id,
      customer_name: orderInput.customer_name.trim(),
      customer_whatsapp: orderInput.customer_whatsapp.trim(),
      total_amount_cents: totalAmountCents,
      total_items: totalItems,
      payment_method: orderInput.payment_method,
      order_status: 'CONFIRMADO',
      payment_status: paymentStatus,
      production_status: 'PENDENTE',
      delivery_status: 'AGUARDANDO_RETIRADA',
      qr_token: qrToken,
      pix_code: pixCharge?.pixCopiaECola || null,
      pix_qr_base64: pixCharge?.qrCodeBase64 || null,
      pix_txid: pixCharge?.txid || null,
      created_at: now,
      updated_at: now,
      items: orderItems,
      campaign,
      school,
    };

    const orderCreatedEvent: OrderStatusEvent = {
      id: crypto.randomUUID(),
      order_id: orderId,
      event_type: 'ORDER_CREATED',
      from_status: null,
      to_status: 'CONFIRMADO',
      actor_type: 'CUSTOMER',
      actor_id: orderInput.customer_name,
      notes: `Pedido criado com sucesso. Total: ${totalItems} peças calculadas autoritativamente.`,
      created_at: now,
    };

    this.state.orders.unshift(newOrder);
    this.state.events.push(orderCreatedEvent);

    // Asynchronous notification queue simulation
    try {
      const waProvider = getWhatsAppProvider();
      await waProvider.sendOrderConfirmation(newOrder);
    } catch (err) {
      console.warn('WhatsApp background notification failed (does not rollback order)', err);
    }

    return newOrder;
  }

  public getOrders(filters?: {
    school_id?: string;
    campaign_id?: string;
    class_id?: string;
    student_name?: string;
    customer_name?: string;
    customer_whatsapp?: string;
    order_number?: string;
    payment_status?: PaymentStatus | 'ALL';
    production_status?: ProductionStatus | 'ALL';
    delivery_status?: DeliveryStatus | 'ALL';
    search?: string;
  }): Order[] {
    let result = [...this.state.orders];

    if (!filters) return result;

    if (filters.school_id) {
      result = result.filter((o) => o.school?.id === filters.school_id);
    }

    if (filters.campaign_id) {
      result = result.filter((o) => o.campaign_id === filters.campaign_id);
    }

    if (filters.class_id) {
      result = result.filter((o) => o.items?.some((i) => i.class_id === filters.class_id));
    }

    if (filters.payment_status && filters.payment_status !== 'ALL') {
      result = result.filter((o) => o.payment_status === filters.payment_status);
    }

    if (filters.production_status && filters.production_status !== 'ALL') {
      result = result.filter((o) => o.production_status === filters.production_status);
    }

    if (filters.delivery_status && filters.delivery_status !== 'ALL') {
      result = result.filter((o) => o.delivery_status === filters.delivery_status);
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter((o) => {
        const matchesNumber = o.order_number.toLowerCase().includes(q);
        const matchesCustomer = o.customer_name.toLowerCase().includes(q);
        const matchesPhone = o.customer_whatsapp.includes(q);
        const matchesStudents = o.items?.some((i) => i.student_name.toLowerCase().includes(q));
        return matchesNumber || matchesCustomer || matchesPhone || matchesStudents;
      });
    }

    return result;
  }

  public getOrderById(id: string): Order | undefined {
    return this.state.orders.find((o) => o.id === id);
  }

  public getOrderByQrToken(qrToken: string): Order | undefined {
    return this.state.orders.find((o) => o.qr_token === qrToken);
  }

  public async getOrderByQrTokenAsync(qrToken: string): Promise<Order | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('rpc_get_public_order_by_qr', {
          p_qr_token: qrToken.trim(),
        });

        if (error) {
          console.error('Erro ao consultar pedido por QR Token no Supabase:', error);
          return null;
        }

        if (!data || typeof data !== 'object') {
          return null;
        }

        const raw = data as Record<string, any>;

        // Safely map items and nested personalizations
        const items: OrderItem[] = Array.isArray(raw.items)
          ? raw.items.map((item: any) => ({
              id: item.id || '',
              order_id: raw.id || '',
              class_id: item.class_id || '',
              class_name: item.class_name || 'Turma não informada',
              student_name: item.student_name || 'Aluno',
              size_label: item.size_label || '',
              unit_price_cents: Number(item.unit_price_cents) || 0,
              quantity: Number(item.quantity) || 1,
              subtotal_cents: Number(item.subtotal_cents) || 0,
              personalizations: Array.isArray(item.personalizations)
                ? item.personalizations.map((p: any) => ({
                    id: p.id || '',
                    piece_index: Number(p.piece_index) || 1,
                    student_name: p.student_name || item.student_name || '',
                    custom_name: p.custom_name || null,
                    custom_number: p.custom_number || null,
                  }))
                : [],
            }))
          : [];

        const mappedOrder: Order = {
          id: raw.id,
          order_number: raw.order_number,
          campaign_id: raw.campaign_id || '',
          customer_name: raw.customer_name || 'Cliente',
          customer_whatsapp: raw.customer_whatsapp_masked || raw.customer_whatsapp || '',
          total_amount_cents: Number(raw.total_amount_cents) || 0,
          total_items: Number(raw.total_items) || items.reduce((acc, it) => acc + it.quantity, 0),
          payment_method: raw.payment_method || 'LOJA',
          order_status: raw.order_status || 'CONFIRMADO',
          payment_status: raw.payment_status || 'NAO_PAGO',
          production_status: raw.production_status || 'PENDENTE',
          delivery_status: raw.delivery_status || 'AGUARDANDO_RETIRADA',
          qr_token: raw.qr_token || qrToken,
          pix_code: raw.pix_code || null,
          created_at: raw.created_at || new Date().toISOString(),
          updated_at: raw.updated_at || raw.created_at || new Date().toISOString(),
          school: raw.school
            ? {
                id: '',
                store_id: '',
                name: raw.school.name || '',
                logo_url: null,
                is_active: true,
                created_at: raw.created_at || new Date().toISOString(),
              }
            : undefined,
          campaign: raw.campaign
            ? {
                id: '',
                school_id: '',
                name: raw.campaign.name || '',
                is_active: true,
                starts_at: '',
                ends_at: '',
                delivery_estimate: raw.campaign.delivery_estimate || '',
                created_at: raw.created_at || new Date().toISOString(),
              }
            : undefined,
          items,
        };

        return mappedOrder;
      } catch (err) {
        console.error('Exceção ao consultar pedido por QR Token:', err);
        return null;
      }
    }

    const local = this.getOrderByQrToken(qrToken);
    return local || null;
  }

  public async lookupOrderByCredentialsAsync(input: OrderLookupInput): Promise<Order | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('rpc_lookup_order_by_credentials', {
          p_order_number: input.order_number.trim(),
          p_student_name: input.student_name.trim(),
          p_customer_name: input.customer_name.trim(),
          p_customer_whatsapp: input.customer_whatsapp.trim(),
        });

        if (error) {
          console.error('Erro ao consultar pedido por credenciais no Supabase:', error);
          return null;
        }

        if (!data || typeof data !== 'object') {
          return null;
        }

        const raw = data as Record<string, any>;

        // Safely map items and nested personalizations
        const items: OrderItem[] = Array.isArray(raw.items)
          ? raw.items.map((item: any) => ({
              id: item.id || '',
              order_id: raw.id || '',
              class_id: item.class_id || '',
              class_name: item.class_name || 'Turma não informada',
              student_name: item.student_name || 'Aluno',
              size_label: item.size_label || '',
              unit_price_cents: Number(item.unit_price_cents) || 0,
              quantity: Number(item.quantity) || 1,
              subtotal_cents: Number(item.subtotal_cents) || 0,
              personalizations: Array.isArray(item.personalizations)
                ? item.personalizations.map((p: any) => ({
                    id: p.id || '',
                    piece_index: Number(p.piece_index) || 1,
                    student_name: p.student_name || item.student_name || '',
                    custom_name: p.custom_name || null,
                    custom_number: p.custom_number || null,
                  }))
                : [],
            }))
          : [];

        const mappedOrder: Order = {
          id: raw.id,
          order_number: raw.order_number,
          campaign_id: raw.campaign_id || '',
          customer_name: raw.customer_name || 'Cliente',
          customer_whatsapp: raw.customer_whatsapp_masked || '',
          total_amount_cents: Number(raw.total_amount_cents) || 0,
          total_items: Number(raw.total_items) || items.reduce((acc, it) => acc + it.quantity, 0),
          payment_method: raw.payment_method || 'LOJA',
          order_status: raw.order_status || 'CONFIRMADO',
          payment_status: raw.payment_status || 'NAO_PAGO',
          production_status: raw.production_status || 'PENDENTE',
          delivery_status: raw.delivery_status || 'AGUARDANDO_RETIRADA',
          qr_token: '', // Deliberately omitted in manual credentials lookup
          pix_code: raw.pix_code || null,
          created_at: raw.created_at || new Date().toISOString(),
          updated_at: raw.updated_at || raw.created_at || new Date().toISOString(),
          school: raw.school
            ? {
                id: '',
                store_id: '',
                name: raw.school.name || '',
                logo_url: null,
                is_active: true,
                created_at: raw.created_at || new Date().toISOString(),
              }
            : undefined,
          campaign: raw.campaign
            ? {
                id: '',
                school_id: '',
                name: raw.campaign.name || '',
                is_active: true,
                starts_at: '',
                ends_at: '',
                delivery_estimate: raw.campaign.delivery_estimate || '',
                created_at: raw.created_at || new Date().toISOString(),
              }
            : undefined,
          items,
        };

        return mappedOrder;
      } catch (err) {
        console.error('Exceção ao consultar pedido por credenciais:', err);
        return null;
      }
    }

    // Mock local fallback
    const cleanOrderNum = input.order_number.trim().toUpperCase();
    const cleanCustomer = input.customer_name.trim().toLowerCase();
    const cleanStudent = input.student_name.trim().toLowerCase();
    let cleanPhone = input.customer_whatsapp.replace(/\D/g, '');
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }

    const found = this.state.orders.find((o) => {
      const matchNum = o.order_number.trim().toUpperCase() === cleanOrderNum;
      const matchCust = o.customer_name.trim().toLowerCase() === cleanCustomer;
      let orderPhone = o.customer_whatsapp.replace(/\D/g, '');
      if (orderPhone.length >= 10 && orderPhone.length <= 11 && !orderPhone.startsWith('55')) {
        orderPhone = '55' + orderPhone;
      }
      const matchPhone = orderPhone === cleanPhone;
      const matchStudent = o.items?.some(
        (it) => it.student_name.trim().toLowerCase() === cleanStudent
      );
      return matchNum && matchCust && matchPhone && matchStudent;
    });

    if (!found) return null;

    return {
      ...found,
      qr_token: '',
    };
  }

  public async searchPublicOrdersAsync(
    params: PublicOrderSearchParams
  ): Promise<PublicOrderSearchResponse> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('rpc_search_public_orders', {
          p_order_number: params.order_number?.trim() || null,
          p_customer_name: params.customer_name?.trim() || null,
          p_customer_whatsapp: params.customer_whatsapp?.trim() || null,
          p_page: params.page || 1,
          p_page_size: params.page_size || 10,
        });

        if (error) {
          console.error('Erro ao pesquisar pedidos públicos no Supabase:', error);
          return {
            items: [],
            total_count: 0,
            page: params.page || 1,
            page_size: params.page_size || 10,
            has_more: false,
          };
        }

        if (!data || typeof data !== 'object') {
          return {
            items: [],
            total_count: 0,
            page: params.page || 1,
            page_size: params.page_size || 10,
            has_more: false,
          };
        }

        const raw = data as Record<string, any>;
        const rawItems = Array.isArray(raw.items) ? raw.items : [];

        const items: PublicOrderSearchResult[] = rawItems.map((item: any) => ({
          order_number: item.order_number || '',
          customer_name: item.customer_name || '',
          customer_whatsapp_masked: item.customer_whatsapp_masked || '',
          total_amount_cents: Number(item.total_amount_cents) || 0,
          total_items: Number(item.total_items) || 0,
          payment_method: item.payment_method || 'LOJA',
          order_status: item.order_status || 'CONFIRMADO',
          payment_status: item.payment_status || 'NAO_PAGO',
          production_status: item.production_status || 'PENDENTE',
          delivery_status: item.delivery_status || 'AGUARDANDO_RETIRADA',
          created_at: item.created_at || new Date().toISOString(),
          school_name: item.school_name || '',
          campaign_name: item.campaign_name || '',
          lookup_token: item.lookup_token || '',
          lookup_token_expires_at: item.lookup_token_expires_at || undefined,
        }));

        return {
          items,
          total_count: Number(raw.total_count) || items.length,
          page: Number(raw.page) || (params.page || 1),
          page_size: Number(raw.page_size) || (params.page_size || 10),
          has_more: Boolean(raw.has_more),
        };
      } catch (err) {
        console.error('Exceção ao pesquisar pedidos públicos:', err);
        return {
          items: [],
          total_count: 0,
          page: params.page || 1,
          page_size: params.page_size || 10,
          has_more: false,
        };
      }
    }

    // Mock local fallback
    const cleanOrderNum = params.order_number?.trim().toUpperCase() || '';
    const cleanCustomer = params.customer_name?.trim().toLowerCase() || '';
    let cleanPhone = params.customer_whatsapp?.replace(/\D/g, '') || '';
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }

    const matches = this.state.orders.filter((o) => {
      if (cleanOrderNum) {
        return o.order_number.trim().toUpperCase() === cleanOrderNum;
      }
      if (cleanPhone && cleanPhone.length >= 8) {
        let orderPhone = o.customer_whatsapp.replace(/\D/g, '');
        if (orderPhone.length >= 10 && orderPhone.length <= 11 && !orderPhone.startsWith('55')) {
          orderPhone = '55' + orderPhone;
        }
        return orderPhone === cleanPhone || orderPhone.endsWith(cleanPhone);
      }
      if (cleanCustomer && cleanCustomer.length >= 3) {
        return o.customer_name.trim().toLowerCase().includes(cleanCustomer);
      }
      return false;
    });

    const page = params.page || 1;
    const pageSize = params.page_size || 10;
    const offset = (page - 1) * pageSize;
    const paginatedMatches = matches.slice(offset, offset + pageSize);

    const items: PublicOrderSearchResult[] = paginatedMatches.map((o) => {
      const len = o.customer_whatsapp.length;
      const masked =
        len >= 8
          ? o.customer_whatsapp.slice(0, 5) + '****' + o.customer_whatsapp.slice(-4)
          : '****';
      return {
        order_number: o.order_number,
        customer_name: o.customer_name,
        customer_whatsapp_masked: masked,
        total_amount_cents: o.total_amount_cents,
        total_items: o.total_items,
        payment_method: o.payment_method,
        order_status: o.order_status,
        payment_status: o.payment_status,
        production_status: o.production_status,
        delivery_status: o.delivery_status,
        created_at: o.created_at,
        school_name: o.school?.name,
        campaign_name: o.campaign?.name,
        lookup_token: `mock_token_${o.id}`,
      };
    });

    return {
      items,
      total_count: matches.length,
      page,
      page_size: pageSize,
      has_more: offset + pageSize < matches.length,
    };
  }

  public async getPublicOrderDetailsAsync(
    lookupToken: string
  ): Promise<Order | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('rpc_get_public_order_details', {
          p_lookup_token: lookupToken.trim(),
        });

        if (error) {
          console.error('Erro ao buscar detalhes do pedido no Supabase:', error);
          return null;
        }

        if (!data || typeof data !== 'object') {
          return null;
        }

        const raw = data as Record<string, any>;

        const items: OrderItem[] = Array.isArray(raw.items)
          ? raw.items.map((item: any) => ({
              id: item.id || '',
              order_id: '',
              class_id: item.class_id || '',
              class_name: item.class_name || 'Turma não informada',
              student_name: item.student_name || 'Aluno',
              size_label: item.size_label || '',
              unit_price_cents: Number(item.unit_price_cents) || 0,
              quantity: Number(item.quantity) || 1,
              subtotal_cents: Number(item.subtotal_cents) || 0,
              personalizations: Array.isArray(item.personalizations)
                ? item.personalizations.map((p: any) => ({
                    id: p.id || '',
                    piece_index: Number(p.piece_index) || 1,
                    student_name: p.student_name || item.student_name || '',
                    custom_name: p.custom_name || null,
                    custom_number: p.custom_number || null,
                  }))
                : [],
            }))
          : [];

        const mappedOrder: Order = {
          id: '', // Deliberately omitted internal UUID
          order_number: raw.order_number,
          campaign_id: '',
          customer_name: raw.customer_name || 'Cliente',
          customer_whatsapp: raw.customer_whatsapp_masked || '',
          total_amount_cents: Number(raw.total_amount_cents) || 0,
          total_items: Number(raw.total_items) || items.reduce((acc, it) => acc + it.quantity, 0),
          payment_method: raw.payment_method || 'LOJA',
          order_status: raw.order_status || 'CONFIRMADO',
          payment_status: raw.payment_status || 'NAO_PAGO',
          production_status: raw.production_status || 'PENDENTE',
          delivery_status: raw.delivery_status || 'AGUARDANDO_RETIRADA',
          qr_token: '', // Deliberately omitted
          pix_code: raw.pix_code || null,
          created_at: raw.created_at || new Date().toISOString(),
          updated_at: raw.created_at || new Date().toISOString(),
          school: raw.school
            ? {
                id: '',
                store_id: '',
                name: raw.school.name || '',
                logo_url: null,
                is_active: true,
                created_at: raw.created_at || new Date().toISOString(),
              }
            : undefined,
          campaign: raw.campaign
            ? {
                id: '',
                school_id: '',
                name: raw.campaign.name || '',
                is_active: true,
                starts_at: '',
                ends_at: '',
                delivery_estimate: raw.campaign.delivery_estimate || '',
                created_at: raw.created_at || new Date().toISOString(),
              }
            : undefined,
          items,
        };

        return mappedOrder;
      } catch (err) {
        console.error('Exceção ao buscar detalhes públicos do pedido:', err);
        return null;
      }
    }

    // Mock fallback
    const found = this.state.orders.find(
      (o) => `mock_token_${o.id}` === lookupToken.trim()
    );
    if (!found) return null;

    return {
      ...found,
      id: '',
      qr_token: '',
    };
  }

  // --- ATOMIC SENSITIVE OPERATIONS ---
  public async confirmPayment(
    orderId: string,
    adminUser: string = 'Administrador Seven',
    method: InStorePaymentMethod = 'LOJA',
    txReference?: string
  ): Promise<Order> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('rpc_confirm_payment', {
        p_order_id: orderId,
        p_admin_user: adminUser,
        p_method: method,
        p_tx_reference: txReference,
      });
      if (error) {
        throw new Error(`Erro ao confirmar pagamento no banco: ${error.message}`);
      }
      return this.getOrderById(orderId)!;
    }

    const order = this.getOrderById(orderId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND: Pedido não encontrado.');
    }

    // Idempotent: If already paid, return safely without duplicated events
    if (order.payment_status === 'PAGO') {
      return order;
    }

    const now = new Date().toISOString();
    order.payment_status = 'PAGO';
    order.updated_at = now;

    const paymentAudit: PaymentAudit = {
      id: crypto.randomUUID(),
      order_id: order.id,
      amount_cents: order.total_amount_cents,
      method,
      status: 'CONFIRMADO',
      confirmed_at: now,
      confirmed_by_admin: adminUser,
      transaction_reference: txReference || `MANUAL_${Date.now()}`,
      created_at: now,
    };

    const event: OrderStatusEvent = {
      id: crypto.randomUUID(),
      order_id: order.id,
      event_type: 'PAYMENT_UPDATED',
      from_status: 'NAO_PAGO',
      to_status: 'PAGO',
      actor_type: 'ADMIN',
      actor_id: adminUser,
      notes: `Pagamento de R$ ${(order.total_amount_cents / 100).toFixed(2)} confirmado por ${adminUser}.`,
      created_at: now,
    };

    this.state.payments.push(paymentAudit);
    this.state.events.push(event);

    try {
      const waProvider = getWhatsAppProvider();
      await waProvider.sendPaymentConfirmation(order);
    } catch (err) {
      console.warn('WhatsApp dispatch failed (does not affect paid state)', err);
    }

    return order;
  }

  public updateProductionStatus(
    orderId: string,
    newStatus: ProductionStatus,
    adminUser: string = 'Administrador Seven'
  ): Order {
    const order = this.getOrderById(orderId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND: Pedido não encontrado.');
    }

    const oldStatus = order.production_status;
    order.production_status = newStatus;
    order.updated_at = new Date().toISOString();

    const event: OrderStatusEvent = {
      id: crypto.randomUUID(),
      order_id: order.id,
      event_type: 'PRODUCTION_UPDATED',
      from_status: oldStatus,
      to_status: newStatus,
      actor_type: 'ADMIN',
      actor_id: adminUser,
      notes: `Status de produção alterado para ${newStatus} por ${adminUser}.`,
      created_at: new Date().toISOString(),
    };

    this.state.events.push(event);
    return order;
  }

  /**
   * Atomic Delivery Confirmation (Concurrency Protected)
   */
  public confirmDelivery(
    orderId: string,
    adminUser: string = 'Administrador Seven',
    recipientName?: string,
    notes?: string
  ): Order {
    const order = this.getOrderById(orderId);
    if (!order) {
      throw new Error('ORDER_NOT_FOUND: Pedido não encontrado.');
    }

    // Atomic Concurrency Guard
    if (order.delivery_status === 'ENTREGUE') {
      throw new Error('ORDER_ALREADY_DELIVERED: Este pedido já foi retirado anteriormente. Segunda entrega bloqueada!');
    }

    const now = new Date().toISOString();
    order.delivery_status = 'ENTREGUE';
    order.updated_at = now;

    const deliveryAudit: DeliveryAudit = {
      id: crypto.randomUUID(),
      order_id: order.id,
      delivered_at: now,
      delivered_by_admin: adminUser,
      recipient_name: recipientName || order.customer_name,
      notes: notes || 'Retirado na loja física',
      created_at: now,
    };

    const event: OrderStatusEvent = {
      id: crypto.randomUUID(),
      order_id: order.id,
      event_type: 'DELIVERY_UPDATED',
      from_status: 'AGUARDANDO_RETIRADA',
      to_status: 'ENTREGUE',
      actor_type: 'ADMIN',
      actor_id: adminUser,
      notes: `Entrega realizada por ${adminUser} para ${recipientName || order.customer_name}.`,
      created_at: now,
    };

    this.state.deliveries.push(deliveryAudit);
    this.state.events.push(event);
    return order;
  }

  /**
   * Async Delivery Confirmation via RPC (Secure & Persistent)
   */
  public async confirmDeliveryAsync(
    orderId: string,
    adminUser: string = 'Administrador Seven',
    recipientName?: string,
    notes?: string
  ): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.rpc('rpc_confirm_delivery', {
        p_order_id: orderId,
        p_admin_user: adminUser,
        p_recipient_name: recipientName,
        p_notes: notes,
      });
      if (error) {
        throw new Error(`Erro ao confirmar entrega: ${error.message}`);
      }
      return;
    }
    // Fallback local (should not happen in production with Supabase configured)
    this.confirmDelivery(orderId, adminUser, recipientName, notes);
  }

  // --- MANDATORY CLASS REPORT ---
  public getClassReport(
    campaignId: string,
    classId: string,
    filterStatus?: 'ALL' | 'PAID' | 'UNPAID' | 'DELIVERED' | 'UNDELIVERED'
  ): ClassReportSummary {
    const cls = this.getClassById(classId);
    const className = cls?.name || 'Turma Selecionada';

    const orders = this.getOrders({ campaign_id: campaignId });
    const rows: ClassReportRow[] = [];

    let totalItems = 0;
    let paidItemsCount = 0;
    let unpaidItemsCount = 0;
    let totalAmountCents = 0;
    let paidAmountCents = 0;
    let unpaidAmountCents = 0;
    const matchedOrderIds = new Set<string>();

    for (const order of orders) {
      // ONLY include items strictly belonging to this class (prevents cross-class duplication in multi-class orders)
      const itemsInClass = (order.items || []).filter((item) => item.class_id === classId);
      if (itemsInClass.length === 0) continue;

      const isPaid = order.payment_status === 'PAGO';
      const isDelivered = order.delivery_status === 'ENTREGUE';

      if (filterStatus === 'PAID' && !isPaid) continue;
      if (filterStatus === 'UNPAID' && isPaid) continue;
      if (filterStatus === 'DELIVERED' && !isDelivered) continue;
      if (filterStatus === 'UNDELIVERED' && isDelivered) continue;

      matchedOrderIds.add(order.id);

      for (const item of itemsInClass) {
        totalItems += item.quantity;
        const itemTotal = item.subtotal_cents;
        totalAmountCents += itemTotal;

        if (isPaid) {
          paidItemsCount += item.quantity;
          paidAmountCents += itemTotal;
        } else {
          unpaidItemsCount += item.quantity;
          unpaidAmountCents += itemTotal;
        }

        const customNames = item.personalizations?.map((p) => p.custom_name).filter(Boolean).join(', ') || '-';
        const customNumbers = item.personalizations?.map((p) => p.custom_number).filter(Boolean).join(', ') || '-';

        rows.push({
          order_number: order.order_number,
          order_id: order.id,
          created_at: order.created_at,
          student_name: item.student_name,
          customer_name: order.customer_name,
          customer_whatsapp: order.customer_whatsapp,
          size_label: item.size_label,
          custom_name: customNames,
          custom_number: customNumbers,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          subtotal_cents: item.subtotal_cents,
          payment_status: order.payment_status,
          production_status: order.production_status,
          delivery_status: order.delivery_status,
        });
      }
    }

    return {
      class_name: className,
      total_orders: matchedOrderIds.size,
      total_items: totalItems,
      paid_items_count: paidItemsCount,
      unpaid_items_count: unpaidItemsCount,
      total_amount_cents: totalAmountCents,
      paid_amount_cents: paidAmountCents,
      unpaid_amount_cents: unpaidAmountCents,
      rows,
    };
  }

  // --- ASYNC SUPABASE METHODS FOR CLASS REPORT ---

  public async getCampaignsAsync(schoolId?: string): Promise<Campaign[]> {
    if (isSupabaseConfigured) {
      let query = supabase.from('campaigns').select('*');
      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao buscar campanhas no Supabase:', error);
        throw new Error(`Falha ao consultar campanhas: ${error.message} (code: ${error.code})`);
      }
      return (data || []) as Campaign[];
    }
    const all = this.state.campaigns;
    return schoolId ? all.filter(c => c.school_id === schoolId) : all;
  }

  public async getCampaignByIdAsync(id: string): Promise<Campaign | undefined> {
    if (!id) return undefined;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('Erro ao buscar campanha por ID no Supabase:', error);
        throw new Error(`Falha ao consultar campanha: ${error.message} (code: ${error.code})`);
      }
      return (data as Campaign) || undefined;
    }
    return this.state.campaigns.find(c => c.id === id);
  }

  public async getClassByIdAsync(id: string): Promise<ClassItem | undefined> {
    if (!id) return undefined;
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.error('Erro ao buscar turma por ID no Supabase:', error);
        throw new Error(`Falha ao consultar turma: ${error.message} (code: ${error.code})`);
      }
      return (data as ClassItem) || undefined;
    }
    return this.state.classes.find(c => c.id === id);
  }

  public async getOrdersAsync(filters?: {
    campaign_id?: string;
    class_id?: string;
    payment_status?: PaymentStatus | 'ALL';
    delivery_status?: DeliveryStatus | 'ALL';
  }): Promise<Order[]> {
    if (isSupabaseConfigured) {
      // Fetch orders with nested order_items and item_personalizations via Supabase join syntax
      let query = supabase.from('orders').select(`
        *,
        items:order_items(
          id,
          class_id,
          class_name,
          student_name,
          size_label,
          unit_price_cents,
          quantity,
          subtotal_cents,
          personalizations:item_personalizations(
            id,
            piece_index,
            student_name,
            custom_name,
            custom_number
          )
        )
      `);

      if (filters?.campaign_id) {
        query = query.eq('campaign_id', filters.campaign_id);
      }
      if (filters?.payment_status && filters.payment_status !== 'ALL') {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters?.delivery_status && filters.delivery_status !== 'ALL') {
        query = query.eq('delivery_status', filters.delivery_status);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.error('Erro ao buscar pedidos no Supabase:', error);
        throw new Error(`Falha ao consultar pedidos: ${error.message} (code: ${error.code})`);
      }

      const rawOrders = (data || []) as any[];

      // If class_id filter is set, we need to post-filter since order_items is nested
      let mappedOrders: Order[] = rawOrders.map(raw => {
        const items: OrderItem[] = Array.isArray(raw.items)
          ? raw.items.map((item: any) => ({
              id: item.id || '',
              order_id: raw.id || '',
              class_id: item.class_id || '',
              class_name: item.class_name || '',
              student_name: item.student_name || '',
              size_label: item.size_label || '',
              unit_price_cents: Number(item.unit_price_cents) || 0,
              quantity: Number(item.quantity) || 0,
              subtotal_cents: Number(item.subtotal_cents) || 0,
              personalizations: Array.isArray(item.personalizations)
                ? item.personalizations.map((p: any) => ({
                    id: p.id || '',
                    piece_index: Number(p.piece_index) || 1,
                    student_name: p.student_name || '',
                    custom_name: p.custom_name || null,
                    custom_number: p.custom_number || null,
                  }))
                : [],
            }))
          : [];

        return {
          id: raw.id,
          order_number: raw.order_number || '',
          campaign_id: raw.campaign_id || '',
          customer_name: raw.customer_name || '',
          customer_whatsapp: raw.customer_whatsapp || '',
          total_amount_cents: Number(raw.total_amount_cents) || 0,
          total_items: Number(raw.total_items) || 0,
          payment_method: raw.payment_method || 'LOJA',
          order_status: raw.order_status || 'CONFIRMADO',
          payment_status: raw.payment_status || 'NAO_PAGO',
          production_status: raw.production_status || 'PENDENTE',
          delivery_status: raw.delivery_status || 'AGUARDANDO_RETIRADA',
          qr_token: raw.qr_token || '',
          pix_code: raw.pix_code || null,
          pix_qr_base64: raw.pix_qr_base64 || null,
          pix_txid: raw.pix_txid || null,
          created_at: raw.created_at || '',
          updated_at: raw.updated_at || raw.created_at || '',
          items,
        } as Order;
      });

      // Post-filter by class_id if specified (nested in order_items)
      if (filters?.class_id) {
        mappedOrders = mappedOrders.filter(o =>
          o.items?.some(i => i.class_id === filters.class_id)
        );
      }

      return mappedOrders;
    }

    // Fallback to local state
    return this.getOrders(filters as any);
  }

  public async getClassReportAsync(
    campaignId: string,
    classId: string,
    filterStatus?: 'ALL' | 'PAID' | 'UNPAID' | 'DELIVERED' | 'UNDELIVERED'
  ): Promise<ClassReportSummary> {
    const cls = await this.getClassByIdAsync(classId);
    const className = cls?.name || 'Turma Selecionada';

    const orders = await this.getOrdersAsync({ campaign_id: campaignId });
    const rows: ClassReportRow[] = [];

    let totalItems = 0;
    let paidItemsCount = 0;
    let unpaidItemsCount = 0;
    let totalAmountCents = 0;
    let paidAmountCents = 0;
    let unpaidAmountCents = 0;
    const matchedOrderIds = new Set<string>();

    for (const order of orders) {
      const itemsInClass = (order.items || []).filter(item => item.class_id === classId);
      if (itemsInClass.length === 0) continue;

      const isPaid = order.payment_status === 'PAGO';
      const isDelivered = order.delivery_status === 'ENTREGUE';

      if (filterStatus === 'PAID' && !isPaid) continue;
      if (filterStatus === 'UNPAID' && isPaid) continue;
      if (filterStatus === 'DELIVERED' && !isDelivered) continue;
      if (filterStatus === 'UNDELIVERED' && isDelivered) continue;

      matchedOrderIds.add(order.id);

      for (const item of itemsInClass) {
        totalItems += item.quantity;
        const itemTotal = item.subtotal_cents;
        totalAmountCents += itemTotal;

        if (isPaid) {
          paidItemsCount += item.quantity;
          paidAmountCents += itemTotal;
        } else {
          unpaidItemsCount += item.quantity;
          unpaidAmountCents += itemTotal;
        }

        const customNames = item.personalizations?.map(p => p.custom_name).filter(Boolean).join(', ') || '-';
        const customNumbers = item.personalizations?.map(p => p.custom_number).filter(Boolean).join(', ') || '-';

        rows.push({
          order_number: order.order_number,
          order_id: order.id,
          created_at: order.created_at,
          student_name: item.student_name,
          customer_name: order.customer_name,
          customer_whatsapp: order.customer_whatsapp,
          size_label: item.size_label,
          custom_name: customNames,
          custom_number: customNumbers,
          quantity: item.quantity,
          unit_price_cents: item.unit_price_cents,
          subtotal_cents: item.subtotal_cents,
          payment_status: order.payment_status,
          production_status: order.production_status,
          delivery_status: order.delivery_status,
        });
      }
    }

    return {
      class_name: className,
      total_orders: matchedOrderIds.size,
      total_items: totalItems,
      paid_items_count: paidItemsCount,
      unpaid_items_count: unpaidItemsCount,
      total_amount_cents: totalAmountCents,
      paid_amount_cents: paidAmountCents,
      unpaid_amount_cents: unpaidAmountCents,
      rows,
    };
  }

  // --- MANDATORY PRODUCTION MAP ---
  public getProductionMap(
    campaignId: string,
    classId: string
  ): {
    className: string;
    sizeBreakdown: ProductionMapBySize[];
    totalQuantity: number;
    customizations: CustomizationItemDetail[];
  } {
    const cls = this.getClassById(classId);
    const className = cls?.name || 'Turma Selecionada';
    const prices = this.getPricesByCampaign(campaignId);

    const sizeQtyMap = new Map<string, number>();
    prices.forEach((p) => sizeQtyMap.set(p.size_label, 0));

    const customizations: CustomizationItemDetail[] = [];
    let totalQuantity = 0;

    const orders = this.getOrders({ campaign_id: campaignId });
    for (const order of orders) {
      if (order.order_status === 'CANCELADO') continue;

      const itemsInClass = (order.items || []).filter((item) => item.class_id === classId);
      for (const item of itemsInClass) {
        totalQuantity += item.quantity;
        const currentQty = sizeQtyMap.get(item.size_label) || 0;
        sizeQtyMap.set(item.size_label, currentQty + item.quantity);

        if (item.personalizations && item.personalizations.length > 0) {
          item.personalizations.forEach((p) => {
            if (p.custom_name || p.custom_number) {
              customizations.push({
                order_number: order.order_number,
                student_name: p.student_name || item.student_name,
                class_name: className,
                size_label: item.size_label,
                custom_name: p.custom_name || '-',
                custom_number: p.custom_number || '-',
                piece_index: p.piece_index,
              });
            }
          });
        }
      }
    }

    const sizeBreakdown: ProductionMapBySize[] = prices.map((p) => ({
      size_label: p.size_label,
      category: p.category,
      quantity: sizeQtyMap.get(p.size_label) || 0,
      order_index: p.order_index,
    }));

    return {
      className,
      sizeBreakdown,
      totalQuantity,
      customizations,
    };
  }

  // --- ASYNC PRODUCTION MAP (Supabase) ---
  public async getProductionMapAsync(
    campaignId: string,
    classId: string
  ): Promise<{
    className: string;
    sizeBreakdown: ProductionMapBySize[];
    totalQuantity: number;
    customizations: CustomizationItemDetail[];
  }> {
    const cls = await this.getClassByIdAsync(classId);
    const className = cls?.name || 'Turma Selecionada';
    const prices = await this.getPricesByCampaignAsync(campaignId);

    const sizeQtyMap = new Map<string, number>();
    prices.forEach((p) => sizeQtyMap.set(p.size_label, 0));

    const customizations: CustomizationItemDetail[] = [];
    let totalQuantity = 0;

    // Use the same real orders source as the Class Report
    const orders = await this.getOrdersAsync({ campaign_id: campaignId });
    for (const order of orders) {
      // Same production rule: skip cancelled orders
      if (order.order_status === 'CANCELADO') continue;

      const itemsInClass = (order.items || []).filter((item) => item.class_id === classId);
      for (const item of itemsInClass) {
        totalQuantity += item.quantity;
        const currentQty = sizeQtyMap.get(item.size_label) || 0;
        sizeQtyMap.set(item.size_label, currentQty + item.quantity);

        if (item.personalizations && item.personalizations.length > 0) {
          item.personalizations.forEach((p) => {
            if (p.custom_name || p.custom_number) {
              customizations.push({
                order_number: order.order_number,
                student_name: p.student_name || item.student_name,
                class_name: className,
                size_label: item.size_label,
                custom_name: p.custom_name || '-',
                custom_number: p.custom_number || '-',
                piece_index: p.piece_index,
              });
            }
          });
        }
      }
    }

    const sizeBreakdown: ProductionMapBySize[] = prices.map((p) => ({
      size_label: p.size_label,
      category: p.category,
      quantity: sizeQtyMap.get(p.size_label) || 0,
      order_index: p.order_index,
    }));

    return {
      className,
      sizeBreakdown,
      totalQuantity,
      customizations,
    };
  }

  public async getCampaignGeneralSummary(campaignId: string): Promise<{
    classId: string;
    className: string;
    ordersCount: number;
    piecesCount: number;
    paidCount: number;
    unpaidCount: number;
  }[]> {
    const classes = await this.getClassesByCampaign(campaignId);
    const orders = this.getOrders({ campaign_id: campaignId });

    return classes.map((cls) => {
      let ordersCount = 0;
      let piecesCount = 0;
      let paidCount = 0;
      let unpaidCount = 0;

      for (const order of orders) {
        const classItems = (order.items || []).filter((i) => i.class_id === cls.id);
        if (classItems.length > 0) {
          ordersCount++;
          const orderPieces = classItems.reduce((acc, item) => acc + item.quantity, 0);
          piecesCount += orderPieces;
          if (order.payment_status === 'PAGO') {
            paidCount += orderPieces;
          } else {
            unpaidCount += orderPieces;
          }
        }
      }

      return {
        classId: cls.id,
        className: cls.name,
        ordersCount,
        piecesCount,
        paidCount,
        unpaidCount,
      };
    });
  }

  public getDashboardStats(campaignId?: string): {
    totalOrders: number;
    totalPieces: number;
    paidOrders: number;
    unpaidOrders: number;
    totalRevenueCents: number;
    paidRevenueCents: number;
    pendingRevenueCents: number;
    deliveredCount: number;
    pendingDeliveryCount: number;
  } {
    const orders = this.getOrders(campaignId ? { campaign_id: campaignId } : undefined);

    let totalPieces = 0;
    let paidOrders = 0;
    let unpaidOrders = 0;
    let totalRevenueCents = 0;
    let paidRevenueCents = 0;
    let pendingRevenueCents = 0;
    let deliveredCount = 0;
    let pendingDeliveryCount = 0;

    for (const order of orders) {
      totalPieces += order.total_items;
      totalRevenueCents += order.total_amount_cents;

      if (order.payment_status === 'PAGO') {
        paidOrders++;
        paidRevenueCents += order.total_amount_cents;
      } else {
        unpaidOrders++;
        pendingRevenueCents += order.total_amount_cents;
      }

      if (order.delivery_status === 'ENTREGUE') {
        deliveredCount++;
      } else {
        pendingDeliveryCount++;
      }
    }

    return {
      totalOrders: orders.length,
      totalPieces,
      paidOrders,
      unpaidOrders,
      totalRevenueCents,
      paidRevenueCents,
      pendingRevenueCents,
      deliveredCount,
      pendingDeliveryCount,
    };
  }
}

export const db = new DatabaseService();
