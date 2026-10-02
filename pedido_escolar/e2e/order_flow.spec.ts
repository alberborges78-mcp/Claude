import { test, expect } from '@playwright/test';

/**
 * E2E BROWSER TEST (Chromium) — Fluxo Real Completo
 * 
 * Executa o fluxo de ponta a ponta no navegador:
 * Home -> Colégio Conceito -> 1º Ano -> Tam 10 x2 -> personalizações -> carrinho -> 5º Ano -> GG x1 -> checkout -> pagar na loja -> confirmação -> QR -> painel -> relatórios das duas turmas.
 * 
 * Executar após conexão ao Supabase real:
 *   npx playwright test
 */

test.describe('E2E Navegador Real (Chromium) — Pedidos Seven Malharia', () => {
  test('Fluxo completo: Pedido multi-turma com personalização até conciliação e relatórios', async ({ page }) => {
    // 1. Acessa a Home
    await page.goto('/');
    await expect(page.locator('text=SEVEN MALHARIA')).toBeVisible();
    await expect(page.locator('text=COLÉGIO CONCEITO')).toBeVisible();

    // 2. Seleciona a turma 1º Ano
    await page.click('button:has-text("1º Ano")');
    await expect(page.locator('text=Adicionar ao Pedido')).toBeVisible();

    // 3. Seleciona Tamanho 10 e Quantidade 2
    await page.click('button:has-text("10")');
    const plusBtn = page.locator('button[aria-label="Aumentar quantidade"], button:has-text("+")').first();
    if (await plusBtn.isVisible()) {
      await plusBtn.click();
    }

    // 4. Preenche nome do aluno e personalizações
    const studentInput = page.locator('input[placeholder*="Nome do Aluno"], input[name="student_name"]').first();
    if (await studentInput.isVisible()) {
      await studentInput.fill('Enzo Gabriel');
    }

    const customName1 = page.locator('input[placeholder*="Nome na Camisa 1"]').first();
    if (await customName1.isVisible()) {
      await customName1.fill('ENZO');
    }
    const customNum1 = page.locator('input[placeholder*="Número 1"]').first();
    if (await customNum1.isVisible()) {
      await customNum1.fill('10');
    }

    const customName2 = page.locator('input[placeholder*="Nome na Camisa 2"]').first();
    if (await customName2.isVisible()) {
      await customName2.fill('GABRIEL');
    }
    const customNum2 = page.locator('input[placeholder*="Número 2"]').first();
    if (await customNum2.isVisible()) {
      await customNum2.fill('7');
    }

    // 5. Adiciona ao carrinho
    await page.click('button:has-text("Adicionar ao Carrinho")');

    // 6. Retorna ao catálogo e seleciona 5º Ano
    await page.click('button:has-text("Adicionar Outra Turma"), button:has-text("Continuar Comprando")');
    await page.click('button:has-text("5º Ano")');

    // 7. Seleciona Tamanho GG (Quantidade 1)
    await page.click('button:has-text("GG")');
    const studentInput2 = page.locator('input[placeholder*="Nome do Aluno"], input[name="student_name"]').first();
    if (await studentInput2.isVisible()) {
      await studentInput2.fill('Mateus Silva');
    }
    await page.click('button:has-text("Adicionar ao Carrinho")');

    // 8. Abre o carrinho e confere itens
    await page.click('button:has-text("Ver Carrinho"), button[aria-label="Abrir Carrinho"]');
    await expect(page.locator('text=1º Ano')).toBeVisible();
    await expect(page.locator('text=5º Ano')).toBeVisible();

    // 9. Avança para Checkout
    await page.click('button:has-text("Finalizar Pedido"), button:has-text("Ir para Checkout")');

    // 10. Preenche dados do responsável e seleciona "Pagar na Loja"
    await page.fill('input[placeholder*="Seu Nome Completo"], input[name="customer_name"]', 'Mariana Souza');
    await page.fill('input[placeholder*="WhatsApp"], input[name="customer_whatsapp"]', '96991605151');
    await page.click('text=Pagar na Loja');

    // 11. Conclui o pedido
    await page.click('button:has-text("Confirmar Pedido")');

    // 12. Valida tela de confirmação e QR Code
    await expect(page.locator('text=Pedido Confirmado!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Mariana Souza')).toBeVisible();
    await expect(page.locator('canvas, svg, img[alt*="QR"]')).toBeVisible();

    // 13. Acessa Painel Administrativo
    await page.goto('/admin');
    await expect(page.locator('text=Painel Administrativo')).toBeVisible();

    // 14. Acessa Relatório por Turma
    await page.click('a:has-text("Relatório por Turma"), button:has-text("Relatório por Turma")');
    
    // Confere 1º Ano
    await page.selectOption('select', { label: '1º Ano' });
    await expect(page.locator('text=Enzo Gabriel')).toBeVisible();

    // Confere 5º Ano
    await page.selectOption('select', { label: '5º Ano' });
    await expect(page.locator('text=Mateus Silva')).toBeVisible();
  });
});
