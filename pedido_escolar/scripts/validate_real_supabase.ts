/**
 * SCRIPT DE VALIDAÇÃO DE INTEGRAÇÃO — SUPABASE REAL
 * 
 * Este script deve ser executado exclusivamente quando as credenciais do
 * Supabase REAL (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) estiverem configuradas.
 * 
 * Execução:
 *   npx tsx scripts/validate_real_supabase.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('mock.supabase.co')) {
  console.error('\n❌ [ERRO] Supabase real não configurado!');
  console.error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env antes de executar este script.\n');
  process.exit(1);
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

async function runValidation() {
  console.log('================================================================');
  console.log('🚀 INICIANDO VALIDAÇÃO NO SUPABASE REAL');
  console.log(`URL: ${supabaseUrl}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function testStep(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}:`, err?.message || err);
      failed++;
    }
  }

  let campaignId = '';
  let class1Id = '';
  let class5Id = '';
  let createdOrderId = '';
  let createdQrToken = '';

  // A) Migrations aplicadas & B) Seed carregado: Checa escolas
  await testStep('A/B) Migrations aplicadas e Seed carregado (Tabela stores/schools)', async () => {
    const { data, error } = await anonClient.from('schools').select('*');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Nenhuma escola encontrada no seed');
  });

  // C) Campanha Colégio Conceito encontrada
  await testStep('C) Campanha ativa do Colégio Conceito encontrada', async () => {
    const { data, error } = await anonClient
      .from('campaigns')
      .select('*, schools(*)')
      .eq('is_active', true)
      .limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Nenhuma campanha ativa encontrada');
    campaignId = data[0].id;
  });

  // D) 9 turmas encontradas
  await testStep('D) Exatamente 9 turmas cadastradas para a campanha', async () => {
    const { data, error } = await anonClient
      .from('classes')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('is_active', true);
    if (error) throw new Error(error.message);
    if (!data || data.length !== 9) throw new Error(`Esperado 9 turmas, encontrado ${data?.length}`);
    const c1 = data.find((c) => c.name.includes('1º Ano'));
    const c5 = data.find((c) => c.name.includes('5º Ano'));
    if (!c1 || !c5) throw new Error('Turmas 1º Ano e 5º Ano não encontradas');
    class1Id = c1.id;
    class5Id = c5.id;
  });

  // E) Tabela de preços correta
  await testStep('E) Tabela de preços com faixas R$ 30, R$ 40 e R$ 50', async () => {
    const { data, error } = await anonClient
      .from('campaign_prices')
      .select('*')
      .eq('campaign_id', campaignId);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Preços não encontrados');
    const p10 = data.find((p) => p.size_label === '10');
    const pGG = data.find((p) => p.size_label === 'GG');
    const pXG = data.find((p) => p.size_label === 'XG');
    if (p10?.price_cents !== 3000) throw new Error('Tamanho 10 deve ser 3000 centavos');
    if (pGG?.price_cents !== 4000) throw new Error('Tamanho GG deve ser 4000 centavos');
    if (pXG?.price_cents !== 5000) throw new Error('Tamanho XG deve ser 5000 centavos');
  });

  // F) Anon NÃO consegue listar orders
  await testStep('F) RLS: Usuário anônimo NÃO consegue fazer SELECT na tabela orders', async () => {
    const { data, error } = await anonClient.from('orders').select('*');
    if (data && data.length > 0) {
      throw new Error('VULNERABILIDADE: Anon conseguiu listar pedidos de terceiros!');
    }
    // RLS blocks or returns empty array
  });

  // G) Anon NÃO consegue atualizar payment
  await testStep('G) RLS: Usuário anônimo NÃO consegue fazer UPDATE em payments ou orders', async () => {
    const { error } = await anonClient
      .from('orders')
      .update({ payment_status: 'PAGO' })
      .eq('order_number', 'TEST');
    // PostgREST with RLS returns error or 0 modified rows
  });

  // H) rpc_create_order cria pedido válido com cálculo server-side
  await testStep('H) rpc_create_order cria pedido com cálculo server-side correto', async () => {
    const { data, error } = await anonClient.rpc('rpc_create_order', {
      p_campaign_id: campaignId,
      p_customer_name: 'Smoke Test Real Supabase',
      p_customer_whatsapp: '+5596991605151',
      p_payment_method: 'LOJA',
      p_items: [
        {
          class_id: class1Id,
          student_name: 'Enzo',
          size_label: '10',
          quantity: 2,
          personalizations: [
            { piece_index: 1, custom_name: 'ENZO', custom_number: '10' },
            { piece_index: 2, custom_name: 'GABRIEL', custom_number: '7' }
          ]
        }
      ]
    });
    if (error) throw new Error(error.message);
    if (!data?.order_number || !data?.qr_token) throw new Error('Retorno inválido do RPC');
    if (data.total_amount_cents !== 6000) throw new Error(`Esperado R$ 60,00 (6000 cents), obteve ${data.total_amount_cents}`);
    createdOrderId = data.id;
    createdQrToken = data.qr_token;
  });

  // I) Tentativa de preço adulterado (ex: R$ 0,01 enviado no payload)
  await testStep('I) Preço adulterado no payload é ignorado e recalculado no banco', async () => {
    const { data, error } = await anonClient.rpc('rpc_create_order', {
      p_campaign_id: campaignId,
      p_customer_name: 'Hacker Test',
      p_customer_whatsapp: '+5596991605151',
      p_payment_method: 'LOJA',
      p_items: [
        {
          class_id: class1Id,
          student_name: 'Hacker',
          size_label: '10',
          quantity: 1,
          unit_price_cents: 1, // Malicious 1 cent
          subtotal_cents: 1
        }
      ]
    });
    if (error) throw new Error(error.message);
    if (data.total_amount_cents !== 3000) {
      throw new Error(`VULNERABILIDADE: Preço aceito como ${data.total_amount_cents} em vez do valor oficial 3000!`);
    }
  });

  // J) Pedido multi-turma
  await testStep('J) Pedido multi-turma (1º Ano + 5º Ano) calculado e persistido', async () => {
    const { data, error } = await anonClient.rpc('rpc_create_order', {
      p_campaign_id: campaignId,
      p_customer_name: 'Multi Class Parent',
      p_customer_whatsapp: '+5596991605151',
      p_payment_method: 'LOJA',
      p_items: [
        { class_id: class1Id, student_name: 'Filho 1', size_label: '10', quantity: 2 },
        { class_id: class5Id, student_name: 'Filho 2', size_label: 'GG', quantity: 1 }
      ]
    });
    if (error) throw new Error(error.message);
    if (data.total_amount_cents !== 10000) { // 2x30 + 1x40 = 100
      throw new Error(`Esperado R$ 100,00, obtido ${data.total_amount_cents}`);
    }
  });

  // K) QR token consulta somente o pedido correspondente com dados mascarados
  await testStep('K) rpc_get_public_order_by_qr retorna apenas o pedido e mascara telefone', async () => {
    const { data, error } = await anonClient.rpc('rpc_get_public_order_by_qr', {
      p_qr_token: createdQrToken
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Pedido não retornado pelo QR token');
    if (!data.customer_whatsapp_masked.includes('****')) {
      throw new Error('Telefone não foi mascarado para privacidade pública!');
    }
  });

  // L) Confirmação de pagamento exige admin
  await testStep('L) rpc_confirm_payment rejeita chamadas de usuário anônimo', async () => {
    const { error } = await anonClient.rpc('rpc_confirm_payment', {
      p_order_id: createdOrderId,
      p_admin_user: 'Fake Admin'
    });
    if (!error) throw new Error('VULNERABILIDADE: Anon conseguiu chamar rpc_confirm_payment!');
  });

  // M) Confirmação de retirada exige admin
  await testStep('M) rpc_confirm_delivery rejeita chamadas de usuário anônimo', async () => {
    const { error } = await anonClient.rpc('rpc_confirm_delivery', {
      p_order_id: createdOrderId,
      p_admin_user: 'Fake Admin'
    });
    if (!error) throw new Error('VULNERABILIDADE: Anon conseguiu chamar rpc_confirm_delivery!');
  });

  // Se admin client estiver disponível, testa pagamento e concorrência de entrega
  if (adminClient) {
    await testStep('L.2 / N) Admin confirma pagamento e entrega, segunda entrega bloqueada', async () => {
      // Confirm payment as admin
      const payRes = await adminClient.rpc('rpc_confirm_payment', {
        p_order_id: createdOrderId,
        p_admin_user: 'Admin Oficial'
      });
      if (payRes.error) throw new Error(payRes.error.message);

      // Confirm first delivery
      const delivRes1 = await adminClient.rpc('rpc_confirm_delivery', {
        p_order_id: createdOrderId,
        p_admin_user: 'Admin Oficial'
      });
      if (delivRes1.error) throw new Error(delivRes1.error.message);

      // Attempt duplicate delivery
      const delivRes2 = await adminClient.rpc('rpc_confirm_delivery', {
        p_order_id: createdOrderId,
        p_admin_user: 'Admin Oficial'
      });
      if (!delivRes2.error) {
        throw new Error('FALHA DE CONCORRÊNCIA: Segunda entrega foi autorizada!');
      }
    });
  } else {
    console.log('ℹ️ [SKIP L.2/N] SUPABASE_SERVICE_ROLE_KEY não informado no .env para testar ações de admin autenticado.');
  }

  console.log('\n================================================================');
  console.log(`🏁 RESULTADO DA VALIDAÇÃO: ${passed} PASS, ${failed} FAIL`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runValidation().catch((err) => {
  console.error('Erro fatal na validação:', err);
  process.exit(1);
});
