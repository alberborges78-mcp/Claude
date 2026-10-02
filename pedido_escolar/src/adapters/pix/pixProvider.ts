import QRCode from 'qrcode';
import { PixChargeResult, PixProvider, PixStatusResult } from '../../types';

/**
 * Mock / Dev implementation of Banco do Brasil PIX Provider
 * Clearly marked for Development / Automated Testing environments.
 */
export class MockPixProvider implements PixProvider {
  async createPixCharge(order: {
    id: string;
    order_number: string;
    total_amount_cents: number;
    customer_name: string;
  }): Promise<PixChargeResult> {
    const isProd = import.meta.env.PROD && import.meta.env.VITE_APP_ENV === 'production';
    if (isProd) {
      throw new Error('CONFIG_ERROR: MockPixProvider não é permitido em ambiente de produção.');
    }

    const txid = `bb_tx_${order.order_number.replace(/-/g, '')}_${Date.now().toString(36)}`;
    const amountFormatted = (order.total_amount_cents / 100).toFixed(2);
    
    // Standard Banco do Brasil PIX EMV Copia e Cola mock format
    const pixCopiaECola = `00020126580014br.gov.bcb.pix0136sevenmalharia@pix.bb.com.br520400005303986540${amountFormatted.length + 3}${amountFormatted}5802BR5914SEVEN MALHARIA6006MACAPA62240520${txid}6304ABCD`;

    let qrCodeBase64 = '';
    try {
      qrCodeBase64 = await QRCode.toDataURL(pixCopiaECola, {
        margin: 1,
        width: 300,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      });
    } catch {
      qrCodeBase64 = '';
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      txid,
      pixCopiaECola,
      qrCodeBase64,
      expiresAt,
    };
  }

  async getPixStatus(txid: string): Promise<PixStatusResult> {
    return {
      txid,
      status: 'NAO_PAGO',
      amountCents: 0,
    };
  }

  async processWebhook(payload: Record<string, unknown>): Promise<{ txid: string; paid: boolean }> {
    const txid = (payload.txid as string) || '';
    const status = payload.status as string;
    return {
      txid,
      paid: status === 'CONCLUIDA' || status === 'PAID' || status === 'PAGO',
    };
  }
}

/**
 * Production Banco do Brasil PIX Provider Adapter
 * Strictly invoked via Server-Side / Supabase Edge Functions with secure mTLS certificate & OAuth credentials.
 */
export class BancoDoBrasilPixProvider implements PixProvider {
  async createPixCharge(_order: {
    id: string;
    order_number: string;
    total_amount_cents: number;
    customer_name: string;
  }): Promise<PixChargeResult> {
    throw new Error('BB_INTEGRATION_PENDING: Credenciais oficiais do Banco do Brasil pendentes para deploy de produção.');
  }

  async getPixStatus(txid: string): Promise<PixStatusResult> {
    return { txid, status: 'NAO_PAGO', amountCents: 0 };
  }

  async processWebhook(payload: Record<string, unknown>): Promise<{ txid: string; paid: boolean }> {
    const pixList = (payload.pix as Array<{ txid: string; valor: string }>) || [];
    if (pixList.length > 0) {
      return { txid: pixList[0].txid, paid: true };
    }
    return { txid: '', paid: false };
  }
}

export function getPixProvider(): PixProvider {
  return new MockPixProvider();
}
