export interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  category: string;
  image?: string;
}

export interface Manicure {
  id: string;
  name: string;
  phone: string;
  specialties: string[];
  avatar_emoji: string;
  is_active: boolean;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  client_id?: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  service_name: string;
  service_price: number;
  manicure_id?: string;
  manicure_name?: string;
  date: string; // YYYY-MM-DD
  time_slot: string; // "09:00", "10:00", etc.
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
}

export interface BlockedSlot {
  id: string;
  date: string; // YYYY-MM-DD
  time_slot: string; // "12:00" ou "ALL_DAY"
  reason: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'client' | 'admin';
}

export type SlotStatus = 'free' | 'busy' | 'blocked' | 'past';

export interface SlotInfo {
  time: string;
  status: SlotStatus;
  appointment?: Appointment;
  reason?: string;
}
