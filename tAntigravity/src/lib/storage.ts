import type { Service, Manicure, Appointment, BlockedSlot, UserProfile, SlotInfo } from '../types';

export const DEFAULT_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'Manicure Tradicional',
    description: 'Cuticulagem impecável, lixamento e esmaltação tradicional com brilho extra.',
    duration_minutes: 60,
    price: 45,
    category: 'Unhas'
  },
  {
    id: 'srv-2',
    name: 'Esmaltação em Gel',
    description: 'Secagem imediata na cabine LED. Unhas perfeitas, brilhantes e sem lascar por 20 dias.',
    duration_minutes: 60,
    price: 75,
    category: 'Unhas'
  },
  {
    id: 'srv-3',
    name: 'Alongamento em Fibra de Vidro',
    description: 'Estrutura leve, resistente e ultra natural com acabamento fino e curvatura C.',
    duration_minutes: 120,
    price: 160,
    category: 'Alongamento'
  },
  {
    id: 'srv-4',
    name: 'Manutenção Fibra / Gel',
    description: 'Higienização, nivelamento de crescimento, reposição de estrutura e nova cor.',
    duration_minutes: 90,
    price: 110,
    category: 'Alongamento'
  },
  {
    id: 'srv-5',
    name: 'Spa dos Pés Relaxante',
    description: 'Esfoliação aromática, imersão em sais, remoção de asperezas e massagem hidratante.',
    duration_minutes: 60,
    price: 65,
    category: 'Spa'
  },
  {
    id: 'srv-6',
    name: 'Blindagem de Unhas',
    description: 'Película protetora de gel sobre a unha natural para evitar quebras e descamação.',
    duration_minutes: 60,
    price: 80,
    category: 'Tratamento'
  }
];

export const DEFAULT_MANICURES: Manicure[] = [
  {
    id: 'man-1',
    name: 'Fernanda',
    phone: '(11) 99999-8888',
    specialties: ['Alongamento', 'Esmaltação em Gel'],
    avatar_emoji: '💅',
    is_active: true
  },
  {
    id: 'man-2',
    name: 'Juliana',
    phone: '(11) 98888-7777',
    specialties: ['Spa dos Pés', 'Manicure Tradicional'],
    avatar_emoji: '✨',
    is_active: true
  }
];

export const FIXED_TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00'
];

export const DEMO_USER: UserProfile = {
  id: 'usr-demo-1',
  name: 'Camila Oliveira',
  phone: '(11) 98765-4321',
  email: 'camila.oliveira@email.com',
  role: 'client'
};

export const ADMIN_USER: UserProfile = {
  id: 'usr-admin-1',
  name: 'Fernanda Nails Studio',
  phone: '(11) 99999-8888',
  email: 'contato@fernandanails.com.br',
  role: 'admin'
};

const STORAGE_KEYS = {
  SERVICES: 'manicure_services',
  MANICURES: 'manicure_professionals',
  APPOINTMENTS: 'manicure_appointments',
  BLOCKED: 'manicure_blocked_slots',
  USER: 'manicure_current_user',
  SUPABASE_CONFIG: 'manicure_supabase_config'
};

// Obter data de hoje e amanhã no formato YYYY-MM-DD
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Procura a primeira data com horários livres (se o expediente de hoje já encerrou, seleciona o próximo dia útil)
export function getFirstAvailableDate(): string {
  const now = new Date();
  const todayStr = getLocalDateString(now);
  
  // Se ainda estiver dentro do horário e não for domingo
  if (now.getDay() !== 0) {
    const slotsToday = storageService.getDaySlots(todayStr);
    const hasFree = slotsToday.some(s => s.status === 'free');
    if (hasFree) return todayStr;
  }

  // Procura nos próximos dias
  for (let i = 1; i <= 14; i++) {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + i);
    if (nextDate.getDay() === 0) continue; // Pula domingos
    const nextDateStr = getLocalDateString(nextDate);
    const slots = storageService.getDaySlots(nextDateStr);
    if (slots.some(s => s.status === 'free')) {
      return nextDateStr;
    }
  }

  return todayStr;
}

export function getInitialAppointments(): Appointment[] {
  const today = getLocalDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = getLocalDateString(tomorrowDate);

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 14);
  const past = getLocalDateString(pastDate);

  return [
    {
      id: 'apt-sample-1',
      client_id: DEMO_USER.id,
      client_name: DEMO_USER.name,
      client_phone: DEMO_USER.phone,
      service_id: 'srv-2',
      service_name: 'Esmaltação em Gel',
      service_price: 75,
      manicure_id: 'man-1',
      manicure_name: 'Fernanda',
      date: today,
      time_slot: '10:00',
      status: 'confirmed',
      notes: 'Gostaria de tom nude com francesinha fina',
      created_at: new Date().toISOString()
    },
    {
      id: 'apt-sample-2',
      client_id: 'usr-outro-1',
      client_name: 'Mariana Souza',
      client_phone: '(11) 91234-5678',
      service_id: 'srv-3',
      service_name: 'Alongamento em Fibra de Vidro',
      service_price: 160,
      manicure_id: 'man-2',
      manicure_name: 'Juliana',
      date: today,
      time_slot: '14:00',
      status: 'confirmed',
      notes: '',
      created_at: new Date().toISOString()
    },
    {
      id: 'apt-sample-3',
      client_id: 'usr-outro-2',
      client_name: 'Beatriz Lima',
      client_phone: '(11) 94567-8901',
      service_id: 'srv-1',
      service_name: 'Manicure Tradicional',
      service_price: 45,
      manicure_id: 'man-1',
      manicure_name: 'Fernanda',
      date: tomorrow,
      time_slot: '09:00',
      status: 'confirmed',
      notes: '',
      created_at: new Date().toISOString()
    },
    {
      id: 'apt-sample-4',
      client_id: DEMO_USER.id,
      client_name: DEMO_USER.name,
      client_phone: DEMO_USER.phone,
      service_id: 'srv-5',
      service_name: 'Spa dos Pés Relaxante',
      service_price: 65,
      manicure_id: 'man-2',
      manicure_name: 'Juliana',
      date: past,
      time_slot: '15:00',
      status: 'completed',
      notes: 'Visita anterior realizada com sucesso.',
      created_at: new Date(Date.now() - 14 * 86400000).toISOString()
    }
  ];
}

export function getInitialBlockedSlots(): BlockedSlot[] {
  const today = getLocalDateString();
  return [
    {
      id: 'blk-1',
      date: today,
      time_slot: '12:00',
      reason: 'Intervalo de Almoço'
    }
  ];
}

// Storage helpers
export const storageService = {
  getServices(): Service[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SERVICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(DEFAULT_SERVICES));
      return DEFAULT_SERVICES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SERVICES;
    }
  },

  saveService(service: Omit<Service, 'id'>): Service {
    const current = this.getServices();
    const newService: Service = {
      ...service,
      id: 'srv-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
    };
    current.push(newService);
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(current));
    return newService;
  },

  updateService(id: string, updates: Partial<Omit<Service, 'id'>>): void {
    const current = this.getServices();
    const index = current.findIndex(s => s.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(current));
    }
  },

  getManicures(): Manicure[] {
    const raw = localStorage.getItem(STORAGE_KEYS.MANICURES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MANICURES, JSON.stringify(DEFAULT_MANICURES));
      return DEFAULT_MANICURES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_MANICURES;
    }
  },

  saveManicure(manicure: Omit<Manicure, 'id'>): Manicure {
    const current = this.getManicures();
    const newManicure: Manicure = {
      ...manicure,
      id: 'man-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
    };
    current.push(newManicure);
    localStorage.setItem(STORAGE_KEYS.MANICURES, JSON.stringify(current));
    return newManicure;
  },

  updateManicure(id: string, updates: Partial<Omit<Manicure, 'id'>>): void {
    const current = this.getManicures();
    const index = current.findIndex(m => m.id === id);
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.MANICURES, JSON.stringify(current));
    }
  },

  deleteManicure(id: string): void {
    const current = this.getManicures().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEYS.MANICURES, JSON.stringify(current));
  },

  deleteService(id: string): void {
    const current = this.getServices().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(current));
  },

  getAppointments(): Appointment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    if (!raw) {
      const initial = getInitialAppointments();
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return getInitialAppointments();
    }
  },

  saveAppointment(appointment: Omit<Appointment, 'id' | 'created_at'>): Appointment {
    const current = this.getAppointments();
    const newAppointment: Appointment = {
      ...appointment,
      id: 'apt-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString()
    };
    current.push(newAppointment);
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(current));
    return newAppointment;
  },

  updateAppointmentStatus(id: string, status: Appointment['status']): void {
    const current = this.getAppointments();
    const index = current.findIndex(a => a.id === id);
    if (index !== -1) {
      current[index].status = status;
      localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(current));
    }
  },

  getBlockedSlots(): BlockedSlot[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BLOCKED);
    if (!raw) {
      const initial = getInitialBlockedSlots();
      localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return getInitialBlockedSlots();
    }
  },

  toggleBlockSlot(date: string, time_slot: string, reason: string = 'Horário Bloqueado'): void {
    const current = this.getBlockedSlots();
    const index = current.findIndex(b => b.date === date && b.time_slot === time_slot);
    if (index !== -1) {
      // Desbloquear
      current.splice(index, 1);
    } else {
      // Bloquear
      current.push({
        id: 'blk-' + Date.now().toString(36),
        date,
        time_slot,
        reason
      });
    }
    localStorage.setItem(STORAGE_KEYS.BLOCKED, JSON.stringify(current));
  },

  getCurrentUser(): UserProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(DEMO_USER));
      return DEMO_USER;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEMO_USER;
    }
  },

  setCurrentUser(user: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  getSupabaseConfig(): { url: string; anonKey: string } | null {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSupabaseConfig(config: { url: string; anonKey: string } | null): void {
    if (!config) {
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_CONFIG);
    } else {
      localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
    }
  },

  // Retorna a disponibilidade de cada horário para uma determinada data
  getDaySlots(date: string): SlotInfo[] {
    const appointments = this.getAppointments().filter(
      a => a.date === date && a.status !== 'cancelled'
    );
    const blocked = this.getBlockedSlots().filter(b => b.date === date);

    const now = new Date();
    const todayStr = getLocalDateString(now);
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    return FIXED_TIME_SLOTS.map(time => {
      // Checar se já passou do horário de hoje
      const [slotH, slotM] = time.split(':').map(Number);
      const isPast =
        date < todayStr ||
        (date === todayStr && (slotH < currentHours || (slotH === currentHours && currentMinutes > slotM)));

      const isBlocked = blocked.some(b => b.time_slot === time || b.time_slot === 'ALL_DAY');
      const bookedAppointment = appointments.find(a => a.time_slot === time);

      if (isPast) {
        return { time, status: 'past' as const };
      }
      if (isBlocked) {
        const blk = blocked.find(b => b.time_slot === time || b.time_slot === 'ALL_DAY');
        return { time, status: 'blocked' as const, reason: blk?.reason || 'Bloqueado' };
      }
      if (bookedAppointment) {
        return { time, status: 'busy' as const, appointment: bookedAppointment };
      }
      return { time, status: 'free' as const };
    });
  }
};
