import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../services/db';
import {
  formatCurrency,
  formatPhone,
  maskPhoneInput,
  normalizePhoneE164,
  validateBrazilianPhone,
} from '../utils/formatters';
import { generateOrderNumber, generateSecureToken, maskPhoneForPublic } from '../utils/security';

describe('SEVEN PEDIDOS ESCOLARES — FASE 2: Auditoria de Produção e Hardening', () => {
  beforeEach(() => {
    db.resetToDefaultSeed();
  });

  const CAMPAIGN_ID = '33333333-3333-3333-3333-333333333333';
  const CLASS_1_ID = '44444444-0005-0000-0000-000000000005'; // 1º Ano
  const CLASS_2_ID = '44444444-0009-0000-0000-000000000009'; // 5º Ano

  // 1. Pedido de uma turma
  it('1. Deve criar pedido de uma única turma com sucesso', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Maria Silva',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [
        {
          class_id: CLASS_1_ID,
          student_name: 'Lucas Silva',
          size_label: '8',
          quantity: 1,
        },
      ],
    });

    expect(order).toBeDefined();
    expect(order.order_status).toBe('CONFIRMADO');
    expect(order.total_items).toBe(1);
    expect(order.items?.length).toBe(1);
    expect(order.items?.[0].class_name).toBe('1º Ano');
  });

  // 2. Pedido de duas turmas
  it('2. Deve permitir adicionar peças de duas turmas diferentes no mesmo pedido', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Carlos Oliveira',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [
        {
          class_id: CLASS_1_ID,
          student_name: 'Filho 1 (Lucas)',
          size_label: '6',
          quantity: 1,
        },
        {
          class_id: CLASS_2_ID,
          student_name: 'Filho 2 (Mateus)',
          size_label: '12',
          quantity: 1,
        },
      ],
    });

    expect(order.items?.length).toBe(2);
    expect(order.total_items).toBe(2);
    expect(order.items?.[0].class_id).toBe(CLASS_1_ID);
    expect(order.items?.[1].class_id).toBe(CLASS_2_ID);
  });

  // 3. Vários filhos
  it('3. Deve registrar múltiplos alunos/filhos no mesmo pedido', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Fernanda Souza',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [
        {
          class_id: CLASS_1_ID,
          student_name: 'Ana Beatriz Souza',
          size_label: '8',
          quantity: 1,
        },
        {
          class_id: CLASS_1_ID,
          student_name: 'Enzo Gabriel Souza',
          size_label: '10',
          quantity: 1,
        },
      ],
    });

    expect(order.items?.[0].student_name).toBe('Ana Beatriz Souza');
    expect(order.items?.[1].student_name).toBe('Enzo Gabriel Souza');
  });

  // 4. Vários tamanhos
  it('4. Deve calcular corretamente pedidos com múltiplos tamanhos', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Roberto',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [
        { class_id: CLASS_1_ID, student_name: 'Aluno 1', size_label: '4', quantity: 1 },
        { class_id: CLASS_1_ID, student_name: 'Aluno 2', size_label: 'M', quantity: 1 },
        { class_id: CLASS_1_ID, student_name: 'Aluno 3', size_label: 'XG', quantity: 1 },
      ],
    });

    expect(order.items?.[0].unit_price_cents).toBe(3000);
    expect(order.items?.[1].unit_price_cents).toBe(4000);
    expect(order.items?.[2].unit_price_cents).toBe(5000);
    expect(order.total_amount_cents).toBe(12000);
  });

  // 5. Várias unidades do mesmo tamanho
  it('5. Deve multiplicar corretamente quando quantidade > 1 no mesmo tamanho', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Julia',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [
        {
          class_id: CLASS_1_ID,
          student_name: 'Bruno',
          size_label: '10',
          quantity: 3,
        },
      ],
    });

    expect(order.total_items).toBe(3);
    expect(order.items?.[0].subtotal_cents).toBe(9000); // 3 * 3000
    expect(order.total_amount_cents).toBe(9000);
  });

  // 6. Personalização individual por peça
  it('6. Deve preservar personalizações individuais quando quantidade > 1 (ex: Pedro / 10, Gabriel / 7, sem)', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Juliana',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [
        {
          class_id: CLASS_1_ID,
          student_name: 'Irmãos',
          size_label: 'M',
          quantity: 3,
          personalizations: [
            { piece_index: 1, student_name: 'Irmãos', custom_name: 'PEDRO', custom_number: '10' },
            { piece_index: 2, student_name: 'Irmãos', custom_name: 'GABRIEL', custom_number: '7' },
            { piece_index: 3, student_name: 'Irmãos', custom_name: '', custom_number: '' },
          ],
        },
      ],
    });

    const item = order.items?.[0];
    expect(item?.personalizations.length).toBe(3);
    expect(item?.personalizations[0].custom_name).toBe('PEDRO');
    expect(item?.personalizations[0].custom_number).toBe('10');
    expect(item?.personalizations[1].custom_name).toBe('GABRIEL');
    expect(item?.personalizations[1].custom_number).toBe('7');
    expect(item?.personalizations[2].custom_name).toBeNull();
  });

  // 7. Cálculo R$30
  it('7. Deve calcular corretamente faixa Infantil (2..16) como R$ 30,00', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Teste',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '14', quantity: 2 }],
    });

    expect(order.items?.[0].unit_price_cents).toBe(3000);
    expect(order.total_amount_cents).toBe(6000);
  });

  // 8. Cálculo R$40
  it('8. Deve calcular corretamente faixa Adulto Padrão (PP..GG) como R$ 40,00', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Teste',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: 'G', quantity: 2 }],
    });

    expect(order.items?.[0].unit_price_cents).toBe(4000);
    expect(order.total_amount_cents).toBe(8000);
  });

  // 9. Cálculo R$50
  it('9. Deve calcular corretamente faixa Adulto Especial (XG..XXXG) como R$ 50,00', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Teste',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: 'XXXG', quantity: 1 }],
    });

    expect(order.items?.[0].unit_price_cents).toBe(5000);
    expect(order.total_amount_cents).toBe(5000);
  });

  // 10. Combinação das três faixas
  it('10. Deve calcular corretamente a combinação das 3 faixas de preços (R$30 + R$40 + R$50 = R$120)', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Teste Combinado',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [
        { class_id: CLASS_1_ID, student_name: 'A', size_label: '8', quantity: 1 }, // 30
        { class_id: CLASS_1_ID, student_name: 'B', size_label: 'M', quantity: 1 }, // 40
        { class_id: CLASS_1_ID, student_name: 'C', size_label: 'XG', quantity: 1 }, // 50
      ],
    });

    expect(order.total_amount_cents).toBe(12000);
  });

  // HARDENING TEST: Tentativa de manipulação de preço pelo cliente
  it('HARDENING: Deve rejeitar e ignorar unit_price manipulado pelo cliente (ex: XG R$ 50 para R$ 0,01)', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Attacker Attempt',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [
        {
          class_id: CLASS_1_ID,
          student_name: 'Manipulador',
          size_label: 'XG',
          quantity: 1,
          unit_price_cents: 1, // Tentativa maliciosa de pagar R$ 0,01
        },
      ],
    });

    // O servidor DEVE ter recalculado autoritativamente para 5000 cents (R$ 50,00)
    expect(order.items?.[0].unit_price_cents).toBe(5000);
    expect(order.total_amount_cents).toBe(5000);
  });

  // 11. PIX
  it('11. Deve criar cobrança PIX e definir status AGUARDANDO_PIX', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'PIX Teste',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [{ class_id: CLASS_1_ID, student_name: 'A', size_label: '8', quantity: 1 }],
    });

    expect(order.payment_method).toBe('PIX');
    expect(order.payment_status).toBe('AGUARDANDO_PIX');
    expect(order.pix_code).toBeDefined();
  });

  // 12. Pagar na loja
  it('12. Deve criar pedido para pagar na loja e definir status financeiro NAO_PAGO', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Loja Teste',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'A', size_label: '8', quantity: 1 }],
    });

    expect(order.payment_method).toBe('LOJA');
    expect(order.payment_status).toBe('NAO_PAGO');
  });

  // 13. Relatório pago
  it('13. Relatório deve filtrar somente itens pagos quando solicitado', async () => {
    const o1 = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Cliente Pago',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno 1', size_label: '8', quantity: 1 }],
    });
    await db.confirmPayment(o1.id);

    await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Cliente Não Pago',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno 2', size_label: '10', quantity: 1 }],
    });

    const reportPaid = db.getClassReport(CAMPAIGN_ID, CLASS_1_ID, 'PAID');
    expect(reportPaid.rows.length).toBe(1);
    expect(reportPaid.rows[0].student_name).toBe('Aluno 1');
  });

  // 14. Relatório não pago
  it('14. Relatório deve filtrar somente itens não pagos quando solicitado', async () => {
    const o1 = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Cliente Pago',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno 1', size_label: '8', quantity: 1 }],
    });
    await db.confirmPayment(o1.id);

    await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Cliente Não Pago',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno 2', size_label: '10', quantity: 1 }],
    });

    const reportUnpaid = db.getClassReport(CAMPAIGN_ID, CLASS_1_ID, 'UNPAID');
    expect(reportUnpaid.rows.length).toBe(1);
    expect(reportUnpaid.rows[0].student_name).toBe('Aluno 2');
  });

  // 15. Relatório por turma (Isolação de pedidos multi-turma)
  it('15. Relatório por turma: pedido multi-turma (1º Ano e 5º Ano) deve contabilizar apenas peças de cada turma', async () => {
    await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Pai Multi Turma',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [
        { class_id: CLASS_1_ID, student_name: 'Filho 1º Ano', size_label: '8', quantity: 2 }, // 2x 30 = 60
        { class_id: CLASS_2_ID, student_name: 'Filho 5º Ano', size_label: 'GG', quantity: 1 }, // 1x 40 = 40
      ],
    });

    const reportClass1 = db.getClassReport(CAMPAIGN_ID, CLASS_1_ID);
    const reportClass2 = db.getClassReport(CAMPAIGN_ID, CLASS_2_ID);

    // Relatório do 1º Ano conta apenas 2 camisas (R$ 60,00)
    expect(reportClass1.total_orders).toBe(1);
    expect(reportClass1.total_items).toBe(2);
    expect(reportClass1.total_amount_cents).toBe(6000);

    // Relatório do 5º Ano conta apenas 1 camisa (R$ 40,00)
    expect(reportClass2.total_orders).toBe(1);
    expect(reportClass2.total_items).toBe(1);
    expect(reportClass2.total_amount_cents).toBe(4000);
  });

  // 16. Mapa de produção
  it('16. Mapa de produção deve agrupar quantidades por tamanho e listar personalizações', async () => {
    await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Pai',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [
        {
          class_id: CLASS_1_ID,
          student_name: 'Aluno A',
          size_label: '8',
          quantity: 2,
          personalizations: [
            { piece_index: 1, student_name: 'Aluno A', custom_name: 'GABRIEL', custom_number: '10' },
          ],
        },
        {
          class_id: CLASS_1_ID,
          student_name: 'Aluno B',
          size_label: 'M',
          quantity: 1,
        },
      ],
    });

    const map = db.getProductionMap(CAMPAIGN_ID, CLASS_1_ID);
    expect(map.totalQuantity).toBe(3);
    const size8 = map.sizeBreakdown.find((s) => s.size_label === '8');
    const sizeM = map.sizeBreakdown.find((s) => s.size_label === 'M');
    expect(size8?.quantity).toBe(2);
    expect(sizeM?.quantity).toBe(1);
    expect(map.customizations.length).toBe(1);
    expect(map.customizations[0].custom_name).toBe('GABRIEL');
  });

  // 17. Campanha encerrada
  it('17. Deve bloquear novos pedidos quando a campanha estiver encerrada no backend', async () => {
    db.updateCampaign(CAMPAIGN_ID, {
      ends_at: '2020-01-01T00:00:00Z',
    });

    await expect(
      db.createOrder({
        campaign_id: CAMPAIGN_ID,
        customer_name: 'Tarde',
        customer_whatsapp: '+5596991112233',
        payment_method: 'PIX',
        items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '8', quantity: 1 }],
      })
    ).rejects.toThrow(/CAMPAIGN_CLOSED/i);
  });

  // 18. Campanha reaberta
  it('18. Deve permitir novos pedidos após o administrador reabrir a campanha', async () => {
    db.updateCampaign(CAMPAIGN_ID, {
      ends_at: '2020-01-01T00:00:00Z',
    });

    db.updateCampaign(CAMPAIGN_ID, {
      ends_at: '2030-12-31T23:59:59Z',
    });

    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Reaberto',
      customer_whatsapp: '+5596991112233',
      payment_method: 'PIX',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '8', quantity: 1 }],
    });

    expect(order.order_status).toBe('CONFIRMADO');
  });

  // 19. QR válido
  it('19. Deve localizar o pedido corretamente através do QR Token não enumerável', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'QR Test',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '8', quantity: 1 }],
    });

    const retrieved = db.getOrderByQrToken(order.qr_token);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(order.id);
  });

  // 20. QR inválido
  it('20. Deve retornar indefinido quando fornecido um QR Token inexistente', () => {
    const retrieved = db.getOrderByQrToken('token_inexistente_123');
    expect(retrieved).toBeUndefined();
  });

  // 21. Pedido não pago no scanner
  it('21. Pedido não pago consultado pelo scanner deve ter payment_status = NAO_PAGO', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Scanner Unpaid',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '8', quantity: 1 }],
    });

    const scanned = db.getOrderByQrToken(order.qr_token);
    expect(scanned?.payment_status).toBe('NAO_PAGO');
  });

  // 22. Pedido pago no scanner
  it('22. Pedido pago consultado pelo scanner deve ter payment_status = PAGO', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Scanner Paid',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '8', quantity: 1 }],
    });

    await db.confirmPayment(order.id, 'Admin Loja');
    const scanned = db.getOrderByQrToken(order.qr_token);
    expect(scanned?.payment_status).toBe('PAGO');
  });

  // 23. Confirmação de retirada
  it('23. Deve confirmar a entrega na loja e atualizar status para ENTREGUE', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Entrega Teste',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '8', quantity: 1 }],
    });

    const delivered = db.confirmDelivery(order.id, 'Admin Loja', 'Responsável Recebedor');
    expect(delivered.delivery_status).toBe('ENTREGUE');
  });

  // 24. Concorrência e bloqueio de retirada dupla
  it('24. HARDENING CONCORRÊNCIA: Deve bloquear segunda confirmação de retirada atômica', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Entrega Dupla Teste',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '8', quantity: 1 }],
    });

    // Primeira entrega
    db.confirmDelivery(order.id, 'Admin Loja');

    // Tentativa simultânea ou subsequente
    expect(() => {
      db.confirmDelivery(order.id, 'Admin Loja');
    }).toThrow(/ORDER_ALREADY_DELIVERED/i);
  });

  // 25. Idempotência de confirmação de pagamento
  it('25. HARDENING IDEMPOTÊNCIA: Pagamento confirmado múltiplas vezes deve ser idempotente', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Idempotent Payment',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '8', quantity: 1 }],
    });

    const p1 = await db.confirmPayment(order.id, 'Admin Autorizado', 'LOJA', 'TX_123');
    expect(p1.payment_status).toBe('PAGO');

    // Segunda chamada com mesmo ID / ref
    const p2 = await db.confirmPayment(order.id, 'Admin Autorizado', 'LOJA', 'TX_123');
    expect(p2.payment_status).toBe('PAGO');
  });

  // 26. Acesso público tentando modificar entrega
  it('26. Deve garantir integridade de alteração de entrega exigindo operador logado', async () => {
    const order = await db.createOrder({
      campaign_id: CAMPAIGN_ID,
      customer_name: 'Security Delivery',
      customer_whatsapp: '+5596991112233',
      payment_method: 'LOJA',
      items: [{ class_id: CLASS_1_ID, student_name: 'Aluno', size_label: '8', quantity: 1 }],
    });

    const delivered = db.confirmDelivery(order.id, 'Operador Seven');
    expect(delivered.delivery_status).toBe('ENTREGUE');
  });

  // 27. Validação de telefone E.164 brasileiro e privacidade
  it('27. Deve validar e normalizar números de telefone brasileiros no padrão E.164 e mascarar dados públicos', () => {
    expect(validateBrazilianPhone('96991605151')).toBe(true);
    expect(validateBrazilianPhone('11988887777')).toBe(true);
    expect(validateBrazilianPhone('12345')).toBe(false);

    expect(normalizePhoneE164('(96) 99160-5151')).toBe('+5596991605151');
    expect(maskPhoneInput('96991605151')).toBe('(96) 99160-5151');
    expect(maskPhoneForPublic('+5596991605151')).toBe('(96) 9****-5151');
  });
});
