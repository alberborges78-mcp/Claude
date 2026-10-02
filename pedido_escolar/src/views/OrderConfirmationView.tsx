import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Download,
  QrCode,
  Share2,
  Copy,
  Check,
  MapPin,
  ExternalLink,
  ArrowLeft,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../services/db';
import { Order } from '../types';
import { generateOrderPDF } from '../utils/pdfGenerator';
import { formatCurrency, formatDateTime, formatPhone } from '../utils/formatters';
import { maskPhoneForPublic } from '../utils/security';
import { useAuth } from '../context/AuthContext';

interface OrderConfirmationViewProps {
  qrToken: string;
  onNavigate: (view: string) => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({
  qrToken,
  onNavigate,
}) => {
  const { isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedQrToken, setCopiedQrToken] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      if (!qrToken) {
        if (isMounted) {
          setOrder(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fetched = await db.getOrderByQrTokenAsync(qrToken);
        if (isMounted) {
          setOrder(fetched);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error('Erro ao consultar pedido:', err);
          setError(err instanceof Error ? err.message : 'Falha ao buscar dados do pedido');
          setOrder(null);
          setLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [qrToken, refreshTrigger]);

  const store = db.getStore();

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-10 shadow-xs space-y-4">
          <div className="w-12 h-12 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-lg font-black text-[var(--seven-text-primary)] font-display">Carregando Pedido...</h2>
            <p className="text-xs text-[var(--seven-text-secondary)] mt-1">Consultando detalhes oficiais do seu pedido.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order || error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-8 sm:p-10 shadow-xs space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-600 border border-red-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--seven-text-primary)] font-display">Pedido Não Encontrado</h2>
            <p className="text-xs text-[var(--seven-text-secondary)] mt-2 leading-relaxed">
              O código de consulta fornecido é inválido ou expirou.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            Voltar para a Página Inicial
          </button>
        </div>
      </div>
    );
  }

  const isPaid = order.payment_status === 'PAGO';
  const isDelivered = order.delivery_status === 'ENTREGUE';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicQrUrl = `${origin}/pedido/${order.qr_token}`;

  const handleCopyPix = () => {
    if (order.pix_code) {
      navigator.clipboard.writeText(order.pix_code);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  const handleCopyQrCode = () => {
    if (order?.qr_token) {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(order.qr_token);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = order.qr_token;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedQrToken(true);
      setTimeout(() => setCopiedQrToken(false), 3000);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      await generateOrderPDF(order, publicQrUrl);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Helper dev simulation for instant PIX confirmation
  const handleSimulatePixPaid = async () => {
    await db.confirmPayment(order.id, 'Simulação PIX BB (Dev)', 'PIX');
    setRefreshTrigger((prev) => prev + 1);
  };

  const displayedPhone = (order.customer_whatsapp && order.customer_whatsapp.includes('*'))
    ? order.customer_whatsapp
    : isAuthenticated
    ? formatPhone(order.customer_whatsapp)
    : maskPhoneForPublic(order.customer_whatsapp);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 space-y-6">
      {/* ── Barra Superior de Navegação ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-xs font-bold text-[var(--seven-text-primary)] bg-[var(--seven-surface-card)] hover:bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl shadow-xs transition-all self-start active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--seven-text-secondary)]" />
          <span>Voltar ao Catálogo</span>
        </button>

        <span className="text-xs font-medium text-white/80">
          Pedido gerado em {formatDateTime(order.created_at)}
        </span>
      </div>

      {/* ── Hero de Confirmação e Sucesso ────────────────────────────────── */}
      <div className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-6 sm:p-8 shadow-xs text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-800 shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-3 py-1 rounded-full border border-teal-100 dark:border-teal-800 inline-block">
            Seven Malharia • Pedido Registrado
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--seven-text-primary)] font-display pt-1">
            Pedido {order.order_number}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--seven-text-secondary)] max-w-md mx-auto leading-relaxed">
            Obrigado, <strong className="text-[var(--seven-text-primary)] font-bold">{order.customer_name}</strong>! Seu pedido foi registrado com sucesso em nosso sistema.
          </p>
        </div>

        {/* Grade de Indicadores de Status (4 colunas responsivas) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-left">
          {/* Status Pedido */}
          <div className="bg-[var(--seven-surface-input)] p-3 rounded-xl border border-[var(--seven-border-default)]">
            <span className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider block">Pedido</span>
            <p className="text-xs font-black text-[var(--seven-text-primary)] mt-0.5">
              {order.order_status}
            </p>
          </div>

          {/* Status Pagamento */}
          <div
            className={`p-3 rounded-xl border ${
              isPaid
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-400'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-400'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider opacity-80 block">Pagamento</span>
            <p className="text-xs font-black mt-0.5">
              {isPaid
                ? 'PAGO'
                : order.payment_method === 'PIX'
                ? 'AGUARDANDO PIX'
                : 'NÃO PAGO (LOJA)'}
            </p>
          </div>

          {/* Status Produção */}
          <div className="bg-[var(--seven-surface-input)] p-3 rounded-xl border border-[var(--seven-border-default)]">
            <span className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider block">Produção</span>
            <p className="text-xs font-black text-[var(--seven-text-primary)] mt-0.5">
              {order.production_status === 'PENDENTE'
                ? 'PENDENTE'
                : order.production_status === 'EM_PRODUCAO'
                ? 'EM PRODUÇÃO'
                : 'PRONTO'}
            </p>
          </div>

          {/* Status Entrega */}
          <div
            className={`p-3 rounded-xl border ${
              isDelivered
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-400'
                : 'bg-[var(--seven-surface-input)] border-[var(--seven-border-default)] text-[var(--seven-text-primary)]'
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-wider opacity-80 block">Entrega</span>
            <p className="text-xs font-black mt-0.5">
              {isDelivered ? 'ENTREGUE' : 'AGUARDANDO'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Bloco de Pagamento PIX (se PIX selecionado e ainda não pago) ── */}
      {order.payment_method === 'PIX' && !isPaid && order.pix_code && (
        <div className="bg-teal-50 dark:bg-teal-900/30 border-2 border-teal-200 dark:border-teal-700/50 rounded-2xl p-5 sm:p-7 shadow-xs space-y-5 text-[var(--seven-text-primary)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-100 dark:border-teal-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-xs">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black font-display text-[var(--seven-text-primary)]">
                  Pague com PIX Banco do Brasil
                </h2>
                <p className="text-xs text-[var(--seven-text-secondary)] mt-0.5">
                  Total a pagar: <strong className="text-teal-700 dark:text-teal-400 font-black text-sm sm:text-base font-display">{formatCurrency(order.total_amount_cents)}</strong>
                </p>
              </div>
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 self-start sm:self-auto">
              Aguardando Pagamento
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* QR Code PIX */}
            <div className="bg-white p-3.5 rounded-2xl border border-teal-100 dark:border-teal-800/50 shadow-xs flex-shrink-0">
              <QRCodeSVG
                value={order.pix_code}
                size={160}
                bgColor="#FFFFFF"
                fgColor="#0F172A"
                level="M"
              />
            </div>

            {/* Instruções Copia e Cola */}
            <div className="flex-1 space-y-3 text-center sm:text-left w-full min-w-0">
              <p className="text-xs text-[var(--seven-text-secondary)] leading-relaxed">
                Escaneie o QR Code no aplicativo do seu banco ou copie o código Pix abaixo para efetuar o pagamento:
              </p>

              <div className="bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] p-2 rounded-xl flex items-center justify-between gap-2 shadow-xs min-w-0">
                <input
                  type="text"
                  readOnly
                  value={order.pix_code}
                  className="bg-transparent text-xs text-[var(--seven-text-primary)] font-mono flex-1 outline-none truncate select-all px-2"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="min-h-[44px] px-4 py-2 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  {copiedPix ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar PIX</span>
                    </>
                  )}
                </button>
              </div>

              {/* Botão de simulação dev */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSimulatePixPaid}
                  className="text-xs text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 underline font-medium cursor-pointer"
                >
                  [Dev/Teste]: Simular Confirmação Instantânea do PIX BB
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Card Oficial do QR Code de Retirada na Loja ──────────────────── */}
      <div className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Pickup QR Code */}
          <div className="bg-white p-4 rounded-2xl border border-[var(--seven-border-default)] shadow-xs flex flex-col items-center flex-shrink-0">
            <QRCodeSVG
              value={publicQrUrl}
              size={140}
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              level="H"
              aria-label={`QR Code de retirada para o pedido ${order.order_number}`}
            />
            <span className="text-xs font-black text-gray-500 mt-2 font-mono uppercase tracking-wider">
              TOKEN OFICIAL
            </span>
          </div>

          {/* Instruções de Retirada e Ações */}
          <div className="flex-1 space-y-3.5 text-center sm:text-left w-full">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Apresentação Obrigatória na Retirada</span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-[var(--seven-text-primary)] font-display">
              QR Code de Retirada na Loja
            </h3>

            <p className="text-xs text-[var(--seven-text-secondary)] leading-relaxed">
              “Para retirar o pedido é <strong>obrigatória</strong> a apresentação deste QR Code. Outra pessoa poderá retirar o pedido apresentando o QR Code enviado ao responsável.”
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--seven-surface-brand)] text-white hover:opacity-90 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? 'Gerando Comprovante...' : 'Baixar Comprovante Oficial (PDF)'}</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Olá! Aqui está o comprovante e QR Code de retirada do pedido ${order.order_number} na Seven Malharia: ${publicQrUrl}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Caixa com Código Textual do QR Token (Contingência) */}
        <div className="bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider">
              Código do QR
            </span>
            <button
              type="button"
              onClick={handleCopyQrCode}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
              aria-label="Copiar código textual do QR"
            >
              {copiedQrToken ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Código copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar código</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 bg-[var(--seven-surface-card)] rounded-lg border border-[var(--seven-border-default)] font-mono text-xs text-[var(--seven-text-primary)] break-all select-all leading-relaxed">
            {order.qr_token}
          </div>

          <p className="text-xs text-gray-500 leading-tight">
            Utilize este código textual caso a câmera da loja apresente dificuldade na leitura óptica do QR Code.
          </p>
        </div>
      </div>

      {/* ── Resumo Detalhado dos Itens Encomendados ──────────────────────── */}
      <div className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-5 sm:p-7 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider">
          Resumo dos Itens Encomendados
        </h3>

        <div className="divide-y divide-[var(--seven-border-default)]">
          {(order.items || []).map((item, idx) => (
            <div key={item.id || idx} className="py-3.5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-black text-[var(--seven-text-primary)]">
                  {item.student_name} • <span className="text-teal-700 dark:text-teal-400 font-bold">{item.class_name}</span>
                </p>
                <p className="text-xs text-[var(--seven-text-secondary)]">
                  Tamanho: <strong className="text-[var(--seven-text-primary)] font-semibold">{item.size_label}</strong> (Qtd: {item.quantity}) • {formatCurrency(item.unit_price_cents)}/unid.
                </p>

                {item.personalizations && item.personalizations.length > 0 && (
                  <div className="mt-1.5 space-y-0.5 bg-[var(--seven-surface-input)] p-2.5 rounded-lg border border-[var(--seven-border-default)] text-xs">
                    {item.personalizations.map((p) => {
                      const hasCustom = p.custom_name || p.custom_number;
                      return (
                        <p key={p.piece_index} className="text-xs text-[var(--seven-text-secondary)] leading-relaxed">
                          ↳ Peça {p.piece_index}: {hasCustom ? (
                            <strong className="text-teal-950 dark:text-teal-300 font-bold">
                              {[p.custom_name, p.custom_number ? `Nº ${p.custom_number}` : ''].filter(Boolean).join(' • ')}
                            </strong>
                          ) : (
                            <span className="text-gray-400 italic">Sem personalização</span>
                          )}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>

              <span className="text-xs sm:text-sm font-black text-[var(--seven-text-primary)] shrink-0 font-display">
                {formatCurrency(item.subtotal_cents)}
              </span>
            </div>
          ))}
        </div>

        {/* Rodapé do Resumo Financeiro e Dados */}
        <div className="bg-[var(--seven-surface-input)] p-4 rounded-xl border border-[var(--seven-border-default)] space-y-2 text-xs text-[var(--seven-text-secondary)]">
          <div className="flex justify-between">
            <span>Responsável:</span>
            <strong className="text-[var(--seven-text-primary)] font-bold">{order.customer_name}</strong>
          </div>
          <div className="flex justify-between">
            <span>WhatsApp:</span>
            <strong className="text-[var(--seven-text-primary)] font-bold">{displayedPhone}</strong>
          </div>
          <div className="flex justify-between">
            <span>Forma de Pagamento:</span>
            <strong className="text-[var(--seven-text-primary)] font-bold">
              {order.payment_method === 'PIX' ? 'PIX (Banco do Brasil)' : 'Pagar na Loja Física'}
            </strong>
          </div>
          <div className="flex justify-between items-baseline text-sm font-black text-[var(--seven-text-primary)] pt-2.5 border-t border-[var(--seven-border-default)]">
            <span className="uppercase tracking-wider">Total Geral:</span>
            <span className="text-teal-700 dark:text-teal-400 font-display text-lg sm:text-xl">
              {formatCurrency(order.total_amount_cents)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Card do Local de Retirada na Loja Física ─────────────────────── */}
      <div className="bg-teal-950 text-teal-50 rounded-2xl p-5 sm:p-7 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
          <MapPin className="w-4 h-4" />
          <span>Local de Retirada</span>
        </div>
        <p className="text-sm font-bold text-white">{store.name}</p>
        <p className="text-xs text-teal-100/70 leading-relaxed">{store.address}</p>
        <a
          href={store.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center gap-2 text-xs font-bold text-teal-400 hover:text-teal-300 underline py-2 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Abrir no Google Maps</span>
        </a>
      </div>
    </div>
  );
};

