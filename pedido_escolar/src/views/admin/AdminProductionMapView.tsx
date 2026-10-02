import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  Layers,
  Sparkles,
  Shirt,
  Loader2,
} from 'lucide-react';
import { db } from '../../services/db';
import type { Campaign, ClassItem } from '../../types';

export const AdminProductionMapView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [productionMap, setProductionMap] = useState<Awaited<ReturnType<typeof db.getProductionMapAsync>> | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);

  const activeCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Load campaigns on mount (async)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingCampaigns(true);
      try {
        const all = await db.getCampaignsAsync();
        if (cancelled) return;
        setCampaigns(all);
        if (all.length > 0) {
          setSelectedCampaignId(prev => {
            const stillValid = all.find(c => c.id === prev);
            return stillValid ? prev : all[0].id;
          });
        } else {
          setSelectedCampaignId('');
        }
      } finally {
        if (!cancelled) setLoadingCampaigns(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Load classes when campaign changes (async)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedCampaignId) {
        setClasses([]);
        setSelectedClassId('');
        return;
      }
      setLoadingClasses(true);
      try {
        const fetched = await db.getClassesByCampaign(selectedCampaignId);
        if (cancelled) return;
        setClasses(fetched);
        if (fetched.length > 0) {
          setSelectedClassId(prev => {
            const stillValid = fetched.find(c => c.id === prev);
            return stillValid ? prev : fetched[0].id;
          });
        } else {
          setSelectedClassId('');
        }
      } finally {
        if (!cancelled) setLoadingClasses(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedCampaignId]);

  // Load production map when campaign + class are selected (async)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedCampaignId || !selectedClassId) {
        setProductionMap(null);
        return;
      }
      setLoadingMap(true);
      try {
        const result = await db.getProductionMapAsync(selectedCampaignId, selectedClassId);
        if (!cancelled) setProductionMap(result);
      } catch (err) {
        console.error('Erro ao carregar mapa de produção:', err);
        if (!cancelled) setProductionMap(null);
      } finally {
        if (!cancelled) setLoadingMap(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedCampaignId, selectedClassId]);

  const handleExportCSV = () => {
    if (!productionMap) return;

    let csvContent = `﻿MAPA DE PRODUCAO - ${productionMap.className.toUpperCase()}
`;
    csvContent += `Grade de Tamanhos
`;
    csvContent += `Tamanho;Categoria;Quantidade
`;
    productionMap.sizeBreakdown.forEach((s) => {
      csvContent += `${s.size_label};${s.category};${s.quantity}
`;
    });
    csvContent += `TOTAL;;${productionMap.totalQuantity}
`;

    csvContent += `Lista de Personalizacoes de Estampa
`;
    csvContent += `Pedido;Aluno;Tamanho;Nome Estampa;Numero Estampa;Peca
`;
    productionMap.customizations.forEach((c) => {
      csvContent += `${c.order_number};"${c.student_name}";${c.size_label};"${c.custom_name}";"${c.custom_number}";${c.piece_index}
`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `mapa_producao_${productionMap.className.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = loadingCampaigns || loadingClasses || loadingMap;

  return (
    <div className="space-y-6">
      {/* Controls / Filter Header */}
      <div className="no-print bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] flex items-center gap-2">
              <Layers className="w-6 h-6 text-sky-600" />
              Mapa de Produção por Turma
            </h1>
            <p className="text-xs text-slate-500">
              Grade de corte/costura agregada por tamanho e listagem de personalizações
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              disabled={!productionMap}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              Imprimir Mapa
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!productionMap}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Campanha
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => {
                setSelectedCampaignId(e.target.value);
              }}
              disabled={loadingCampaigns}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none disabled:opacity-50"
            >
              {loadingCampaigns ? (
                <option>Carregando...</option>
              ) : campaigns.length === 0 ? (
                <option value="">Nenhuma campanha</option>
              ) : (
                campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Turma Selecionada
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={loadingClasses}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-sky-800 focus:bg-white focus:outline-none disabled:opacity-50"
            >
              {loadingClasses ? (
                <option>Carregando...</option>
              ) : classes.length === 0 ? (
                <option value="">Nenhuma turma</option>
              ) : (
                classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <span className="text-xs font-bold">Carregando dados do mapa...</span>
        </div>
      )}

      {/* Production Document Body */}
      {!isLoading && productionMap && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
          {/* Header */}
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-sky-600">
                SEVEN MALHARIA • MAPA DE PRODUÇÃO INDUSTRIAL
              </span>
              <h2 className="text-2xl font-black text-slate-900 font-['Outfit'] mt-1">
                Turma: {productionMap.className}
              </h2>
              <p className="text-xs text-slate-500">
                Campanha: <strong>{activeCampaign?.name}</strong> | Total a confeccionar:{' '}
                <strong className="text-slate-900 text-sm">{productionMap.totalQuantity} peças</strong>
              </p>
            </div>

            <div className="text-right text-xs text-slate-400">
              <p>Data do mapa:</p>
              <p className="font-bold text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Section 1: Size Breakdown Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Shirt className="w-4 h-4 text-sky-600" />
              1. Grade de Tamanhos e Quantidades
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
              {productionMap.sizeBreakdown.map((item) => (
                <div
                  key={item.size_label}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    item.quantity > 0
                      ? 'bg-sky-50/80 border-sky-300 text-sky-950 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <span className="text-xs font-black block">{item.size_label}</span>
                  <span className="text-xl font-black block mt-1 font-['Outfit']">
                    {item.quantity}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-bold opacity-75">
                    {item.quantity === 1 ? 'peça' : 'peças'}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Highlight Bar */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                TOTAL DE CAMISAS DESTA TURMA:
              </span>
              <span className="text-2xl font-black text-sky-400 font-['Outfit']">
                {productionMap.totalQuantity} PEÇAS
              </span>
            </div>
          </div>

          {/* Section 2: Personalizations Table */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                2. Lista de Personalizações para Estamparia ({productionMap.customizations.length})
              </h3>
            </div>

            {productionMap.customizations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="p-2.5 rounded-l-lg">Pedido</th>
                      <th className="p-2.5">Aluno</th>
                      <th className="p-2.5 text-center">Tamanho</th>
                      <th className="p-2.5">Nome a Estampar</th>
                      <th className="p-2.5 text-center">Número</th>
                      <th className="p-2.5 text-center rounded-r-lg">Peça #</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {productionMap.customizations.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2.5 font-bold text-slate-900 font-mono">
                          {c.order_number}
                        </td>
                        <td className="p-2.5 font-extrabold text-slate-900">
                          {c.student_name}
                        </td>
                        <td className="p-2.5 text-center font-black text-slate-800">
                          {c.size_label}
                        </td>
                        <td className="p-2.5 font-bold text-sky-800 uppercase">
                          {c.custom_name}
                        </td>
                        <td className="p-2.5 text-center font-black text-slate-900">
                          {c.custom_number}
                        </td>
                        <td className="p-2.5 text-center text-slate-500">
                          #{c.piece_index}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4">
                Nenhuma personalização cadastrada para as camisas desta turma.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !productionMap && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Layers className="w-8 h-8 opacity-40" />
          <span className="text-sm font-bold">Selecione uma campanha e turma para ver o mapa.</span>
        </div>
      )}
    </div>
  );
};