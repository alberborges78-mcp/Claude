import React, { useState, useEffect, useRef } from 'react';
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
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);
  // Tracks whether a PIX generation call is currently in-flight to prevent parallel calls.
  // Unlike a permanent "attempted" flag, this resets after each call completes,
  // allowing legitimate retries when pix_code is still missing.
  const pixCallInFlight = useRef(false);

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

  // Auto-generate PIX when order is loaded, unpaid, and has no pix_code yet.
  // Uses pixCallInFlight ref to prevent parallel calls without permanently blocking retries.
  useEffect(() => {
    if (
      !order ||
      order.payment_method !== 'PIX' ||
      order.payment_status === 'PAGO' ||
      order.payment_status === 'PIX_EXPIRADO' ||
      order.order_status === 'CANCELADO' ||
      order.pix_code ||
      pixCallInFlight.current
    ) {
      return;
    }

    let cancelled = false;
    pixCallInFlight.current = true;

    async function generatePix() {
      if (!order) return;
      setPixLoading(true);
      setPixError(null);
      try {
        const result = await db.createPixCobranca(order.id);
        if (cancelled) return;
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                pix_code: result.pixCopiaECola,
                pix_txid: result.txid,
                payment_status: 'AGUARDANDO_PIX',
                pix_expires_at: result.pix_expires_at,
              }
            : prev
        );
      } catch (err: unknown) {
        if (!cancelled) {
          setPixError(
            err instanceof Error ? err.message : 'Erro desconhecido ao gerar PIX.'
          );
        }
      } finally {
        if (!cancelled) {
          setPixLoading(false);
          pixCallInFlight.current = false;
        }
      }
    }

    generatePix();

    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.payment_method, order?.payment_status, order?.pix_code]);

  // While a PIX is awaiting payment, refresh the public order automatically.
  // This does not call Banco do Brasil and never creates a new charge. It only
  // observes the server-side status already updated by the protected scheduler.
  useEffect(() => {
    if (
      !order ||
      order.payment_method !== 'PIX' ||
      order.payment_status !== 'AGUARDANDO_PIX' ||
      order.order_status === 'CANCELADO'
    ) {
      return;
    }

    let cancelled = false;
    let checking = false;

    const checkPaymentStatus = async () => {
      if (checking || cancelled) return;
      checking = true;
      try {
        const refreshed = await db.getOrderByQrTokenAsync(qrToken);
        if (!cancelled && refreshed) {
          setOrder(refreshed);
        }
      } catch (err) {
        // Fail-safe: keep the current screen and try again on the next interval.
        console.warn('Falha temporária ao atualizar status do PIX:', err);
      } finally {
        checking = false;
      }
    };

    // Check immediately, then keep polling while the PIX is pending.
    void checkPaymentStatus();
    const intervalId = window.setInterval(checkPaymentStatus, 5000);

    // Mobile banking usually sends the browser to the background. Re-check as
    // soon as the customer returns to this tab instead of waiting for the timer.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkPaymentStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [order?.id, order?.payment_method, order?.payment_status, order?.order_status, qrToken]);

  const handleRetryPix = () => {
    if (!order || pixLoading || pixCallInFlight.current) return;
    setPixError(null);
    // Reset the in-flight guard so the useEffect can fire again on next render
    pixCallInFlight.current = false;
    // Force a re-render cycle; the useEffect will detect pix_code is still null and retry
    setRefreshTrigger((t) => t + 1);
  };

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
  const isPixExpired =
    order.payment_method === 'PIX' &&
    (order.payment_status === 'PIX_EXPIRADO' || order.order_status === 'CANCELADO');
  const isPixPending = order.payment_method === 'PIX' && !isPaid && !isPixExpired;
  const showOperationalStatuses = order.payment_method !== 'PIX' || isPaid;
  const pixExpiresAt = order.pix_expires_at ? new Date(order.pix_expires_at) : null;
  const pixExpiryLabel =
    pixExpiresAt && !Number.isNaN(pixExpiresAt.getTime())
      ? pixExpiresAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : null;
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
            Seven Malharia • {isPixExpired ? 'Pedido Encerrado' : isPaid ? 'Pedido Confirmado' : 'Pedido Registrado'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--seven-text-primary)] font-display pt-1">
            {isPixExpired ? 'PEDIDO EXPIRADO / CANCELADO' : isPaid ? 'PEDIDO CONFIRMADO' : 'PEDIDO RECEBIDO COM SUCESSO'}
          </h1>
          <p className="text-sm font-black text-[var(--seven-text-primary)]">Pedido {order.order_number}</p>
          <p className="text-xs sm:text-sm text-[var(--seven-text-secondary)] max-w-md mx-auto leading-relaxed">
            {isPixExpired
              ? 'O prazo de pagamento deste pedido terminou.'
              : isPaid
              ? 'Pagamento confirmado. Agora seu pedido pode seguir para produção.'
              : <>Obrigado, <strong className="text-[var(--seven-text-primary)] font-bold">{order.customer_name}</strong>! Seu pedido foi recebido e aguarda o pagamento.</>}
          </p>
        </div>

        {/* Grade de Indicadores de Status (4 colunas responsivas) */}
        <div className={`grid grid-cols-2 ${showOperationalStatuses ? 'sm:grid-cols-4' : ''} gap-2.5 pt-3 text-left`}>
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
                : isPixExpired
                ? 'PIX EXPIRADO'
                : order.payment_method === 'PIX'
                ? 'AGUARDANDO PAGAMENTO'
                : 'NÃO PAGO (LOJA)'}
            </p>
          </div>

          {/* Status Produção */}
          <div className={`${showOperationalStatuses ? '' : 'hidden'} bg-[var(--seven-surface-input)] p-3 rounded-xl border border-[var(--seven-border-default)]`}>
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
            className={`${showOperationalStatuses ? '' : 'hidden'} p-3 rounded-xl border ${
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

      {/* ── PIX expirado/cancelado: nunca reutilizar nem regenerar cobrança ── */}
      {isPixExpired && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h2 className="text-base sm:text-lg font-black font-display">PAGAMENTO EXPIRADO</h2>
          </div>
          <p className="text-sm font-bold text-red-800 dark:text-red-300">
            Este pedido expirou e foi cancelado por falta de pagamento dentro do prazo de 6 horas.
          </p>
          <p className="text-xs sm:text-sm text-[var(--seven-text-secondary)] leading-relaxed">
            Para realizar a compra, faça um <strong>NOVO PEDIDO</strong>. Um novo PIX será gerado para a nova compra.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="min-h-[44px] px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl transition-colors"
          >
            FAZER NOVO PEDIDO
          </button>
        </div>
      )}

      {/* ── PIX Loading / Error / Retry ── */}
      {isPixPending && !order.pix_code && (
        <div className="bg-teal-50 dark:bg-teal-900/30 border-2 border-teal-200 dark:border-teal-700/50 rounded-2xl p-5 sm:p-7 shadow-xs text-center space-y-4">
          {pixLoading && (
            <>
              <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-teal-800 dark:text-teal-300">Gerando seu PIX...</p>
            </>
          )}
          {!pixLoading && pixError && (
            <>
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{pixError}</p>
              <button
                onClick={handleRetryPix}
                disabled={pixLoading}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-50"
              >
                Tentar gerar PIX novamente
              </button>
            </>
          )}
        </div>
      )}

      {/* ── CAIXA DE PAGAMENTO PIX (se PIX selecionado e ainda não pago) ── */}
      {isPixPending && order.pix_code && (
        <div className="bg-white border-2 border-[#F5D000] rounded-3xl p-5 sm:p-7 shadow-lg space-y-5 text-slate-950 overflow-hidden">
          {/* Header com Logo BB e Título */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#F5D000] pb-4 bg-gradient-to-r from-[#FFEF00] via-[#FFE34D] to-[#FFF7B2] -mx-5 sm:-mx-7 -mt-5 sm:-mt-7 px-5 sm:px-7 pt-5 sm:pt-7">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black font-display text-[#003399]">
                  PAGAMENTO VIA PIX
                </h2>
                <p className="text-[10px] text-[#003399] mt-0.5 uppercase tracking-wide font-black">
                  Banco do Brasil
                </p>
              </div>
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60 self-start sm:self-auto">
              Aguardando Pagamento
            </span>
          </div>

          {/* Informações Obrigatórias da Cobrança */}
          <div className="space-y-1.5 text-xs sm:text-sm">
            <p className="font-bold text-[var(--seven-text-primary)]">
              Valor a pagar: <strong className="text-[#0756B8] text-xl sm:text-2xl font-black">{formatCurrency(order.total_amount_cents)}</strong>
            </p>
            <p className="text-[var(--seven-text-secondary)]">
              Recebedor: <strong className="text-[var(--seven-text-primary)]">P. CAMILA CAMBRAIA DA COSTA Ltda.</strong>
            </p>
            <p className="text-[var(--seven-text-secondary)]">
              Instituição: <strong className="text-[var(--seven-text-primary)]">Banco do Brasil</strong>
            </p>
            <p className="text-[10px] text-[var(--seven-text-secondary)] italic opacity-80 pt-1">
              Pagamento processado pelo Banco do Brasil para a conta da empresa identificada acima.
            </p>
            <div className="mt-3 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2.5">
              <p className="text-xs font-black text-sky-900">
                Seu pedido só será liberado para produção após a confirmação do pagamento.
              </p>
              <p className="text-[11px] text-sky-800 font-medium mt-1">
                Após pagar, aguarde nesta tela. A confirmação e a liberação do QR de retirada acontecem automaticamente.
              </p>
            </div>
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2.5">
              <p className="text-xs font-black text-amber-950">
                O PIX é válido por 6 horas{pixExpiryLabel ? `, até ${pixExpiryLabel}` : ''}.
              </p>
              <p className="text-[11px] text-amber-900 font-medium mt-1">
                Após o vencimento, este pedido será cancelado e será necessário fazer um novo pedido.
              </p>
            </div>
          </div>

          {/* QR Code PIX + Copia e Cola */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
            {/* QR Code PIX */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#003399]">
                QR CODE PARA PAGAMENTO PIX
              </p>
              <div className="bg-white p-3.5 rounded-2xl border-2 border-blue-200 shadow-sm">
                <QRCodeSVG
                  value={order.pix_code}
                  size={180}
                  bgColor="#FFFFFF"
                  fgColor="#003399"
                  level="M"
                />
              </div>
            </div>

            {/* Instruções Copia e Cola */}
            <div className="flex-1 space-y-3 text-center sm:text-left w-full min-w-0">
              <p className="text-xs text-[var(--seven-text-secondary)] leading-relaxed">
                Escaneie o QR Code no aplicativo do seu banco ou copie o código Pix abaixo para efetuar o pagamento:
              </p>

              <div className="bg-slate-50 border border-blue-200 p-2 rounded-xl flex items-center justify-between gap-2 shadow-xs min-w-0">
                <input
                  type="text"
                  readOnly
                  value={order.pix_code}
                  className="bg-transparent text-xs text-slate-900 font-mono flex-1 outline-none truncate select-all px-2"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="min-h-[44px] px-4 py-2 bg-[#003399] hover:bg-[#002266] active:scale-95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer"
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

                          </div>
          </div>
        </div>
      )}

      {/* ── Retirada só aparece após pagamento PIX; LOJA preserva fluxo existente ── */}
      {showOperationalStatuses && (
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
              QR CODE DE RETIRADA NA LOJA
            </h3>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2">
              <p className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                Este QR Code NÃO realiza pagamento.
              </p>
            </div>

            <p className="text-xs text-[var(--seven-text-secondary)] leading-relaxed">
              Este código serve <strong>exclusivamente</strong> para identificação e retirada do pedido na loja. Para pagar, utilize o QR Code PIX acima.
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
      )}

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

