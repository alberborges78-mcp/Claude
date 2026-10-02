import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { getLocalDateString } from '../lib/storage';

interface CalendarProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  availableDatesSummary?: Record<string, { total: number; free: number }>;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  onSelectDate,
  availableDatesSummary = {}
}) => {
  // Inicializa com o mês da data selecionada
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [currentYear, setCurrentYear] = useState<number>(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialDate.getMonth());

  const todayStr = getLocalDateString(new Date());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Calcular dias do mês
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Dias vazios antes do dia 1
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);
  // Dias do mês
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
      {/* Month & Year Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalIcon size={18} style={{ color: 'var(--primary)' }} />
          <h2 style={{
            fontSize: '1.15rem',
            color: 'var(--secondary)',
            fontWeight: 700,
            textTransform: 'capitalize'
          }}>
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handlePrevMonth}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-muted)',
              color: 'var(--text-main)'
            }}
            title="Mês anterior"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={handleNextMonth}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface-muted)',
              color: 'var(--text-main)'
            }}
            title="Próximo mês"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        textAlign: 'center',
        marginBottom: '8px',
        fontWeight: 600,
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        {WEEK_DAYS.map((day, idx) => (
          <div key={day} style={{
            color: idx === 0 ? 'var(--text-light)' : 'var(--text-muted)',
            padding: '4px 0'
          }}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        textAlign: 'center'
      }}>
        {blanks.map(blank => (
          <div key={`blank-${blank}`} style={{ height: '42px' }} />
        ))}

        {days.map(day => {
          const monthStr = String(currentMonth + 1).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          const dateString = `${currentYear}-${monthStr}-${dayStr}`;

          const isSelected = selectedDate === dateString;
          const isToday = todayStr === dateString;
          const isPast = dateString < todayStr;
          const isSunday = new Date(currentYear, currentMonth, day).getDay() === 0;

          // Se for domingo, a manicure pode não atender
          const isDisabled = isPast || isSunday;

          // Info de vagas
          const summary = availableDatesSummary[dateString];
          const hasFreeSlots = summary ? summary.free > 0 : true;

          return (
            <button
              key={dateString}
              disabled={isDisabled}
              onClick={() => onSelectDate(dateString)}
              style={{
                height: '42px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                fontSize: '0.9rem',
                fontWeight: isSelected || isToday ? 700 : 500,
                background: isSelected
                  ? 'var(--primary)'
                  : isToday
                  ? 'var(--primary-light)'
                  : 'transparent',
                color: isSelected
                  ? '#FFFFFF'
                  : isDisabled
                  ? 'var(--text-light)'
                  : isToday
                  ? 'var(--primary)'
                  : 'var(--text-main)',
                border: isToday && !isSelected
                  ? '1.5px solid var(--primary)'
                  : '1px solid transparent',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.4 : 1,
                boxShadow: isSelected ? '0 4px 12px var(--primary-glow)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{day}</span>
              {/* Pontinho indicador de vagas abertas */}
              {!isDisabled && (
                <span style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: isSelected
                    ? '#FFFFFF'
                    : hasFreeSlots
                    ? 'var(--status-free)'
                    : 'var(--status-busy)',
                  marginTop: '1px'
                }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-free)' }} />
          <span>Com horários vagos</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
          <span>Data selecionada</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-light)' }} />
          <span>Indisponível</span>
        </div>
      </div>
    </div>
  );
};
