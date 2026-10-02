import React, { useState } from 'react';
import { Calendar, Clock, Sparkles, MessageSquare, AlertTriangle } from 'lucide-react';
import type { Appointment, UserProfile } from '../types';

interface ClientPortalProps {
  currentUser: UserProfile;
  appointments: Appointment[];
  onCancelAppointment: (appointmentId: string) => void;
  onBookNew: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({
  currentUser,
  appointments,
  onCancelAppointment,
  onBookNew
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancellationModalApt, setCancellationModalApt] = useState<Appointment | null>(null);

  // Filtrar apenas agendamentos desta cliente (ou demonstrativos)
  const clientAppointments = appointments.filter(
    a => a.client_name.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]) ||
         a.client_id === currentUser.id
  );

  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingList = clientAppointments
    .filter(a => a.date >= todayStr && a.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date));

  const pastList = clientAppointments
    .filter(a => a.date < todayStr || a.status === 'cancelled' || a.status === 'completed')
    .sort((a, b) => b.date.localeCompare(a.date));

  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleOpenCancelWhatsApp = (apt: Appointment) => {
    const manicuristPhone = '5511999998888';
    const message = `Olá Fernanda! Gostaria de solicitar o cancelamento do meu agendamento:\n\n` +
      `💅 *Procedimento:* ${apt.service_name}\n` +
      `📅 *Data:* ${formatDateFriendly(apt.date)}\n` +
      `⏰ *Horário:* ${apt.time_slot}\n` +
      `👤 *Cliente:* ${apt.client_name}\n\n` +
      `Poderia liberar a vaga para outra cliente, por favor?`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${manicuristPhone}?text=${encoded}`, '_blank');
    
    // Libera a vaga no sistema
    onCancelAppointment(apt.id);
    setCancellationModalApt(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Profile Card */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, #A9594A 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '1.2rem',
              boxShadow: '0 4px 12px var(--primary-glow)'
            }}>
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)' }}>
                {currentUser.name}
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {currentUser.phone} • {currentUser.email}
              </p>
            </div>
          </div>

          <button onClick={onBookNew} className="btn-primary">
            <Sparkles size={16} />
            <span>Agendar Novo Horário</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div style={{
        display: 'flex',
        gap: '10px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setActiveSubTab('upcoming')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: activeSubTab === 'upcoming' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'upcoming' ? '#FFFFFF' : 'var(--text-muted)',
            boxShadow: activeSubTab === 'upcoming' ? '0 4px 10px var(--primary-glow)' : 'none'
          }}
        >
          Próximos Agendamentos ({upcomingList.length})
        </button>

        <button
          onClick={() => setActiveSubTab('past')}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.9rem',
            fontWeight: 600,
            background: activeSubTab === 'past' ? 'var(--primary)' : 'transparent',
            color: activeSubTab === 'past' ? '#FFFFFF' : 'var(--text-muted)',
            boxShadow: activeSubTab === 'past' ? '0 4px 10px var(--primary-glow)' : 'none'
          }}
        >
          Histórico de Visitas ({pastList.length})
        </button>
      </div>

      {/* List Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeSubTab === 'upcoming' ? (
          upcomingList.length === 0 ? (
            <div className="glass-card" style={{ padding: '36px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
              <Calendar size={40} style={{ color: 'var(--primary)', opacity: 0.5, margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '1.1rem', color: 'var(--secondary)', marginBottom: '6px' }}>
                Nenhum agendamento futuro
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Você ainda não tem nenhum horário reservado para os próximos dias.
              </p>
              <button onClick={onBookNew} className="btn-primary">
                Consultar Horários Vagos
              </button>
            </div>
          ) : (
            upcomingList.map(apt => (
              <div
                key={apt.id}
                className="glass-card"
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  borderLeft: '4px solid var(--primary)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--status-free-bg)',
                      color: 'var(--status-free)',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      Confirmado
                    </span>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--secondary)' }}>
                      {apt.service_name}
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={14} style={{ color: 'var(--primary)' }} />
                      <strong style={{ color: 'var(--text-main)', textTransform: 'capitalize' }}>
                        {formatDateFriendly(apt.date)}
                      </strong>
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} style={{ color: 'var(--primary)' }} />
                      <strong style={{ color: 'var(--text-main)' }}>{apt.time_slot}</strong>
                    </span>

                    <span>
                      Valor: <strong>R$ {apt.service_price.toFixed(2).replace('.', ',')}</strong>
                    </span>
                  </div>

                  {apt.notes && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '6px' }}>
                      Obs: {apt.notes}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setCancellationModalApt(apt)}
                    className="btn-outline"
                    style={{ fontSize: '0.82rem', padding: '8px 14px', color: 'var(--status-busy)', borderColor: '#FFCDD2' }}
                  >
                    Cancelar Horário
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          pastList.length === 0 ? (
            <div className="glass-card" style={{ padding: '36px', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Nenhum histórico anterior registrado.
              </p>
            </div>
          ) : (
            pastList.map(apt => (
              <div
                key={apt.id}
                className="glass-card"
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  opacity: apt.status === 'cancelled' ? 0.6 : 0.95
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: apt.status === 'cancelled' ? 'var(--status-busy-bg)' : 'var(--surface-muted)',
                      color: apt.status === 'cancelled' ? 'var(--status-busy)' : 'var(--text-muted)',
                      fontSize: '0.72rem',
                      fontWeight: 700
                    }}>
                      {apt.status === 'cancelled' ? 'Cancelado' : 'Concluído'}
                    </span>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--secondary)' }}>
                      {apt.service_name}
                    </h4>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {formatDateFriendly(apt.date)} às {apt.time_slot} • R$ {apt.service_price.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Modal de Cancelamento com Aviso WhatsApp */}
      {cancellationModalApt && (
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
          zIndex: 110,
          padding: '16px'
        }}>
          <div className="glass-card animate-fade-in" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '24px',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: 'var(--status-busy)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--secondary)' }}>
                Cancelar Agendamento
              </h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '14px', lineHeight: 1.4 }}>
              Você está prestes a cancelar o horário de <strong>{cancellationModalApt.service_name}</strong> em <strong>{formatDateFriendly(cancellationModalApt.date)} às {cancellationModalApt.time_slot}</strong>.
            </p>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px', background: 'var(--surface-muted)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
              Conforme a política do estúdio, ao confirmar o cancelamento você enviará uma mensagem direta para a manicure no WhatsApp para que ela possa liberar o horário para outra cliente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleOpenCancelWhatsApp(cancellationModalApt)}
                style={{
                  background: '#25D366',
                  color: '#FFFFFF',
                  padding: '12px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <MessageSquare size={16} />
                <span>Avisar no WhatsApp e Liberar Horário</span>
              </button>

              <button
                onClick={() => setCancellationModalApt(null)}
                className="btn-outline"
              >
                Voltar e Manter Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
