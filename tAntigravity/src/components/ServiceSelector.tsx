import React from 'react';
import { Sparkles, Clock, Check } from 'lucide-react';
import type { Service } from '../types';

interface ServiceSelectorProps {
  services: Service[];
  selectedService: Service | null;
  onSelectService: (service: Service) => void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  services,
  selectedService,
  onSelectService
}) => {
  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary)' }}>
            Escolha o Procedimento
          </h3>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Selecione o serviço de manicure que deseja realizar
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '12px'
      }}>
        {services.map(service => {
          const isSelected = selectedService?.id === service.id;

          return (
            <div
              key={service.id}
              onClick={() => onSelectService(service)}
              style={{
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: isSelected ? 'var(--primary-light)' : 'var(--surface)',
                border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.18s ease',
                boxShadow: isSelected ? '0 4px 14px var(--primary-glow)' : 'var(--shadow-sm)',
                position: 'relative'
              }}
            >
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '6px'
                }}>
                  <h4 style={{
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    color: isSelected ? 'var(--primary)' : 'var(--secondary)'
                  }}>
                    {service.name}
                  </h4>

                  {isSelected && (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  lineHeight: '1.35',
                  marginBottom: '10px'
                }}>
                  {service.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px solid ' + (isSelected ? 'rgba(212,139,123,0.2)' : 'var(--border)'),
                fontSize: '0.82rem'
              }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--text-muted)'
                }}>
                  <Clock size={13} />
                  <span>{service.duration_minutes} min</span>
                </span>

                <span style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: 'var(--secondary)'
                }}>
                  R$ {service.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
