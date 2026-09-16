import { BarberShopDatabase, Appointment, Service, BlockedSlot, ShopSettings, User, Barber, UserRole } from '../types';

const API_BASE = '/api';

export async function fetchDatabase(): Promise<BarberShopDatabase> {
  const res = await fetch(`${API_BASE}/data`);
  if (!res.ok) {
    throw new Error('Falha ao carregar dados da barbearia');
  }
  return res.json();
}

// Authentication: Login
export async function loginUser(
  role: UserRole,
  credential: string,
  password?: string
): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, credential, password }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Erro ao realizar login');
  }
  return body.user;
}

// Authentication: Register Client ("Novo por aqui?")
export async function registerClient(
  name: string,
  phone: string,
  password?: string
): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register-client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, password }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Erro ao cadastrar cliente');
  }
  return body.user;
}

// Admin: Get all users
export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) {
    throw new Error('Erro ao listar usuários');
  }
  return res.json();
}

// Admin: Create Barber (Barbeiros são cadastrados pelo admin)
export async function createBarber(data: {
  name: string;
  specialty: string;
  phone: string;
  avatar?: string;
  login?: string;
  password?: string;
}): Promise<{ barber: Barber; user?: User }> {
  const res = await fetch(`${API_BASE}/barbers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Erro ao cadastrar barbeiro');
  }
  return body;
}

// Admin: Update Barber
export async function updateBarber(
  id: string,
  data: Partial<Barber> & { password?: string }
): Promise<Barber> {
  const res = await fetch(`${API_BASE}/barbers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Erro ao atualizar barbeiro');
  }
  return body.barber;
}

// Admin: Delete Barber
export async function deleteBarber(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/barbers/${id}`, {
    method: 'DELETE',
  });
  return res.ok;
}


export async function createAppointment(data: {
  clientName: string;
  clientPhone: string;
  serviceId: string;
  barberId: string;
  date: string;
  time: string;
  notes?: string;
}): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Erro ao criar agendamento');
  }
  return body.appointment;
}

export async function updateAppointmentStatus(
  id: string,
  status: 'pendente' | 'confirmado' | 'concluido' | 'cancelado'
): Promise<Appointment> {
  const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Erro ao atualizar status');
  }
  return body.appointment;
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/appointments/${id}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function saveService(serviceData: Partial<Service>): Promise<Service> {
  const res = await fetch(`${API_BASE}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serviceData),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Erro ao salvar serviço');
  }
  return body.service;
}

export async function deleteService(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/services/${id}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function addBlockedSlot(data: {
  barberId: string;
  date: string;
  time: string;
  reason: string;
}): Promise<BlockedSlot> {
  const res = await fetch(`${API_BASE}/blocked-slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Erro ao bloquear horário');
  }
  return body.blockedSlot;
}

export async function deleteBlockedSlot(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/blocked-slots/${id}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function saveSettings(settings: Partial<ShopSettings>): Promise<ShopSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error || 'Erro ao salvar configurações');
  }
  return body.settings;
}
