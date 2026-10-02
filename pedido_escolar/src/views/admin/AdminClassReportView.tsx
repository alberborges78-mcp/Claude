import React, { useState, useEffect, useCallback } from 'react';
import {
  Printer,
  Download,
  Filter,
  Users,
  Loader2,
} from 'lucide-react';
import { db } from '../../services/db';
import { formatCurrency, formatDateTime, formatPhone } from '../../utils/formatters';
import type { Campaign, ClassItem, ClassReportSummary, School } from '../../types';

export const AdminClassReportView: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'DELIVERED' | 'UNDELIVERED'>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [activeCampaign, setActiveCampaign] = useState<Campaign | undefined>(undefined);
  const [activeClass, setActiveClass] = useState<ClassItem | undefined>(undefined);

  const [report, setReport] = useState<ClassReportSummary | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Load schools on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingSchools(true);
      try {
        const all = await db.getSchoolsAsync();
        if (cancelled) return;
        setSchools(all);
        if (all.length > 0) {
          setSelectedSchoolId(prev => {
            const stillValid = all.find(s => s.id === prev);
            return stillValid ? prev : all[0].id;
          });
        } else {
          setSelectedSchoolId('');
        }
      } finally {
        if (!cancelled) setLoadingSchools(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Load campaigns when school changes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedSchoolId) {
        setCampaigns([]);
        setSelectedCampaignId('');
        return;
      }
      setLoadingCampaigns(true);
      try {
        const all = await db.getCampaignsAsync(selectedSchoolId);
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
  }, [selectedSchoolId]);

  // Load classes when campaign changes
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

  // Resolve active campaign and class names via async lookup
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      const camp = selectedCampaignId ? await db.getCampaignByIdAsync(selectedCampaignId) : undefined;
      const cls = selectedClassId ? await db.getClassByIdAsync(selectedClassId) : undefined;
      if (!cancelled) {
        setActiveCampaign(camp);
        setActiveClass(cls);
      }
    };
    resolve();
    return () => { cancelled = true; };
  }, [selectedCampaignId, selectedClassId]);

  // Load report when campaign, class, or status filter changes
  const loadReport = useCallback(async () => {
    if (!selectedCampaignId || !selectedClassId) {
      setReport(null);
      setReportError(null);
      return;
    }
    setLoadingReport(true);
    setReportError(null);
    try {
      const result = await db.getClassReportAsync(selectedCampaignId, selectedClassId, statusFilter);
      setReport(result);
    } catch (err) {
      console.error('Erro ao carregar relatório:', err);
      setReport(null);
      setReportError(err instanceof Error ? err.message : 'Erro desconhecido ao consultar pedidos.');
    } finally {
      setLoadingReport(false);
    }
  }, [selectedCampaignId, selectedClassId, statusFilter]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Apply date filters client-side on the loaded report
  const filteredReport = React.useMemo(() => {
    if (!report) return null;
    if (!dateFrom && !dateTo) return report;

    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59.999') : null;

    const filteredRows = report.rows.filter(r => {
      const created = new Date(r.created_at);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });

    // Recalculate summary totals based on filtered rows
    let totalItems = 0;
    let paidItemsCount = 0;
    let unpaidItemsCount = 0;
    let totalAmountCents = 0;
    let paidAmountCents = 0;
    let unpaidAmountCents = 0;
    const orderIds = new Set<string>();

    for (const row of filteredRows) {
      orderIds.add(row.order_id);
      totalItems += row.quantity;
      totalAmountCents += row.subtotal_cents;
      if (row.payment_status === 'PAGO') {
        paidItemsCount += row.quantity;
        paidAmountCents += row.subtotal_cents;
      } else {
        unpaidItemsCount += row.quantity;
        unpaidAmountCents += row.subtotal_cents;
      }
    }

    return {
      ...report,
      total_orders: orderIds.size,
      total_items: totalItems,
      paid_items_count: paidItemsCount,
      unpaid_items_count: unpaidItemsCount,
      total_amount_cents: totalAmountCents,
      paid_amount_cents: paidAmountCents,
      unpaid_amount_cents: unpaidAmountCents,
      rows: filteredRows,
    };
  }, [report, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (!filteredReport || filteredReport.rows.length === 0) {
      alert('Nenhum dado disponível para exportação.');
      return;
    }

    const headers = [
      'Pedido',
      'Data',
      'Aluno',
      'Responsável',
      'WhatsApp',
      'Tamanho',
      'Nome Estampa',
      'Número Estampa',
      'Quantidade',
      'Valor Unitário (R$)',
      'Subtotal (R$)',
      'Status Pagamento',
      'Status Produção',
      'Status Entrega',
    ];

    const rows = filteredReport.rows.map((r) => [
      r.order_number,
      formatDateTime(r.created_at),
      `"${r.student_name}"`,
      `"${r.customer_name}"`,
      formatPhone(r.customer_whatsapp),
      r.size_label,
      `"${r.custom_name}"`,
      `"${r.custom_number}"`,
      r.quantity,
      (r.unit_price_cents / 100).toFixed(2),
      (r.subtotal_cents / 100).toFixed(2),
      r.payment_status === 'PAGO' ? 'PAGO' : 'NÃO PAGO',
      r.production_status,
      r.delivery_status,
    ]);

    const csvContent = '﻿' + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `relatorio_${filteredReport.class_name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const isLoading = loadingSchools || loadingCampaigns || loadingClasses || loadingReport;

  return (
    <div className="space-y-6">
      {/* View Header & Action Controls (no-print) */}
      <div className="no-print bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] flex items-center gap-2">
              <Users className="w-6 h-6 text-sky-600" />
              Relatório Operacional por Turma
            </h1>
            <p className="text-xs text-slate-500">
              Listagem completa de pedidos, alunos, personalizações e status operacionais
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={!filteredReport || filteredReport.rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              Imprimir Relatório
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!filteredReport || filteredReport.rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Exportar CSV / Excel
            </button>
          </div>
        </div>

        {/* Selection Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Escola */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Escola
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => {
                setSelectedSchoolId(e.target.value);
              }}
              disabled={loadingSchools}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none disabled:opacity-50"
            >
              {loadingSchools ? (
                <option>Carregando...</option>
              ) : schools.length === 0 ? (
                <option value="">Nenhuma escola</option>
              ) : (
                schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Campanha */}
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

          {/* Turma */}
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

        {/* Quick Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtrar por:
          </span>
          {[
            { key: 'ALL', label: 'Todos' },
            { key: 'PAID', label: 'Apenas Pagos' },
            { key: 'UNPAID', label: 'Não Pagos' },
            { key: 'DELIVERED', label: 'Entregues' },
            { key: 'UNDELIVERED', label: 'Aguardando Retirada' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                statusFilter === tab.key
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Data Inicial</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Data Final</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Print Document Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Printable Official Header */}
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-sky-600">
              SEVEN MALHARIA • RELATÓRIO DE PEDIDOS POR TURMA
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-['Outfit'] mt-1">
              Turma: {activeClass?.name || 'Selecione uma turma'}
            </h2>
            <p className="text-xs text-slate-500">
              Escola: <strong>{schools.find(s => s.id === selectedSchoolId)?.name || '-'}</strong> | Campanha: <strong>{activeCampaign?.name || '-'}</strong>
            </p>
          </div>

          <div className="text-right text-xs text-slate-400">
            <p>Data do relatório:</p>
            <p className="font-bold text-slate-700">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="text-xs font-bold">Carregando dados do relatório...</span>
          </div>
        )}

        {/* Error State */}
        {!isLoading && reportError && (
          <div className="py-8 px-4 bg-red-50 border border-red-200 rounded-2xl text-center space-y-2">
            <p className="text-sm font-black text-red-700">Erro ao carregar relatório</p>
            <p className="text-xs text-red-600 max-w-xl mx-auto break-words">{reportError}</p>
            <button
              onClick={loadReport}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Operational Figures Summary Cards */}
        {!isLoading && filteredReport && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total de Pedidos</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">{filteredReport.total_orders}</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total de Camisas</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">{filteredReport.total_items}</p>
            </div>
            <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
              <span className="text-[10px] font-bold uppercase text-emerald-600">Pagos</span>
              <p className="text-lg font-black text-emerald-700 mt-0.5">{filteredReport.paid_items_count}</p>
            </div>
            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-100">
              <span className="text-[10px] font-bold uppercase text-amber-600">Pendentes</span>
              <p className="text-lg font-black text-amber-700 mt-0.5">{filteredReport.unpaid_items_count}</p>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        {!isLoading && filteredReport && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900 p-4 rounded-2xl text-white">
              <span className="text-[10px] font-bold uppercase text-slate-400">Valor Total</span>
              <p className="text-xl font-black mt-1">{formatCurrency(filteredReport.total_amount_cents)}</p>
            </div>
            <div className="bg-emerald-600 p-4 rounded-2xl text-white">
              <span className="text-[10px] font-bold uppercase text-emerald-200">Recebido</span>
              <p className="text-xl font-black mt-1">{formatCurrency(filteredReport.paid_amount_cents)}</p>
            </div>
            <div className="bg-amber-500 p-4 rounded-2xl text-white">
              <span className="text-[10px] font-bold uppercase text-amber-200">A Receber</span>
              <p className="text-xl font-black mt-1">{formatCurrency(filteredReport.unpaid_amount_cents)}</p>
            </div>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && filteredReport && filteredReport.rows.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Pedido</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Data</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Aluno</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Responsável</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Tamanho</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 whitespace-nowrap">Estampa</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 text-center whitespace-nowrap">Qtd</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 text-right whitespace-nowrap">Valor</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 text-center whitespace-nowrap">Pagamento</th>
                  <th className="px-3 py-2.5 font-bold text-slate-600 text-center whitespace-nowrap">Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReport.rows.map((row, idx) => (
                  <tr key={`${row.order_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2 font-mono font-bold text-sky-700 whitespace-nowrap">{row.order_number}</td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
                    <td className="px-3 py-2 font-bold text-slate-800">{row.student_name}</td>
                    <td className="px-3 py-2 text-slate-600">{row.customer_name}</td>
                    <td className="px-3 py-2 font-bold text-slate-700">{row.size_label}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {row.custom_name !== '-' ? row.custom_name : ''}
                      {row.custom_number !== '-' ? ` #${row.custom_number}` : ''}
                      {row.custom_name === '-' && row.custom_number === '-' ? '-' : ''}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-slate-700">{row.quantity}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700 whitespace-nowrap">{formatCurrency(row.subtotal_cents)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                        row.payment_status === 'PAGO'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {row.payment_status === 'PAGO' ? 'PAGO' : 'PENDENTE'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black ${
                        row.delivery_status === 'ENTREGUE'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {row.delivery_status === 'ENTREGUE' ? 'ENTREGUE' : 'RETIRADA'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredReport && filteredReport.rows.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Filter className="w-8 h-8 opacity-40" />
            <span className="text-sm font-bold">Nenhum pedido encontrado para os filtros selecionados.</span>
          </div>
        )}
      </div>
    </div>
  );
};