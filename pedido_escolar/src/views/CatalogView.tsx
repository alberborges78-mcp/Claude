import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
  Shirt,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  X,
} from 'lucide-react';
import { db } from '../services/db';
import { ClassItem } from '../types';
import { useCart } from '../context/CartContext';
import { formatCurrency, formatDate } from '../utils/formatters';

interface CatalogViewProps {
  onNavigate: (view: string) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onNavigate }) => {
  const { addItem, totalPieces } = useCart();
  const store = db.getStore();
  const school = db.getSchools()[0];
  const campaign = db.getActiveCampaign() || db.getCampaigns()[0];
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [pricesError, setPricesError] = useState<string | null>(null);

  useEffect(() => {
    if (campaign) {
      db.getClassesByCampaign(campaign.id).then(setClasses);
      setPricesError(null);
      db.getPricesByCampaignAsync(campaign.id)
        .then(setPrices)
        .catch((err) => {
          console.error('Erro ao carregar tabela de preços:', err);
          setPricesError('Falha ao carregar tabela de preços. Verifique sua conexão.');
        });
    }
  }, [campaign]);

  const isCampaignOpen = campaign ? db.isCampaignOpen(campaign) : false;

  type Personalization = {
    custom_name: string;
    custom_number: string;
  };

  type SizeSelection = {
    id: string;
    sizeLabel: string;
    quantity: number;
    personalize: boolean;
    personalizations: Personalization[];
  };

  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [studentName, setStudentName] = useState('');
  const [sizeSelections, setSizeSelections] = useState<SizeSelection[]>([]);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openClassModal = (cls: ClassItem) => {
    setSelectedClass(cls);
    setStudentName('');
    setSizeSelections([{
      id: Math.random().toString(36).slice(2),
      sizeLabel: '',
      quantity: 1,
      personalize: false,
      personalizations: []
    }]);
    setErrorMsg(null);
  };

  const closeClassModal = () => {
    setSelectedClass(null);
    setErrorMsg(null);
  };

  const handleAddCard = () => {
    setSizeSelections(prev => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        sizeLabel: '',
        quantity: 1,
        personalize: false,
        personalizations: []
      }
    ]);
  };

  const handleRemoveCard = (id: string) => {
    setSizeSelections(prev => prev.filter(c => c.id !== id));
  };

  const handleCardChange = (id: string, updates: Partial<SizeSelection>) => {
    setSizeSelections(prev => prev.map(c => {
      if (c.id !== id) return c;
      const nextCard = { ...c, ...updates };

      if (updates.quantity !== undefined || updates.personalize !== undefined) {
        if (nextCard.personalize) {
          const nextPers = [...nextCard.personalizations];
          while (nextPers.length < nextCard.quantity) {
            nextPers.push({ custom_name: '', custom_number: '' });
          }
          if (nextPers.length > nextCard.quantity) {
            nextPers.length = nextCard.quantity;
          }
          nextCard.personalizations = nextPers;
        }
      }
      return nextCard;
    }));
  };

  const handlePersonalizationChange = (cardId: string, idx: number, field: keyof Personalization, val: string) => {
    setSizeSelections(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      const nextPers = [...c.personalizations];
      nextPers[idx] = { ...nextPers[idx], [field]: val };
      return { ...c, personalizations: nextPers };
    }));
  };

  const modalTotalPieces = sizeSelections.reduce((acc, c) => acc + c.quantity, 0);
  const subtotalCents = sizeSelections.reduce((acc, c) => {
    if (!c.sizeLabel) return acc;
    const priceObj = prices.find(p => p.size_label === c.sizeLabel);
    return acc + (priceObj ? priceObj.price_cents * c.quantity : 0);
  }, 0);

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    if (!studentName.trim()) {
      setErrorMsg('Por favor, informe o nome do aluno.');
      document.getElementById('student-name')?.focus();
      return;
    }

    let hasError = false;
    for (const c of sizeSelections) {
      if (!c.sizeLabel) {
        setErrorMsg('Selecione um tamanho em todos os blocos.');
        hasError = true;
        break;
      }
      if (c.quantity <= 0) {
        setErrorMsg('Informe a quantidade para todos os tamanhos selecionados.');
        hasError = true;
        break;
      }
    }
    if (hasError) return;

    if (!isCampaignOpen) {
      setErrorMsg('Esta campanha já atingiu o prazo de encerramento.');
      return;
    }

    sizeSelections.forEach(c => {
      const priceObj = prices.find((p) => p.size_label === c.sizeLabel);
      const unitPriceCents = priceObj ? priceObj.price_cents : 3000;
      
      const itemPersonalizations = [];
      if (c.personalize) {
        for (let i = 0; i < c.quantity; i++) {
          const p = c.personalizations[i];
          itemPersonalizations.push({
            piece_index: i + 1,
            student_name: studentName.trim(),
            custom_name: p?.custom_name?.trim() || undefined,
            custom_number: p?.custom_number?.trim() || undefined,
          });
        }
      }

      addItem({
        class_id: selectedClass.id,
        class_name: selectedClass.name,
        student_name: studentName.trim(),
        size_label: c.sizeLabel,
        unit_price_cents: unitPriceCents,
        quantity: c.quantity,
        personalizations: itemPersonalizations,
      });
    });

    const addedClassName = selectedClass.name;
    closeClassModal();
    setFeedbackSuccess(`${modalTotalPieces} peça(s) do ${addedClassName} adicionada(s) ao seu carrinho!`);
    setTimeout(() => {
      setFeedbackSuccess(null);
    }, 4000);
  };

  // Group prices by category
  const infantilPrices = prices.filter((p) => p.category === 'infantil');
  const adultoPadraoPrices = prices.filter((p) => p.category === 'adulto_padrao');
  const adultoEspecialPrices = prices.filter((p) => p.category === 'adulto_especial');

  return (
    <div className="pb-16">
      {/* ── Toast Notification ──────────────────────────────────────────────
           Lógica preservada: feedbackSuccess, onNavigate('cart'), totalPieces
      ─────────────────────────────────────────────────────────────────────── */}
      {feedbackSuccess && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-50 bg-gray-900 text-white border border-emerald-500/30 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-300">Adicionado!</p>
              <p className="text-xs text-gray-300 leading-tight mt-0.5">{feedbackSuccess}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('cart')}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-400 active:scale-[0.97] text-white text-xs font-extrabold rounded-xl shadow transition-all flex-shrink-0 text-center min-h-[40px]"
          >
            Ver Carrinho ({totalPieces})
          </button>
        </div>
      )}

      {/* ── Hero Section ────────────────────────────────────────────────────
           Visual: bg-blue-900 institucional, sem gradientes pesados.
           Lógica: isCampaignOpen, school, campaign, store — tudo preservado.
      ─────────────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-2 sm:pt-3 pb-3 sm:pb-4 px-4 sm:px-6 border-b border-teal-700/50 dark:border-teal-800/50"
      >
        {/* Overlay Translúcida Teal para garantir leitura do background global sem apagar a imagem */}
        <div className="absolute inset-0 z-0 bg-teal-800/45 dark:bg-teal-950/75" />

        {/* Decoração discreta — sutil, não intrusiva */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(20,184,166,0.15),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(4,120,87,0.3),transparent_60%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 flex flex-col gap-3 sm:gap-4">

          {/* ── Top block: Badges, Texto e Logo ──────────────────── */}
          <div className="flex flex-row items-center justify-between gap-3 sm:gap-4">
            
            <div className="flex-1 space-y-1.5 animate-catalog-fade-up min-w-0" style={{ animationDelay: '4.5s' }}>
              
              {/* Badges - Little Games (Destaque Principal) + Campanha */}
              <div className="flex flex-row items-center gap-3">
                {/* Little Games Event Block */}
                <div className="inline-flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 bg-teal-950/80 border border-teal-400/40 rounded-xl shadow-md relative overflow-hidden shrink-0">
                  {/* Pequeno detalhe laranja sutil para harmonizar */}
                  <div className="absolute top-0 left-1/2 w-full h-1 bg-orange-500/20 blur-sm transform -translate-x-1/2" />
                  <img src="/Little.png" alt="Little Games 2026" className="h-8 sm:h-11 md:h-12 w-auto object-contain relative z-10 drop-shadow-sm" />
                </div>
                
                {/* Campanha Aberta Badge */}
                {isCampaignOpen ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold text-[10px] sm:text-xs shadow-sm shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    CAMPANHA ABERTA
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 text-white font-bold text-[10px] sm:text-xs shadow-sm shrink-0">
                    CAMPANHA ENCERRADA
                  </div>
                )}
              </div>

              {/* Texto Principal Aproximado (Sem Título Grande) */}
              <p className="text-xs sm:text-sm text-white/95 font-medium max-w-xl leading-snug drop-shadow-sm">
                Faça a encomenda dos uniformes escolares do seu filho com a{' '}
                <strong className="text-white">Seven Malharia</strong>. Personalização de nome e número gratuita!
              </p>
            </div>

            {/* Logo do Colégio - Redimensionada e Estática */}
            <div className="flex-shrink-0 animate-catalog-fade-up relative" style={{ animationDelay: '4.6s' }}>
              {/* Leve glow atrás da logo para garantir contraste sobre qualquer área da arte */}
              <div className="absolute inset-0 bg-white/10 blur-xl rounded-full" />
              <img src="/logo.png" alt="Colégio Conceito" className="relative h-16 sm:h-20 md:h-24 w-auto object-contain drop-shadow-lg" />
            </div>
            
          </div>

          {/* ── Info Cards ───────────────────────────────────────────────── */}
          {/* Dados preservados: campaign?.ends_at, campaign?.delivery_estimate, store.maps_url */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 animate-catalog-fade-up" style={{ animationDelay: '4.7s' }}>

            {/* Prazo */}
            <div className="bg-teal-600/90 backdrop-blur-md border border-teal-400/50 p-3 sm:p-3.5 rounded-xl flex items-start sm:items-center gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-teal-500/50 text-white flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/90 leading-tight">Prazo de Pedidos</p>
                <p className="text-sm sm:text-base font-extrabold text-white leading-tight mt-0.5">
                  Até {formatDate(campaign?.ends_at || '2026-10-07')}
                </p>
                <p className="text-[11px] sm:text-xs text-white/80 font-medium mt-0.5">Garanta no prazo</p>
              </div>
            </div>

            {/* Previsão de Entrega */}
            <div className="bg-teal-600/90 backdrop-blur-md border border-teal-400/50 p-3 sm:p-3.5 rounded-xl flex items-start sm:items-center gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-teal-500/50 text-white flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/90 leading-tight">Previsão de Entrega</p>
                <p className="text-sm font-bold text-white leading-tight mt-0.5 break-words">
                  {campaign?.delivery_estimate || '20 a 25 dias pós-campanha'}
                </p>
                <p className="text-[11px] sm:text-xs text-white/80 mt-0.5">Notificação via WhatsApp</p>
              </div>
            </div>

            {/* Retirada na Loja */}
            <div className="bg-teal-600/90 backdrop-blur-md border border-teal-400/50 p-3 sm:p-3.5 rounded-xl flex items-start sm:items-center gap-3 shadow-sm sm:col-span-2 lg:col-span-1">
              <div className="p-2 rounded-lg bg-teal-500/50 text-white flex-shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/90 leading-tight">Retirada na Loja</p>
                <p className="text-sm font-bold text-white leading-tight mt-0.5 break-words">
                  Seven Malharia — Av. Cora de Carvalho, 2042-B
                </p>
                <a
                  href={store.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold text-white underline decoration-white/50 hover:decoration-white transition-colors min-h-[24px]"
                >
                  <ExternalLink className="w-3 h-3" />
                  Abrir no Google Maps
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Main Content: Preços + Turmas ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-4 sm:mt-5 relative z-20">

        {/* ── Seção de Preços ──────────────────────────────────────────────
             Valores preservados: R$ 30,00 / R$ 40,00 / R$ 50,00
             Somente apresentação alterada.
        ─────────────────────────────────────────────────────────────────── */}
        <div className="bg-[var(--seven-surface-card)] rounded-2xl p-4 sm:p-5 shadow-sm border border-[var(--seven-border-default)] mb-8 animate-catalog-fade-up" style={{ animationDelay: '4.8s' }}>
          {/* Cabeçalho da tabela */}
          <div className="flex items-center gap-2 mb-3">
            <Shirt className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-[var(--seven-text-primary)]">
                Tabela de Valores Oficiais da Campanha
              </h2>
              <p className="text-xs text-[var(--seven-text-secondary)] mt-0.5">
                Malha premium • Estampa de alta definição • Personalização gratuita
              </p>
            </div>
          </div>

          {/* Badges de preço — responsivos: coluna em 320px, linha em sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 px-3 py-2.5 rounded-xl bg-teal-600 dark:bg-[var(--seven-surface-brand)] border border-teal-500 shadow-sm">
              <span className="text-xs font-semibold text-white/90">Tam. 2 ao 16 (Infantil)</span>
              <span className="font-display font-black text-base text-white">R$ 30,00</span>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 px-3 py-2.5 rounded-xl bg-teal-600 dark:bg-[var(--seven-surface-brand)] border border-teal-500 shadow-sm">
              <span className="text-xs font-semibold text-white/90">Tam. PP ao GG (Adulto)</span>
              <span className="font-display font-black text-base text-white">R$ 40,00</span>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 px-3 py-2.5 rounded-xl bg-teal-600 dark:bg-[var(--seven-surface-brand)] border border-teal-500 shadow-sm">
              <span className="text-xs font-semibold text-white/90">Tam. XG ao XXXG (Plus)</span>
              <span className="font-display font-black text-base text-white">R$ 50,00</span>
            </div>
          </div>

          {pricesError && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-100 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{pricesError}</span>
            </div>
          )}
        </div>

        {/* ── Cabeçalho da seção de turmas ────────────────────────────────── */}
        <div className="mb-6 animate-catalog-fade-up" style={{ animationDelay: '4.9s' }}>
          <h2 className="font-display font-black text-xl sm:text-2xl text-[var(--seven-text-primary)] tracking-tight leading-tight">
            Escolha a Turma do Aluno
          </h2>
          <p className="text-xs sm:text-sm text-[var(--seven-text-secondary)] mt-1">
            Selecione a turma para visualizar a camisa e personalizar o pedido
          </p>
        </div>

        {/* ── Cards de Turma ───────────────────────────────────────────────
             Lógica preservada: classes.map, cls.id (key), cls.name, cls.image_url,
             openClassModal(cls), isCampaignOpen, disabled.
             Jersey CSS vetorial: preservado — apenas escala e respiro melhorados.
             Tipografia: .font-display no nome, text-xs mínimo — zero text-[10px]/[11px].
        ─────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {classes.map((cls, index) => (
            <div
              key={cls.id}
              className="h-full animate-catalog-fade-up"
              style={{ animationDelay: `${5.0 + Math.min(index * 0.07, 0.42)}s` }}
            >
              <div className="group h-full bg-[var(--seven-surface-card)] rounded-xl border border-[var(--seven-border-default)] shadow-sm transition-all duration-300 ease-out overflow-hidden flex flex-col motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md motion-safe:hover:border-teal-300 active:scale-[0.99] focus-within:ring-2 focus-within:ring-teal-500 focus-within:ring-offset-2">
                {/* ── Área do Jersey ────────────────────────────────────────────
                     Fundo neutro claro para contraste com o jersey azul.
                     Respiro aumentado (py-8) para o jersey respirar.
                     Badge "Modelo Oficial" posicionado no topo direito.
                ──────────────────────────────────────────────────────────────── */}
                <div className="relative flex flex-col items-center justify-center py-8 px-6 bg-[var(--seven-surface-input)] border-b border-[var(--seven-border-default)] min-h-[200px] overflow-hidden">

                  {/* Badge de status — topo direito, sempre visível */}
                  {isCampaignOpen ? (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-[var(--seven-surface-card)] text-[var(--seven-text-secondary)] border border-[var(--seven-border-default)] shadow-sm z-10">
                      Modelo Oficial
                    </span>
                  ) : (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-[var(--seven-surface-input)] text-[var(--seven-text-tertiary)] border border-[var(--seven-border-default)] z-10">
                      Encerrado
                    </span>
                  )}

                  {/* Jersey ou imagem — lógica de exibição preservada */}
                  {cls.image_url ? (
                    <img
                      src={cls.image_url}
                      alt={cls.name}
                      className="max-h-40 w-auto object-contain drop-shadow-md transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03]"
                    />
                  ) : (
                    /* ── Jersey CSS Vetorial ─────────────────────────────────
                         Conceito preservado. Paleta: azul institucional.
                         Scale aumentado: w-32 h-36 (era w-28 h-32).
                         Collar, nome da turma, badge 2026 — todos preservados.
                    ──────────────────────────────────────────────────────────── */
                    <div className="relative flex flex-col items-center justify-center">

                      {/* Sombra ambiente sutil ao redor do jersey */}
                      <div className="absolute inset-0 bg-blue-600/5 rounded-full blur-xl pointer-events-none scale-150" />

                      <div className="relative w-32 h-36 bg-gradient-to-b from-blue-600 to-blue-900 rounded-t-2xl rounded-b-xl shadow-lg flex flex-col items-center justify-center p-3 text-center text-white border-2 border-blue-400/20 transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.03]">

                        {/* Gola da camiseta */}
                        <div className="absolute -top-1.5 w-11 h-3.5 bg-white rounded-b-full shadow-sm" />

                        {/* Mangas implícitas — bordas arredondadas no topo */}
                        <div className="absolute -top-0.5 -left-1 w-4 h-6 bg-blue-500/60 rounded-tl-xl rounded-bl-lg" />
                        <div className="absolute -top-0.5 -right-1 w-4 h-6 bg-blue-500/60 rounded-tr-xl rounded-br-lg" />

                        {/* Texto da escola */}
                        <span className="text-xs font-black uppercase tracking-widest text-blue-200 mt-2">
                          CONCEITO
                        </span>

                        {/* Nome da turma no jersey — cls.name preservado */}
                        <span className="text-sm font-black leading-tight mt-1 text-amber-300 px-1">
                          {cls.name}
                        </span>

                        {/* Ano */}
                        <div className="mt-2 text-xs bg-blue-950/50 px-2.5 py-0.5 rounded-full font-bold tracking-wider">
                          2026
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Rodapé do Card ────────────────────────────────────────────
                     Hierarquia: Nome da turma → Preço/perks → CTA
                     Todos os dados (cls.name) e handlers (openClassModal, isCampaignOpen)
                     preservados integralmente.
                ──────────────────────────────────────────────────────────────── */}
                <div className="p-5 flex flex-col gap-4 flex-1">

                  {/* Identidade da turma */}
                  <div className="flex-1">
                    <h3 className="font-display font-black text-lg text-[var(--seven-text-primary)] leading-tight">
                      {cls.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                      <span className="text-xs text-[var(--seven-text-secondary)]">
                        A partir de{' '}
                        <strong className="text-teal-700 dark:text-teal-400 font-bold">R$ 30,00</strong>
                      </span>
                      <span className="text-[var(--seven-border-default)] text-xs">•</span>
                      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        Personalização grátis
                      </span>
                    </div>
                  </div>

                  {/* Linha divisória sutil */}
                  <div className="border-t border-[var(--seven-border-default)]" />

                  {/* CTA — onClick, disabled e isCampaignOpen preservados.
                      min-h-[44px] garantido via py-3 + text-sm = ~46px */}
                  <button
                    onClick={() => openClassModal(cls)}
                    disabled={!isCampaignOpen}
                    className={`
                      w-full min-h-[44px] px-4 py-3
                      rounded-xl text-sm font-bold
                      inline-flex items-center justify-center gap-2
                      transition-all duration-300 ease-out
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2
                      ${isCampaignOpen
                        ? 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white shadow-sm motion-safe:hover:shadow-md'
                        : 'bg-[var(--seven-surface-input)] text-[var(--seven-text-tertiary)] cursor-not-allowed border border-[var(--seven-border-default)]'
                      }
                    `}
                  >
                    {isCampaignOpen ? (
                      <>
                        <Plus className="w-4 h-4 flex-shrink-0" />
                        Fazer Pedido desta Turma
                      </>
                    ) : (
                      <>
                        <span className="w-4 h-4 flex-shrink-0 text-gray-400">✕</span>
                        Campanha Fechada
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal de Pedido ──────────────────────────────────────────────────
           selectedClass controla abertura — preservado.
           handleAddToCart onSubmit — preservado.
           closeClassModal onClick — preservado.
           Todos os values, onChange, handlers, calculations — preservados.
      ─────────────────────────────────────────────────────────────────────── */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto">
          {/* Backdrop animado independente */}
          <div 
            className="fixed inset-0 bg-gray-950/75 backdrop-blur-sm animate-in fade-in duration-200 ease-out motion-reduce:animate-none"
            aria-hidden="true"
          />
          
          {/* Container — bottom-sheet visual em mobile, centralizado em sm+ */}
          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[95dvh] sm:max-h-[92vh] overflow-y-auto shadow-2xl border-0 sm:border border-gray-200 flex flex-col animate-in fade-in slide-in-from-bottom-8 sm:slide-in-from-bottom-2 sm:zoom-in-95 duration-300 ease-out motion-reduce:animate-none">

            {/* ── Cabeçalho Sticky ─────────────────────────────────────────── */}
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between z-10 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Shirt className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-black text-base text-gray-900 truncate leading-tight">
                    {selectedClass.name}
                  </h3>
                  <p className="text-xs text-gray-500 leading-none mt-0.5">Configuração de Aluno e Personalização</p>
                </div>
              </div>
              {/* Botão fechar — onClick={closeClassModal} preservado, touch 44×44 */}
              <button
                onClick={closeClassModal}
                aria-label="Fechar modal"
                className="w-11 h-11 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 ml-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Corpo do formulário — onSubmit={handleAddToCart} preservado ── */}
            <form onSubmit={handleAddToCart} className="flex flex-col flex-1 overflow-y-auto">
              <div className="p-5 sm:p-6 space-y-6">

                {/* Mensagem de erro — errorMsg || pricesError */}
                {(errorMsg || pricesError) && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg || pricesError}</span>
                  </div>
                )}

                {/* ── Seção 1: Dados do Aluno ─────────────────────────────── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="student-name" className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider">
                      Nome do Aluno <span className="text-red-500">*</span>
                    </label>
                    <span className="text-xs text-[var(--seven-text-tertiary)]">identificação escolar</span>
                  </div>
                  {/* value, onChange, type, placeholder — preservados */}
                  <input
                    id="student-name"
                    type="text"
                    placeholder="Ex: Pedro Henrique Alencar"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full px-4 py-3 min-h-[44px] bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] text-[var(--seven-text-primary)] placeholder:text-[var(--seven-text-tertiary)] rounded-xl text-base font-medium focus:bg-[var(--seven-surface-page)] focus:outline-none focus:ring-2 focus:ring-[var(--seven-brand-primary)] focus:border-[var(--seven-brand-primary)] transition-all"
                  />
                </div>

                {/* ── Seção 2: Tamanhos e Personalização ──────────────────────────── */}
                <div className="space-y-4">
                  {sizeSelections.map((card) => {
                    // Filter available sizes: exclude sizes already selected in OTHER cards
                    const availablePrices = prices.filter(p => 
                      !sizeSelections.some(other => other.id !== card.id && other.sizeLabel === p.size_label)
                    );
                    const selectedPriceObj = prices.find(p => p.size_label === card.sizeLabel);

                    return (
                      <div key={card.id} className="bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] rounded-xl p-4 space-y-4">
                        {/* Header do Card */}
                        <div className="flex items-start justify-between gap-2">
                          <label className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider block">
                            Tamanho
                          </label>
                          {sizeSelections.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCard(card.id)}
                              className="text-red-500 text-xs font-bold uppercase hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors"
                            >
                              Remover
                            </button>
                          )}
                        </div>

                        {/* Tamanho e Quantidade na mesma linha */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1 relative">
                            <select
                              value={card.sizeLabel}
                              onChange={(e) => handleCardChange(card.id, { sizeLabel: e.target.value })}
                              className="w-full px-4 py-3 min-h-[44px] bg-[var(--seven-surface-card)] border border-[var(--seven-border-default)] text-[var(--seven-text-primary)] rounded-xl text-base font-bold focus:bg-[var(--seven-surface-page)] focus:outline-none focus:ring-2 focus:ring-[var(--seven-brand-primary)] focus:border-[var(--seven-brand-primary)] transition-all appearance-none"
                            >
                              <option value="" disabled>Selecione ▼</option>
                              {selectedPriceObj && !availablePrices.find(p => p.size_label === selectedPriceObj.size_label) && (
                                <option value={selectedPriceObj.size_label}>{selectedPriceObj.size_label} — {formatCurrency(selectedPriceObj.price_cents)}</option>
                              )}
                              {availablePrices.map(p => (
                                <option key={p.id} value={p.size_label}>
                                  {p.size_label} — {formatCurrency(p.price_cents)}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex items-center gap-1 bg-[var(--seven-surface-card)] rounded-lg p-1 shadow-sm border border-[var(--seven-border-default)] shrink-0 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleCardChange(card.id, { quantity: Math.max(0, card.quantity - 1) })}
                              disabled={card.quantity <= 0}
                              className="w-11 h-11 rounded-md flex items-center justify-center font-black text-lg text-[var(--seven-text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--seven-border-default)] transition-colors"
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-bold text-base text-[var(--seven-text-primary)]">{card.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleCardChange(card.id, { quantity: card.quantity + 1 })}
                              className="w-11 h-11 rounded-md flex items-center justify-center font-black text-lg text-[var(--seven-text-primary)] hover:bg-[var(--seven-border-default)] transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Personalização Toggle */}
                        {card.sizeLabel && card.quantity > 0 && (
                          <div className="pt-2 border-t border-[var(--seven-border-default)]">
                            <div className="flex items-center justify-between mt-2 mb-3">
                              <label className="text-xs font-bold text-[var(--seven-text-secondary)] uppercase tracking-wider">
                                Nome na Costa e Nº
                              </label>
                              <div className="flex items-center bg-[var(--seven-surface-card)] border border-[var(--seven-border-default)] rounded-lg overflow-hidden p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleCardChange(card.id, { personalize: false })}
                                  className={`min-h-[36px] px-3 text-xs font-bold rounded-md transition-all ${
                                    !card.personalize
                                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                      : 'text-[var(--seven-text-secondary)] hover:bg-gray-50 dark:hover:bg-gray-800'
                                  }`}
                                >
                                  {!card.personalize ? '● NÃO' : '○ NÃO'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCardChange(card.id, { personalize: true })}
                                  className={`min-h-[36px] px-3 text-xs font-bold rounded-md transition-all ${
                                    card.personalize
                                      ? 'bg-[var(--seven-brand-primary)] text-white'
                                      : 'text-[var(--seven-text-secondary)] hover:bg-gray-50 dark:hover:bg-gray-800'
                                  }`}
                                >
                                  {card.personalize ? '● SIM' : '○ SIM'}
                                </button>
                              </div>
                            </div>

                            {/* Campos de Personalização */}
                            {card.personalize && card.personalizations.length > 0 && (
                              <div className="space-y-3 mt-4">
                                {card.personalizations.map((p, idx) => (
                                  <div key={idx} className="p-3 bg-[var(--seven-surface-card)] rounded-xl border border-[var(--seven-border-default)] shadow-sm space-y-2">
                                    <p className="text-xs font-bold text-[var(--seven-text-primary)]">
                                      Camisa {idx + 1}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                      <div className="sm:col-span-2">
                                        <input
                                          type="text"
                                          placeholder="Nome na costa (opcional)"
                                          value={p.custom_name}
                                          onChange={(e) =>
                                            handlePersonalizationChange(card.id, idx, 'custom_name', e.target.value)
                                          }
                                          className="w-full px-3 py-2.5 min-h-[44px] bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] text-[var(--seven-text-primary)] placeholder:text-[var(--seven-text-tertiary)] rounded-lg text-sm font-medium focus:bg-[var(--seven-surface-page)] focus:outline-none focus:ring-1 focus:ring-[var(--seven-brand-primary)] focus:border-[var(--seven-brand-primary)] transition-all"
                                        />
                                      </div>
                                      <div>
                                        <input
                                          type="text"
                                          maxLength={3}
                                          placeholder="Nº (opcional)"
                                          value={p.custom_number}
                                          onChange={(e) =>
                                            handlePersonalizationChange(card.id, idx, 'custom_number', e.target.value)
                                          }
                                          className="w-full px-3 py-2.5 min-h-[44px] bg-[var(--seven-surface-input)] border border-[var(--seven-border-default)] text-[var(--seven-text-primary)] placeholder:text-[var(--seven-text-tertiary)] rounded-lg text-sm font-medium focus:bg-[var(--seven-surface-page)] focus:outline-none focus:ring-1 focus:ring-[var(--seven-brand-primary)] focus:border-[var(--seven-brand-primary)] transition-all"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddCard}
                    disabled={sizeSelections.length >= prices.length}
                    className="w-full min-h-[44px] border-2 border-dashed border-[var(--seven-brand-primary)] text-[var(--seven-brand-primary)] rounded-xl font-bold text-sm hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-lg leading-none">+</span> ADICIONAR OUTRO TAMANHO
                  </button>
                </div>

              </div>

              {/* ── CTA Sticky no Rodapé ───────────────────────────────────────
                   type="submit" → handleAddToCart → onSubmit do form — preservado.
                   formatCurrency(subtotalCents) no texto — preservado.
                   Sticky no bottom para garantir acesso mesmo com teclado virtual.
              ─────────────────────────────────────────────────────────────────── */}
              <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex-shrink-0">
                <button
                  type="submit"
                  className="w-full min-h-[52px] px-4 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl font-black text-base shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
                >
                  <ShoppingBag className="w-5 h-5 flex-shrink-0" />
                  <span>
                    Adicionar {modalTotalPieces > 0 ? `${modalTotalPieces} ` : ''}ao Carrinho • {formatCurrency(subtotalCents)}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
