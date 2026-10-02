import { Order } from '../types';
import QRCode from 'qrcode';

/**
* Deriva o número curto da sacola do order_number (ex: SEV-2026-0037 -> 0037)
*/
export const getShortOrderNumber = (orderNumber: string): string => {
  const match = orderNumber.match(/\d{4}$/);
  return match ? match[0] : orderNumber;
};

/**
* Gera o HTML de uma ÚNICA etiqueta para uso em grade A4 ou individual.
*/
const generateSingleLabelHTML = async (order: Order, isThermal: boolean): Promise<string> => {
  const shortNumber = getShortOrderNumber(order.order_number);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = `${origin}/pedido/${order.qr_token}`;

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: isThermal ? 200 : 150,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (e) {
    console.error('Erro ao gerar QR Code:', e);
  }

  const items = order.items || [];
  const itemsSummary = items.map(item =>
    `${item.quantity}x ${item.size_label}`
  ).join(', ');

  const personalizationNote = items.some(i => i.personalizations && i.personalizations.length > 0)
    ? '<span class="warning">★ PERSONALIZADO ★</span>'
    : '';

  // Layout para A4 (99x38.1mm)
  if (!isThermal) {
    return `
      <div class="a4-label">
        <div class="a4-header">
          <span class="a4-short">${shortNumber}</span>
          <img src="${qrDataUrl}" class="a4-qr" alt="QR" />
        </div>
        <div class="a4-full">${order.order_number}</div>
        <div class="a4-info">
          <strong>${items[0]?.student_name || 'N/A'}</strong> • ${items[0]?.class_name || ''}
        </div>
        <div class="a4-details">
          ${itemsSummary} ${personalizationNote}
        </div>
      </div>`;
  }

  // Layout Térmico (100x70mm)
  return `
    <div class="thermal-label">
      <div class="header">
        <div class="short-number">${shortNumber}</div>
        <div class="full-number">${order.order_number}</div>
      </div>
      <div class="content">
        <div class="info-row">
          <span class="info-label">Aluno:</span>
          <span class="info-value">${items[0]?.student_name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Turma:</span>
          <span class="info-value">${items[0]?.class_name || 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Responsável:</span>
          <span class="info-value">${order.customer_name}</span>
        </div>
        <div class="items-summary">
          <strong>Peças:</strong> ${order.total_items} | ${itemsSummary}
          ${personalizationNote ? `<br>${personalizationNote}` : ''}
        </div>
      </div>
      <div class="footer">
        <img src="${qrDataUrl}" class="qr-code" alt="QR Code" />
        <div style="text-align: right; font-size: 8px;">
          SEVEN MALHARIA<br/>Retirada na Loja
        </div>
      </div>
    </div>`;
};

/**
* Gera o HTML completo para impressão em lote.
* Suporta modos: 'thermal' (100x70mm) e 'a4' (folha comum 99x38.1mm).
* Para A4, suporta posição inicial (1-14) para reaproveitamento de folha.
*/
export const generateBatchLabelsHTML = async (
  orders: Order[],
  mode: 'thermal' | 'a4' = 'thermal',
  startPosition: number = 1
): Promise<string> => {
  const isThermal = mode === 'thermal';

  // CSS Base
  const baseStyles = `
    <style>
      body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; }
      .warning { color: red; font-weight: bold; font-size: 8px; }

      /* Estilos A4 */
      .a4-page {
        width: 210mm; height: 297mm; padding: 10.5mm 5.5mm; box-sizing: border-box;
        display: grid; grid-template-columns: 99mm 99mm; grid-template-rows: repeat(7, 38.1mm);
        gap: 0; page-break-after: always; position: relative;
      }
      .a4-label {
        width: 99mm; height: 38.1mm; padding: 2mm; box-sizing: border-box;
        border: 1px dashed #eee; display: flex; flex-direction: column; justify-content: space-between;
        overflow: hidden; position: relative;
      }
      .a4-header { display: flex; justify-content: space-between; align-items: center; }
      .a4-short { font-size: 22px; font-weight: 900; line-height: 1; }
      .a4-qr { width: 30mm; height: 30mm; }
      .a4-full { font-size: 9px; font-weight: bold; color: #555; }
      .a4-info { font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .a4-details { font-size: 9px; color: #333; }

      /* Estilos Térmicos */
      .thermal-page {
        width: 100mm; height: 70mm; page-break-after: always; position: relative;
      }
      .thermal-label {
        width: 100mm; height: 70mm; padding: 4mm; box-sizing: border-box;
        display: flex; flex-direction: column; justify-content: space-between;
      }
      .thermal-label .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 2px; margin-bottom: 4px; }
      .thermal-label .short-number { font-size: 24px; font-weight: 900; line-height: 1; }
      .thermal-label .full-number { font-size: 8px; font-weight: bold; }
      .thermal-label .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
      .thermal-label .info-label { font-size: 8px; font-weight: bold; text-transform: uppercase; color: #555; }
      .thermal-label .info-value { font-size: 10px; font-weight: 600; text-align: right; max-width: 60%; }
      .thermal-label .items-summary { font-size: 10px; margin-top: 4px; line-height: 1.2; }
      .thermal-label .footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
      .thermal-label .qr-code { width: 45mm; height: 45mm; }

      @media print {
        body { -webkit-print-color-adjust: exact; }
        .no-print { display: none !important; }
        .a4-page:not(:last-child) { page-break-after: always; }
        .thermal-page:not(:last-child) { page-break-after: always; }
      }
    </style>`;

  if (isThermal) {
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiquetas Térmicas</title>${baseStyles}</head><body>`;
    for (const order of orders) {
      html += `<div class="thermal-page">${await generateSingleLabelHTML(order, true)}</div>`;
    }
    html += `</body></html>`;
    return html;
  } else {
    // Lógica A4 com posição inicial
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiquetas A4</title>${baseStyles}</head><body>`;

    let currentPos = startPosition; // 1 a 14
    let currentPageLabels: string[] = Array(currentPos - 1).fill('<div></div>'); // Preencher vazios iniciais

    for (const order of orders) {
      const labelHTML = await generateSingleLabelHTML(order, false);
      currentPageLabels.push(labelHTML);

      if (currentPageLabels.length === 14) {
        html += `<div class="a4-page">${currentPageLabels.join('')}</div>`;
        currentPageLabels = [];
      }
    }

    // Última página parcial
    if (currentPageLabels.length > 0) {
      // Completar até 14 para manter a grade física correta
      while (currentPageLabels.length < 14) {
        currentPageLabels.push('<div></div>');
      }
      html += `<div class="a4-page">${currentPageLabels.join('')}</div>`;
    }

    html += `</body></html>`;
    return html;
  }
};

/**
* Abre a janela de impressão com o HTML gerado.
*/
export const printLabels = (htmlContent: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      // Não fechar automaticamente para permitir ver a prévia
    }, 500);
  }
};