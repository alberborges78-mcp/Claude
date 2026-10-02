import React, { useState } from 'react';
import { X, Calendar, Clock, Sparkles, CheckCircle2, MessageSquare, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Service, Manicure, UserProfile, Appointment } from '../types';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service;
  date: string;
  timeSlot: string;
  currentUser: UserProfile;
  manicures: Manicure[];
  onConfirm: (appointmentData: {
    client_name: string;
    client_phone: string;
    notes: string;
    manicure_id?: string;
    manicure_name?: string;
  }) => Appointment;
  onNavigateToHistory: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  onClose,
  service,
  date,
  timeSlot,
  currentUser,
  manicures,
  onConfirm,
  onNavigateToHistory
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [notes, setNotes] = useState('');
  const [selectedManicureId, setSelectedManicureId] = useState<string>(
    manicures.filter(m => m.is_active)[0]?.id || ''
  );
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  // Formatar data
  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Por favor, informe seu nome e telefone.');
      return;
    }

    const selectedManicure = manicures.find(m => m.id === selectedManicureId);

    onConfirm({
      client_name: name,
      client_phone: phone,
      notes,
      manicure_id: selectedManicure?.id,
      manicure_name: selectedManicure?.name
    });

    setIsSuccess(true);

    // Efeito de confetes festivo de confirmação
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D48B7B', '#D4AF37', '#FAF7F5', '#3E2723']
      });
    } catch {
      // Ignorar se confetti falhar
    }
  };

  // Gerar link do WhatsApp da manicure
  const handleOpenWhatsApp = () => {
    const selectedManicure = manicures.find(m => m.id === selectedManicureId);
    const manicuristPhone = (selectedManicure?.phone || '5511999998888').replace(/\D/g, '');
    const manicuristName = selectedManicure?.name || 'Manicure';
    const message = `✨ Olá${manicuristName ? ', ' + manicuristName : ''}! Acabei de agendar um horário no *NailStudio Luxe*:\n\n` +
      `💅 *Procedimento:* ${service.name}\n` +
      `📅 *Data:* ${formatDateFriendly(date)}\n` +
      `⏰ *Horário:* ${timeSlot}\n` +
      `💰 *Valor:* R$ ${service.price.toFixed(2).replace('.', ',')}\n` +
      `👤 *Cliente:* ${name}\n` +
      (notes ? `📝 *Observação:* ${notes}\n\n` : `\n`) +
      `Por favor, confirme meu agendamento! Obrigada.`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${manicuristPhone}?text=${encoded}`, '_blank');
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
      zIndex: 100,
      padding: '16px'
    }}>
      <div className="glass-card animate-fade-in" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '24px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-modal)',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
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

        {!isSuccess ? (
          <div>
            <div style={{ marginBottom: '18px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                marginBottom: '8px'
              }}>
                <Sparkles size={13} />
                <span>Confirmar Reserva</span>
              </div>
              <h2 style={{ fontSize: '1.3rem', color: 'var(--secondary)', fontWeight: 700 }}>
                Revise seu Agendamento
              </h2>
            </div>

            {/* Summary Card */}
            <div style={{
              background: 'var(--surface-muted)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)' }}>
                  {service.name}
                </h4>
                <span style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--primary)'
                }}>
                  R$ {service.price.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <Calendar size={15} style={{ color: 'var(--primary)' }} />
                  <span style={{ textTransform: 'capitalize' }}>{formatDateFriendly(date)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <Clock size={15} style={{ color: 'var(--primary)' }} />
                  <span>Horário: <strong>{timeSlot}</strong> ({service.duration_minutes} minutos)</span>
                </div>
              </div>
            </div>

            {/* Manicure Selector */}
            {manicures.filter(m => m.is_active).length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontSize: '0.82rem', fontWeight: 600, color: 'var(--secondary)', marginBottom: '8px'
                }}>
                  <User size={14} style={{ color: 'var(--primary)' }} />
                  Escolha sua Manicure
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {manicures.filter(m => m.is_active).map(manicure => (
                    <button
                      key={manicure.id}
                      type="button"
                      onClick={() => setSelectedManicureId(manicure.id)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: selectedManicureId === manicure.id
                          ? '2px solid var(--primary)'
                          : '1px solid var(--border)',
                        background: selectedManicureId === manicure.id
                          ? 'var(--primary-light)'
                          : 'var(--surface)',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: selectedManicureId === manicure.id
                          ? '0 2px 8px var(--primary-glow)'
                          : 'none'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{manicure.avatar_emoji}</span>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{
                          display: 'block', fontSize: '0.88rem', fontWeight: 700,
                          color: selectedManicureId === manicure.id ? 'var(--primary)' : 'var(--secondary)'
                        }}>
                          {manicure.name}
                        </span>
                        {manicure.specialties.length > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {manicure.specialties.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--secondary)',
                  marginBottom: '5px'
                }}>
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Camila Oliveira"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    background: 'var(--surface)'
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
                  WhatsApp / Celular *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    background: 'var(--surface)'
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
                  Observações (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ex: Quero francesa sorriso, unha quebrou, etc."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    outline: 'none',
                    fontSize: '0.85rem',
                    resize: 'none',
                    background: 'var(--surface)'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', marginTop: '6px' }}
              >
                <span>Confirmar Agendamento</span>
              </button>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--status-free-bg)',
              color: 'var(--status-free)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={36} />
            </div>

            <h3 style={{ fontSize: '1.35rem', color: 'var(--secondary)', fontWeight: 700, marginBottom: '6px' }}>
              Horário Reservado com Sucesso!
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Seu agendamento para <strong>{service.name}</strong> em <strong>{formatDateFriendly(date)}</strong> às <strong>{timeSlot}</strong> foi gravado no sistema.
            </p>

            {/* Direct WhatsApp Confirmation Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleOpenWhatsApp}
                style={{
                  background: '#25D366',
                  color: '#FFFFFF',
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
              >
                <MessageSquare size={18} />
                <span>Notificar Manicure no WhatsApp</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onNavigateToHistory();
                }}
                className="btn-outline"
                style={{ width: '100%' }}
              >
                Ver Minhas Visitas Agendadas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
