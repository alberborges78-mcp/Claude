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
 * Gera o HTML completo para impressão da etiqueta.
 * Suporta modos: 'thermal' (100x70mm) e 'a4' (folha comum).
 */
export const generateLabelHTML = async (order: Order, mode: 'thermal' | 'a4' = 'thermal'): Promise<string> => {
  const shortNumber = getShortOrderNumber(order.order_number);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = `${origin}/pedido/${order.qr_token}`;

  // Gerar QR Code em base64
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    });
  } catch (e) {
    console.error('Erro ao gerar QR Code:', e);
  }

  const isThermal = mode === 'thermal';

  // Estilos específicos para cada formato
  const containerStyle = isThermal
    ? 'width: 100mm; height: 70mm; padding: 4mm; box-sizing: border-box;'
    : 'width: 80mm; height: 50mm; padding: 5mm; box-sizing: border-box; border: 1px dashed #ccc; margin: 10mm auto;';

  const titleSize = isThermal ? '24px' : '18px';
  const infoSize = isThermal ? '10px' : '9px';
  const labelSize = isThermal ? '8px' : '7px';

  // Resumo dos itens para caber na etiqueta
  const items = order.items || [];
  const itemsSummary = items.map(item =>
    `${item.quantity}x ${item.size_label} (${item.class_name})`
  ).join(', ');

  const personalizationNote = items.some(i => i.personalizations && i.personalizations.length > 0)
    ? '★ PERSONALIZADO ★'
    : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Etiqueta ${order.order_number}</title>
  <style>
    @page { size: ${isThermal ? '100mm 70mm' : 'A4'}; margin: 0; }
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      background: white;
      color: black;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .label-container {
      ${containerStyle}
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 2px; margin-bottom: 4px; }
    .short-number { font-size: ${titleSize}; font-weight: 900; line-height: 1; }
    .full-number { font-size: ${labelSize}; font-weight: bold; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .info-label { font-size: ${labelSize}; font-weight: bold; text-transform: uppercase; color: #555; }
    .info-value { font-size: ${infoSize}; font-weight: 600; text-align: right; max-width: 60%; }
    .items-summary { font-size: ${infoSize}; margin-top: 4px; line-height: 1.2; }
    .footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
    .qr-code { width: 45mm; height: 45mm; }
    .warning { font-size: 8px; color: red; font-weight: bold; }
    @media print {
      body { background: white; -webkit-print-color-adjust: exact; }
      .label-container { border: none; margin: 0; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="label-container">
    <div class="header">
      <div class="short-number">${shortNumber}</div>
      <div class="full-number">${order.order_number}</div>
    </div>

    <div class="content">
      <div class="info-row">
        <span class="info-label">Aluno:</span>
        <span class="info-value">${(order.items || [])[0]?.student_name || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Turma:</span>
        <span class="info-value">${(order.items || [])[0]?.class_name || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Responsável:</span>
        <span class="info-value">${order.customer_name}</span>
      </div>

      <div class="items-summary">
        <strong>Peças:</strong> ${order.total_items} | ${itemsSummary}
        ${personalizationNote ? `<br><span class="warning">${personalizationNote}</span>` : ''}
      </div>
    </div>

    <div class="footer">
      <img src="${qrDataUrl}" class="qr-code" alt="QR Code" />
      <div style="text-align: right; font-size: 8px;">
        SEVEN MALHARIA<br/>
        Retirada na Loja
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Abre a janela de impressão com o HTML da etiqueta.
 */
export const printLabel = (htmlContent: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    // Pequeno delay para garantir que o QR carregue antes de abrir o diálogo
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
};