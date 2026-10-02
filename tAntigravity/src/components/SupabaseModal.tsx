import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, RefreshCw, Key } from 'lucide-react';
import { storageService } from '../lib/storage';
import { isSupabaseConnected, resetSupabaseClient } from '../lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated
}) => {
  const currentConfig = storageService.getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig?.url || '');
  const [anonKey, setAnonKey] = useState(currentConfig?.anonKey || '');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const connected = isSupabaseConnected();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setStatusMessage('Por favor preencha a URL e a Anon Key do Supabase.');
      return;
    }

    storageService.setSupabaseConfig({
      url: url.trim(),
      anonKey: anonKey.trim()
    });

    resetSupabaseClient();
    onConfigUpdated();
    setStatusMessage('Configurações salvas! Conexão Supabase atualizada.');
  };

  const handleResetToDemo = () => {
    storageService.setSupabaseConfig(null);
    resetSupabaseClient();
    setUrl('');
    setAnonKey('');
    onConfigUpdated();
    setStatusMessage('Modo Demonstração Local reativado com sucesso.');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(45, 36, 36, 0.65)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 120,
      padding: '16px'
    }}>
      <div className="glass-card animate-fade-in" style={{
        maxWidth: '520px',
        width: '100%',
        padding: '24px',
        borderRadius: 'var(--radius-lg)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#3ECF8E', // Verde Supabase
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Database size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--secondary)' }}>
                Configuração do Supabase
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Sincronização em nuvem e banco de dados em tempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--surface-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Status Box */}
        <div style={{
          padding: '14px',
          borderRadius: 'var(--radius-md)',
          background: connected ? 'var(--status-free-bg)' : 'var(--surface-muted)',
          border: '1px solid ' + (connected ? '#C8E6C9' : 'var(--border)'),
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {connected ? (
            <CheckCircle2 size={24} style={{ color: 'var(--status-free)', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={24} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          )}

          <div>
            <h4 style={{
              fontSize: '0.92rem',
              fontWeight: 700,
              color: connected ? 'var(--status-free)' : 'var(--secondary)'
            }}>
              {connected ? 'Supabase Conectado à Nuvem' : 'Modo Demonstração Híbrido Ativo'}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {connected
                ? 'Os agendamentos e horários estão sendo sincronizados diretamente com seu banco Supabase.'
                : 'O aplicativo está salvando e operando localmente no navegador (LocalStorage). Você pode usar 100% das funções imediatamente.'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--secondary)',
              marginBottom: '5px'
            }}>
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://seu-projeto.supabase.co"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: 'var(--secondary)',
              marginBottom: '5px'
            }}>
              Supabase Anon / Public Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={e => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {statusMessage && (
            <p style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
              {statusMessage}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              type="submit"
              className="btn-primary"
              style={{ flex: 1 }}
            >
              <Key size={15} />
              <span>Salvar Credenciais</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDemo}
              className="btn-outline"
            >
              <RefreshCw size={15} />
              <span>Usar Demo Local</span>
            </button>
          </div>
        </form>

        <div style={{
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
          fontSize: '0.75rem',
          color: 'var(--text-light)',
          lineHeight: 1.4
        }}>
          💡 <strong>Dica:</strong> O script de tabelas e permissões SQL já está pronto no arquivo <code>supabase/schema.sql</code>. Basta colá-lo no SQL Editor do seu painel Supabase.
        </div>
      </div>
    </div>
  );
};
