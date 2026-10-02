import React, { useState } from 'react';
import {
  Search,
  Eye,
  Download,
  Package,
  X,
} from 'lucide-react';
import { db } from '../../services/db';
import { Order, PaymentStatus, ProductionStatus, DeliveryStatus } from '../../types';
import { formatCurrency, formatDateTime, formatPhone } from '../../utils/formatters';
import { generateOrderPDF } from '../../utils/pdfGenerator';
import { useAuth } from '../../context/AuthContext';

export const AdminOrdersView: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [productionFilter, setProductionFilter] = useState<ProductionStatus | 'ALL'>('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryStatus | 'ALL'>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [, setRefreshTrigger] = useState(0);

  const orders = db.getOrders({
    search: searchTerm,
    payment_status: paymentFilter,
    production_status: productionFilter,
    delivery_status: deliveryFilter,
  });

  const handleConfirmPayment = async (orderId: string) => {
    const updated = await db.confirmPayment(orderId, user?.name || 'Administrador Seven', 'LOJA');
    setSelectedOrder(updated);
    setRefreshTrigger((p) => p + 1);
  };

  const handleUpdateProduction = (orderId: string, status: ProductionStatus) => {
    const updated = db.updateProductionStatus(orderId, status, user?.name || 'Administrador Seven');
    setSelectedOrder(updated);
    setRefreshTrigger((p) => p + 1);
  };

  const handleConfirmDelivery = (orderId: string) => {
    try {
      const updated = db.confirmDelivery(orderId, user?.name || 'Administrador Seven');
      setSelectedOrder(updated);
      setRefreshTrigger((p) => p + 1);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao confirmar entrega.');
    }
  };

  const handleDownloadPdf = (order: Order) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    generateOrderPDF(order, `${origin}/pedido/${order.qr_token}`);
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
              Total de {orders.length} pedidos encontrados
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

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="p-3">Pedido</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Itens / Alunos</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Pagamento</th>
                  <th className="p-3 text-center">Produção</th>
                  <th className="p-3 text-center">Entrega</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900 font-mono">
                      {o.order_number}
                    </td>
                    <td className="p-3 text-slate-500">
                      {formatDateTime(o.created_at)}
                    </td>
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900">{o.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{formatPhone(o.customer_whatsapp)}</div>
                    </td>
                    <td className="p-3 text-slate-700">
                      <span className="font-bold text-slate-900">{o.total_items} camisa(s)</span>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">
                        {o.items?.map((i) => `${i.student_name} (${i.class_name})`).join(', ')}
                      </div>
                    </td>
                    <td className="p-3 text-right font-black text-slate-900">
                      {formatCurrency(o.total_amount_cents)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          o.payment_status === 'PAGO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {o.payment_status === 'PAGO' ? 'PAGO' : 'NÃO PAGO'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-[11px] font-bold text-slate-700">
                        {o.production_status}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          o.delivery_status === 'ENTREGUE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {o.delivery_status === 'ENTREGUE' ? 'ENTREGUE' : 'AGUARDANDO'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                          title="Ver Detalhes do Pedido"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(o)}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                          title="Baixar Comprovante PDF"
                        >
                          <Download className="w-4 h-4" />
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
            Nenhum pedido corresponde aos critérios de pesquisa.
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                  Detalhes Administrativos
                </span>
                <h3 className="text-xl font-black text-slate-900 font-['Outfit']">
                  Pedido {selectedOrder.order_number}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Customer and Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Responsável</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">{selectedOrder.customer_name}</p>
                  <p className="text-slate-600">{formatPhone(selectedOrder.customer_whatsapp)}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Forma de Pagamento</span>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {selectedOrder.payment_method === 'PIX' ? 'PIX (Banco do Brasil)' : 'Pagar na Loja Física'}
                  </p>
                  <p className="text-slate-500">Data: {formatDateTime(selectedOrder.created_at)}</p>
                </div>
              </div>

              {/* Status Management Actions */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Ações Administrativas no Pedido
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Payment toggle */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      Status Financeiro:
                    </label>
                    {selectedOrder.payment_status === 'PAGO' ? (
                      <span className="inline-block px-3 py-1.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black">
                        ✓ PAGO
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConfirmPayment(selectedOrder.id)}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow transition-all active:scale-95"
                      >
                        Confirmar Pagamento
                      </button>
                    )}
                  </div>

                  {/* Production status */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      Status de Produção:
                    </label>
                    <select
                      value={selectedOrder.production_status}
                      onChange={(e) =>
                        handleUpdateProduction(selectedOrder.id, e.target.value as ProductionStatus)
                      }
                      className="w-full py-1.5 px-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs font-bold"
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="EM_PRODUCAO">EM PRODUÇÃO</option>
                      <option value="PRONTO">PRONTO</option>
                    </select>
                  </div>

                  {/* Delivery confirmation */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      Status de Entrega:
                    </label>
                    {selectedOrder.delivery_status === 'ENTREGUE' ? (
                      <span className="inline-block px-3 py-1.5 bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-black">
                        ✓ ENTREGUE
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConfirmDelivery(selectedOrder.id)}
                        className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-black rounded-xl shadow transition-all active:scale-95"
                      >
                        Confirmar Entrega
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Items Table */}
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

              {/* PDF Voucher Button */}
              <div className="pt-2">
                <button
                  onClick={() => handleDownloadPdf(selectedOrder)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Gerar / Baixar Comprovante Oficial (PDF)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
