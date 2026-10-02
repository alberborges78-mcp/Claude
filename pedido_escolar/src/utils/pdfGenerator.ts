import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Order } from '../types';
import { formatCurrency, formatDateTime, formatPhone } from './formatters';

export async function generateOrderPDF(order: Order, qrUrl: string): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Generate QR Code image data URL
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrUrl, {
      margin: 1,
      width: 256,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code for PDF', err);
  }

  // Header Colors & Background
  const primaryColor = [15, 23, 42]; // #0F172A
  const secondaryColor = [2, 132, 199]; // #0284C7
  const isPaid = order.payment_status === 'PAGO';

  // Top header bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 32, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SEVEN MALHARIA', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Avenida Professora Cora de Carvalho, 2042-B, Centro | WhatsApp: (96) 99160-5151', 14, 21);
  doc.text('COMPROVANTE OFICIAL DE PEDIDO ESCOLAR', 14, 27);

  // Order Number Box on the right
  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.roundedRect(140, 6, 56, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('NÚMERO DO PEDIDO', 168, 11, { align: 'center' });
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(order.order_number, 168, 20, { align: 'center' });

  // Payment Status Badge
  const statusY = 38;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  if (isPaid) {
    doc.setFillColor(16, 185, 129); // Green
    doc.roundedRect(14, statusY, 52, 9, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('PAGAMENTO OK', 40, statusY + 6, { align: 'center' });
  } else {
    doc.setFillColor(239, 68, 68); // Red
    doc.roundedRect(14, statusY, 44, 9, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('PAGAMENTO PENDENTE', 36, statusY + 6, { align: 'center' });
  }

  // Order Details Box
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let currentY = 53;
  const schoolName = order.school?.name || 'COLÉGIO CONCEITO';
  
  doc.setFont('helvetica', 'bold');
  doc.text('Escola / Campanha:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`COLÉGIO CONCEITO - LITTLE GAMES 2026`, 52, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Responsável:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(order.customer_name, 52, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('WhatsApp:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatPhone(order.customer_whatsapp), 52, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Data do Pedido:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateTime(order.created_at), 52, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Forma de Pagamento:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(order.payment_method === 'PIX' ? 'PIX (Banco do Brasil)' : 'Pagar na Loja (Retirada)', 52, currentY);

  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Previsão de Entrega:', 14, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text('A PARTIR DO DIA 12 DE OUTUBRO/26', 52, currentY);

  // Table of Items
  const tableRows: (string | number)[][] = [];
  (order.items || []).forEach((item) => {
    // Collect all personalization details
    const customList = item.personalizations && item.personalizations.length > 0
      ? item.personalizations.map((p) => {
          const custom = [p.custom_name, p.custom_number ? `Nº ${p.custom_number}` : ''].filter(Boolean).join(' / ');
          return custom ? `Peça ${p.piece_index}: ${custom}` : `Peça ${p.piece_index}: Sem personalização`;
        }).join('\n')
      : 'Sem personalização';

    tableRows.push([
      item.student_name,
      item.class_name,
      item.size_label,
      customList,
      item.quantity,
      formatCurrency(item.unit_price_cents),
      formatCurrency(item.subtotal_cents),
    ]);
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['Aluno', 'Turma', 'Tam.', 'Personalização Estampa', 'Qtd', 'Unit.', 'Subtotal']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 28 },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 56 },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
    },
  });

  // Get table bottom position
  // @ts-expect-error jspdf-autotable adds lastAutoTable to jsPDF instance
  const finalY = doc.lastAutoTable?.finalY || currentY + 60;

  // Total summary box
  doc.setFillColor(241, 245, 249);
  doc.rect(130, finalY + 4, 66, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total de Peças: ${order.total_items}`, 134, finalY + 10);
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAL: ${formatCurrency(order.total_amount_cents)}`, 134, finalY + 16);

  // QR Code and Retrieval Notice section
  const noticeY = finalY + 24;
  
  // Outer frame for Pickup / QR code
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, noticeY, 182, 42, 2, 2, 'FD');

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 18, noticeY + 3, 36, 36);
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('QR CODE DE RETIRADA / CONSULTA OFICIAL', 58, noticeY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  
  const noticeText = [
    '• Para retirar o pedido é OBRIGATÓRIA a apresentação deste QR Code.',
    '• Outra pessoa poderá retirar o pedido apresentando o QR Code enviado ao responsável.',
    '• A verificação de pagamento e entrega é autenticada online em tempo real.',
    '• Local de Retirada: SEVEN MALHARIA - Av. Profª Cora de Carvalho, 2042-B, Centro (Atrás do SENAI).',
  ];
  doc.text(noticeText, 58, noticeY + 16);

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Comprovante gerado em ${new Date().toLocaleString('pt-BR')} | Seven Malharia Sistema de Pedidos Escolares`, 105, 290, { align: 'center' });

  // Save the PDF
  doc.save(`pedido_${order.order_number}.pdf`);
}
