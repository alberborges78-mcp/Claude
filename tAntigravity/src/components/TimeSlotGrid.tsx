import React from 'react';
import { Clock, CheckCircle2, XCircle, Calendar, ArrowRight } from 'lucide-react';
import type { SlotInfo } from '../types';

interface TimeSlotGridProps {
  date: string; // YYYY-MM-DD
  slots: SlotInfo[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  isAdmin?: boolean;
  onToggleBlock?: (time: string) => void;
  onProceedBooking?: () => void;
  onNextAvailableDate?: () => void;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  date,
  slots,
  selectedTime,
  onSelectTime,
  isAdmin = false,
  onToggleBlock,
  onProceedBooking,
  onNextAvailableDate
}) => {
  // Formatar data em português
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

  const freeSlotsCount = slots.filter(s => s.status === 'free').length;

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
      {/* Header with selected date and count */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={18} style={{ color: 'var(--primary)' }} />
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--secondary)',
              textTransform: 'capitalize'
            }}>
              {formatDateFriendly(date)}
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Selecione uma hora vaga para o seu atendimento
          </p>
        </div>

        {/* Free slots badge */}
        <span style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          background: freeSlotsCount > 0 ? 'var(--status-free-bg)' : 'var(--status-busy-bg)',
          color: freeSlotsCount > 0 ? 'var(--status-free)' : 'var(--status-busy)',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          {freeSlotsCount > 0 ? (
            <>
              <CheckCircle2 size={13} />
              <span>{freeSlotsCount} {freeSlotsCount === 1 ? 'vaga livre' : 'vagas livres'}</span>
            </>
          ) : (
            <>
              <XCircle size={13} />
              <span>Sem vagas livres hoje</span>
            </>
          )}
        </span>
      </div>

      {/* Alerta quando o dia não tiver vagas livres */}
      {freeSlotsCount === 0 && (
        <div style={{
          background: 'var(--status-busy-bg)',
          border: '1px solid #FFCDD2',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--status-busy)' }}>
              Nenhum horário vago para esta data
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              O expediente desta data já encerrou ou todos os horários estão ocupados.
            </p>
          </div>
          {onNextAvailableDate && (
            <button
              onClick={onNextAvailableDate}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              <Calendar size={14} />
              <span>Ver Vagas do Próximo Dia</span>
            </button>
          )}
        </div>
      )}

      {/* Grid of Slots */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: '10px'
      }}>
        {slots.map(slot => {
          const isSelected = selectedTime === slot.time;
          const isFree = slot.status === 'free';
          const isBusy = slot.status === 'busy';
          const isBlocked = slot.status === 'blocked';
          const isPast = slot.status === 'past';

          let bg = 'var(--surface)';
          let border = '1px solid var(--border)';
          let textColor = 'var(--text-main)';
          let statusText = 'Livre';
          let statusColor = 'var(--status-free)';

          if (isSelected) {
            bg = 'var(--primary)';
            border = '1px solid var(--primary)';
            textColor = '#FFFFFF';
            statusText = 'Selecionado';
            statusColor = '#FFFFFF';
          } else if (isFree) {
            bg = 'var(--surface)';
            border = '1.5px solid #C8E6C9';
            textColor = 'var(--text-main)';
            statusText = 'Disponível';
            statusColor = 'var(--status-free)';
          } else if (isBusy) {
            bg = 'var(--status-busy-bg)';
            border = '1px solid #FFCDD2';
            textColor = 'var(--status-busy)';
            const manicureName = slot.appointment?.manicure_name;
            if (isAdmin && slot.appointment) {
              statusText = slot.appointment.client_name + (manicureName ? ` • c/ ${manicureName}` : '');
            } else {
              statusText = manicureName ? `c/ ${manicureName}` : 'Ocupado';
            }
            statusColor = 'var(--status-busy)';
          } else if (isBlocked) {
            bg = 'var(--status-blocked-bg)';
            border = '1px solid #D7CCC8';
            textColor = 'var(--text-muted)';
            statusText = slot.reason || 'Bloqueado';
            statusColor = 'var(--text-muted)';
          } else if (isPast) {
            bg = 'var(--surface-muted)';
            border = '1px dashed var(--border)';
            textColor = 'var(--text-light)';
            statusText = 'Passado';
            statusColor = 'var(--text-light)';
          }

          return (
            <div
              key={slot.time}
              onClick={() => {
                if (isFree) {
                  onSelectTime(slot.time);
                } else if (isAdmin && onToggleBlock) {
                  onToggleBlock(slot.time);
                }
              }}
              style={{
                padding: '12px 10px',
                borderRadius: 'var(--radius-md)',
                background: bg,
                border: border,
                cursor: isFree || isAdmin ? 'pointer' : 'not-allowed',
                textAlign: 'center',
                boxShadow: isSelected ? '0 4px 14px var(--primary-glow)' : 'var(--shadow-sm)',
                transition: 'all 0.18s ease',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '68px',
                opacity: isPast ? 0.45 : 1
              }}
            >
              <span style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: textColor,
                letterSpacing: '-0.01em'
              }}>
                {slot.time}
              </span>

              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: statusColor,
                marginTop: '3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%'
              }}>
                {statusText}
              </span>

              {/* Botão de bloqueio rápido para Manicure no modo Admin */}
              {isAdmin && !isPast && !isBusy && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleBlock) onToggleBlock(slot.time);
                  }}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    fontSize: '0.65rem',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    background: isBlocked ? 'var(--status-free)' : 'var(--secondary)',
                    color: '#FFFFFF'
                  }}
                  title={isBlocked ? 'Desbloquear horário' : 'Bloquear horário'}
                >
                  {isBlocked ? 'Liberar' : 'Bloquear'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão de ação direta dentro do card */}
      {selectedTime && onProceedBooking && (
        <div style={{
          marginTop: '16px',
          padding: '14px 18px',
          background: 'linear-gradient(135deg, var(--primary-light) 0%, #FFFFFF 100%)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Horário Selecionado:
            </span>
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--secondary)' }}>
              {selectedTime} • <span style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{formatDateFriendly(date)}</span>
            </p>
          </div>

          <button
            onClick={onProceedBooking}
            className="btn-primary"
            style={{ padding: '10px 22px', fontSize: '0.95rem' }}
          >
            <span>Confirmar Horário</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Legend below grid */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: 'var(--surface)',
            border: '1.5px solid #C8E6C9'
          }} />
          <span>Vago (Clique para escolher)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: 'var(--status-busy-bg)',
            border: '1px solid #FFCDD2'
          }} />
          <span>Ocupado por cliente</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: 'var(--status-blocked-bg)',
            border: '1px solid #D7CCC8'
          }} />
          <span>Intervalo / Bloqueado</span>
        </div>
      </div>
    </div>
  );
};
