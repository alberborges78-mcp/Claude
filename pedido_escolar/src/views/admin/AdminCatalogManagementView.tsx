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

  // Grade de tamanhos: edição em lote, persistida somente no botão Salvar.
  const [draftPrices, setDraftPrices] = useState<any[]>([]);
  const [deletedPriceIds, setDeletedPriceIds] = useState<string[]>([]);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [priceSavedFeedback, setPriceSavedFeedback] = useState(false);

  React.useEffect(() => {
    setDraftPrices(prices.map((p) => ({
      ...p,
      _price: (p.price_cents / 100).toFixed(2).replace('.', ','),
      _new: false,
    })));
    setDeletedPriceIds([]);
  }, [prices]);

  const updateDraftPrice = (key: string, field: 'size_label' | '_price', value: string) => {
    setDraftPrices((current) => current.map((p) => (p.id === key ? { ...p, [field]: value } : p)));
  };

  const handleAddPriceRow = () => {
    if (!activeCampaign) return;
    setDraftPrices((current) => [...current, {
      id: `new-${Date.now()}`,
      campaign_id: activeCampaign.id,
      size_label: '',
      _price: '',
      _new: true,
      order_index: current.length,
    }]);
  };

  const handleRemovePriceRow = (row: any) => {
    if (!row._new) setDeletedPriceIds((current) => [...current, row.id]);
    setDraftPrices((current) => current.filter((p) => p.id !== row.id));
  };

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

  const handleSaveAllPrices = async () => {
    if (!activeCampaign) return;

    const normalized = draftPrices.map((p) => ({
      ...p,
      label: p.size_label.trim(),
      cents: Math.round(parseFloat(String(p._price).replace(',', '.')) * 100),
    }));
    if (normalized.some((p) => !p.label || !Number.isFinite(p.cents) || p.cents <= 0)) {
      alert('Preencha todos os tamanhos e preços antes de salvar.');
      return;
    }
    const labels = normalized.map((p) => p.label.toLocaleLowerCase('pt-BR'));
    if (new Set(labels).size !== labels.length) {
      alert('Não pode haver tamanhos com o mesmo nome na campanha.');
      return;
    }

    setIsSavingPrice(true);
    try {
      for (const id of deletedPriceIds) await db.deletePrice(id);
      for (let index = 0; index < normalized.length; index += 1) {
        const p = normalized[index];
        if (p._new) await db.createPrice(activeCampaign.id, p.label, p.cents, index);
        else await db.updatePrice(p.id, p.cents, p.label);
      }
      setPriceSavedFeedback(true);
      setTimeout(() => setPriceSavedFeedback(false), 3000);
      setRefresh((p) => p + 1);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Erro ao salvar a tabela de tamanhos. Os dados serão recarregados.');
      setRefresh((p) => p + 1);
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {draftPrices.map((p) => (
            <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-black text-slate-600 uppercase">Tamanho / Nome</label>
                <button type="button" onClick={() => handleRemovePriceRow(p)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50" title="Excluir tamanho">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input type="text" value={p.size_label} onChange={(e) => updateDraftPrice(p.id, 'size_label', e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              <label className="block text-[10px] font-black text-slate-600 uppercase">Preço (R$)</label>
              <input type="text" inputMode="decimal" value={p._price} onChange={(e) => updateDraftPrice(p.id, '_price', e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-blue-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <button type="button" onClick={handleAddPriceRow}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-black text-sm rounded-xl flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar tamanho
          </button>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {priceSavedFeedback && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-4 h-4" /> Tabela salva com sucesso!
              </span>
            )}
            <button type="button" onClick={handleSaveAllPrices} disabled={isSavingPrice}
              className="w-full sm:w-auto min-h-[44px] px-8 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-400 text-white font-black text-sm rounded-xl shadow flex items-center justify-center">
              {isSavingPrice ? 'SALVANDO...' : 'SALVAR TODAS AS ALTERAÇÕES'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
