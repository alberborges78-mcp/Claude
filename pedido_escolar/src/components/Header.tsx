import React from 'react';
import { ShoppingBag, Shield, MapPin, Phone, Search, Sun, Moon, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, theme, onToggleTheme }) => {
  const { totalPieces, totalAmountCents } = useCart();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">

      {/* ── Announcement bar ─────────────────────────────────────────────── */}
      {/* Preservado: conteúdo e função. Visual: blue-900 sólido (sem gradiente) */}
      <div className="bg-blue-900 py-1.5 px-3 sm:px-4 text-xs font-medium text-white flex items-center justify-between gap-2 min-h-[32px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
          <span className="truncate text-blue-100">Campanha Oficial de Uniformes 2026</span>
        </div>
        {/* Telefone e localização — ocultos em mobile, visíveis a partir de sm */}
        <div className="hidden sm:flex items-center gap-4 text-blue-200 flex-shrink-0 text-xs">
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3 flex-shrink-0" />
            (96) 99160-5151
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            Macapá - AP
          </span>
        </div>
      </div>

      {/* ── Main header bar ──────────────────────────────────────────────── */}
      {/*
        Análise 320px (área útil ≈ 296px após px-3 × 2):
          Logo side:  ícone 36px + gap 8px + "SEVEN" ~50px = ~94px (MALHARIA oculto abaixo de sm)
          Buttons:    Search ~34px + gap 6px + Admin ~34px + gap 6px + Cart ~56px = ~136px
          Container gap-2: 8px
          Total ≈ 94 + 8 + 136 = 238px → cabe confortavelmente em 296px ✓
      */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2">

        {/* ── Container Esquerdo (Seta Mobile + Logo) ───────────────────── */}
        <div className="flex items-center min-w-0">
          {/* Seta Voltar Mobile (somente fora do catálogo) */}
          {currentView !== 'catalog' && currentView !== 'admin' && !currentView.startsWith('admin/') && (
            <button
              onClick={() => onNavigate('catalog')}
              className="sm:hidden flex items-center justify-center w-11 h-11 mr-2 rounded-xl bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] shadow-sm text-[var(--seven-text-primary)] hover:bg-[var(--seven-border-default)] transition-all flex-shrink-0 focus:outline-none"
              aria-label="Voltar ao Catálogo"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* ── Logo / Brand ──────────────────────────────────────────────── */}
          {/* onClick, aria-label e navegação preservados.
              min-w-0 no botão permite que a área de texto encolha sem forçar overflow. */}
          <button
            onClick={() => onNavigate('catalog')}
            className="flex items-center gap-2 sm:gap-3 text-left group focus:outline-none min-w-0"
            aria-label="Ir para a página inicial"
          >
          {/* Ícone "7" — azul institucional sólido, sem gradiente.
              flex-shrink-0 apenas no ícone, não no botão inteiro. */}
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg sm:text-xl text-white shadow-sm group-hover:bg-blue-700 transition-colors flex-shrink-0">
            7
          </div>

          {/* Bloco de texto da marca — encolhe com min-w-0 quando necessário */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-display font-black text-base sm:text-lg tracking-tight text-slate-950 dark:text-white truncate leading-none">
                SEVEN
              </span>
              {/* Badge MALHARIA — oculto abaixo de sm para liberar ~72px em 320px.
                  Em 640px+ (sm) aparece normalmente. */}
              <span className="hidden sm:inline-flex text-xs font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0 leading-none">
                MALHARIA
              </span>
            </div>
            {/* Subidentificação — oculta abaixo de sm (sem xs inválido).
                "Colégio Conceito 2026" é informação secundária e pode esperar sm+. */}
            <p className="hidden sm:block text-xs text-slate-600 dark:text-slate-300 font-semibold truncate mt-0.5 leading-none">
              Colégio Conceito 2026
            </p>
          </div>
        </button>
      </div>

        {/* ── Action Controls ────────────────────────────────────────────── */}
        {/* Todos os callbacks, onClick e condicionais preservados integralmente. */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

          {/* Consultar Pedido — onClick e aria-label preservados.
              min-h-[44px] em todos os tamanhos para toque confortável. */}
          <button
            onClick={() => onNavigate('lookup')}
            aria-label="Consultar Pedido"
            className={`
              inline-flex items-center justify-center gap-1 sm:gap-1.5
              px-2.5 sm:px-3.5
              min-h-[44px]
              rounded-xl text-xs font-semibold
              transition-all focus:outline-none
              ${currentView === 'lookup'
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 ring-offset-1'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
              }
            `}
          >
            <Search className={`w-4 h-4 flex-shrink-0 ${currentView === 'lookup' ? 'text-white' : 'text-blue-600'}`} />
            {/* Texto visível apenas em md+ para preservar espaço em mobile */}
            <span className="hidden md:inline">Consultar Pedido</span>
          </button>

          {/* Admin / Login — onClick, aria-label, isAuthenticated e condicional preservados. */}
          <button
            onClick={() => onNavigate(isAuthenticated ? 'admin' : 'login')}
            aria-label={isAuthenticated ? 'Painel Admin' : 'Acesso Administrativo'}
            className={`
              inline-flex items-center justify-center gap-1 sm:gap-1.5
              px-2.5 sm:px-3.5
              min-h-[44px]
              rounded-xl text-xs font-semibold
              transition-all focus:outline-none
              ${currentView.startsWith('admin')
                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 ring-offset-1'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
              }
            `}
          >
            <Shield className={`w-4 h-4 flex-shrink-0 ${currentView.startsWith('admin') ? 'text-white' : 'text-gray-500'}`} />
            <span className="hidden md:inline">{isAuthenticated ? 'Painel Admin' : 'Admin'}</span>
          </button>

          {/* Toggle de Tema Dia/Noite */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              aria-label={`Alternar para tema ${theme === 'light' ? 'Noite' : 'Dia'}`}
              aria-pressed={theme === 'dark'}
              title={`Modo ${theme === 'light' ? 'Dia' : 'Noite'}`}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] sm:px-3 sm:gap-1.5 rounded-xl text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {theme === 'light' ? (
                <>
                  <Sun className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  <span className="hidden md:inline text-xs font-semibold">Dia</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 flex-shrink-0 text-blue-300" />
                  <span className="hidden md:inline text-xs font-semibold">Noite</span>
                </>
              )}
            </button>
          )}

          {/* ── Carrinho ──────────────────────────────────────────────────
               totalPieces, totalAmountCents, onClick, aria-label preservados.
               Quando tem itens: orange-500 para urgência.
               Quando view=cart: amber-500 (ativo).
               Quando vazio: blue-600.
               min-h-[44px] em todos os tamanhos.
          ──────────────────────────────────────────────────────────────── */}
          <button
            onClick={() => onNavigate('cart')}
            aria-label={`Carrinho com ${totalPieces} ${totalPieces === 1 ? 'item' : 'itens'}`}
            className={`
              relative inline-flex items-center justify-center gap-1.5 sm:gap-2
              px-3 sm:px-4
              min-h-[44px]
              rounded-xl text-xs font-bold
              transition-all active:scale-[0.97] focus:outline-none
              ${currentView === 'cart'
                ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300 ring-offset-1'
                : totalPieces > 0
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }
            `}
          >
            <ShoppingBag className="w-4 h-4 flex-shrink-0" />

            {/* "Carrinho" — visível apenas em sm+ */}
            <span className="hidden sm:inline">Carrinho</span>

            {/* Badge de quantidade — lógica de exibição preservada integralmente */}
            {totalPieces > 0 ? (
              <span className="inline-flex items-center gap-1 bg-white/25 text-white text-xs px-1.5 py-0.5 rounded-full font-black leading-none">
                {/* Versão completa em md+ */}
                <span className="hidden md:inline">
                  {totalPieces} {totalPieces === 1 ? 'peça' : 'peças'} • {formatCurrency(totalAmountCents)}
                </span>
                {/* Versão compacta em mobile — apenas o número */}
                <span className="md:hidden">{totalPieces}</span>
              </span>
            ) : (
              <span className="text-xs font-semibold opacity-70">0</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
