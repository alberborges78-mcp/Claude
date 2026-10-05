import React, { useState, useEffect } from 'react';
import {
  Package,
  Shirt,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Clock,
  QrCode,
  Users,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { db } from '../../services/db';
import { formatCurrency } from '../../utils/formatters';

interface AdminDashboardViewProps {
  onTabChange: (tab: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onTabChange }) => {
  const campaign = db.getActiveCampaign() || db.getCampaigns()[0];

  // State for top cards (async)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalPieces: 0,
    paidOrders: 0,
    unpaidOrders: 0,
    totalRevenueCents: 0,
    paidRevenueCents: 0,
    pendingRevenueCents: 0,
    deliveredCount: 0,
    pendingDeliveryCount: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // State for class breakdown (async)
  const [classBreakdown, setClassBreakdown] = useState<any[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [classError, setClassError] = useState<string | null>(null);

  // Load top stats asynchronously
  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      if (!campaign) return;
      setIsLoadingStats(true);
      setStatsError(null);
      try {
        const data = await db.getDashboardStatsAsync(campaign.id);
        if (mounted) {
          setStats(data);
        }
      } catch (err) {
        console.error('Erro ao carregar estatísticas do dashboard:', err);
        if (mounted) {
          setStatsError(err instanceof Error ? err.message : 'Falha ao carregar métricas.');
        }
      } finally {
        if (mounted) {
          setIsLoadingStats(false);
        }
      }
    };
    loadStats();
    return () => {
      mounted = false;
    };
  }, [campaign]);

  // Load class breakdown asynchronously
  useEffect(() => {
    let mounted = true;
    const loadSummary = async () => {
      if (!campaign) return;
      setIsLoadingClasses(true);
      setClassError(null);
      try {
        const summary = await db.getCampaignGeneralSummary(campaign.id);
        if (mounted) {
          setClassBreakdown(summary);
        }
      } catch (err) {
        console.error('Erro ao carregar resumo da campanha:', err);
        if (mounted) {
          setClassError(err instanceof Error ? err.message : 'Falha ao carregar dados das turmas.');
        }
      } finally {
        if (mounted) {
          setIsLoadingClasses(false);
        }
      }
    };
    loadSummary();
    return () => {
      mounted = false;
    };
  }, [campaign]);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-[#0F4D49] text-white border border-teal-700 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-sky-400 bg-sky-950/60 px-3 py-1 rounded-full border border-sky-800/60">
            PAINEL OPERACIONAL
          </span>
          <h1 className="text-2xl sm:text-3xl font-black font-['Outfit']">
            {campaign?.name || 'Campanha de Uniformes 2026'}
          </h1>
          <p className="text-xs text-teal-100">
            Escola: <strong className="text-white">COLÉGIO CONCEITO</strong> • Loja: <strong className="text-white">SEVEN MALHARIA</strong>
          </p>
        </div>
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onTabChange('scanner')}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            Scanner de Retirada
          </button>
          <button
            onClick={() => onTabChange('class-report')}
            className="px-4 py-2.5 bg-[#166B64] hover:bg-teal-700 text-white rounded-xl text-xs font-black border border-teal-600 flex items-center gap-1.5 transition-all"
          >
            <Users className="w-4 h-4 text-sky-400" />
            Relatório por Turma
          </button>
        </div>
      </div>

      {/* Operational Stats Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-teal-100 mb-3">
          Métricas Operacionais dos Pedidos
        </h2>

        {isLoadingStats ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-sky-600" />
            <p className="text-xs font-bold">Carregando métricas...</p>
          </div>
        ) : statsError ? (
          <div className="p-6 text-center text-red-600 bg-red-50 rounded-3xl border border-red-200">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs font-bold">{statsError}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* 1. Total Pedidos */}
              <div className="bg-[#0F4D49] p-5 rounded-3xl border border-teal-700 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-100 uppercase">Pedidos</span>
                  <Package className="w-4 h-4 text-sky-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
                  {stats.totalOrders}
                </p>
                <p className="text-[11px] text-teal-200 font-medium">pedidos registrados</p>
              </div>
              {/* 2. Total Peças */}
              <div className="bg-[#0F4D49] p-5 rounded-3xl border border-teal-700 shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-100 uppercase">Total de Peças</span>
                  <Shirt className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white font-['Outfit']">
                  {stats.totalPieces}
                </p>
                <p className="text-[11px] text-teal-200 font-medium">camisas no total</p>
              </div>
              {/* 3. Pagos */}
              <div className="bg-[#166B64] p-5 rounded-3xl border border-emerald-500 text-white shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-emerald-200">Pedidos Pagos</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-black font-['Outfit']">
                  {stats.paidOrders}
                </p>
                <p className="text-[11px] text-emerald-200 font-semibold">
                  {formatCurrency(stats.paidRevenueCents)} recebidos
                </p>
              </div>
              {/* 4. Não Pagos */}
              <div className="bg-[#166B64] p-5 rounded-3xl border border-red-400 text-white shadow-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-red-300">Aguardando Pagamento</span>
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl sm:text-3xl font-black font-['Outfit']">
                  {stats.unpaidOrders}
                </p>
                <p className="text-[11px] text-red-200 font-semibold">
                  {formatCurrency(stats.pendingRevenueCents)} a receber
                </p>
              </div>
            </div>

            {/* Financial Summary Strip */}
            <div className="mt-4 bg-[#0B3F3B] text-white border border-teal-700 rounded-3xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400">
                  Valor Total dos Pedidos:
                </span>
                <p className="text-xl sm:text-2xl font-black text-white font-['Outfit'] mt-0.5">
                  {formatCurrency(stats.totalRevenueCents)}
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-emerald-400">
                  Valor Pago Confirmado:
                </span>
                <p className="text-xl sm:text-2xl font-black text-emerald-400 font-['Outfit'] mt-0.5">
                  {formatCurrency(stats.paidRevenueCents)}
                </p>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider text-amber-400">
                  Valor Pendente (Cobrar na Retirada):
                </span>
                <p className="text-xl sm:text-2xl font-black text-amber-400 font-['Outfit'] mt-0.5">
                  {formatCurrency(stats.pendingRevenueCents)}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Campaign General Overview by Class */}
      <div className="bg-[#0F4D49] rounded-3xl border border-teal-700 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white font-['Outfit']">
              Visão Geral da Campanha por Turma
            </h2>
            <p className="text-xs text-teal-100">
              Acompanhamento operacional por cada turma cadastrada
            </p>
          </div>
          <button
            onClick={() => onTabChange('production-map')}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            Ver Mapa de Produção Completo <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoadingClasses ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2 text-sky-600" />
            <p className="text-xs font-bold">Carregando dados das turmas...</p>
          </div>
        ) : classError ? (
          <div className="py-8 text-center text-red-600 bg-red-50 rounded-2xl border border-red-200">
            <AlertCircle className="w-6 h-6 mx-auto mb-2" />
            <p className="text-xs font-bold">{classError}</p>
          </div>
        ) : classBreakdown.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Nenhuma turma encontrada para esta campanha.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#166B64] text-teal-50 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3">Turma</th>
                  <th className="p-3 text-center">Pedidos</th>
                  <th className="p-3 text-center">Total de Peças</th>
                  <th className="p-3 text-center">Peças Pagas</th>
                  <th className="p-3 text-center">Peças Não Pagas</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {classBreakdown.map((item) => (
                  <tr key={item.classId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-extrabold text-white">{item.className}</td>
                    <td className="p-3 text-center font-bold text-teal-50">{item.ordersCount}</td>
                    <td className="p-3 text-center font-black text-sky-800">{item.piecesCount}</td>
                    <td className="p-3 text-center">
                      <span className="text-emerald-100 font-bold bg-emerald-700 px-2 py-0.5 rounded-md">
                        {item.paidCount}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-red-100 font-bold bg-red-700 px-2 py-0.5 rounded-md">
                        {item.unpaidCount}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onTabChange('class-report')}
                        className="text-[11px] font-bold text-cyan-300 hover:text-white hover:underline"
                      >
                        Ver Relatório
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};