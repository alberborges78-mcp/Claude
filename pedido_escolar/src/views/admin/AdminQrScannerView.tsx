import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  PackageCheck,
  ShieldAlert,
  Phone,
  Download,
  CreditCard,
  DollarSign,
  X,
  Camera,
  Loader2,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { db } from '../../services/db';
import { Order, InStorePaymentMethod } from '../../types';
import { formatCurrency, formatDateTime, formatPhone } from '../../utils/formatters';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import { useAuth } from '../../context/AuthContext';

const PAYMENT_METHODS: { value: InStorePaymentMethod; label: string; icon: any }[] = [
  { value: 'PIX', label: 'PIX', icon: QrCode },
  { value: 'DEBITO', label: 'DÉBITO', icon: CreditCard },
  { value: 'CREDITO', label: 'CRÉDITO', icon: CreditCard },
  { value: 'DINHEIRO', label: 'DINHEIRO', icon: DollarSign },
];

export const AdminQrScannerView: React.FC = () => {
  const { user } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [scannedOrder, setScannedOrder] = useState<Order | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<InStorePaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Scanner QR states
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false); // Track scanning state for UI

  // Refs for scanner lifecycle management
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);
  const isProcessingScanRef = useRef<boolean>(false); // Prevent duplicate scan processing

  // Parse QR content: accept token pure or URL /pedido/:token
  const parseQrContent = (content: string): string | null => {
    if (!content) return null;
    // Try to extract token from URL pattern /pedido/:token
    const urlMatch = content.match(/\/pedido\/([a-f0-9-]+)/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    // If it looks like a UUID (qr_token format), use directly
    if (/^[a-f0-9-]{36}$/i.test(content)) {
      return content;
    }
    // If it looks like an order number (SEV-YYYY-NNNN), use directly
    if (/^SEV-\d{4}-\d{4}$/i.test(content)) {
      return content;
    }
    return null;
  };

  // Initialize scanner ONLY when showScanner becomes true and DOM is ready
  useEffect(() => {
    let mounted = true;
    let html5QrCode: Html5Qrcode | null = null;

    const initScanner = async () => {
      if (!showScanner || !scannerContainerRef.current) {
        console.log('[QR] Waiting for scanner view and container...');
        return;
      }

      console.log('[QR] Starting scanner initialization...');

      // Check secure context
      if (!window.isSecureContext) {
        setScannerError('A câmera requer HTTPS. Acesse via produção.');
        // Do NOT close viewport on error so user sees the message
        return;
      }

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScannerError('Seu navegador não suporta acesso à câmera.');
        return;
      }

      try {
        console.log('[QR] Creating Html5Qrcode instance...');
        html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
        };

        console.log('[QR] Attempting to start camera with facingMode: environment...');

        // First attempt with environment (rear camera)
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText: string) => {
              // Successful scan - stop and process
              if (isProcessingScanRef.current) return; // Prevent duplicate processing
              isProcessingScanRef.current = true;

              console.log('[QR] QR Code detected:', decodedText);

              // Stop scanner first
              html5QrCode?.stop().then(() => {
                console.log('[QR] Scanner stopped successfully after scan');
                setIsScanning(false);
                setShowScanner(false);

                const parsed = parseQrContent(decodedText);
                if (parsed) {
                  handleSearch(parsed);
                } else {
                  setFeedback({
                    type: 'error',
                    message: 'QR Code inválido para este sistema.',
                  });
                }
                isProcessingScanRef.current = false;
              }).catch((err) => {
                console.error('[QR] Error stopping scanner after scan:', err);
                setIsScanning(false);
                setShowScanner(false);
                isProcessingScanRef.current = false;
              });
            },
            (errorMessage: string) => {
              // Scan error (usually just means no QR in frame yet)
              // Silenced to avoid console spam
            }
          );

          console.log('[QR] Camera started successfully with environment mode');
          setIsScanning(true);
        } catch (envError) {
          // Fallback to default camera if environment fails
          console.log('[QR] Environment camera failed, trying fallback...', envError);

          // Check if it's a constraint error (camera not available)
          if (envError instanceof Error && (envError.name === 'OverconstrainedError' || envError.name === 'NotFoundError')) {
             await html5QrCode.start(
              {}, // Use default camera (any available)
              config,
              (decodedText: string) => {
                if (isProcessingScanRef.current) return;
                isProcessingScanRef.current = true;

                html5QrCode?.stop().then(() => {
                  setIsScanning(false);
                  setShowScanner(false);

                  const parsed = parseQrContent(decodedText);
                  if (parsed) {
                    handleSearch(parsed);
                  } else {
                    setFeedback({
                      type: 'error',
                      message: 'QR Code inválido para este sistema.',
                    });
                  }
                  isProcessingScanRef.current = false;
                }).catch((err) => {
                  console.error('[QR] Error stopping scanner after scan:', err);
                  setIsScanning(false);
                  setShowScanner(false);
                  isProcessingScanRef.current = false;
                });
              },
              (errorMessage: string) => {}
            );
            console.log('[QR] Fallback camera started successfully');
            setIsScanning(true);
          } else {
            throw envError; // Re-throw if not a simple constraint error
          }
        }
      } catch (err: unknown) {
        if (!mounted) return;

        console.error('[QR] Error starting scanner:', err);
        const error = err as Error;

        // Map common errors to user-friendly messages
        if (error.name === 'NotAllowedError') {
          setScannerError('Permissão de câmera negada. Permita o acesso nas configurações do navegador.');
        } else if (error.name === 'NotFoundError') {
          setScannerError('Nenhuma câmera encontrada neste dispositivo.');
        } else if (error.name === 'NotReadableError') {
          setScannerError('Câmera ocupada ou indisponível. Feche outros apps e tente novamente.');
        } else if (error.name === 'OverconstrainedError') {
          setScannerError('Câmera solicitada não disponível. Tentando padrão...');
        } else if (error.name === 'SecurityError') {
          setScannerError('Bloqueio de segurança. Verifique se está em HTTPS.');
        } else {
          setScannerError(`Erro na câmera: ${error.message}`);
        }
        // Do NOT close the scanner viewport on error - keep it visible so user sees the message
        setIsScanning(false);
      }
    };

    if (showScanner) {
      initScanner();
    }

    return () => {
      console.log('[QR] Cleanup effect running...');
      mounted = false;
      if (html5QrCodeRef.current) {
        // Only stop if we were actually scanning
        if (isScanning) {
          html5QrCodeRef.current.stop().then(() => {
            console.log('[QR] Scanner stopped during cleanup');
          }).catch((err) => {
            console.error('[QR] Error stopping scanner during cleanup:', err);
          });
        }
        html5QrCodeRef.current = null;
      }
      setIsScanning(false);
      isProcessingScanRef.current = false;
    };
  }, [showScanner]); // Re-run when showScanner changes

  // Start QR Scanner - just sets the state to trigger useEffect
  const startScanner = () => {
    console.log('[QR] Start button clicked');
    setScannerError(null);
    setShowScanner(true);
    setIsScanning(false);
    isProcessingScanRef.current = false;
  };

  // Stop scanner manually
  const stopScanner = async () => {
    console.log('[QR] Stop button clicked');
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        console.log('[QR] Scanner stopped manually');
      } catch (err) {
        console.error('[QR] Error stopping scanner manually:', err);
      }
      html5QrCodeRef.current = null;
    }
    setShowScanner(false);
    setIsScanning(false);
    isProcessingScanRef.current = false;
  };

  // Administrative search: uses Supabase async methods
  const handleSearch = async (tokenOrNumber: string) => {
    setFeedback(null);
    setIsLoading(true);
    const clean = tokenOrNumber.trim();

    if (!clean) {
      setFeedback({ type: 'error', message: 'Informe o Token ou Número do Pedido.' });
      setIsLoading(false);
      return;
    }

    try {
      let found: Order | null = null;

      // Try by qr_token first
      found = await db.getOrderByQrTokenAsync(clean);

      // If not found, try by order_number
      if (!found) {
        const orders = await db.getOrdersAsync({});
        found = orders.find(o => o.order_number.toUpperCase() === clean.toUpperCase()) || null;
      }

      if (found) {
        setScannedOrder(found);
        setRecipientName(found.customer_name);
        setFeedback({ type: 'success', message: 'Pedido localizado com sucesso!' });
      } else {
        setScannedOrder(null);
        setFeedback({
          type: 'error',
          message: 'Pedido não encontrado. Verifique o código digitado.',
        });
      }
    } catch (err) {
      console.error('Erro na consulta:', err);
      setScannedOrder(null);
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao consultar o banco de dados.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPaymentModal = () => {
    if (!scannedOrder) return;
    setSelectedPaymentMethod(null);
    setShowPaymentModal(true);
  };

  const handleExecutePayment = async () => {
    if (!scannedOrder || !selectedPaymentMethod) return;

    setIsProcessing(true);
    setShowPaymentModal(false);

    try {
      const updated = await db.confirmPayment(
        scannedOrder.id,
        user?.name || 'Administrador Seven',
        selectedPaymentMethod
      );

      // Recarregar pedido real do Supabase
      const refreshed = await db.getOrderByQrTokenAsync(scannedOrder.qr_token || '');
      if (refreshed) {
        setScannedOrder(refreshed);
      } else {
        setScannedOrder({ ...updated });
      }

      setFeedback({
        type: 'success',
        message: `Pagamento de ${formatCurrency(scannedOrder.total_amount_cents)} via ${selectedPaymentMethod} confirmado!`,
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao confirmar pagamento.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!scannedOrder) return;
    if (!recipientName.trim()) {
      setFeedback({ type: 'error', message: 'Informe o nome de quem está retirando.' });
      return;
    }

    setIsProcessing(true);
    try {
      await db.confirmDeliveryAsync(
        scannedOrder.id,
        user?.name || 'Administrador Seven',
        recipientName || scannedOrder.customer_name,
        'Retirado na loja física'
      );

      // Recarregar pedido real
      const refreshed = await db.getOrderByQrTokenAsync(scannedOrder.qr_token || '');
      if (refreshed) {
        setScannedOrder(refreshed);
      }

      setFeedback({
        type: 'success',
        message: 'Retirada realizada e registrada com sucesso!',
      });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao confirmar entrega.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!scannedOrder) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    generateOrderPDF(scannedOrder, `${origin}/pedido/${scannedOrder.qr_token}`);
  };

  const isPaid = scannedOrder?.payment_status === 'PAGO';
  const isDelivered = scannedOrder?.delivery_status === 'ENTREGUE';
  const canDeliver = isPaid && !isDelivered;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Scanner / Lookup Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] flex items-center gap-2">
            <QrCode className="w-6 h-6 text-sky-600" />
            Central de Retirada
          </h1>
          <p className="text-xs text-slate-500">
            Escaneie o QR Code ou digite o número do pedido para conferência e entrega
          </p>
        </div>

        {/* QR Scanner Button */}
        {!showScanner && (
          <button
            onClick={startScanner}
            className="w-full py-4 px-6 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold text-sm shadow transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" />
            LER QR CODE (Câmera)
          </button>
        )}

        {/* Scanner Viewport */}
        {showScanner && (
          <div className="space-y-3">
            <div
              ref={scannerContainerRef}
              id="qr-reader"
              className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-sky-500"
              style={{ minHeight: '250px' }}
            />
            <button
              onClick={stopScanner}
              className="w-full py-3 px-6 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm shadow transition-all active:scale-95"
            >
              CANCELAR LEITURA
            </button>
            {scannerError && (
              <p className="text-xs text-red-600 text-center font-bold">{scannerError}</p>
            )}
            {isScanning && !scannerError && (
              <p className="text-xs text-sky-600 text-center font-bold">Aponte a câmera para o QR Code...</p>
            )}
          </div>
        )}

        {/* Manual Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(tokenInput);
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ex: SEV-2026-0035"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-2xl font-bold text-xs sm:text-sm shadow transition-all active:scale-95 flex items-center gap-1"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Localizar
          </button>
        </form>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Scanned Order Details Card */}
      {scannedOrder && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
          {/* Order Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                PEDIDO LOCALIZADO
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-['Outfit'] mt-1">
                {scannedOrder.order_number}
              </h2>
              <p className="text-xs text-slate-500">
                Criado em {formatDateTime(scannedOrder.created_at)} • {scannedOrder.total_items} peças
              </p>
            </div>
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              <Download className="w-4 h-4" />
              Comprovante PDF
            </button>
          </div>

          {/* Payment Status Banner */}
          <div className="space-y-3">
            {isPaid ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex items-center justify-between gap-3 text-emerald-950">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-black tracking-wide">PAGAMENTO CONFIRMADO</h3>
                    <p className="text-xs text-emerald-800">
                      Total pago: {formatCurrency(scannedOrder.total_amount_cents)}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-200 text-emerald-900">
                  LIBERADO
                </span>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-950">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-black tracking-wide text-red-900">
                      ATENÇÃO: PEDIDO NÃO PAGO
                    </h3>
                    <p className="text-xs text-red-800">
                      Cobrar: <strong className="text-sm">{formatCurrency(scannedOrder.total_amount_cents)}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleOpenPaymentModal}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow transition-all active:scale-95"
                >
                  Confirmar Recebimento
                </button>
              </div>
            )}

            {/* Delivery Status Banner */}
            {isDelivered && (
              <div className="p-4 bg-purple-50 border-2 border-purple-500 rounded-2xl flex items-center gap-3 text-purple-950">
                <AlertTriangle className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-black tracking-wide text-purple-900">
                    PEDIDO JÁ ENTREGUE
                  </h3>
                  <p className="text-xs text-purple-800">
                    Este pedido já foi retirado anteriormente.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Customer & Item Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Responsável</span>
              <p className="font-extrabold text-slate-900 text-sm">{scannedOrder.customer_name}</p>
              <p className="text-slate-600 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {formatPhone(scannedOrder.customer_whatsapp)}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Escola / Campanha</span>
              <p className="font-extrabold text-slate-900 text-sm">
                {scannedOrder.school?.name || 'COLÉGIO CONCEITO'}
              </p>
              <p className="text-slate-600">
                {scannedOrder.campaign?.name || 'Campanha de Uniformes 2026'}
              </p>
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Itens ({scannedOrder.total_items} camisas)
            </h3>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {(scannedOrder.items || []).map((item, idx) => (
                <div key={idx} className="p-3 bg-white flex items-start justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">
                      {item.student_name} - {item.class_name}
                    </span>
                    <p className="text-slate-500 text-[11px]">
                      Tam: <strong>{item.size_label}</strong> • Qtd: {item.quantity}
                    </p>
                    {item.personalizations && item.personalizations.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {item.personalizations.map((p) => {
                          const hasCustom = p.custom_name || p.custom_number;
                          return (
                            <p key={p.piece_index} className="text-[11px] text-sky-800 font-medium">
                              ↳ Peça {p.piece_index}: {hasCustom ? `${p.custom_name} ${p.custom_number ? `(${p.custom_number})` : ''}` : 'Sem personalização'}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(item.subtotal_cents)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action: Confirm Pickup */}
          {!isDelivered ? (
            <div className="p-5 bg-sky-50 border border-sky-200 rounded-3xl space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-sky-950 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-sky-700" />
                Registrar Entrega
              </h4>

              {!canDeliver && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">
                  PAGAMENTO PENDENTE — Libere o financeiro antes de entregar.
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">
                  Nome de quem está retirando:
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  disabled={!canDeliver || isProcessing}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none disabled:opacity-50"
                  placeholder="Nome do responsável"
                />
              </div>

              <button
                onClick={handleConfirmDelivery}
                disabled={!canDeliver || isProcessing}
                className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-5 h-5" />
                    CONFIRMAR RETIRADA
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 bg-slate-100 rounded-2xl text-center text-xs font-bold text-slate-500">
              ✓ Entrega finalizada e arquivada
            </div>
          )}
        </div>
      )}

      {/* Modal de Seleção de Pagamento */}
      {showPaymentModal && scannedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Confirmar Pagamento</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={isProcessing}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 text-center">
                Selecione a forma de recebimento presencial:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedPaymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      onClick={() => setSelectedPaymentMethod(method.value)}
                      disabled={isProcessing}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">{method.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedPaymentMethod && (
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Resumo da Operação</p>
                  <p className="text-xl font-black text-slate-900">
                    {formatCurrency(scannedOrder.total_amount_cents)}
                  </p>
                  <p className="text-sm text-slate-600">
                    via <strong>{PAYMENT_METHODS.find(m => m.value === selectedPaymentMethod)?.label}</strong>
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={isProcessing}
                className="flex-1 py-3 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecutePayment}
                disabled={!selectedPaymentMethod || isProcessing}
                className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};