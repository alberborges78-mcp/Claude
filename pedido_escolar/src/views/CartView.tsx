import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  ArrowLeft,
  CheckCircle,
  QrCode,
  Store as StoreIcon,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { db } from '../services/db';
import { PaymentMethod } from '../types';
import {
  formatCurrency,
  maskPhoneInput,
  normalizePhoneE164,
  validateBrazilianPhone,
} from '../utils/formatters';

interface CartViewProps {
  onNavigate: (view: string, orderToken?: string) => void;
}

export const CartView: React.FC<CartViewProps> = ({ onNavigate }) => {
  const { items, removeItem, updateItemQuantity, clearCart, totalPieces, totalAmountCents } =
    useCart();
  const campaign = db.getActiveCampaign() || db.getCampaigns()[0];

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskPhoneInput(e.target.value);
    setCustomerPhone(masked);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (items.length === 0) {
      setErrorMsg('Seu carrinho está vazio.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Por favor, preencha o nome do responsável.');
      return;
    }

    if (!validateBrazilianPhone(customerPhone)) {
      setErrorMsg('Por favor, informe um número de WhatsApp brasileiro válido com DDD (Ex: 96 99160-5151).');
      return;
    }

    if (!campaign) {
      setErrorMsg('Campanha não configurada.');
      return;
    }

    setIsSubmitting(true);

    try {
      const e164Phone = normalizePhoneE164(customerPhone);

      const newOrder = await db.createOrder({
        campaign_id: campaign.id,
        customer_name: customerName.trim(),
        customer_whatsapp: e164Phone,
        payment_method: paymentMethod,
        items: items.map((item) => ({
          class_id: item.class_id,
          student_name: item.student_name,
          size_label: item.size_label,
          quantity: item.quantity,
          personalizations: item.personalizations,
        })),
      });

      clearCart();
      onNavigate('confirmation', newOrder.qr_token);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao criar pedido. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 shadow-sm">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-blue-600">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 font-display">
            Seu Carrinho está Vazio
          </h2>
          <p className="text-sm text-gray-500 mt-2.5 max-w-md mx-auto leading-relaxed">
            Você ainda não selecionou nenhuma camisa. Navegue pelas turmas da escola e faça o pedido dos uniformes dos seus alunos.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="mt-8 inline-flex items-center justify-center gap-2 min-h-[48px] px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Ver Turmas e Camisas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24">
      {/* ── Cabeçalho do Carrinho ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        {/* Desktop Back Button */}
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          className="hidden sm:inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 text-xs font-bold text-[var(--seven-text-primary)] hover:text-[var(--seven-brand-primary)] bg-[var(--seven-surface-card)] hover:bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl shadow-xs transition-all self-start active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-[var(--seven-text-secondary)]" />
          <span>Continuar Escolhendo</span>
        </button>

        <div className="text-left sm:text-right">
          <h1 className="text-xl sm:text-2xl font-black text-white/95 font-display tracking-tight">
            Finalizar Pedido
          </h1>
          <p className="text-xs font-medium text-white/80 mt-0.5">
            {totalPieces} {totalPieces === 1 ? 'peça selecionada' : 'peças selecionadas'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── Coluna Esquerda: Lista de Itens do Pedido ────────────────────── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Cabeçalho da Lista e Ação de Esvaziar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b sm:border-b-0 border-teal-700/50 sm:pb-0 mb-2 sm:mb-0">
            <h2 className="text-xs font-bold text-white/95 uppercase tracking-wider flex items-center gap-2 shrink-0">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>Itens do Pedido ({items.length})</span>
            </h2>

            {isConfirmingClear ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-50 p-3 rounded-xl border border-red-100 animate-in fade-in duration-200 w-full sm:w-auto">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-red-800 leading-tight">Esvaziar carrinho?</span>
                  <span className="text-xs text-red-600 leading-tight mt-0.5">Todos os itens serão removidos.</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClear(false)}
                    className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearCart();
                      setIsConfirmingClear(false);
                    }}
                    className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Esvaziar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                <span className="text-xs font-medium text-white/80 shrink-0">
                  Total: <strong className="text-white">{totalPieces}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsConfirmingClear(true)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 border border-red-600/50 px-3 py-2 rounded-xl transition-colors min-h-[44px] active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-300 shrink-0 shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Esvaziar carrinho
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3.5">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-[var(--seven-surface-card)] rounded-2xl border border-[var(--seven-border-default)] p-4 sm:p-5 shadow-xs space-y-4 transition-all hover:border-[var(--seven-border-focus)]"
              >
                {/* Cabeçalho do Card: Turma, Aluno, Tamanho e Remoção */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-400">
                      {item.class_name}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-[var(--seven-text-primary)] leading-tight">
                      Aluno: {item.student_name}
                    </h3>
                    <p className="text-xs text-[var(--seven-text-secondary)]">
                      Tamanho: <strong className="text-[var(--seven-text-primary)] font-bold">{item.size_label}</strong> • Unitário:{' '}
                      <span className="font-semibold text-[var(--seven-text-secondary)]">{formatCurrency(item.unit_price_cents)}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors shrink-0"
                    title="Remover item"
                    aria-label="Remover item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Lista de Personalizações */}
                {item.personalizations && item.personalizations.length > 0 && (
                  <div className="bg-[var(--seven-surface-input)] rounded-xl p-3 border border-[var(--seven-border-default)] text-xs space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--seven-text-secondary)] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Estampa Personalizada (Grátis):</span>
                    </p>
                    <div className="space-y-1 pl-1">
                      {item.personalizations.map((p) => {
                        const hasCustom = p.custom_name || p.custom_number;
                        return (
                          <div key={p.piece_index} className="text-gray-700 font-medium leading-relaxed">
                            {item.quantity > 1 && (
                              <span className="text-gray-500 font-normal">Peça #{p.piece_index}: </span>
                            )}
                            {hasCustom ? (
                              <strong className="font-bold text-blue-950">
                                {[p.custom_name, p.custom_number ? `Nº ${p.custom_number}` : ''].filter(Boolean).join(' • ')}
                              </strong>
                            ) : (
                              <span className="text-gray-400 italic">Sem personalização</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Barra de Quantidade e Subtotal */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--seven-border-default)]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[var(--seven-text-secondary)]">Qtd:</span>
                    <div className="flex items-center border border-[var(--seven-border-default)] rounded-xl bg-[var(--seven-surface-input)] p-0.5">
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-[var(--seven-surface-card)] shadow-xs flex items-center justify-center font-bold text-[var(--seven-text-primary)] text-base hover:bg-[var(--seven-surface-input)] active:scale-95 transition-all"
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span className="w-9 text-center font-black text-sm text-[var(--seven-text-primary)]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg bg-[var(--seven-surface-card)] shadow-xs flex items-center justify-center font-bold text-[var(--seven-text-primary)] text-base hover:bg-[var(--seven-surface-input)] active:scale-95 transition-all"
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[var(--seven-text-secondary)] block">Subtotal</span>
                    <span className="text-base sm:text-lg font-black text-[var(--seven-text-primary)] font-display">
                      {formatCurrency(item.subtotal_cents)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Coluna Direita: Formulário do Responsável & Checkout ──────────── */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[var(--seven-surface-card)] rounded-3xl border border-[var(--seven-border-default)] p-5 sm:p-7 shadow-sm space-y-6 lg:sticky lg:top-24">
            <div className="border-b border-[var(--seven-border-default)] pb-3">
              <h2 className="text-base sm:text-lg font-black text-[var(--seven-text-primary)] font-display">
                Dados do Responsável
              </h2>
              <p className="text-xs text-[var(--seven-text-secondary)] mt-0.5">
                Informe seus dados para contato e retirada do uniforme.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCheckout} className="space-y-5">
              {/* Nome do Responsável */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider block">
                  Nome do Responsável *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo de quem retira"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full min-h-[48px] px-4 py-3 bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl text-sm font-medium text-[var(--seven-text-primary)] placeholder:text-[var(--seven-text-tertiary)] focus:bg-[var(--seven-surface-card)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
              </div>

              {/* WhatsApp Brasileiro */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider block">
                    WhatsApp para Notificação *
                  </label>
                  <span className="text-xs text-[var(--seven-text-tertiary)] font-normal">com DDD</span>
                </div>
                <input
                  type="tel"
                  required
                  placeholder="(96) 99160-5151"
                  value={customerPhone}
                  onChange={handlePhoneChange}
                  className="w-full min-h-[48px] px-4 py-3 bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl text-sm font-medium text-[var(--seven-text-primary)] placeholder:text-[var(--seven-text-tertiary)] focus:bg-[var(--seven-surface-card)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
                <p className="text-xs text-[var(--seven-text-secondary)] leading-relaxed">
                  Enviaremos o comprovante e QR de retirada automaticamente para este número.
                </p>
                <p className="text-[11px] text-[var(--seven-text-secondary)] leading-relaxed pt-1">
                  Seus dados serão usados para processar o pedido, pagamento, produção, contato e retirada.
                  {' '}<a href="/privacidade" className="font-black text-cyan-300 underline underline-offset-2">Política de Privacidade</a>.
                </p>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-2.5 pt-2">
                <label className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider block">
                  Forma de Pagamento *
                </label>

                {/* Option 1: PIX */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'PIX'
                      ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/30 shadow-xs'
                      : 'border-[var(--seven-border-default)] hover:border-[var(--seven-border-focus)] bg-[var(--seven-surface-card)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="PIX"
                    checked={paymentMethod === 'PIX'}
                    onChange={() => setPaymentMethod('PIX')}
                    className="mt-1 text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-black text-[var(--seven-text-primary)]">
                        PIX Banco do Brasil
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-400">
                        Recomendado
                      </span>
                    </div>
                    <p className="text-xs text-[var(--seven-text-secondary)] mt-1 leading-relaxed">
                      Geração de QR Code e chave Copia e Cola instantâneos para pagamento.
                    </p>
                  </div>
                </label>`r`n</div>

              {/* Box de Resumo Financeiro */}
              <div className="pt-4 border-t border-[var(--seven-border-default)] space-y-2.5 bg-[var(--seven-surface-input)] rounded-2xl p-4 border">
                <div className="flex justify-between text-xs sm:text-sm text-[var(--seven-text-secondary)]">
                  <span>Quantidade de Camisas:</span>
                  <strong className="font-bold text-[var(--seven-text-primary)]">{totalPieces} {totalPieces === 1 ? 'unidade' : 'unidades'}</strong>
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-[var(--seven-text-secondary)]">
                  <span>Personalização de Estampa:</span>
                  <span className="font-bold text-emerald-600 uppercase text-xs">Grátis</span>
                </div>
                <div className="flex items-baseline justify-between pt-2.5 border-t border-[var(--seven-border-default)]">
                  <span className="text-xs sm:text-sm font-black text-[var(--seven-text-primary)] uppercase tracking-wider">
                    Total a Pagar:
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-teal-700 dark:text-teal-400 font-display">
                    {formatCurrency(totalAmountCents)}
                  </span>
                </div>
              </div>

              {/* Botão de Finalizar (Submit CTA) */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[52px] py-3.5 px-4 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white rounded-xl sm:rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Processando Pedido...</span>
                  </span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirmar Pedido • {formatCurrency(totalAmountCents)}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-xs text-[var(--seven-text-tertiary)] pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Compra 100% Segura • Seven Malharia</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

