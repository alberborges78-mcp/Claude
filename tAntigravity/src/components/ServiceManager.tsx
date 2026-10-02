import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Check, Sparkles, Clock, DollarSign, Tag } from 'lucide-react';
import type { Service } from '../types';

interface ServiceManagerProps {
  services: Service[];
  onAddService: (service: Omit<Service, 'id'>) => void;
  onUpdateService: (id: string, updates: Partial<Omit<Service, 'id'>>) => void;
  onDeleteService: (id: string) => void;
}

const CATEGORIES = ['Unhas', 'Alongamento', 'Spa', 'Tratamento', 'Pedicure', 'Design', 'Outro'];

const EMPTY_FORM = {
  name: '',
  description: '',
  duration_minutes: 60,
  price: 0,
  category: 'Unhas'
};

export const ServiceManager: React.FC<ServiceManagerProps> = ({
  services,
  onAddService,
  onUpdateService,
  onDeleteService
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openNewForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEditForm = (service: Service) => {
    setForm({
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
      category: service.category
    });
    setEditingId(service.id);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      onUpdateService(editingId, form);
    } else {
      onAddService(form);
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    onDeleteService(id);
    setDeleteConfirmId(null);
  };

  const formatPrice = (price: number) =>
    'R$ ' + price.toFixed(2).replace('.', ',');

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '18px',
        paddingBottom: '14px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--secondary)' }}>
              Meus Procedimentos & Preços
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            Cadastre, edite ou remova os serviços que você oferece no seu studio
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="btn-primary"
          style={{ padding: '10px 18px', fontSize: '0.88rem' }}
        >
          <Plus size={16} />
          <span>Novo Procedimento</span>
        </button>
      </div>

      {/* Form Modal Inline */}
      {isFormOpen && (
        <div className="animate-fade-in" style={{
          marginBottom: '20px',
          padding: '20px',
          background: 'var(--primary-light)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--primary)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>
              {editingId ? '✏️ Editar Procedimento' : '✨ Novo Procedimento'}
            </h4>
            <button onClick={closeForm} style={{
              width: '30px', height: '30px', borderRadius: '50%',
              background: 'var(--surface)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--text-muted)'
            }}>
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Nome */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.8rem', fontWeight: 600,
                color: 'var(--secondary)', marginBottom: '4px'
              }}>
                Nome do Procedimento *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Esmaltação em Gel, Alongamento em Fibra..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', fontSize: '0.9rem', background: 'var(--surface)'
                }}
              />
            </div>

            {/* Descrição */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.8rem', fontWeight: 600,
                color: 'var(--secondary)', marginBottom: '4px'
              }}>
                Descrição
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva detalhes do procedimento para a cliente..."
                rows={2}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', fontSize: '0.85rem', resize: 'none',
                  background: 'var(--surface)'
                }}
              />
            </div>

            {/* Linha com Preço, Duração e Categoria */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px'
            }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '0.8rem', fontWeight: 600,
                  color: 'var(--secondary)', marginBottom: '4px'
                }}>
                  Preço (R$) *
                </label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={14} style={{
                    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.price || ''}
                    onChange={e => setForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="45,00"
                    style={{
                      width: '100%', padding: '10px 10px 10px 30px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', fontSize: '0.9rem', background: 'var(--surface)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '0.8rem', fontWeight: 600,
                  color: 'var(--secondary)', marginBottom: '4px'
                }}>
                  Duração (minutos)
                </label>
                <div style={{ position: 'relative' }}>
                  <Clock size={14} style={{
                    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={form.duration_minutes}
                    onChange={e => setForm(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                    style={{
                      width: '100%', padding: '10px 10px 10px 30px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', fontSize: '0.9rem', background: 'var(--surface)'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '0.8rem', fontWeight: 600,
                  color: 'var(--secondary)', marginBottom: '4px'
                }}>
                  Categoria
                </label>
                <div style={{ position: 'relative' }}>
                  <Tag size={14} style={{
                    position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <select
                    value={form.category}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 10px 10px 30px', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)', fontSize: '0.9rem', background: 'var(--surface)',
                      appearance: 'auto'
                    }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Botões do formulário */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                <Check size={16} />
                <span>{editingId ? 'Salvar Alterações' : 'Cadastrar Procedimento'}</span>
              </button>
              <button type="button" onClick={closeForm} className="btn-outline">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Serviços */}
      {services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <Sparkles size={40} style={{ color: 'var(--primary)', opacity: 0.4, margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1rem', color: 'var(--secondary)', marginBottom: '6px' }}>
            Nenhum procedimento cadastrado
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Adicione seus serviços com nome, preço e duração para que suas clientes possam agendar.
          </p>
          <button onClick={openNewForm} className="btn-primary">
            <Plus size={16} />
            <span>Cadastrar Meu Primeiro Serviço</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {services.map(service => (
            <div
              key={service.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                flexWrap: 'wrap',
                gap: '10px',
                transition: 'box-shadow 0.15s ease'
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--secondary)' }}>
                    {service.name}
                  </h4>
                  <span style={{
                    padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    fontSize: '0.68rem', fontWeight: 600,
                    background: 'var(--surface-muted)', color: 'var(--text-muted)'
                  }}>
                    {service.category}
                  </span>
                </div>

                {service.description && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    {service.description}
                  </p>
                )}

                <div style={{
                  display: 'flex', gap: '14px', marginTop: '6px',
                  fontSize: '0.82rem', color: 'var(--text-main)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} style={{ color: 'var(--primary)' }} />
                    {service.duration_minutes} min
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--secondary)', fontSize: '0.95rem' }}>
                    {formatPrice(service.price)}
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => openEditForm(service)}
                  style={{
                    padding: '7px 12px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--surface-muted)', color: 'var(--text-main)',
                    fontSize: '0.8rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '5px'
                  }}
                  title="Editar procedimento"
                >
                  <Pencil size={14} />
                  <span>Editar</span>
                </button>

                {deleteConfirmId === service.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => handleDelete(service.id)}
                      style={{
                        padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--status-busy)', color: '#FFFFFF',
                        fontSize: '0.78rem', fontWeight: 700
                      }}
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      style={{
                        padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--surface-muted)', color: 'var(--text-muted)',
                        fontSize: '0.78rem', fontWeight: 600
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(service.id)}
                    style={{
                      padding: '7px 8px', borderRadius: 'var(--radius-sm)',
                      color: 'var(--status-busy)', fontSize: '0.8rem'
                    }}
                    title="Excluir procedimento"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resumo */}
      {services.length > 0 && (
        <div style={{
          marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '0.82rem', color: 'var(--text-muted)'
        }}>
          <span>{services.length} procedimento{services.length !== 1 ? 's' : ''} cadastrado{services.length !== 1 ? 's' : ''}</span>
          <span>
            Faixa de preços: <strong style={{ color: 'var(--secondary)' }}>
              {formatPrice(Math.min(...services.map(s => s.price)))} – {formatPrice(Math.max(...services.map(s => s.price)))}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
};
