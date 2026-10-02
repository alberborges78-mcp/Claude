import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { db } from '../services/db';

describe('E2E DOM Integration — Sequência Completa de Produção (Seção 15)', () => {
  beforeEach(() => {
    db.resetToDefaultSeed();
    window.history.pushState({}, '', '/');
  });

  it('Executa o fluxo completo do responsável e do administrador ponta a ponta', async () => {
    const { container } = render(<App />);

    // 1. Catálogo inicial: localiza card do 1º Ano e clica para pedir
    expect(screen.getByText('COLÉGIO CONCEITO')).toBeInTheDocument();
    
    const pedido1AnoBtns = screen.getAllByRole('button', { name: /Fazer Pedido desta Turma/i });
    // Clica no botão correspondente ao 1º Ano (índice 4 no seed das 9 turmas)
    fireEvent.click(pedido1AnoBtns[4]);

    // Modal de configuração do 1º Ano
    await waitFor(() => {
      expect(screen.getByText('Configuração de Aluno e Personalização')).toBeInTheDocument();
    });

    // Preenche Aluno: Enzo Gabriel
    const studentInput = screen.getByPlaceholderText('Ex: Pedro Henrique Alencar');
    fireEvent.change(studentInput, { target: { value: 'Enzo Gabriel' } });

    // Seleciona tamanho 10
    const size10Btn = screen.getByRole('button', { name: '10' });
    fireEvent.click(size10Btn);

    // Altera quantidade para 2 (clica em +)
    const plusBtn = screen.getByRole('button', { name: '+' });
    fireEvent.click(plusBtn);

    // Preenche personalizações
    const customNameInputs = screen.getAllByPlaceholderText('Nome na estampa (opcional)');
    const customNumberInputs = screen.getAllByPlaceholderText('Nº (opcional)');

    fireEvent.change(customNameInputs[0], { target: { value: 'ENZO' } });
    fireEvent.change(customNumberInputs[0], { target: { value: '10' } });

    fireEvent.change(customNameInputs[1], { target: { value: 'GABRIEL' } });
    fireEvent.change(customNumberInputs[1], { target: { value: '7' } });

    // Adiciona ao carrinho
    const addCartBtn = screen.getByRole('button', { name: /Adicionar ao Carrinho/i });
    fireEvent.click(addCartBtn);

    // 2. Agora seleciona a turma do 5º Ano
    const pedido5AnoBtns = screen.getAllByRole('button', { name: /Fazer Pedido desta Turma/i });
    fireEvent.click(pedido5AnoBtns[8]); // 5º Ano

    await waitFor(() => {
      expect(screen.getByText('Configuração de Aluno e Personalização')).toBeInTheDocument();
    });

    const studentInput5 = screen.getByPlaceholderText('Ex: Pedro Henrique Alencar');
    fireEvent.change(studentInput5, { target: { value: 'Mateus Silva' } });

    const sizeGGBtn = screen.getByRole('button', { name: 'GG' });
    fireEvent.click(sizeGGBtn);

    const addCartBtn5 = screen.getByRole('button', { name: /Adicionar ao Carrinho/i });
    fireEvent.click(addCartBtn5);

    // 3. Abre o Carrinho (seleciona o botão de carrinho)
    const cartHeaderBtns = screen.getAllByRole('button', { name: /Carrinho/i });
    fireEvent.click(cartHeaderBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Finalizar Pedido')).toBeInTheDocument();
      expect(screen.getByText('3 peças selecionadas')).toBeInTheDocument();
    });

    // 4. Preenche formulário de checkout
    const customerNameInput = screen.getByPlaceholderText('Nome completo de quem retira');
    fireEvent.change(customerNameInput, { target: { value: 'Mariana Souza' } });

    const whatsappInput = screen.getByPlaceholderText('(96) 99160-5151');
    fireEvent.change(whatsappInput, { target: { value: '96991605151' } });

    // Seleciona "Pagar na Loja Física"
    const payInStoreRadio = screen.getByDisplayValue('LOJA');
    fireEvent.click(payInStoreRadio);

    // Submete o formulário
    const submitOrderBtn = screen.getByRole('button', { name: /Confirmar Pedido/i });
    const checkoutForm = submitOrderBtn.closest('form')!;
    fireEvent.submit(checkoutForm);

    // 5. Verifica tela de Comprovante / Pedido Confirmado
    await waitFor(() => {
      expect(screen.getByText(/SEVEN MALHARIA • PEDIDO REGISTRADO/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Mariana Souza/i).length).toBeGreaterThan(0);
      expect(screen.getByText('NÃO PAGO (LOJA)')).toBeInTheDocument();
      expect(screen.getByText('TOKEN OFICIAL')).toBeInTheDocument();
    });

    const orders = db.getOrders();
    expect(orders.length).toBe(1);
    const createdOrder = orders[0];
    expect(createdOrder.customer_name).toBe('Mariana Souza');
    expect(createdOrder.total_items).toBe(3);
    // 2x R$ 30 (Tam 10) + 1x R$ 40 (Tam GG) = R$ 100,00 (10000 cents)
    expect(createdOrder.total_amount_cents).toBe(10000);

    // 6. Navega para o Acesso Admin
    const adminHeaderBtn = screen.getByRole('button', { name: /Acesso Admin/i });
    fireEvent.click(adminHeaderBtn);

    // Faz Login
    await waitFor(() => {
      expect(screen.getByText('Acesso Administrativo')).toBeInTheDocument();
    });
    const loginSubmitBtn = screen.getByRole('button', { name: /Entrar no Painel Administrativo/i });
    fireEvent.click(loginSubmitBtn);

    // 7. No Painel Admin: Verifica Dashboard
    await waitFor(() => {
      expect(screen.getByText('Painel Administrativo Seven')).toBeInTheDocument();
    });

    // 8. Relatório por Turma: 1º Ano
    const reportTabBtns = screen.getAllByRole('button', { name: /Relatório por Turma/i });
    fireEvent.click(reportTabBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Relatório Operacional por Turma')).toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox');
    const classSelect = selects[2] as HTMLSelectElement; // 3rd select is Turma
    // 1º Ano
    fireEvent.change(classSelect, { target: { value: '44444444-0005-0000-0000-000000000005' } });

    await waitFor(() => {
      expect(screen.getByText('Enzo Gabriel')).toBeInTheDocument();
      expect(screen.getAllByText(/60,00/).length).toBeGreaterThan(0);
    });

    // 9. Relatório por Turma: 5º Ano (Isolação multi-turma)
    fireEvent.change(classSelect, { target: { value: '44444444-0009-0000-0000-000000000009' } });

    await waitFor(() => {
      expect(screen.getByText('Mateus Silva')).toBeInTheDocument();
      expect(screen.getAllByText(/40,00/).length).toBeGreaterThan(0);
    });

    // 10. Aba Pedidos: Confirmar Pagamento
    const ordersTabBtns = screen.getAllByRole('button', { name: 'Pedidos' });
    fireEvent.click(ordersTabBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Gestão de Pedidos')).toBeInTheDocument();
      expect(screen.getAllByText('Mariana Souza').length).toBeGreaterThan(0);
    });

    // Abre detalhes do pedido
    const viewDetailBtns = screen.getAllByTitle('Ver Detalhes do Pedido');
    fireEvent.click(viewDetailBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Ações Administrativas no Pedido')).toBeInTheDocument();
    });

    // Clica em Confirmar Pagamento
    const confirmPaymentBtn = screen.getByRole('button', { name: /Confirmar Pagamento/i });
    fireEvent.click(confirmPaymentBtn);

    await waitFor(() => {
      expect(screen.getByText('✓ PAGO')).toBeInTheDocument();
    });

    // Fecha o modal de detalhes
    const closeBtns = screen.getAllByRole('button');
    const closeDetailModalBtn = closeBtns.find((b) => b.querySelector('svg.lucide-x'));
    if (closeDetailModalBtn) {
      fireEvent.click(closeDetailModalBtn);
    }

    // 11. Scanner de Retirada
    const scannerTabBtns = screen.getAllByRole('button', { name: /Scanner Retirada/i });
    fireEvent.click(scannerTabBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Scanner de Retirada & Validação de Pedidos')).toBeInTheDocument();
    });

    // Digita o número do pedido
    const scannerInput = screen.getByPlaceholderText(/Cole o Token do QR Code ou Número do Pedido/i);
    fireEvent.change(scannerInput, { target: { value: createdOrder.order_number } });

    const consultBtn = screen.getByRole('button', { name: 'Consultar' });
    fireEvent.click(consultBtn);

    await waitFor(() => {
      expect(screen.getByText('PAGAMENTO CONFIRMADO')).toBeInTheDocument();
      expect(screen.getByText('CONFIRMAR RETIRADA DO PEDIDO')).toBeInTheDocument();
    });

    // 12. Confirma Retirada
    const confirmDeliveryBtn = screen.getByRole('button', { name: 'CONFIRMAR RETIRADA DO PEDIDO' });
    fireEvent.click(confirmDeliveryBtn);

    await waitFor(() => {
      expect(screen.getByText('Retirada realizada e registrada com sucesso!')).toBeInTheDocument();
    });

    // 13. Tenta consultar o mesmo pedido novamente no Scanner para testar proteção de duplicidade
    fireEvent.click(consultBtn);

    await waitFor(() => {
      expect(screen.getByText('PEDIDO JÁ ENTREGUE ANTERIORMENTE')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'CONFIRMAR RETIRADA DO PEDIDO' })).not.toBeInTheDocument();
    });
  });
});
