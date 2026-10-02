import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Users,
  Layers,
  QrCode,
  Settings,
  LogOut,
  ArrowLeft,
  Shield,
  Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminOrdersView } from './AdminOrdersView';
import { AdminClassReportView } from './AdminClassReportView';
import { AdminProductionMapView } from './AdminProductionMapView';
import { AdminQrScannerView } from './AdminQrScannerView';
import { AdminCatalogManagementView } from './AdminCatalogManagementView';

interface AdminLayoutProps {
  onNavigatePublic: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ onNavigatePublic }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'orders', label: 'Pedidos', icon: Package },
    { key: 'class-report', label: 'Relatório por Turma', icon: Users },
    { key: 'production-map', label: 'Mapa de Produção', icon: Layers },
    { key: 'scanner', label: 'Scanner Retirada', icon: QrCode },
    { key: 'catalog-settings', label: 'Catálogo & Preços', icon: Settings },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-20 space-y-6">
      {/* Admin Subheader Bar (no-print) */}
      <div className="no-print bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base font-['Outfit']">
                Painel Administrativo Seven
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-slate-950">
                PRODUÇÃO & OPERAÇÃO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Operador: <strong className="text-slate-200">{user?.name || 'Administrador Seven'}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigatePublic}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Loja Pública
          </button>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/40 text-xs font-bold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </div>

      {/* Tabs Navigation (no-print) */}
      <div className="no-print bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'dashboard' && <AdminDashboardView onTabChange={setActiveTab} />}
        {activeTab === 'orders' && <AdminOrdersView />}
        {activeTab === 'class-report' && <AdminClassReportView />}
        {activeTab === 'production-map' && <AdminProductionMapView />}
        {activeTab === 'scanner' && <AdminQrScannerView />}
        {activeTab === 'catalog-settings' && <AdminCatalogManagementView />}
      </div>
    </div>
  );
};
