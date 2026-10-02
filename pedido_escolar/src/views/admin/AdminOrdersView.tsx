import React, { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  Download,
  Package,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { db } from '../../services/db';
import { Order, PaymentStatus, ProductionStatus, DeliveryStatus, InStorePaymentMethod } from '../../types';
import { formatCurrency, formatDateTime, formatPhone } from '../../utils/formatters';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import { generateBatchLabelsHTML, printLabels } from '../../utils/labelGenerator';
import { useAuth } from '../../context/AuthContext';

const PAYMENT_METHODS: { value: InStorePaymentMethod; label: string }[] = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DEBITO', label: 'DÉBITO' },
  { value: 'CREDITO', label: 'CRÉDITO' },
  { value: 'DINHEIRO', label: 'DINHEIRO' },
];

export const AdminOrdersView: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'ALL'>('NAO_PAGO');
  const [productionFilter, setProductionFilter] = useState<ProductionStatus | 'ALL'>('PENDENTE');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryStatus | 'ALL'>('ALL');

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state for batch printing
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Print Modal State
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState<'a4' | 'thermal'>('a4');
  const [startPosition, setStartPosition] = useState(1);
  const [printTarget, setPrintTarget] = useState<'selected' | 'all' | 'single' | null>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<InStorePaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load orders from Supabase asynchronously
  useEffect(() => {
    let mounted = true;
    const loadOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const allOrders = await db.getOrdersAsync({});
        if (mounted) {
          setOrders(allOrders);
        }
      } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar pedidos do banco de dados.');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    loadOrders();
    return () => {
      mounted = false;
    };
  }, []);

  // Client-side filtering based on current state
  const filteredOrders = orders.filter((o) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase().trim();
      const matchesNumber = o.order_number.toLowerCase().includes(q);
      const matchesCustomer = o.customer_name.toLowerCase().includes(q);
      const matchesPhone = o.customer_whatsapp.includes(q);
      const matchesStudents = o.items?.some((i) => i.student_name.toLowerCase().includes(q));
      if (!matchesNumber && !matchesCustomer && !matchesPhone && !matchesStudents) {
        return false;
      }
    }
    if (paymentFilter !== 'ALL' && o.payment_status !== paymentFilter) return false;
    if (productionFilter !== 'ALL' && o.production_status !== productionFilter) return false;
    if (deliveryFilter !== 'ALL' && o.delivery_status !== deliveryFilter) return false;
    return true;
  });

  // Selection Handlers
  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const toggleSelectOrder = (id: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedOrderIds(newSet);
  };

  // Print Handlers
  const openPrintModal = (target: 'selected' | 'all') => {
    setPrintTarget(target);
    setPrintMode('a4');
    setStartPosition(1);
    setShowPrintModal(true);
  };

  const handleExecutePrint = async () => {
    if (!printTarget) return;

    const ordersToPrint = printTarget === 'selected'
      ? orders.filter(o => selectedOrderIds.has(o.id))
      : filteredOrders;

    if (ordersToPrint.length === 0) {
      alert('Nenhum pedido encontrado para impressão.');
      return;
    }

    try {
      const html = await generateBatchLabelsHTML(ordersToPrint, printMode, startPosition);
      printLabels(html);
      setShowPrintModal(false);
    } catch (e) {
      console.error('Erro ao gerar etiquetas:', e);
      alert('Não foi possível gerar as etiquetas.');
    }
  };

  const handleOpenPaymentModal = (order: Order) => {
    setSelectedOrder(order);
    setSelectedPaymentMethod(null);
    setShowPaymentModal(true);
  };

  const handleExecutePayment = async () => {
    if (!selectedOrder || !selectedPaymentMethod) return;
    setIsProcessing(true);
    try {
      await db.confirmPayment(
        selectedOrder.id,
        user?.name || 'Administrador Seven',
        selectedPaymentMethod
      );
      const allOrders = await db.getOrdersAsync({});
      setOrders(allOrders);
      setShowPaymentModal(false);
      setSelectedOrder(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao confirmar pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateProduction = async (orderId: string, status: ProductionStatus) => {
    if (!selectedOrder || isProcessing) return;
    const previousStatus = selectedOrder.production_status;
    setIsProcessing(true);
    try {
      await db.updateProductionStatusAsync(orderId, status);
      setSelectedOrder((prev) => prev ? { ...prev, production_status: status } : prev);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, production_status: status } : o));
    } catch (err: unknown) {
      setSelectedOrder((prev) => prev ? { ...prev, production_status: previousStatus } : prev);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, production_status: previousStatus } : o));
      alert(err instanceof Error ? err.message : 'Erro ao atualizar produção.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDelivery = async (orderId: string) => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    try {
      await db.confirmDeliveryAsync(
        orderId,
        user?.name || 'Administrador Seven',
        selectedOrder.customer_name,
        'Retirado via Gestão de Pedidos'
      );
      const allOrders = await db.getOrdersAsync({});
      setOrders(allOrders);
      setSelectedOrder(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao confirmar entrega.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = (order: Order) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    generateOrderPDF(order, `${origin}/pedido/${order.qr_token}`);
  };

  const handlePrintSingleLabel = (order: Order) => {
    setSelectedOrder(order);
    setPrintTarget('single');
    setPrintMode('thermal'); // Default to thermal for single
    setStartPosition(1);
    setShowPrintModal(true);
  };

  // Calculate estimated pages for A4
  const getEstimatedPages = () => {
    const count = printTarget === 'selected'
      ? Array.from(selectedOrderIds).length
      : filteredOrders.length;

    if (printMode === 'thermal') return count;

    const remainingSlots = 15 - startPosition; // 14 slots total, 1-based
    const firstPageCount = Math.min(count, Math.max(0, 14 - (startPosition - 1)));
    const remainingCount = count - firstPageCount;
    const extraPages = remainingCount > 0 ? Math.ceil(remainingCount / 14) : 0;
    return (firstPageCount > 0 ? 1 : 0) + extraPages;
  };

  return (
    <div className="space-y-6">
      {/* Header with Search & Filters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] flex items-center gap-2">
              <Package className="w-6 h-6 text-sky-600" />
              Gestão de Pedidos
            </h1>
            <p className="text-xs text-slate-500">
              {isLoading ? 'Carregando...' : `Total de ${filteredOrders.length} pedidos encontrados`}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por número do pedido, responsável, aluno ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Filter Dropdowns Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Pagamento</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
            >
              <option value="ALL">Todos os Pagamentos</option>
              <option value="PAGO">Pago</option>
              <option value="NAO_PAGO">Não Pago</option>
              <option value="AGUARDANDO_PIX">Aguardando PIX</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Produção</label>
            <select
              value={productionFilter}
              onChange={(e) => setProductionFilter(e.target.value as any)}
              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
            >
              <option value="ALL">Todos os Status de Produção</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EM_PRODUCAO">Em Produção</option>
              <option value="PRONTO">Pronto</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-slate-500">Entrega</label>
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value as any)}
              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
            >
              <option value="ALL">Todos os Status de Entrega</option>
              <option value="AGUARDANDO_RETIRADA">Aguardando Retirada</option>
              <option value="ENTREGUE">Entregue</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Action Bar */}
      {!isLoading && filteredOrders.length > 0 && (
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-600">
            {selectedOrderIds.size} de {filteredOrders.length} selecionados
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openPrintModal('selected')}
              disabled={selectedOrderIds.size === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR SELECIONADAS
            </button>
            <button
              onClick={() => openPrintModal('all')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" /> IMPRIMIR TODAS
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Orders Table - Compact Operational View */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-sky-600" />
            <p className="text-xs font-bold">Carregando pedidos...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="overflow-x-hidden">
            <table className="w-full table-fixed text-left text-[11px] border-collapse whitespace-nowrap">
              <colgroup>
                <col className="w-[3%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[17%]" />
                <col className="w-[22%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[13%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="px-1.5 py-2">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-500 text-sky-600 focus:ring-sky-500 bg-slate-800"
                    />
                  </th>
                  <th className="px-1.5 py-2">Pedido</th>
                  <th className="px-1.5 py-2">Data</th>
                  <th className="px-1.5 py-2">Responsável</th>
                  <th className="px-1.5 py-2">Itens / Alunos</th>
                  <th className="px-1.5 py-2 text-right">Total</th>
                  <th className="px-1.5 py-2 text-center">Pagamento</th>
                  <th className="px-1.5 py-2 text-center">Produção</th>
                  <th className="px-1.5 py-2 text-center">Entrega</th>
                  <th className="px-1.5 py-2 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors h-9">
                    <td className="px-1 py-1">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(o.id)}
                        onChange={() => toggleSelectOrder(o.id)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </td>
                    <td className="px-1.5 py-1 font-bold text-slate-900 font-mono text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
                      {o.order_number}
                    </td>
                    <td className="px-1.5 py-1 text-slate-500 font-mono text-[10px] whitespace-nowrap overflow-hidden text-ellipsis">
                      {formatDateTime(o.created_at).split(' ')[0]} <span className="text-slate-400">{formatDateTime(o.created_at).split(' ')[1]}</span>
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap overflow-hidden text-ellipsis">
                      <span className="font-extrabold text-slate-900">{o.customer_name}</span>
                      <span className="text-slate-400 mx-1">•</span>
                      <span className="text-slate-500">{formatPhone(o.customer_whatsapp)}</span>
                    </td>
                    <td className="px-1.5 py-1 text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis">
                      <span className="font-bold text-slate-900 mr-1">{o.total_items}x</span>
                      <span className="text-slate-500">
                        {o.items?.map((i) => i.student_name).join(', ')}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 text-right font-black text-slate-900 whitespace-nowrap overflow-hidden text-ellipsis">
                      {formatCurrency(o.total_amount_cents)}
                    </td>
                    <td className="px-1 py-1 text-center">
                      <span
                        className={`inline-flex items-center px-1 py-0.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${
                          o.payment_status === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {o.payment_status === 'PAGO' ? 'PAGO' : 'NÃO PAGO'}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-center">
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded whitespace-nowrap">
                        {o.production_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-center">
                      <span
                        className={`inline-flex items-center px-1 py-0.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap ${
                          o.delivery_status === 'ENTREGUE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {o.delivery_status === 'ENTREGUE' ? 'ENTREGUE' : 'AGUARDANDO'}
                      </span>
                    </td>
                    <td className="px-1 py-1 text-center">
                      <div className="flex flex-nowrap items-center justify-center gap-0.5">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handlePrintSingleLabel(o)}
                          className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                          title="Etiqueta"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(o)}
                          className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          title="PDF"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 text-xs">
            {error ? 'Erro ao carregar dados.' : 'Nenhum pedido corresponde aos critérios de pesquisa.'}
          </div>
        )}
      </div>

      {/* Order Details Modal (Ficha Operacional) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header - Sticky with Back Button */}
            <div className="sticky top-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
                  aria-label="Voltar para Gestão de Pedidos"
                  type="button"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                    FICHA OPERACIONAL
                  </span>
                  <h3 className="text-base sm:text-xl font-black text-slate-900 font-['Outfit'] leading-tight">
                    {selectedOrder.order_number}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="hidden sm:inline-flex w-10 h-10 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                aria-label="Fechar ficha"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Identification Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Responsável</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedOrder.customer_name}</p>
                  <p className="text-slate-600">{formatPhone(selectedOrder.customer_whatsapp)}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Data / Hora</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">{formatDateTime(selectedOrder.created_at)}</p>
                  <p className="text-slate-500">Método: {selectedOrder.payment_method === 'PIX' ? 'PIX' : 'Loja Física'}</p>
                </div>
              </div>
              {/* Items Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Itens do Pedido ({selectedOrder.total_items} camisas)
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {(selectedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="p-3 text-xs flex justify-between gap-4">
                      <div>
                        <p className="font-extrabold text-slate-900">
                          {item.student_name} - <span className="text-sky-700">{item.class_name}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Tamanho: <strong>{item.size_label}</strong> (Qtd: {item.quantity}) • {formatCurrency(item.unit_price_cents)}/unid.
                        </p>
                        {item.personalizations && item.personalizations.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {item.personalizations.map((p) => (
                              <p key={p.piece_index} className="text-[11px] text-sky-800">
                                ↳ Peça {p.piece_index}: {p.custom_name || p.custom_number ? `${p.custom_name || ''} ${p.custom_number ? `(${p.custom_number})` : ''}` : 'Sem personalização'}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="font-black text-slate-900">{formatCurrency(item.subtotal_cents)}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Operational Actions */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Ações Administrativas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Payment toggle */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Financeiro:</label>
                    {selectedOrder.payment_status === 'PAGO' ? (
                      <span className="inline-block px-3 py-1.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black">
                        ✓ PAGO
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenPaymentModal(selectedOrder)}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow transition-all active:scale-95"
                      >
                        Confirmar Pagamento
                      </button>
                    )}
                  </div>
                  {/* Production status */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Produção:</label>
                    <select
                      value={selectedOrder.production_status}
                      onChange={(e) => handleUpdateProduction(selectedOrder.id, e.target.value as ProductionStatus)}
                      disabled={isProcessing}
                      className={`w-full py-1.5 px-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="EM_PRODUCAO">EM PRODUÇÃO</option>
                      <option value="PRONTO">PRONTO</option>
                    </select>
                  </div>
                  {/* Delivery confirmation */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">Entrega:</label>
                    {selectedOrder.delivery_status === 'ENTREGUE' ? (
                      <span className="inline-block px-3 py-1.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black">
                        ✓ ENTREGUE
                      </span>
                    ) : selectedOrder.payment_status !== 'PAGO' ? (
                      <div className="p-2 bg-red-900/50 border border-red-700 rounded-xl text-[10px] text-red-200 font-bold text-center">
                        BLOQUEADO: PAGAMENTO PENDENTE
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConfirmDelivery(selectedOrder.id)}
                        disabled={isProcessing}
                        className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow transition-all active:scale-95"
                      >
                        Confirmar Entrega
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Footer Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => handlePrintSingleLabel(selectedOrder)}
                  className="flex-1 py-3 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Etiqueta (Sacola)
                </button>
                <button
                  onClick={() => handleDownloadPdf(selectedOrder)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Comprovante PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Configuration Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="sticky top-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
                  aria-label="Voltar para Gestão de Pedidos"
                  type="button"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                    IMPRESSÃO EM LOTE
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Configurar Etiquetas
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="hidden sm:inline-flex w-10 h-10 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                aria-label="Fechar modal"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-3xl font-black text-sky-600">
                  {printTarget === 'selected' ? selectedOrderIds.size : printTarget === 'all' ? filteredOrders.length : 1}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Etiquetas a imprimir</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase">Formato</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPrintMode('a4')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      printMode === 'a4' ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">A4 Adesivo</span>
                    <span className="text-[10px] opacity-70">14 etiq/folha (99x38mm)</span>
                  </button>
                  <button
                    onClick={() => setPrintMode('thermal')}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      printMode === 'thermal' ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">Térmica</span>
                    <span className="text-[10px] opacity-70">100x70mm</span>
                  </button>
                </div>
              </div>

              {printMode === 'a4' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase">Posição Inicial na Folha</label>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const pos = i + 1;
                      const isSelected = pos === startPosition;
                      return (
                        <button
                          key={pos}
                          onClick={() => setStartPosition(pos)}
                          className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                            isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {pos.toString().padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-500 text-center">
                    Use para reaproveitar folhas parcialmente utilizadas.
                  </p>
                </div>
              )}

              {printMode === 'a4' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-600">
                    Folhas estimadas: <strong className="text-slate-900">{getEstimatedPages()}</strong>
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-3 px-4 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecutePrint}
                className="flex-1 py-3 px-4 bg-sky-600 text-white rounded-xl font-bold text-sm hover:bg-sky-500 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Visualizar / Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="sticky top-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isProcessing}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
                  aria-label="Voltar para Ficha Operacional"
                  type="button"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                    FINANCEIRO
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Confirmar Pagamento — {selectedOrder.order_number}
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
              <p className="text-xs text-slate-500 text-center">
                Selecione a forma de recebimento presencial:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    disabled={isProcessing}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
                      selectedPaymentMethod === method.value
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">{method.label}</span>
                  </button>
                ))}
              </div>
              {selectedPaymentMethod && (
                <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Resumo da Operação</p>
                  <p className="text-xl font-black text-slate-900">
                    {formatCurrency(selectedOrder.total_amount_cents)}
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