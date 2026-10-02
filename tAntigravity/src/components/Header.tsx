import React from 'react';
import { Sparkles, Calendar as CalendarIcon, History, Shield, Database } from 'lucide-react';
import type { UserProfile } from '../types';

interface HeaderProps {
  currentTab: 'book' | 'history' | 'admin';
  setCurrentTab: (tab: 'book' | 'history' | 'admin') => void;
  currentUser: UserProfile;
  onToggleUserRole: () => void;
  onOpenSupabaseModal: () => void;
  isCloudConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onToggleUserRole,
  onOpenSupabaseModal,
  isCloudConnected
}) => {
  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      backdropFilter: 'blur(8px)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="app-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '12px',
        paddingBottom: '12px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Logo & Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary) 0%, #B86757 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 10px var(--primary-glow)'
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <h1 style={{
              fontSize: '1.25rem',
              lineHeight: 1.1,
              fontWeight: 700,
              color: 'var(--secondary)',
              letterSpacing: '-0.01em'
            }}>
              NailStudio Luxe
            </h1>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontWeight: 500
            }}>
              Agenda Inteligente de Manicure
            </p>
          </div>
        </div>

        {/* Middle Navigation */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--surface-muted)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          gap: '4px'
        }}>
          <button
            onClick={() => setCurrentTab('book')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'book' ? 'var(--surface)' : 'transparent',
              color: currentTab === 'book' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: currentTab === 'book' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <CalendarIcon size={16} />
            <span>Agendar</span>
          </button>

          <button
            onClick={() => setCurrentTab('history')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'history' ? 'var(--surface)' : 'transparent',
              color: currentTab === 'history' ? 'var(--primary)' : 'var(--text-muted)',
              boxShadow: currentTab === 'history' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <History size={16} />
            <span>Minhas Visitas</span>
          </button>

          <button
            onClick={() => setCurrentTab('admin')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: currentTab === 'admin' ? 'var(--secondary)' : 'transparent',
              color: currentTab === 'admin' ? '#FFFFFF' : 'var(--text-muted)',
              boxShadow: currentTab === 'admin' ? 'var(--shadow-sm)' : 'none'
            }}
          >
            <Shield size={15} />
            <span>Painel Manicure</span>
          </button>
        </nav>

        {/* Right Tools: Role & Cloud Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenSupabaseModal}
            title={isCloudConnected ? "Supabase Conectado" : "Modo Demonstração Local"}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.75rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--border)',
              background: isCloudConnected ? '#E8F5E9' : 'var(--surface)',
              color: isCloudConnected ? 'var(--status-free)' : 'var(--text-muted)'
            }}
          >
            <Database size={14} />
            <span>{isCloudConnected ? 'Supabase Nuvem' : 'Modo Demo'}</span>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isCloudConnected ? 'var(--status-free)' : 'var(--accent)'
            }} />
          </button>

          <button
            onClick={onToggleUserRole}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 500,
              background: currentUser.role === 'admin' ? 'var(--primary-light)' : 'var(--surface-muted)',
              color: currentUser.role === 'admin' ? 'var(--primary)' : 'var(--text-main)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{currentUser.role === 'admin' ? '👤 Manicure' : '👤 ' + currentUser.name.split(' ')[0]}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
