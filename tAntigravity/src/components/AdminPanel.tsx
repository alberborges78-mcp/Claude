import React, { useState } from 'react';
import { Calendar, Clock, DollarSign, Users, CheckCircle2, XCircle, Ban, MessageSquare } from 'lucide-react';
import type { Appointment, BlockedSlot, SlotInfo } from '../types';
import { getLocalDateString } from '../lib/storage';

interface AdminPanelProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  daySlots: SlotInfo[];
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
  onToggleBlock: (date: string, timeSlot: string, reason?: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  selectedDate,
  onSelectDate,
  appointments,
  daySlots,
  onUpdateStatus,
  onToggleBlock
}) => {
  const [blockReasonInput, setBlockReasonInput] = useState('Intervalo / Almoço');
  const todayStr = getLocalDateString(new Date());

  const dayAppointments = appointments.filter(
    a => a.date === selectedDate && a.status !== 'cancelled'
  );

  const completedCount = dayAppointments.filter(a => a.status === 'completed').length;
  const estimatedRevenue = dayAppointments.reduce((acc, curr) => acc + curr.service_price, 0);
  const freeSlotsCount = daySlots.filter(s => s.status === 'free').length;

  const formatDateFriendly = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const handleMessageClient = (apt: Appointment) => {
    const cleanPhone = apt.client_phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const msg = `Olá ${apt.client_name}! Aqui é a Fernanda do Studio Nails. Confirmando seu horário de *${apt.service_name}* para hoje às *${apt.time_slot}*. Posso te esperar? ✨`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner / Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px'
      }}>
        <div className="glass-card" style={{ padding: '18px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '6px' }}>
            <DollarSign size={20} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Previsão do Dia</span>
          </div>
          <p style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--secondary)' }}>
            R$ {estimatedRevenue.toFixed(2).replace('.', ',')}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '18px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', marginBottom: '6px' }}>
            <Users size={20} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Clientes Agendadas</span>
          </div>
          <p style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--secondary)' }}>
            {dayAppointments.length} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>({completedCount} atendidas)</span>
          </p>
        </div>

        <div className="glass-card" style={{ padding: '18px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--status-free)', marginBottom: '6px' }}>
            <Clock size={20} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Horários Vagos</span>
          </div>
          <p style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--status-free)' }}>
            {freeSlotsCount} horários livres
          </p>
        </div>
      </div>

      {/* Date Switcher */}
      <div className="glass-card" style={{
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary)', textTransform: 'capitalize' }}>
            {formatDateFriendly(selectedDate)}
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onSelectDate(todayStr)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: selectedDate === todayStr ? 'var(--primary)' : 'var(--surface-muted)',
              color: selectedDate === todayStr ? '#FFFFFF' : 'var(--text-main)'
            }}
          >
            Hoje
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={e => onSelectDate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Day Agenda Schedule List */}
      <div className="glass-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary)' }}>
            Linha do Tempo de Horários ({selectedDate})
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Motivo do bloqueio:</span>
            <input
              type="text"
              value={blockReasonInput}
              onChange={e => setBlockReasonInput(e.target.value)}
              placeholder="Ex: Almoço / Folga"
              style={{
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: '0.8rem'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {daySlots.map(slot => {
            const appointment = slot.appointment;
            const isBlocked = slot.status === 'blocked';
            const isPast = slot.status === 'past';

            return (
              <div
                key={slot.time}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: appointment
                    ? 'var(--surface)'
                    : isBlocked
                    ? 'var(--status-blocked-bg)'
                    : 'var(--surface-muted)',
                  border: appointment ? '1px solid var(--border)' : '1px dashed var(--border)',
                  flexWrap: 'wrap',
                  gap: '10px',
                  opacity: isPast && !appointment ? 0.5 : 1
                }}
              >
                {/* Time & Client / Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '65px',
                    fontWeight: 700,
                    fontSize: '1.05rem',
                    color: 'var(--secondary)'
                  }}>
                    {slot.time}
                  </div>

                  {appointment ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-main)' }}>
                          {appointment.client_name}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: appointment.status === 'completed' ? 'var(--status-free-bg)' : 'var(--primary-light)',
                          color: appointment.status === 'completed' ? 'var(--status-free)' : 'var(--primary)'
                        }}>
                          {appointment.status === 'completed' ? 'Atendida' : 'Confirmada'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {appointment.service_name} • R$ {appointment.service_price.toFixed(2).replace('.', ',')} • Tel: {appointment.client_phone}
                      </p>
                      {appointment.notes && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                          "{appointment.notes}"
                        </p>
                      )}
                    </div>
                  ) : isBlocked ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      <Ban size={15} />
                      <span>{slot.reason || 'Horário Bloqueado'}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-free)', fontSize: '0.88rem', fontWeight: 600 }}>
                      <CheckCircle2 size={15} />
                      <span>Horário Vago / Disponível para agendamento</span>
                    </div>
                  )}
                </div>

                {/* Actions per slot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {appointment && (
                    <>
                      <button
                        onClick={() => handleMessageClient(appointment)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: '#E8F8EE',
                          color: '#25D366',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        title="Enviar mensagem WhatsApp"
                      >
                        <MessageSquare size={14} />
                        <span>WhatsApp</span>
                      </button>

                      {appointment.status !== 'completed' ? (
                        <button
                          onClick={() => onUpdateStatus(appointment.id, 'completed')}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--status-free-bg)',
                            color: 'var(--status-free)',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}
                        >
                          Concluir
                        </button>
                      ) : (
                        <button
                          onClick={() => onUpdateStatus(appointment.id, 'confirmed')}
                          className="btn-ghost"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Reabrir
                        </button>
                      )}

                      <button
                        onClick={() => onUpdateStatus(appointment.id, 'cancelled')}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--status-busy)',
                          fontSize: '0.8rem'
                        }}
                        title="Cancelar Agendamento"
                      >
                        <XCircle size={16} />
                      </button>
                    </>
                  )}

                  {!appointment && !isPast && (
                    <button
                      onClick={() => onToggleBlock(selectedDate, slot.time, blockReasonInput)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: isBlocked ? 'var(--status-free)' : 'var(--surface)',
                        color: isBlocked ? '#FFFFFF' : 'var(--text-muted)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      {isBlocked ? 'Liberar Vaga' : 'Bloquear Horário'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
