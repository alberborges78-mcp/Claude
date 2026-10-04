import { Order, WhatsAppMessageResult, WhatsAppProvider } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export function buildOrderConfirmationMessage(order: Order, qrUrl: string): string {
  const storePhone = '+55 96 99160-5151';
  const schoolName = order.school?.name || order.campaign?.name || 'COLÉGIO CONCEITO';
  const isPix = order.payment_method === 'PIX';

  let itemsSummary = '';
  (order.items || []).forEach((item, idx) => {
    itemsSummary += `\n👕 *Item ${idx + 1}:* ${item.student_name} - ${item.class_name} (Tam. ${item.size_label}) x${item.quantity} = ${formatCurrency(item.subtotal_cents)}`;
    if (item.personalizations && item.personalizations.length > 0) {
      item.personalizations.forEach((p) => {
        const custom = [p.custom_name, p.custom_number ? `Nº ${p.custom_number}` : ''].filter(Boolean).join(' / ');
        if (custom) {
          itemsSummary += `\n   ↳ Peça ${p.piece_index}: Estampa: ${custom}`;
        }
      });
    }
  });

  return `🎉 *SEVEN MALHARIA - Pedido Recebido!*
----------------------------------------
Olá *${order.customer_name}*, recebemos com sucesso o seu pedido para o *${schoolName}*.

📋 *Pedido:* ${order.order_number}
📦 *Total de Peças:* ${order.total_items}
💰 *Valor Total:* ${formatCurrency(order.total_amount_cents)}
💳 *Forma de Pagamento:* ${isPix ? 'PIX (Banco do Brasil)' : 'Pagar na Loja física'}
📌 *Status Atual:* ${order.payment_status === 'PAGO' ? '✅ PAGO' : '⏳ NÃO PAGO / AGUARDANDO'}

*Resumo dos Itens:*${itemsSummary}

----------------------------------------
📍 *Retirada:* SEVEN MALHARIA
Avenida Professora Cora de Carvalho, 2042-B, Centro (atrás do SENAI)

📲 *Acompanhe seu pedido e apresente o QR de retirada:*
${qrUrl}

_Aviso: Para retirar o pedido, basta apresentar o QR Code acima na loja. Dúvidas? Fale conosco: ${storePhone}_`;
}

export function buildPaymentConfirmationMessage(order: Order, qrUrl: string): string {
  return `✅ *PAGAMENTO CONFIRMADO - SEVEN MALHARIA*
----------------------------------------
Olá *${order.customer_name}*, o pagamento do seu pedido *${order.order_number}* foi confirmado com sucesso!

📦 *Total de Peças:* ${order.total_items}
💰 *Valor:* ${formatCurrency(order.total_amount_cents)}
🔄 *Situação de Produção:* PENDENTE / EM PREPARAÇÃO

📱 *Acesse seu comprovante e QR Code oficial de retirada:*
${qrUrl}

Assim que suas camisas estiverem prontas para retirada, você poderá comparecer à nossa loja com este QR Code!`;
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendOrderConfirmation(order: Order): Promise<WhatsAppMessageResult> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const qrUrl = `${origin}/pedido/${order.qr_token}`;
    const text = buildOrderConfirmationMessage(order, qrUrl);
    
    // Log to console in dev mode
    console.log(`[MOCK WhatsApp] Enviando confirmação de pedido para ${order.customer_whatsapp}:\n${text}`);

    return {
      success: true,
      messageId: `mock_msg_${Date.now()}`,
      provider: 'MOCK_DEV',
    };
  }

  async sendPaymentConfirmation(order: Order): Promise<WhatsAppMessageResult> {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const qrUrl = `${origin}/pedido/${order.qr_token}`;
    const text = buildPaymentConfirmationMessage(order, qrUrl);

    console.log(`[MOCK WhatsApp] Enviando confirmação de pagamento para ${order.customer_whatsapp}:\n${text}`);

    return {
      success: true,
      messageId: `mock_msg_${Date.now()}`,
      provider: 'MOCK_DEV',
    };
  }

  async sendReceipt(order: Order, receiptUrl: string): Promise<WhatsAppMessageResult> {
    console.log(`[MOCK WhatsApp] Enviando comprovante para ${order.customer_whatsapp}: ${receiptUrl}`);
    return {
      success: true,
      messageId: `mock_msg_${Date.now()}`,
      provider: 'MOCK_DEV',
    };
  }
}

export class EvolutionWhatsAppProvider implements WhatsAppProvider {
  private readonly supabaseUrl: string;
  private readonly anonKey: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  private async invokeEdgeFunction(
    orderId: string
  ): Promise<WhatsAppMessageResult> {
    if (!this.supabaseUrl || !this.anonKey) {
      return { success: false, messageId: '', provider: 'evolution-api', error: 'Missing Supabase config' };
    }

    try {
      const res = await fetch(`${this.supabaseUrl}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        console.warn('[Evolution WhatsApp] Envio falhou:', data.error || `HTTP ${res.status}`);
        return {
          success: false,
          messageId: '',
          provider: 'evolution-api',
          error: data.error || `HTTP ${res.status}`,
        };
      }

      return {
        success: true,
        messageId: data.message_id || `evo_${Date.now()}`,
        provider: 'evolution-api',
      };
    } catch (err) {
      console.warn('[Evolution WhatsApp] Exceção:', err);
      return {
        success: false,
        messageId: '',
        provider: 'evolution-api',
        error: err instanceof Error ? err.message : 'Unknown exception',
      };
    }
  }

  async sendOrderConfirmation(order: Order): Promise<WhatsAppMessageResult> {
    // Anti-relay: envia SOMENTE order_id; Edge Function valida pedido no Supabase,
    // monta template server-side e envia exclusivamente para o telefone do pedido.
    // Link seguro por order_number — qr_token NUNCA é enviado pelo WhatsApp.
    return this.invokeEdgeFunction(order.id);
  }

  async sendPaymentConfirmation(order: Order): Promise<WhatsAppMessageResult> {
    // Preservado para implementação futura — não usado nesta etapa
    return { success: false, messageId: '', provider: 'evolution-api', error: 'Not implemented yet' };
  }

  async sendReceipt(_order: Order, _receiptUrl: string): Promise<WhatsAppMessageResult> {
    // Preservado para implementação futura — não usado nesta etapa
    return { success: false, messageId: '', provider: 'evolution-api', error: 'Not implemented yet' };
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const isProd = import.meta.env.PROD && import.meta.env.VITE_APP_ENV === 'production';
  if (isProd) {
    return new EvolutionWhatsAppProvider();
  }
  return new MockWhatsAppProvider();
}
