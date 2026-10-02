import React, { useState } from 'react';
import {
  Search,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  MapPin,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Package,
  Calendar,
  Phone,
  User,
  Hash,
  ChevronLeft,
} from 'lucide-react';
import { db } from '../services/db';
import { Order, PublicOrderSearchResult, PublicOrderSearchResponse } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface OrderLookupViewProps {
  onNavigate: (view: string) => void;
}

type SearchMode = 'ORDER_NUMBER' | 'CUSTOMER_NAME' | 'CUSTOMER_WHATSAPP';

export const OrderLookupView: React.FC<OrderLookupViewProps> = ({ onNavigate }) => {
  // Mode selection: explicit tabs
  const [activeMode, setActiveMode] = useState<SearchMode>('ORDER_NUMBER');

  // Input states (each mode has its own isolated value)
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');

  // Pagination & Results states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search results collection response
  const [searchResponse, setSearchResponse] = useState<PublicOrderSearchResponse | null>(null);
  // Selected order detailed view
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const store = db.getStore();

  // Switch mode handler: resets inputs and results
  const handleModeChange = (mode: SearchMode) => {
    setActiveMode(mode);
    setOrderNumber('');
    setCustomerName('');
    setCustomerWhatsapp('');
    setSearchResponse(null);
    setSelectedOrder(null);
    setErrorMessage(null);
    setCurrentPage(1);
  };

  // Friendly telephone masking input handler
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);

    if (val.length > 6) {
      val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
    } else if (val.length > 2) {
      val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
    } else if (val.length > 0) {
      val = `(${val}`;
    }
    setCustomerWhatsapp(val);
  };

  const executeSearch = async (pageToFetch: number) => {
    setErrorMessage(null);
    setSelectedOrder(null);

    let cleanOrderNum: string | undefined;
    let cleanCustomer: string | undefined;
    let cleanPhone: string | undefined;

    if (activeMode === 'ORDER_NUMBER') {
      cleanOrderNum = orderNumber.trim();
      if (!cleanOrderNum) {
        setErrorMessage('Por favor, informe o Número do Pedido.');
        return;
      }
    } else if (activeMode === 'CUSTOMER_NAME') {
      cleanCustomer = customerName.trim();
      if (cleanCustomer.length < 3) {
        setErrorMessage('Por favor, informe pelo menos 3 caracteres do Nome do Responsável.');
        return;
      }
    } else if (activeMode === 'CUSTOMER_WHATSAPP') {
      cleanPhone = customerWhatsapp.replace(/\D/g, '');
      if (cleanPhone.length < 8) {
        setErrorMessage('Por favor, informe um WhatsApp válido com DDD.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await db.searchPublicOrdersAsync({
        order_number: cleanOrderNum,
        customer_name: cleanCustomer,
        customer_whatsapp: cleanPhone,
        page: pageToFetch,
        page_size: pageSize,
      });

      if (!response || response.items.length === 0) {
        setErrorMessage(
          'Não foi possível localizar pedidos com o critério informado. Confira os dados e tente novamente.'
        );
        setSearchResponse(null);
      } else {
        setSearchResponse(response);
        setCurrentPage(pageToFetch);
      }
    } catch {
      setErrorMessage(
        'Não foi possível localizar pedidos com o critério informado. Confira os dados e tente novamente.'
      );
      setSearchResponse(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSearch(1);
  };

  const handleSelectOrder = async (searchItem: PublicOrderSearchResult) => {
    setIsLoadingDetails(true);
    setErrorMessage(null);
    try {
      const fullOrder = await db.getPublicOrderDetailsAsync(searchItem.lookup_token);

      if (fullOrder) {
        setSelectedOrder(fullOrder);
      } else {
        setErrorMessage(
          'Não foi possível carregar os detalhes do pedido ou a sessão de consulta expirou. Realize uma nova busca.'
        );
      }
    } catch {
      setErrorMessage(
        'Não foi possível carregar os detalhes do pedido ou a sessão de consulta expirou. Realize uma nova busca.'
      );
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleReset = () => {
    setSearchResponse(null);
    setSelectedOrder(null);
    setOrderNumber('');
    setCustomerName('');
    setCustomerWhatsapp('');
    setErrorMessage(null);
    setCurrentPage(1);
  };

  // ── ESTADO 3: DETALHE DO PEDIDO (VIEW DETALHADA) ───────────────────────────
  if (selectedOrder) {
    const isPaid = selectedOrder.payment_status === 'PAGO';
    const isDelivered = selectedOrder.delivery_status === 'ENTREGUE';

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 space-y-6">
        {/* Barra de Navegação Superior */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {searchResponse && searchResponse.items.length > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs font-bold text-[var(--seven-text-primary)] bg-[var(--seven-surface-card)] hover:bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl shadow-xs transition-all self-start active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--seven-text-secondary)]" />
              <span>Voltar aos Resultados ({searchResponse.total_count} pedidos)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs font-bold text-[var(--seven-text-primary)] bg-[var(--seven-surface-card)] hover:bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl shadow-xs transition-all self-start active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[var(--seven-text-secondary)]" />
              <span>Nova Consulta</span>
            </button>
          )}

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleReset}
              className="min-h-[44px] inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white underline px-2 py-1 cursor-pointer"
            >
              Nova Pesquisa
            </button>
            <span className="text-xs font-medium text-white/60">
              Gerado em {formatDateTime(selectedOrder.created_at)}
            </span>
          </div>
        </div>

        {/* Hero Card do Pedido */}
        <div className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-6 sm:p-8 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-800 shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-3 py-1 rounded-full border border-teal-100 dark:border-teal-800 inline-block">
              Seven Malharia • Consulta Pública
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--seven-text-primary)] font-display pt-1">
              Pedido {selectedOrder.order_number}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--seven-text-secondary)] max-w-md mx-auto leading-relaxed">
              Responsável: <strong className="text-[var(--seven-text-primary)] font-bold">{selectedOrder.customer_name}</strong>
            </p>
          </div>

          {/* Grade de Indicadores de Status (4 colunas responsivas) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 text-left">
            {/* Status Pedido */}
            <div className="bg-[var(--seven-surface-input)] p-3 rounded-xl border border-[var(--seven-border-default)]">
              <span className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider block">Pedido</span>
              <p className="text-xs font-black text-[var(--seven-text-primary)] mt-0.5">
                {selectedOrder.order_status}
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
                  : selectedOrder.payment_method === 'PIX'
                  ? 'AGUARDANDO PIX'
                  : 'NÃO PAGO (LOJA)'}
              </p>
            </div>

            {/* Status Produção */}
            <div className="bg-[var(--seven-surface-input)] p-3 rounded-xl border border-[var(--seven-border-default)]">
              <span className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider block">Produção</span>
              <p className="text-xs font-black text-[var(--seven-text-primary)] mt-0.5">
                {selectedOrder.production_status === 'PENDENTE'
                  ? 'PENDENTE'
                  : selectedOrder.production_status === 'EM_PRODUCAO'
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

        {/* Card de Aviso sobre Retirada (Segurança do QR) */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-amber-900 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-sm text-amber-950">Aviso sobre Retirada de Uniformes:</p>
            <p className="text-amber-900/90 leading-relaxed">
              Para a retirada na loja física, apresente o <strong>QR Code oficial</strong> recebido na finalização do pedido ou enviado pelo WhatsApp.
            </p>
          </div>
        </div>

        {/* Card de Resumo dos Itens Encomendados */}
        <div className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--seven-border-default)] pb-3">
            <h3 className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider">
              Itens do Pedido ({selectedOrder.total_items})
            </h3>
            {selectedOrder.campaign && (
              <span className="text-xs font-semibold text-[var(--seven-text-secondary)]">
                {selectedOrder.campaign.name}
              </span>
            )}
          </div>

          <div className="divide-y divide-[var(--seven-border-default)]">
            {(selectedOrder.items || []).map((item, idx) => (
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

          {/* Rodapé do Detalhe Financeiro */}
          <div className="bg-[var(--seven-surface-input)] p-4 rounded-xl border border-[var(--seven-border-default)] space-y-2 text-xs text-[var(--seven-text-secondary)]">
            <div className="flex justify-between">
              <span>Responsável:</span>
              <strong className="text-[var(--seven-text-primary)] font-bold">{selectedOrder.customer_name}</strong>
            </div>
            <div className="flex justify-between">
              <span>WhatsApp:</span>
              <strong className="text-[var(--seven-text-primary)] font-mono font-bold">{selectedOrder.customer_whatsapp}</strong>
            </div>
            <div className="flex justify-between">
              <span>Forma de Pagamento:</span>
              <strong className="text-[var(--seven-text-primary)] font-bold">
                {selectedOrder.payment_method === 'PIX' ? 'PIX (Banco do Brasil)' : 'Pagar na Loja Física'}
              </strong>
            </div>
            <div className="flex justify-between items-baseline text-sm font-black text-[var(--seven-text-primary)] pt-2.5 border-t border-[var(--seven-border-default)]">
              <span className="uppercase tracking-wider">Total do Pedido:</span>
              <span className="text-teal-700 dark:text-teal-400 font-display text-lg sm:text-xl">
                {formatCurrency(selectedOrder.total_amount_cents)}
              </span>
            </div>
          </div>
        </div>

        {/* Local de Retirada na Loja Física */}
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
  }

  // ── ESTADO 2: LISTA DE RESULTADOS DA PESQUISA ──────────────────────────────
  if (searchResponse && searchResponse.items.length > 0) {
    const totalPages = Math.ceil(searchResponse.total_count / pageSize);

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 space-y-6">
        {/* Cabeçalho da Lista */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-xs font-bold text-[var(--seven-text-primary)] bg-[var(--seven-surface-card)] hover:bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl shadow-xs transition-all self-start active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[var(--seven-text-secondary)]" />
            <span>Nova Consulta</span>
          </button>

          <span className="text-xs font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-3 py-1.5 rounded-xl border border-teal-100 dark:border-teal-800">
            {searchResponse.total_count} {searchResponse.total_count === 1 ? 'pedido encontrado' : 'pedidos encontrados'}
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--seven-text-primary)] font-display">
            Resultados da Pesquisa
          </h1>
          <p className="text-xs sm:text-sm text-[var(--seven-text-secondary)]">
            Selecione o pedido abaixo para visualizar os detalhes completos, status e composição.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-red-800 dark:text-red-400">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Lista de Pedidos */}
        <div className="space-y-3.5">
          {searchResponse.items.map((item) => {
            const isPaid = item.payment_status === 'PAGO';
            const isDelivered = item.delivery_status === 'ENTREGUE';

            return (
              <div
                key={item.order_number + item.lookup_token}
                className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-4 sm:p-5 shadow-xs hover:border-[var(--seven-border-focus)] hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                onClick={() => handleSelectOrder(item)}
              >
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs sm:text-sm font-black text-[var(--seven-text-primary)] bg-[var(--seven-surface-input)] px-2.5 py-1 rounded-lg border border-[var(--seven-border-default)] break-all">
                      {item.order_number}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[var(--seven-text-primary)] truncate">
                      {item.customer_name}
                    </span>
                    <span className="text-xs text-[var(--seven-text-secondary)] font-mono">
                      {item.customer_whatsapp_masked}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--seven-text-secondary)] flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--seven-text-tertiary)] shrink-0" />
                      <span>{formatDateTime(item.created_at)}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[var(--seven-text-tertiary)] shrink-0" />
                      <span>{item.total_items} {item.total_items === 1 ? 'item' : 'itens'}</span>
                    </span>
                    <span className="font-black text-[var(--seven-text-primary)]">
                      {formatCurrency(item.total_amount_cents)}
                    </span>
                  </div>

                  {/* Badges de Status */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {isPaid ? 'PAGO' : 'NÃO PAGO'}
                    </span>

                    <span className="text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full border border-gray-200">
                      {item.production_status === 'PRONTO'
                        ? 'PRONTO'
                        : item.production_status === 'EM_PRODUCAO'
                        ? 'EM PRODUÇÃO'
                        : 'PROD. PENDENTE'}
                    </span>

                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        isDelivered
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {isDelivered ? 'ENTREGUE' : 'AGUARDANDO RETIRADA'}
                    </span>
                  </div>
                </div>

                {/* Botão Ver Detalhes */}
                <button
                  type="button"
                  onClick={() => handleSelectOrder(item)}
                  disabled={isLoadingDetails}
                  className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all shrink-0 active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {isLoadingDetails ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Ver Detalhes</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Barra de Paginação */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--seven-border-default)]">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start order-2 sm:order-1">
              <button
                type="button"
                onClick={() => executeSearch(currentPage - 1)}
                disabled={currentPage <= 1 || isSubmitting}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[var(--seven-text-primary)] bg-[var(--seven-surface-card)] hover:bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-1 sm:flex-initial cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={() => executeSearch(currentPage + 1)}
                disabled={!searchResponse.has_more || isSubmitting}
                className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[var(--seven-text-primary)] bg-[var(--seven-surface-card)] hover:bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-1 sm:flex-initial cursor-pointer"
              >
                <span>Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs font-medium text-[var(--seven-text-secondary)] order-1 sm:order-2 text-center">
              Página {currentPage} de {totalPages} ({searchResponse.total_count} pedidos)
            </span>
          </div>
        )}
      </div>
    );
  }

  // ── ESTADO 1: FORMULÁRIO DE CONSULTA (DEFAULT) ─────────────────────────────
  const isInputFilled =
    (activeMode === 'ORDER_NUMBER' && orderNumber.trim().length > 0) ||
    (activeMode === 'CUSTOMER_NAME' && customerName.trim().length >= 3) ||
    (activeMode === 'CUSTOMER_WHATSAPP' && customerWhatsapp.replace(/\D/g, '').length >= 8);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 space-y-6">
      {/* Barra de Navegação Superior */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-xs font-bold text-[var(--seven-text-primary)] bg-[var(--seven-surface-card)] hover:bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--seven-text-secondary)]" />
          <span>Voltar ao Catálogo</span>
        </button>

        <span className="text-xs font-medium text-white/80">
          Consulta Pública de Pedidos
        </span>
      </div>

      {/* Card Principal de Pesquisa */}
      <div className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto border border-teal-100 dark:border-teal-800 shadow-xs">
            <Search className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--seven-text-primary)] font-display">
            Consultar Pedido
          </h1>
          <p className="text-xs sm:text-sm text-[var(--seven-text-secondary)] max-w-sm mx-auto leading-relaxed">
            Escolha uma modalidade de pesquisa para localizar seus pedidos na Seven Malharia.
          </p>
        </div>

        {/* Abas Selecionadoras de Modo de Pesquisa (Mobile-First) */}
        <div className="grid grid-cols-3 gap-1 bg-[var(--seven-surface-input)] p-1 rounded-xl border border-[var(--seven-border-default)]">
          <button
            type="button"
            onClick={() => handleModeChange('ORDER_NUMBER')}
            className={`min-h-[44px] py-2 px-1 sm:px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeMode === 'ORDER_NUMBER'
                ? 'bg-[var(--seven-surface-card)] text-[var(--seven-text-primary)] shadow-xs border border-[var(--seven-border-default)]'
                : 'text-[var(--seven-text-secondary)] hover:text-[var(--seven-text-primary)]'
            }`}
          >
            <Hash className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Nº Pedido</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('CUSTOMER_NAME')}
            className={`min-h-[44px] py-2 px-1 sm:px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeMode === 'CUSTOMER_NAME'
                ? 'bg-[var(--seven-surface-card)] text-[var(--seven-text-primary)] shadow-xs border border-[var(--seven-border-default)]'
                : 'text-[var(--seven-text-secondary)] hover:text-[var(--seven-text-primary)]'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Responsável</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('CUSTOMER_WHATSAPP')}
            className={`min-h-[44px] py-2 px-1 sm:px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
              activeMode === 'CUSTOMER_WHATSAPP'
                ? 'bg-[var(--seven-surface-card)] text-[var(--seven-text-primary)] shadow-xs border border-[var(--seven-border-default)]'
                : 'text-[var(--seven-text-secondary)] hover:text-[var(--seven-text-primary)]'
            }`}
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">WhatsApp</span>
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-xs sm:text-sm text-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSearchSubmit} className="space-y-4">
          {/* Modo 1: Número do Pedido */}
          {activeMode === 'ORDER_NUMBER' && (
            <div className="space-y-1.5">
              <label htmlFor="lookup-order-number" className="flex items-center gap-1.5 text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider">
                <Hash className="w-3.5 h-3.5 text-[var(--seven-text-tertiary)]" />
                <span>Número do Pedido</span>
              </label>
              <input
                id="lookup-order-number"
                type="text"
                autoFocus
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ex: SEV-2026-0030"
                className="w-full min-h-[48px] px-4 py-3 bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl text-sm font-bold text-[var(--seven-text-primary)] placeholder:text-[var(--seven-text-tertiary)] placeholder:font-normal uppercase focus:bg-[var(--seven-surface-card)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-mono"
              />
              <p className="text-xs text-[var(--seven-text-secondary)]">
                Informe o código completo do pedido gerado no momento da compra.
              </p>
            </div>
          )}

          {/* Modo 2: Nome do Responsável */}
          {activeMode === 'CUSTOMER_NAME' && (
            <div className="space-y-1.5">
              <label htmlFor="lookup-customer-name" className="flex items-center gap-1.5 text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-[var(--seven-text-tertiary)]" />
                <span>Nome do Responsável</span>
              </label>
              <input
                id="lookup-customer-name"
                type="text"
                autoFocus
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex: Mariana Souza"
                className="w-full min-h-[48px] px-4 py-3 bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl text-sm font-semibold text-[var(--seven-text-primary)] placeholder:text-[var(--seven-text-tertiary)] placeholder:font-normal focus:bg-[var(--seven-surface-card)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
              <p className="text-xs text-[var(--seven-text-secondary)]">
                Informe pelo menos 3 caracteres do nome informado no cadastro.
              </p>
            </div>
          )}

          {/* Modo 3: WhatsApp do Responsável */}
          {activeMode === 'CUSTOMER_WHATSAPP' && (
            <div className="space-y-1.5">
              <label htmlFor="lookup-customer-whatsapp" className="flex items-center gap-1.5 text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider">
                <Phone className="w-3.5 h-3.5 text-[var(--seven-text-tertiary)]" />
                <span>WhatsApp do Responsável</span>
              </label>
              <input
                id="lookup-customer-whatsapp"
                type="tel"
                autoFocus
                value={customerWhatsapp}
                onChange={handlePhoneChange}
                placeholder="Ex: (96) 99999-9999"
                className="w-full min-h-[48px] px-4 py-3 bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl text-sm font-bold text-[var(--seven-text-primary)] placeholder:text-[var(--seven-text-tertiary)] placeholder:font-normal focus:bg-[var(--seven-surface-card)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all font-mono"
              />
              <p className="text-xs text-[var(--seven-text-secondary)]">
                Informe o número com DDD utilizado no pedido.
              </p>
            </div>
          )}

          {/* Botão Consultar */}
          <button
            type="submit"
            disabled={isSubmitting || !isInputFilled}
            className="w-full min-h-[50px] mt-4 py-3.5 px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Pesquisando Pedidos...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Consultar Pedido</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

