export type AppointmentStatus = 'pendente' | 'confirmado' | 'concluido' | 'cancelado';
export type UserRole = 'admin' | 'barbeiro' | 'cliente';

export interface User {
  id: string;
  name: string;
  phone: string;
  login?: string;
  password?: string;
  role: UserRole;
  barberId?: string; // If role === 'barbeiro'
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  price: number;
  category: 'cabelo' | 'barba' | 'combo' | 'extra' | 'quimica' | string;
  active: boolean;
}

export interface Barber {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  avatar: string;
  login?: string;
  active?: boolean;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export interface BlockedSlot {
  id: string;
  barberId: string;
  date: string;
  time: string;
  reason: string;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  openTime: string;
  closeTime: string;
  slotInterval: number;
  lunchStart: string;
  lunchEnd: string;
  workingDays: number[];
}

export interface BarberShopDatabase {
  settings: ShopSettings;
  barbers: Barber[];
  services: Service[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  users?: User[];
}

export type ActiveTab = 'login' | 'cliente' | 'barbeiro' | 'admin';

