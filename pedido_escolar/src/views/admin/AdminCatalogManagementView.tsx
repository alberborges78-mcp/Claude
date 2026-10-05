import React, { useState } from 'react';
import {
  Calendar,
  Layers,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Shirt,
  AlertCircle,
} from 'lucide-react';
import { db } from '../../services/db';
import { formatCurrency } from '../../utils/formatters';
import { ClassImageUploader } from '../../components/ClassImageUploader';

export const AdminCatalogManagementView: React.FC = () => {
  const [refresh, setRefresh] = useState(0);

  const campaigns = db.getCampaigns();
  const activeCampaign = db.getActiveCampaign() || campaigns[0];
  const [classes, setClasses] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [priceLoadError, setPriceLoadError] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeCampaign) {
      db.getClassesByCampaign(activeCampaign.id).then(setClasses);
      setPriceLoadError(null);
      db.getPricesByCampaignAsync(activeCampaign.id)
        .then(setPrices)
        .catch((err) => {
          console.error('Erro ao carregar tabela de preços:', err);
          setPriceLoadError(err?.message || 'Falha ao carregar tabela de preços remota.');
        });
    }
  }, [activeCampaign, refresh]);

  // Editing states
  const [newClassName, setNewClassName] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');

  // Editing campaign dates
  const [campaignEndDate, setCampaignEndDate] = useState(
    activeCampaign ? activeCampaign.ends_at.slice(0, 10) : '2026-10-07'
  );
  const [deliveryEstimate, setDeliveryEstimate] = useState(
    activeCampaign?.delivery_estimate || '20 a 25 dias após o encerramento da campanha'
  );
  const [campaignSavedFeedback, setCampaignSavedFeedback] = useState(false);

  // Price edits
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [editingSizeLabel, setEditingSizeLabel] = useState<string>('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [priceSavedFeedback, setPriceSavedFeedback] = useState(false);

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !activeCampaign) return;
    await db.createClass(activeCampaign.id, newClassName.trim());
    setNewClassName('');
    setRefresh((p) => p + 1);
  };

  const handleSaveClass = async (id: string) => {
    if (!editingClassName.trim()) return;
    await db.updateClass(id, { name: editingClassName.trim() });
    setEditingClassId(null);
    setRefresh((p) => p + 1);
  };

  const handleDeleteClass = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta turma?')) {
      await db.deleteClass(id);
      setRefresh((p) => p + 1);
    }
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return;
    db.updateCampaign(activeCampaign.id, {
      ends_at: `${campaignEndDate}T23:59:59Z`,
      delivery_estimate: deliveryEstimate,
    });
    setCampaignSavedFeedback(true);
    setTimeout(() => setCampaignSavedFeedback(false), 3000);
    setRefresh((p) => p + 1);
  };

  const handleSavePrice = async (id: string) => {
    const numeric = parseFloat(editingPriceValue.replace(',', '.'));
    if (isNaN(numeric) || numeric <= 0) return;
    const cents = Math.round(numeric * 100);
    const sizeLabel = editingSizeLabel.trim();
    if (!sizeLabel) return;
    
    setIsSavingPrice(true);
    try {
      await db.updatePrice(id, cents, sizeLabel);
      setEditingPriceId(null);
      setRefresh((p) => p + 1);
      setPriceSavedFeedback(true);
      setTimeout(() => setPriceSavedFeedback(false), 3000);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erro ao salvar o preço. Tente novamente.');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleResetSeed = () => {
    if (confirm('Deseja restaurar as configurações e dados de demonstração iniciais padrão da Seven Malharia?')) {
      db.resetToDefaultSeed();
      setRefresh((p) => p + 1);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit']">
            Configurações da Loja, Campanhas e Turmas
          </h1>
          <p className="text-xs text-slate-500">
            Gerencie datas da campanha, catálogo de turmas e tabela de preços
          </p>
        </div>

        <button
          onClick={handleResetSeed}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar Dados Iniciais Padrão
        </button>
      </div>

      {/* 1. Campaign Settings & Deadlines */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-black text-slate-900 font-['Outfit'] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-600" />
          Configuração da Campanha Ativa
        </h2>

        {activeCampaign && (
          <form onSubmit={handleSaveCampaign} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Data de Encerramento dos Pedidos
                </label>
                <input
                  type="date"
                  value={campaignEndDate}
                  onChange={(e) => setCampaignEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Previsão de Entrega
                </label>
                <input
                  type="text"
                  value={deliveryEstimate}
                  onChange={(e) => setDeliveryEstimate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95"
              >
                Salvar Configurações da Campanha
              </button>
              {campaignSavedFeedback && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Alterações salvas com sucesso!
                </span>
              )}
            </div>
          </form>
        )}
      </div>

      {/* 2. Classes (Turmas) CRUD */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 font-['Outfit'] flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              Turmas Cadastradas ({classes.length})
            </h2>
            <p className="text-xs text-slate-500">
              Cada turma possui sua respectiva camisa e listagem de pedidos
            </p>
          </div>

          <form onSubmit={handleAddClass} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nome da nova turma (Ex: 6º Ano)"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:bg-white outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                {editingClassId === cls.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={editingClassName}
                      onChange={(e) => setEditingClassName(e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                    <button
                      onClick={() => handleSaveClass(cls.id)}
                      className="p-1.5 bg-emerald-600 text-white rounded-lg"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                        <Shirt className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-slate-900">{cls.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingClassId(cls.id);
                          setEditingClassName(cls.name);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              {/* Drag and Drop Uploader is always visible or you could hide it during edit. Let's hide during edit to keep it clean */}
              {editingClassId !== cls.id && (
                <ClassImageUploader
                  classId={cls.id}
                  currentImageUrl={cls.image_url || null}
                  onSuccess={() => setRefresh((p) => p + 1)}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Pricing Table Management */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-black text-slate-900 font-['Outfit'] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Tabela de Preços por Tamanho (Administrável)
          </h2>
          <p className="text-xs text-slate-500">
            Preços dinâmicos armazenados no banco. Pedidos já realizados mantêm o snapshot do valor.
          </p>
        </div>

        {priceLoadError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{priceLoadError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
          {prices.map((p) => (
            <div
              key={p.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1"
            >
              {editingPriceId === p.id ? (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">Tamanho / Nome</label>
                  <input
                    type="text"
                    value={editingSizeLabel}
                    onChange={(e) => setEditingSizeLabel(e.target.value)}
                    className="w-full px-2 py-2 min-h-[40px] bg-white border border-blue-400 rounded-lg text-center text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-200"
                    autoFocus
                  />
                  <label className="block text-[10px] font-black text-slate-600 uppercase">Preço (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={editingPriceValue}
                    onChange={(e) => setEditingPriceValue(e.target.value)}
                    className="w-full px-2 py-2 min-h-[40px] bg-white border border-emerald-500 rounded-lg text-center text-sm font-black text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-200"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePrice(p.id);
                      if (e.key === 'Escape') setEditingPriceId(null);
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingPriceId(p.id);
                    setEditingSizeLabel(p.size_label);
                    setEditingPriceValue((p.price_cents / 100).toFixed(2));
                  }}
                  className="w-full rounded-xl border border-transparent hover:border-blue-200 hover:bg-white py-2 transition-colors"
                  title="Editar tamanho e preço"
                >
                  <span className="text-xs font-black text-slate-900 block">{p.size_label}</span>
                  <span className="text-xs font-extrabold text-blue-700 block mt-1">{formatCurrency(p.price_cents)}</span>
                  <span className="text-[10px] font-bold text-slate-600 block mt-1">Editar</span>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
          {priceSavedFeedback && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Preço salvo com sucesso!
            </span>
          )}
          <button
            onClick={() => editingPriceId && handleSavePrice(editingPriceId)}
            disabled={!editingPriceId || isSavingPrice}
            className="w-full sm:w-auto min-h-[44px] px-8 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl shadow transition-all flex items-center justify-center"
          >
            {isSavingPrice ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </div>
    </div>
  );
};
