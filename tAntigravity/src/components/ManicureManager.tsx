import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Users, Phone, Star, ToggleLeft, ToggleRight } from 'lucide-react';
import type { Manicure } from '../types';

interface ManicureManagerProps {
  manicures: Manicure[];
  onAddManicure: (manicure: Omit<Manicure, 'id'>) => void;
  onUpdateManicure: (id: string, updates: Partial<Omit<Manicure, 'id'>>) => void;
  onDeleteManicure: (id: string) => void;
}

const EMOJI_OPTIONS = ['💅', '✨', '🌸', '💎', '🌺', '🎀', '💕', '🦋', '🌹', '⭐'];

const EMPTY_FORM = {
  name: '',
  phone: '',
  specialties: [] as string[],
  avatar_emoji: '💅',
  is_active: true
};

export const ManicureManager: React.FC<ManicureManagerProps> = ({
  manicures,
  onAddManicure,
  onUpdateManicure,
  onDeleteManicure
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openNewForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setSpecialtyInput('');
    setIsFormOpen(true);
  };

  const openEditForm = (manicure: Manicure) => {
    setForm({
      name: manicure.name,
      phone: manicure.phone,
      specialties: [...manicure.specialties],
      avatar_emoji: manicure.avatar_emoji,
      is_active: manicure.is_active
    });
    setEditingId(manicure.id);
    setSpecialtyInput('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSpecialtyInput('');
  };

  const handleAddSpecialty = () => {
    const trimmed = specialtyInput.trim();
    if (trimmed && !form.specialties.includes(trimmed)) {
      setForm(prev => ({ ...prev, specialties: [...prev.specialties, trimmed] }));
      setSpecialtyInput('');
    }
  };

  const handleRemoveSpecialty = (spec: string) => {
    setForm(prev => ({ ...prev, specialties: prev.specialties.filter(s => s !== spec) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return;

    if (editingId) {
      onUpdateManicure(editingId, form);
    } else {
      onAddManicure(form);
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    onDeleteManicure(id);
    setDeleteConfirmId(null);
  };

  const handleToggleActive = (manicure: Manicure) => {
    onUpdateManicure(manicure.id, { is_active: !manicure.is_active });
  };

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px', marginBottom: '18px',
        paddingBottom: '14px', borderBottom: '1px solid var(--border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--secondary)' }}>
              Equipe de Manicures
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            Cadastre as profissionais do seu studio. A cliente escolhe com quem agendar.
          </p>
        </div>
        <button onClick={openNewForm} className="btn-primary" style={{ padding: '10px 18px', fontSize: '0.88rem' }}>
          <Plus size={16} />
          <span>Nova Manicure</span>
        </button>
      </div>

      {/* Form */}
      {isFormOpen && (
        <div className="animate-fade-in" style={{
          marginBottom: '20px', padding: '20px',
          background: 'var(--primary-light)', borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>
              {editingId ? '✏️ Editar Manicure' : '💅 Nova Manicure'}
            </h4>
            <button onClick={closeForm} style={{
              width: '30px', height: '30px', borderRadius: '50%', background: 'var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)'
            }}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Emoji Avatar */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '6px' }}>
                Emoji / Avatar
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, avatar_emoji: emoji }))}
                    style={{
                      width: '38px', height: '38px', fontSize: '1.2rem', borderRadius: 'var(--radius-sm)',
                      border: form.avatar_emoji === emoji ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: form.avatar_emoji === emoji ? 'var(--primary-light)' : 'var(--surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Nome e Telefone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '4px' }}>
                  Nome *
                </label>
                <input
                  type="text" required value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Fernanda"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', fontSize: '0.9rem', background: 'var(--surface)'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '4px' }}>
                  Telefone / WhatsApp *
                </label>
                <input
                  type="tel" required value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-8888"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', fontSize: '0.9rem', background: 'var(--surface)'
                  }}
                />
              </div>
            </div>

            {/* Especialidades */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '4px' }}>
                Especialidades
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text" value={specialtyInput}
                  onChange={e => setSpecialtyInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSpecialty(); } }}
                  placeholder="Ex: Alongamento em Fibra"
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', fontSize: '0.85rem', background: 'var(--surface)'
                  }}
                />
                <button type="button" onClick={handleAddSpecialty} className="btn-outline" style={{ padding: '8px 14px' }}>
                  <Plus size={14} />
                </button>
              </div>
              {form.specialties.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                  {form.specialties.map(spec => (
                    <span key={spec} style={{
                      padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem',
                      fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-main)'
                    }}>
                      {spec}
                      <button type="button" onClick={() => handleRemoveSpecialty(spec)} style={{ color: 'var(--status-busy)', lineHeight: 1 }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                <Check size={16} />
                <span>{editingId ? 'Salvar Alterações' : 'Cadastrar Manicure'}</span>
              </button>
              <button type="button" onClick={closeForm} className="btn-outline">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {manicures.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <Users size={40} style={{ color: 'var(--primary)', opacity: 0.4, margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1rem', color: 'var(--secondary)', marginBottom: '6px' }}>
            Nenhuma manicure cadastrada
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Adicione as profissionais da sua equipe para que as clientes possam escolher.
          </p>
          <button onClick={openNewForm} className="btn-primary">
            <Plus size={16} />
            <span>Cadastrar Primeira Manicure</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {manicures.map(manicure => (
            <div
              key={manicure.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderRadius: 'var(--radius-md)',
                background: manicure.is_active ? 'var(--surface)' : 'var(--surface-muted)',
                border: '1px solid var(--border)', flexWrap: 'wrap', gap: '10px',
                opacity: manicure.is_active ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                {/* Avatar */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%', fontSize: '1.4rem',
                  background: 'var(--primary-light)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0
                }}>
                  {manicure.avatar_emoji}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      {manicure.name}
                    </h4>
                    <span style={{
                      padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.65rem',
                      fontWeight: 700, background: manicure.is_active ? 'var(--status-free-bg)' : 'var(--status-busy-bg)',
                      color: manicure.is_active ? 'var(--status-free)' : 'var(--status-busy)'
                    }}>
                      {manicure.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <Phone size={12} />
                    {manicure.phone}
                  </div>

                  {manicure.specialties.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                      {manicure.specialties.map(spec => (
                        <span key={spec} style={{
                          padding: '2px 7px', borderRadius: 'var(--radius-full)',
                          fontSize: '0.68rem', fontWeight: 600,
                          background: 'var(--surface-muted)', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center', gap: '3px'
                        }}>
                          <Star size={9} />
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => handleToggleActive(manicure)} style={{
                  padding: '7px 8px', borderRadius: 'var(--radius-sm)', color: manicure.is_active ? 'var(--status-free)' : 'var(--text-muted)'
                }} title={manicure.is_active ? 'Desativar' : 'Ativar'}>
                  {manicure.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>

                <button onClick={() => openEditForm(manicure)} style={{
                  padding: '7px 12px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-muted)', color: 'var(--text-main)',
                  fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px'
                }} title="Editar">
                  <Pencil size={14} />
                  <span>Editar</span>
                </button>

                {deleteConfirmId === manicure.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button onClick={() => handleDelete(manicure.id)} style={{
                      padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--status-busy)', color: '#FFFFFF',
                      fontSize: '0.78rem', fontWeight: 700
                    }}>Confirmar</button>
                    <button onClick={() => setDeleteConfirmId(null)} style={{
                      padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--surface-muted)', color: 'var(--text-muted)',
                      fontSize: '0.78rem', fontWeight: 600
                    }}>Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirmId(manicure.id)} style={{
                    padding: '7px 8px', borderRadius: 'var(--radius-sm)', color: 'var(--status-busy)', fontSize: '0.8rem'
                  }} title="Excluir">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {manicures.length > 0 && (
        <div style={{
          marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)',
          fontSize: '0.82rem', color: 'var(--text-muted)'
        }}>
          {manicures.filter(m => m.is_active).length} profissional(is) ativa(s) de {manicures.length} cadastrada(s)
        </div>
      )}
    </div>
  );
};
