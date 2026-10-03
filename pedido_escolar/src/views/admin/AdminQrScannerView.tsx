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
  ScanBarcode,
  ChevronLeft,
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<InStorePaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Scanner QR states
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState<'initial' | 'bag-check'>('initial'); // initial search or bag check
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Refs for scanner lifecycle management
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);
  const isProcessingScanRef = useRef<boolean>(false);
  // Stable ref to access scannedOrder inside scanner callback without
  // making it a dependency of the scanner useEffect (avoids re-init/cleanup race)
  const scannedOrderRef = useRef<Order | null>(null);

  // === TEMPORARY DIAGNOSTIC INSTRUMENTATION ===
  const [qrDebugSteps, setQrDebugSteps] = useState<string[]>([]);
  const addDebugStep = (step: string) => {
    const entry = `[${new Date().toISOString().slice(11, 23)}] ${step}`;
    setQrDebugSteps((prev) => {
      const next = [...prev, entry].slice(-30);
      try { sessionStorage.setItem('seven_qr_debug', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('seven_qr_debug');
      if (stored) setQrDebugSteps(JSON.parse(stored));
    } catch {}
    addDebugStep('COMPONENT_MOUNT');
    return () => { addDebugStep('COMPONENT_UNMOUNT'); };
  }, []);
  // Log render phase (safe: no setState)
  console.log('[QR_RENDER]', {
    hasOrder: !!scannedOrder,
    orderNum: scannedOrder?.order_number,
    showScanner,
    scannerMode,
  });
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      addDebugStep(`WINDOW_ERROR: ${e.message || e.error?.message || 'unknown'} | stack=${e.error?.stack?.slice(0, 200) || 'none'}`);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason instanceof Error ? `${e.reason.message} | stack=${e.reason.stack?.slice(0, 200)}` : String(e.reason);
      addDebugStep(`PROMISE_REJECT: ${reason}`);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  // Keep scannedOrderRef in sync so scanner callback can read current order
  // without making scannedOrder a dependency of the scanner useEffect
  useEffect(() => {
    scannedOrderRef.current = scannedOrder;
  }, [scannedOrder]);
  // Log state transitions for diagnosis
  useEffect(() => {
    const val = scannedOrder ? scannedOrder.order_number : 'null';
    addDebugStep(`SCANNED_ORDER_CHANGED order=${val}`);
  }, [scannedOrder]);
  useEffect(() => {
    addDebugStep(`SHOW_SCANNER_CHANGED value=${showScanner}`);
  }, [showScanner]);
  useEffect(() => { addDebugStep(`STATE scannerMode=${scannerMode}`); }, [scannerMode]);
  // === END DIAGNOSTIC INSTRUMENTATION ===

  // Parse QR content: accept token pure or URL /pedido/:token
  const parseQrContent = (content: string): string | null => {
    if (!content) return null;
    const urlMatch = content.match(/\/pedido\/([a-f0-9-]+)/i);
    if (urlMatch && urlMatch[1]) return urlMatch[1];
    if (/^[a-f0-9-]{36}$/i.test(content)) return content;
    if (/^SEV-\d{4}-\d{4}$/i.test(content)) return content;
    return null;
  };

  // Initialize scanner ONLY when showScanner becomes true and DOM is ready
  useEffect(() => {
    let mounted = true;
    let html5QrCode: Html5Qrcode | null = null;

    const initScanner = async () => {
      addDebugStep('SCANNER_EFFECT_START');
      if (!showScanner || !scannerContainerRef.current) return;
      if (isProcessingScanRef.current) return;

      console.log(`[QR] Starting scanner in ${scannerMode} mode...`);
      setScannerError(null);

      if (!window.isSecureContext) {
        setScannerError('A câmera requer HTTPS. Acesse via produção.');
        return;
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScannerError('Seu navegador não suporta acesso à câmera.');
        return;
      }

      try {
        html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0, disableFlip: false };

        // Try environment camera first
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            async (decodedText: string) => {
              try {
                addDebugStep('01 CALLBACK_QR');
                if (isProcessingScanRef.current) { addDebugStep('SKIP_DUPLICATE'); return; }
                isProcessingScanRef.current = true;

                addDebugStep('02 PARSE_START');
                const parsed = parseQrContent(decodedText);
                if (!parsed) {
                  addDebugStep('02 PARSE_FAIL');
                  setFeedback({ type: 'error', message: 'QR Code inválido para este sistema.' });
                  return;
                }
                addDebugStep(`02 PARSE_OK mode=${scannerMode}`);

                // 1. Lookup FIRST (pure data, no UI commit yet)
                let found: Order | null = null;
                if (scannerMode === 'initial') {
                  addDebugStep('04 LOOKUP_START');
                  try {
                    found = await findOrder(parsed);
                    addDebugStep(found ? `04 LOOKUP_OK order=${found.order_number}` : '04 LOOKUP_NOT_FOUND');
                  } catch (searchErr) {
                    addDebugStep(`04 LOOKUP_ERR: ${searchErr instanceof Error ? searchErr.message : String(searchErr)}`);
                    setFeedback({ type: 'error', message: 'Erro ao carregar pedido. Tente novamente.' });
                  }
                }

                // 2. FULLY shutdown scanner BEFORE any UI state change
                await shutdownScanner();

                // 3. Hide scanner UI container
                addDebugStep('08 UI_SCANNER_HIDDEN');
                setShowScanner(false);

                // 4. NOW commit visual state (safe: scanner DOM is gone)
                if (scannerMode === 'initial') {
                  if (found) {
                    displayLocatedOrder(found);
                  } else {
                    setScannedOrder(null);
                    setFeedback({ type: 'error', message: 'Pedido não encontrado.' });
                  }
                } else if (scannerMode === 'bag-check' && scannedOrderRef.current) {
                  addDebugStep('04 BAG_CHECK');
                  if (parsed === scannedOrderRef.current.qr_token) {
                    setFeedback({ type: 'success', message: '✅ SACOLA CORRETA! Pode prosseguir com a entrega.' });
                  } else {
                    setFeedback({ type: 'error', message: '🚫 SACOLA INCORRETA! Verifique o número do pedido.' });
                  }
                }

                addDebugStep('10 QR_FLOW_FINISHED');
              } finally {
                isProcessingScanRef.current = false;
              }
            },
            () => {} // Silent error handler for "no QR found" frames
          );
          setIsScanning(true);
        } catch (envError) {
          // Fallback to default camera
          if (envError instanceof Error && (envError.name === 'OverconstrainedError' || envError.name === 'NotFoundError')) {
            await html5QrCode.start({}, config, async (decodedText: string) => {
              try {
                if (isProcessingScanRef.current) return;
                isProcessingScanRef.current = true;
                const parsed = parseQrContent(decodedText);
                if (!parsed) {
                  setFeedback({ type: 'error', message: 'QR Code inválido para este sistema.' });
                  return;
                }
                let found: Order | null = null;
                if (scannerMode === 'initial') {
                  try {
                    found = await findOrder(parsed);
                  } catch (err) {
                    console.error('[QR] Erro ao processar pedido após scan (fallback):', err);
                    setFeedback({ type: 'error', message: 'Erro ao carregar pedido. Tente novamente.' });
                  }
                }
                await shutdownScanner();
                setShowScanner(false);
                if (scannerMode === 'initial') {
                  if (found) {
                    displayLocatedOrder(found);
                  } else {
                    setScannedOrder(null);
                    setFeedback({ type: 'error', message: 'Pedido não encontrado.' });
                  }
                } else if (scannerMode === 'bag-check' && scannedOrderRef.current) {
                  if (parsed === scannedOrderRef.current.qr_token) {
                    setFeedback({ type: 'success', message: '✅ SACOLA CORRETA! Pode prosseguir com a entrega.' });
                  } else {
                    setFeedback({ type: 'error', message: '🚫 SACOLA INCORRETA! Verifique o número do pedido.' });
                  }
                }
              } finally {
                isProcessingScanRef.current = false;
              }
            }, () => {});
            setIsScanning(true);
          } else {
            throw envError;
          }
        }
      } catch (err: unknown) {
        if (!mounted) return;
        const error = err as Error;
        if (error.name === 'NotAllowedError') setScannerError('Permissão negada.');
        else if (error.name === 'NotFoundError') setScannerError('Nenhuma câmera encontrada.');
        else setScannerError(`Erro: ${error.message}`);
        setIsScanning(false);
      }
    };

    if (showScanner) initScanner();

    return () => {
      addDebugStep('SCANNER_CLEANUP_START');
      mounted = false;
      if (html5QrCodeRef.current) {
        addDebugStep('SCANNER_CLEANUP_STOP');
        html5QrCodeRef.current.stop().catch((e) => {
          addDebugStep(`SCANNER_CLEANUP_STOP_ERR: ${e?.message || e}`);
        });
        addDebugStep('SCANNER_CLEANUP_CLEAR');
        try { html5QrCodeRef.current.clear(); } catch (e: any) {
          addDebugStep(`SCANNER_CLEANUP_CLEAR_ERR: ${e?.message || e}`);
        }
        html5QrCodeRef.current = null;
      }
      setIsScanning(false);
      isProcessingScanRef.current = false;
      addDebugStep('SCANNER_CLEANUP_END');
    };
  }, [showScanner, scannerMode]);

  const startScanner = (mode: 'initial' | 'bag-check' = 'initial') => {
    setScannerMode(mode);
    setScannerError(null);
    setShowScanner(true);
    isProcessingScanRef.current = false;
  };

  const stopScanner = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
      html5QrCodeRef.current = null;
    }
    setShowScanner(false);
    setIsScanning(false);
    isProcessingScanRef.current = false;
  };

  // Pure lookup — no UI side effects. Safe to call from any flow.
  const findOrder = async (tokenOrNumber: string): Promise<Order | null> => {
    const clean = tokenOrNumber.trim();
    if (!clean) return null;
    let found: Order | null = null;
    found = await db.getOrderByQrTokenAsync(clean);
    if (!found) {
      const orders = await db.getOrdersAsync({});
      found = orders.find(o => o.order_number.toUpperCase() === clean.toUpperCase()) || null;
    }
    return found;
  };

  // Commit visual state for a located order. Shared by manual search and QR.
  const displayLocatedOrder = (order: Order) => {
    addDebugStep(`09 DISPLAY_ORDER_START order=${order.order_number}`);
    setScannedOrder(order);
    setRecipientName(order.customer_name || '');
    setFeedback({ type: 'success', message: 'Pedido localizado com sucesso!' });
    addDebugStep('09 DISPLAY_ORDER_DONE');
  };

  // Idempotent scanner shutdown: stop + clear + null ref.
  // Safe to call multiple times; never throws.
  const shutdownScanner = async () => {
    addDebugStep('07 SHUTDOWN_START');
    const instance = html5QrCodeRef.current;
    if (instance) {
      try {
        addDebugStep('07 SHUTDOWN_STOPPING');
        await instance.stop().catch(() => {});
        addDebugStep('07 SHUTDOWN_STOPPED');
      } catch {}
      try {
        addDebugStep('07 SHUTDOWN_CLEARING');
        instance.clear();
        addDebugStep('07 SHUTDOWN_CLEARED');
      } catch {}
      html5QrCodeRef.current = null;
      addDebugStep('07 SHUTDOWN_REF_NULL');
    } else {
      addDebugStep('07 SHUTDOWN_ALREADY_NULL');
    }
    setIsScanning(false);
    isProcessingScanRef.current = false;
  };

  const handleSearch = async (tokenOrNumber: string) => {
    addDebugStep('HS_01 START');
    setFeedback(null);
    setIsLoading(true);
    const clean = tokenOrNumber.trim();
    if (!clean) {
      addDebugStep('HS_01 EMPTY_INPUT');
      setFeedback({ type: 'error', message: 'Informe o Token ou Número do Pedido.' });
      setIsLoading(false);
      return;
    }
    try {
      addDebugStep('HS_02 QR_LOOKUP');
      const found = await findOrder(clean);
      if (found) {
        addDebugStep(`HS_04 FOUND order=${found.order_number} paid=${found.payment_status}`);
        displayLocatedOrder(found);
      } else {
        addDebugStep('HS_04 NOT_FOUND');
        setScannedOrder(null);
        setFeedback({ type: 'error', message: 'Pedido não encontrado.' });
      }
    } catch (err) {
      addDebugStep(`HS_ERR: ${err instanceof Error ? err.message : String(err)}`);
      setFeedback({ type: 'error', message: 'Falha ao consultar o banco.' });
    } finally {
      setIsLoading(false);
      addDebugStep('HS_05 END');
    }
  };

  // Reset attendance state to prepare for next customer. Shared by post-delivery and "scan another" button.
  const resetAttendance = () => {
    setScannedOrder(null);
    setRecipientName('');
    setFeedback(null);
    setTokenInput('');
    setSelectedPaymentMethod(null);
    setShowPaymentModal(false);
    setScannerMode('initial');
    setShowScanner(false);
    setIsScanning(false);
    isProcessingScanRef.current = false;
  };

  const handleConfirmDelivery = async () => {
    addDebugStep('DELIVERY_01 CLICK');
    if (!scannedOrder) {
      addDebugStep('DELIVERY_BLOCKED reason=no_scanned_order');
      return;
    }
    if (!recipientName.trim()) {
      addDebugStep('DELIVERY_BLOCKED reason=empty_recipient_name');
      setFeedback({ type: 'error', message: 'Informe o nome de quem está retirando.' });
      return;
    }
    addDebugStep('DELIVERY_02 VALIDATION_OK');
    setIsProcessing(true);
    try {
      addDebugStep('DELIVERY_03 RPC_START');
      await db.confirmDeliveryAsync(scannedOrder.id, user?.name || 'Admin', recipientName, 'Retirada na loja');
      addDebugStep('DELIVERY_04 RPC_OK');
      addDebugStep('DELIVERY_05 RESET_ATTENDANCE');
      resetAttendance();
      addDebugStep('DELIVERY_06 READY_NEXT_CUSTOMER');
      setFeedback({ type: 'success', message: 'Retirada realizada com sucesso! Pronto para o próximo cliente.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addDebugStep(`DELIVERY_04 RPC_ERROR ${msg.slice(0, 200)}`);
      setFeedback({ type: 'error', message: msg || 'Erro ao confirmar entrega.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const isPaid = scannedOrder?.payment_status === 'PAGO';
  const isDelivered = scannedOrder?.delivery_status === 'ENTREGUE';
  const canDeliver = isPaid && !isDelivered;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] flex items-center gap-2">
            <QrCode className="w-6 h-6 text-sky-600" />
            Central de Retirada
          </h1>
          <p className="text-xs text-slate-500">Escaneie o QR Code ou digite o número do pedido</p>
        </div>

        {!showScanner && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => startScanner('initial')} className="py-4 px-6 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-bold text-sm shadow transition-all active:scale-95 flex items-center justify-center gap-2">
              <Camera className="w-5 h-5" /> LER PEDIDO
            </button>
            {scannedOrder && (
              <button onClick={() => startScanner('bag-check')} className="py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm shadow transition-all active:scale-95 flex items-center justify-center gap-2">
                <ScanBarcode className="w-5 h-5" /> CONFERIR SACOLA
              </button>
            )}
          </div>
        )}

        {showScanner && (
          <div className="space-y-3">
            <div ref={scannerContainerRef} id="qr-reader" className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden border-2 border-sky-500" style={{ minHeight: '250px' }} />
            <button onClick={stopScanner} className="w-full py-3 px-6 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-bold text-sm shadow transition-all active:scale-95">CANCELAR</button>
            {scannerError && <p className="text-xs text-red-600 text-center font-bold">{scannerError}</p>}
            {isScanning && <p className="text-xs text-sky-600 text-center font-bold">Aponte a câmera...</p>}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSearch(tokenInput); }} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Ex: SEV-2026-0035" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} disabled={isLoading} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50" />
          </div>
          <button type="submit" disabled={isLoading} className="px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-2xl font-bold text-xs sm:text-sm shadow transition-all active:scale-95 flex items-center gap-1">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Localizar
          </button>
        </form>

        {feedback && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : feedback.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {scannedOrder && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">PEDIDO LOCALIZADO</span>
              <h2 className="text-2xl font-black text-slate-900 font-['Outfit'] mt-1">{scannedOrder.order_number}</h2>
              <p className="text-xs text-slate-500">Criado em {formatDateTime(scannedOrder.created_at)} • {scannedOrder.total_items} peças</p>
            </div>
            <button onClick={() => generateOrderPDF(scannedOrder, `${window.location.origin}/pedido/${scannedOrder.qr_token}`)} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all">
              <Download className="w-4 h-4" /> Comprovante PDF
            </button>
          </div>

          <div className="space-y-3">
            {isPaid ? (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex items-center justify-between gap-3 text-emerald-950">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-black tracking-wide">PAGAMENTO CONFIRMADO</h3>
                    <p className="text-xs text-emerald-800">Total pago: {formatCurrency(scannedOrder.total_amount_cents)}</p>
                  </div>
                </div>
                <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-200 text-emerald-900">LIBERADO</span>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border-2 border-red-500 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-950">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-black tracking-wide text-red-900">ATENÇÃO: PEDIDO NÃO PAGO</h3>
                    <p className="text-xs text-red-800">Cobrar: <strong className="text-sm">{formatCurrency(scannedOrder.total_amount_cents)}</strong></p>
                  </div>
                </div>
                <button onClick={() => setShowPaymentModal(true)} disabled={isProcessing} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow transition-all active:scale-95">Confirmar Recebimento</button>
              </div>
            )}
            {isDelivered && (
              <div className="p-4 bg-purple-50 border-2 border-purple-500 rounded-2xl flex items-center gap-3 text-purple-950">
                <AlertTriangle className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-black tracking-wide text-purple-900">PEDIDO JÁ ENTREGUE</h3>
                  <p className="text-xs text-purple-800">Este pedido já foi retirado anteriormente.</p>
                </div>
              </div>
            )}
          </div>

          {!isDelivered ? (
            <div className="p-5 bg-sky-50 border border-sky-200 rounded-3xl space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-sky-950 flex items-center gap-1.5"><PackageCheck className="w-4 h-4 text-sky-700" /> Registrar Entrega</h4>
              {!canDeliver && <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">PAGAMENTO PENDENTE — Libere o financeiro antes de entregar.</div>}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Nome de quem está retirando:</label>
                <input type="text" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} disabled={!canDeliver || isProcessing} className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none disabled:opacity-50" placeholder="Nome do responsável" />
              </div>
              <button onClick={handleConfirmDelivery} disabled={!canDeliver || isProcessing} className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2">
                {isProcessing ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : <><PackageCheck className="w-5 h-5" /> CONFIRMAR RETIRADA</>}
              </button>
            </div>
          ) : (
            <div className="p-6 bg-purple-50 border-2 border-purple-300 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <PackageCheck className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide text-purple-900">PEDIDO JÁ ENTREGUE</h3>
                  <p className="text-xs text-purple-700">Este pedido foi retirado anteriormente.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-purple-200">
                  <span className="block text-[10px] font-bold text-purple-500 uppercase mb-0.5">Retirado em</span>
                  <span className="font-bold text-purple-900">{scannedOrder.delivered_at ? formatDateTime(scannedOrder.delivered_at) : '—'}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-purple-200">
                  <span className="block text-[10px] font-bold text-purple-500 uppercase mb-0.5">Retirado por</span>
                  <span className="font-bold text-purple-900">{scannedOrder.delivery_recipient_name || 'Não informado'}</span>
                </div>
              </div>
              <button onClick={resetAttendance} className="w-full py-3.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl font-black text-xs sm:text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" /> ESCANEAR OUTRO QR-CODE
              </button>
            </div>
          )}

          {/* Scan Another QR button for active (non-delivered) orders */}
          {!isDelivered && (
            <button onClick={resetAttendance} className="w-full py-3 px-4 mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs sm:text-sm transition-all active:scale-[0.99] flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4" /> ESCANEAR OUTRO QR-CODE
            </button>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && scannedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="sticky top-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isProcessing}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
                  aria-label="Voltar para Central de Retirada"
                  type="button"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    FINANCEIRO
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Confirmar Pagamento — {scannedOrder.order_number}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={isProcessing}
                className="hidden sm:inline-flex w-10 h-10 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                aria-label="Fechar modal"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 text-center">Selecione a forma de recebimento presencial:</p>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedPaymentMethod === method.value;
                  return (
                    <button key={method.value} onClick={() => setSelectedPaymentMethod(method.value)} disabled={isProcessing} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                      <Icon className={`w-6 h-6 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">{method.label}</span>
                    </button>
                  );
                })}
              </div>
              {selectedPaymentMethod && (
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Resumo da Operação</p>
                  <p className="text-xl font-black text-slate-900">{formatCurrency(scannedOrder.total_amount_cents)}</p>
                  <p className="text-sm text-slate-600">via <strong>{PAYMENT_METHODS.find(m => m.value === selectedPaymentMethod)?.label}</strong></p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} disabled={isProcessing} className="flex-1 py-3 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50">Cancelar</button>
              <button onClick={async () => {
                if (!selectedPaymentMethod) return;
                setIsProcessing(true);
                try {
                  await db.confirmPayment(scannedOrder.id, user?.name || 'Admin', selectedPaymentMethod);
                  const refreshed = await db.getOrderByQrTokenAsync(scannedOrder.qr_token || '');
                  if (refreshed) setScannedOrder(refreshed);
                  setShowPaymentModal(false);
                } catch (err: unknown) {
                  alert(err instanceof Error ? err.message : 'Erro ao confirmar pagamento.');
                } finally {
                  setIsProcessing(false);
                }
              }} disabled={!selectedPaymentMethod || isProcessing} className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isProcessing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processando...</> : <><CheckCircle2 className="w-4 h-4" /> Confirmar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    {/* === TEMPORARY DIAGNOSTIC PANEL === */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-[10px] font-mono text-green-400 p-2 max-h-[30vh] overflow-auto z-[60] border-t-2 border-yellow-500">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-yellow-400">DIAGNÓSTICO QR (TEMP)</span>
          <button onClick={() => { setQrDebugSteps([]); try { sessionStorage.removeItem('seven_qr_debug'); } catch {} }} className="text-[9px] bg-red-800 text-white px-2 py-0.5 rounded">LIMPAR</button>
        </div>
        {qrDebugSteps.length === 0 && <span className="text-slate-500 italic">Nenhum evento registrado.</span>}
        {qrDebugSteps.map((s, i) => <div key={i} className="truncate">{s}</div>)}
      </div>
      {/* === END DIAGNOSTIC PANEL === */}
    </div>
  );
};