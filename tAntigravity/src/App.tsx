import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Calendar } from './components/Calendar';
import { TimeSlotGrid } from './components/TimeSlotGrid';
import { ServiceSelector } from './components/ServiceSelector';
import { AppointmentModal } from './components/AppointmentModal';
import { ClientPortal } from './components/ClientPortal';
import { AdminPanel } from './components/AdminPanel';
import { ServiceManager } from './components/ServiceManager';
import { ManicureManager } from './components/ManicureManager';
import { SupabaseModal } from './components/SupabaseModal';
import { storageService, getLocalDateString, getFirstAvailableDate, DEMO_USER, ADMIN_USER } from './lib/storage';
import { isSupabaseConnected } from './lib/supabase';
import type { Service, Manicure, Appointment, BlockedSlot, UserProfile } from './types';
import { Sparkles, ShieldCheck, HeartHandshake, Award, ArrowRight } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<'book' | 'history' | 'admin'>('book');
  const [currentUser, setCurrentUser] = useState<UserProfile>(storageService.getCurrentUser());
  const [services, setServices] = useState<Service[]>(storageService.getServices());
  const [manicures, setManicures] = useState<Manicure[]>(storageService.getManicures());
  const [selectedService, setSelectedService] = useState<Service | null>(services[0] || null);

  // Inicializa na primeira data que realmente tiver vagas livres (se o expediente de hoje já encerrou, seleciona o próximo dia)
  const [selectedDate, setSelectedDate] = useState<string>(() => getFirstAvailableDate());
  const [selectedTime, setSelectedTime] = useState<string | null>(() => {
    const initialDate = getFirstAvailableDate();
    const initialSlots = storageService.getDaySlots(initialDate);
    const firstFree = initialSlots.find(s => s.status === 'free');
    return firstFree ? firstFree.time : null;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(storageService.getAppointments());
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>(storageService.getBlockedSlots());

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [cloudConnected, setCloudConnected] = useState(isSupabaseConnected());

  // Atualizar slots do dia selecionado
  const [daySlots, setDaySlots] = useState(storageService.getDaySlots(selectedDate));

  const refreshState = () => {
    setAppointments(storageService.getAppointments());
    setBlockedSlots(storageService.getBlockedSlots());
    setDaySlots(storageService.getDaySlots(selectedDate));
    setServices(storageService.getServices());
    setManicures(storageService.getManicures());
    setCloudConnected(isSupabaseConnected());
  };

  useEffect(() => {
    const slots = storageService.getDaySlots(selectedDate);
    setDaySlots(slots);
    // Se a hora selecionada não estiver livre no novo dia, auto-seleciona a primeira vaga livre disponível
    const isCurrentStillFree = slots.some(s => s.time === selectedTime && s.status === 'free');
    if (!isCurrentStillFree) {
      const firstFree = slots.find(s => s.status === 'free');
      setSelectedTime(firstFree ? firstFree.time : null);
    }
  }, [selectedDate]);

  // Alternar entre modo Cliente e modo Manicure
  const handleToggleUserRole = () => {
    if (currentUser.role === 'admin') {
      storageService.setCurrentUser(DEMO_USER);
      setCurrentUser(DEMO_USER);
      setCurrentTab('book');
    } else {
      storageService.setCurrentUser(ADMIN_USER);
      setCurrentUser(ADMIN_USER);
      setCurrentTab('admin');
    }
  };

  // Salvar novo agendamento
  const handleConfirmAppointment = (clientData: {
    client_name: string;
    client_phone: string;
    notes: string;
    manicure_id?: string;
    manicure_name?: string;
  }) => {
    if (!selectedService || !selectedTime) throw new Error('Dados incompletos');

    const created = storageService.saveAppointment({
      client_id: currentUser.id,
      client_name: clientData.client_name,
      client_phone: clientData.client_phone,
      service_id: selectedService.id,
      service_name: selectedService.name,
      service_price: selectedService.price,
      manicure_id: clientData.manicure_id,
      manicure_name: clientData.manicure_name,
      date: selectedDate,
      time_slot: selectedTime,
      status: 'confirmed',
      notes: clientData.notes
    });

    refreshState();
    return created;
  };

  // Cancelar agendamento
  const handleCancelAppointment = (appointmentId: string) => {
    storageService.updateAppointmentStatus(appointmentId, 'cancelled');
    refreshState();
  };

  // Atualizar status (Manicure)
  const handleUpdateStatus = (id: string, status: Appointment['status']) => {
    storageService.updateAppointmentStatus(id, status);
    refreshState();
  };

  // Bloquear / Liberar horário (Manicure)
  const handleToggleBlock = (date: string, timeSlot: string, reason?: string) => {
    storageService.toggleBlockSlot(date, timeSlot, reason);
    refreshState();
  };

  // CRUD de Serviços/Procedimentos (Manicure)
  const handleAddService = (service: Omit<Service, 'id'>) => {
    storageService.saveService(service);
    refreshState();
  };

  const handleUpdateService = (id: string, updates: Partial<Omit<Service, 'id'>>) => {
    storageService.updateService(id, updates);
    refreshState();
    // Atualizar o serviço selecionado se era o que foi editado
    if (selectedService?.id === id) {
      const updated = storageService.getServices().find(s => s.id === id);
      if (updated) setSelectedService(updated);
    }
  };

  const handleDeleteService = (id: string) => {
    storageService.deleteService(id);
    refreshState();
    if (selectedService?.id === id) {
      const remaining = storageService.getServices();
      setSelectedService(remaining[0] || null);
    }
  };

  // CRUD de Manicures (Profissionais)
  const handleAddManicure = (manicure: Omit<Manicure, 'id'>) => {
    storageService.saveManicure(manicure);
    refreshState();
  };

  const handleUpdateManicure = (id: string, updates: Partial<Omit<Manicure, 'id'>>) => {
    storageService.updateManicure(id, updates);
    refreshState();
  };

  const handleDeleteManicure = (id: string) => {
    storageService.deleteManicure(id);
    refreshState();
  };

  // Resumo de vagas para o calendário
  const availableDatesSummary: Record<string, { total: number; free: number }> = {};
  // Pré-computa para os próximos 30 dias
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = getLocalDateString(d);
    const slots = storageService.getDaySlots(dateStr);
    const freeCount = slots.filter(s => s.status === 'free').length;
    availableDatesSummary[dateStr] = { total: slots.length, free: freeCount };
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onToggleUserRole={handleToggleUserRole}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isCloudConnected={cloudConnected}
      />

      <main className="app-container" style={{ paddingTop: '20px', paddingBottom: '80px' }}>
        {currentTab === 'book' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Banner de Boas-Vindas */}
            <div className="glass-card" style={{
              padding: '24px 28px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, #FFFFFF 0%, var(--surface-muted) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ maxWidth: '640px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  marginBottom: '10px'
                }}>
                  <Sparkles size={14} />
                  <span>Atendimento com Hora Marcada</span>
                </div>

                <h2 style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--secondary)',
                  lineHeight: 1.2,
                  marginBottom: '8px'
                }}>
                  Agende sua sessão de unhas com facilidade e precisão
                </h2>

                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Consulte os dias livres, veja os horários disponíveis em tempo real e garanta seu momento de autocuidado com nossa especialista.
                </p>

                {/* Badges de confiança */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  fontWeight: 600
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} style={{ color: 'var(--status-free)' }} />
                    <span>Autoclave & Higiene Hospitalar</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HeartHandshake size={16} style={{ color: 'var(--primary)' }} />
                    <span>Produtos Hipoalergênicos</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={16} style={{ color: 'var(--accent)' }} />
                    <span>Alongamentos com Curvatura Natural</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Passo 1: Selecionar Serviço */}
            <section>
              <ServiceSelector
                services={services}
                selectedService={selectedService}
                onSelectService={setSelectedService}
              />
            </section>

            {/* Passo 2 e 3: Calendário e Grade de Horários Lado a Lado */}
            <section style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '20px',
              alignItems: 'start'
            }}>
              <div>
                <Calendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  availableDatesSummary={availableDatesSummary}
                />
              </div>

              <div>
                <TimeSlotGrid
                  date={selectedDate}
                  slots={daySlots}
                  selectedTime={selectedTime}
                  onSelectTime={setSelectedTime}
                  onProceedBooking={() => {
                    if (selectedService && selectedTime) {
                      setIsBookingModalOpen(true);
                    }
                  }}
                  onNextAvailableDate={() => {
                    for (let i = 1; i <= 14; i++) {
                      const nextD = new Date(selectedDate + 'T00:00:00');
                      nextD.setDate(nextD.getDate() + i);
                      if (nextD.getDay() === 0) continue;
                      const nextDStr = getLocalDateString(nextD);
                      const slots = storageService.getDaySlots(nextDStr);
                      if (slots.some(s => s.status === 'free')) {
                        setSelectedDate(nextDStr);
                        break;
                      }
                    }
                  }}
                />
              </div>
            </section>
          </div>
        )}

        {currentTab === 'history' && (
          <ClientPortal
            currentUser={currentUser}
            appointments={appointments}
            onCancelAppointment={handleCancelAppointment}
            onBookNew={() => setCurrentTab('book')}
          />
        )}

        {currentTab === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <AdminPanel
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              appointments={appointments}
              blockedSlots={blockedSlots}
              daySlots={daySlots}
              onUpdateStatus={handleUpdateStatus}
              onToggleBlock={handleToggleBlock}
            />

            <ServiceManager
              services={services}
              onAddService={handleAddService}
              onUpdateService={handleUpdateService}
              onDeleteService={handleDeleteService}
            />

            <ManicureManager
              manicures={manicures}
              onAddManicure={handleAddManicure}
              onUpdateManicure={handleUpdateManicure}
              onDeleteManicure={handleDeleteManicure}
            />
          </div>
        )}
      </main>

      {/* Floating Bottom Booking Summary Bar (Apenas na aba de agendamento) */}
      {currentTab === 'book' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border)',
          padding: '12px 16px',
          boxShadow: '0 -4px 20px rgba(62, 39, 35, 0.08)',
          zIndex: 30
        }}>
          <div className="app-container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: 0
          }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Resumo da Escolha:
              </span>
              <p style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--secondary)' }}>
                {selectedService ? selectedService.name : 'Selecione um serviço'} •{' '}
                <span style={{ color: 'var(--primary)' }}>
                  {selectedTime ? `${selectedDate} às ${selectedTime}` : 'Selecione uma hora vaga acima'}
                </span>
              </p>
            </div>

            <button
              onClick={() => {
                if (!selectedService) {
                  alert('Por favor, selecione um procedimento acima.');
                  return;
                }
                if (!selectedTime) {
                  alert('Por favor, clique em um dos horários livres (verde) disponíveis para agendar.');
                  return;
                }
                setIsBookingModalOpen(true);
              }}
              className="btn-primary"
              style={{ padding: '12px 28px', fontSize: '1rem' }}
            >
              <span>Continuar Agendamento</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Agendamento */}
      {selectedService && (
        <AppointmentModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          service={selectedService}
          date={selectedDate}
          timeSlot={selectedTime || '09:00'}
          currentUser={currentUser}
          manicures={manicures}
          onConfirm={handleConfirmAppointment}
          onNavigateToHistory={() => setCurrentTab('history')}
        />
      )}

      {/* Modal de Configuração Supabase */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigUpdated={refreshState}
      />
    </div>
  );
}

export default App;
