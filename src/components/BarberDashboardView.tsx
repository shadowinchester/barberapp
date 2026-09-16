import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Phone,
  MessageCircle,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Download,
  Filter,
  Layers,
  Settings as SettingsIcon,
  Lock,
  Edit2,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import {
  Appointment,
  Service,
  Barber,
  BlockedSlot,
  ShopSettings,
  AppointmentStatus,
  User as UserType
} from '../types';
import {
  updateAppointmentStatus,
  deleteAppointment,
  saveService,
  deleteService,
  addBlockedSlot,
  deleteBlockedSlot,
  createAppointment
} from '../services/api';
import { AdminBarbersManager } from './AdminBarbersManager';

interface BarberDashboardViewProps {
  services: Service[];
  barbers: Barber[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  settings: ShopSettings;
  currentUser?: UserType | null;
  initialSubTab?: 'schedule' | 'services' | 'blocks' | 'barbers' | 'raw-json';
  onDataRefresh: () => void;
  onOpenPhpModal: () => void;
}

export const BarberDashboardView: React.FC<BarberDashboardViewProps> = ({
  services,
  barbers,
  appointments,
  blockedSlots,
  settings,
  currentUser,
  initialSubTab = 'schedule',
  onDataRefresh,
  onOpenPhpModal,
}) => {
  // Navigation tabs in barber dashboard
  const [activeTab, setActiveTab] = useState<'schedule' | 'services' | 'blocks' | 'barbers' | 'raw-json'>(
    initialSubTab
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Date filter for appointments
  const getTodayString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>(
    currentUser?.role === 'barbeiro' && currentUser.barberId ? currentUser.barberId : 'all'
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (currentUser?.role === 'barbeiro' && currentUser.barberId) {
      setSelectedBarberFilter(currentUser.barberId);
    }
  }, [currentUser]);

  // Modals state
  const [showAddServiceModal, setShowAddServiceModal] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  const [showAddAppointmentModal, setShowAddAppointmentModal] = useState<boolean>(false);
  const [manualAppForm, setManualAppForm] = useState({
    clientName: '',
    clientPhone: '',
    serviceId: services[0]?.id || '',
    barberId: barbers[0]?.id || '',
    date: getTodayString(),
    time: '14:00',
    notes: ''
  });

  const [showAddBlockModal, setShowAddBlockModal] = useState<boolean>(false);
  const [blockForm, setBlockForm] = useState({
    barberId: barbers[0]?.id || 'all',
    date: getTodayString(),
    time: '12:00',
    reason: 'Almoço / Intervalo'
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Format currency
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Metrics for today
  const todayStr = getTodayString();
  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr && a.status !== 'cancelado');
  }, [appointments, todayStr]);

  const todayRevenue = useMemo(() => {
    return todayAppointments.reduce((acc, a) => acc + (a.servicePrice || 0), 0);
  }, [todayAppointments]);

  const todayConfirmedCount = useMemo(() => {
    return todayAppointments.filter((a) => a.status === 'confirmado').length;
  }, [todayAppointments]);

  const todayCompletedCount = useMemo(() => {
    return todayAppointments.filter((a) => a.status === 'concluido').length;
  }, [todayAppointments]);

  // Filtered appointments for the schedule tab
  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        if (selectedDate && a.date !== selectedDate) return false;
        if (selectedBarberFilter !== 'all' && a.barberId !== selectedBarberFilter) return false;
        if (selectedStatusFilter !== 'all' && a.status !== selectedStatusFilter) return false;
        return true;
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate, selectedBarberFilter, selectedStatusFilter]);

  // Status changer handler
  const handleStatusChange = async (id: string, newStatus: AppointmentStatus) => {
    setActionLoading(id);
    try {
      await updateAppointmentStatus(id, newStatus);
      onDataRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete appointment handler
  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este agendamento do arquivo JSON?')) {
      return;
    }
    setActionLoading(id);
    try {
      await deleteAppointment(id);
      onDataRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir agendamento');
    } finally {
      setActionLoading(null);
    }
  };

  // Save Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.name || !editingService?.price) return;

    try {
      await saveService(editingService);
      setShowAddServiceModal(false);
      setEditingService(null);
      onDataRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar serviço');
    }
  };

  // Delete Service
  const handleDeleteService = async (id: string) => {
    if (!window.confirm('Excluir este serviço?')) return;
    try {
      await deleteService(id);
      onDataRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  // Save Blocked Slot
  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addBlockedSlot(blockForm);
      setShowAddBlockModal(false);
      onDataRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao bloquear horário');
    }
  };

  // Delete Blocked Slot
  const handleDeleteBlock = async (id: string) => {
    try {
      await deleteBlockedSlot(id);
      onDataRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao desbloquear horário');
    }
  };

  // Create Manual Appointment by Barber
  const handleCreateManualApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAppointment(manualAppForm);
      setShowAddAppointmentModal(false);
      setManualAppForm({
        clientName: '',
        clientPhone: '',
        serviceId: services[0]?.id || '',
        barberId: barbers[0]?.id || '',
        date: getTodayString(),
        time: '14:00',
        notes: ''
      });
      onDataRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao agendar horário');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Agendamentos Hoje</span>
            <CalendarIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-stone-100">{todayAppointments.length}</div>
          <p className="text-[11px] text-stone-500 mt-1">Clientes marcados para hoje</p>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Confirmados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{todayConfirmedCount}</div>
          <p className="text-[11px] text-stone-500 mt-1">Prontos para atendimento</p>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Concluídos</span>
            <Scissors className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{todayCompletedCount}</div>
          <p className="text-[11px] text-stone-500 mt-1">Cortes já finalizados</p>
        </div>

        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Faturamento Previsto</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{formatMoney(todayRevenue)}</div>
          <p className="text-[11px] text-stone-500 mt-1">Total estimado para hoje</p>
        </div>
      </div>

      {/* Dashboard Sub-Tabs & Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-stone-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            id="barber-tab-schedule"
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-900 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Agenda & Clientes
          </button>

          <button
            id="barber-tab-team"
            onClick={() => setActiveTab('barbers')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'barbers'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-900 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Barbeiros ({barbers.length})
          </button>

          <button
            id="barber-tab-services"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'services'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-900 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Scissors className="w-4 h-4" />
            Serviços ({services.length})
          </button>

          <button
            id="barber-tab-blocks"
            onClick={() => setActiveTab('blocks')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'blocks'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-900 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            Bloqueios de Horário
          </button>

          <button
            id="barber-tab-raw-json"
            onClick={() => setActiveTab('raw-json')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'raw-json'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'bg-stone-900 text-stone-300 hover:text-stone-100 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <Download className="w-4 h-4" />
            Banco de Dados JSON
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'schedule' && (
            <button
              id="btn-open-manual-appointment-modal"
              onClick={() => setShowAddAppointmentModal(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Agendar no Balcão
            </button>
          )}

          {activeTab === 'services' && (
            <button
              id="btn-open-add-service-modal"
              onClick={() => {
                setEditingService({ name: '', price: 35, duration: 30, description: '', category: 'cabelo', active: true });
                setShowAddServiceModal(true);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Novo Serviço
            </button>
          )}

          {activeTab === 'blocks' && (
            <button
              id="btn-open-add-block-modal"
              onClick={() => setShowAddBlockModal(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              Bloquear Horário
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: SCHEDULE & APPOINTMENTS */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 px-3 py-1.5 rounded-xl">
                <CalendarIcon className="w-4 h-4 text-amber-500" />
                <input
                  id="filter-date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs text-stone-200 focus:outline-none"
                />
              </div>

              <button
                id="filter-date-today-btn"
                onClick={() => setSelectedDate(getTodayString())}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                  selectedDate === getTodayString()
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-stone-950 text-stone-400 border border-stone-800 hover:text-stone-200'
                }`}
              >
                Hoje
              </button>

              <select
                id="filter-barber-select"
                value={selectedBarberFilter}
                onChange={(e) => setSelectedBarberFilter(e.target.value)}
                className="bg-stone-950 border border-stone-800 text-stone-200 text-xs px-3 py-2 rounded-xl focus:outline-none"
              >
                <option value="all">Todos os Barbeiros</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <select
                id="filter-status-select"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-stone-950 border border-stone-800 text-stone-200 text-xs px-3 py-2 rounded-xl focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="confirmado">Confirmados</option>
                <option value="pendente">Pendentes</option>
                <option value="concluido">Concluídos</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

            <span className="text-xs text-stone-400">
              {filteredAppointments.length} agendamento(s) para este filtro
            </span>
          </div>

          {/* Appointments List */}
          {filteredAppointments.length === 0 ? (
            <div className="bg-stone-900/40 border border-stone-800/80 rounded-2xl p-12 text-center">
              <CalendarIcon className="w-12 h-12 text-stone-600 mx-auto mb-3" />
              <h3 className="text-stone-300 font-semibold text-base">Nenhum agendamento encontrado</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Não há horários marcados para esta data com os filtros selecionados.
              </p>
              <button
                onClick={() => setShowAddAppointmentModal(true)}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Adicionar Agendamento Manual
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredAppointments.map((app) => {
                const cleanPhone = app.clientPhone.replace(/\D/g, '');
                const waMessage = encodeURIComponent(
                  `Olá ${app.clientName}! Aqui é da ${settings.shopName || 'Barbearia'}. Confirmando seu horário de ${app.serviceName} hoje às ${app.time}. Qualquer dúvida estamos à disposição!`
                );
                const waUrl = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${waMessage}`;

                return (
                  <div
                    key={app.id}
                    id={`barber-appointment-card-${app.id}`}
                    className={`bg-stone-900 border rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      app.status === 'concluido'
                        ? 'border-stone-800/60 opacity-80'
                        : app.status === 'cancelado'
                        ? 'border-rose-950/40 bg-stone-950/40 opacity-60'
                        : 'border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {/* Time badge & Main info */}
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-stone-950 border border-stone-800 flex flex-col items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-amber-500 mb-0.5" />
                        <span className="text-sm font-bold text-stone-100">{app.time}</span>
                        <span className="text-[10px] text-stone-500">{app.serviceDuration}m</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-stone-100 text-base">{app.clientName}</h4>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                              app.status === 'confirmado'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : app.status === 'concluido'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : app.status === 'cancelado'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
                          <span className="text-amber-400 font-medium">{app.serviceName}</span>
                          <span>•</span>
                          <span className="font-semibold text-stone-200">
                            {formatMoney(app.servicePrice)}
                          </span>
                          <span>•</span>
                          <span className="text-stone-300">Barbeiro: {app.barberName}</span>
                        </div>

                        {app.notes && (
                          <p className="text-xs text-stone-400 italic bg-stone-950/60 px-2 py-1 rounded border border-stone-800/80">
                            Obs: {app.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
                        title="Enviar mensagem no WhatsApp do cliente"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        {app.clientPhone}
                      </a>

                      {app.status !== 'concluido' && (
                        <button
                          id={`btn-complete-${app.id}`}
                          onClick={() => handleStatusChange(app.id, 'concluido')}
                          disabled={actionLoading === app.id}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-medium border border-blue-500/30 transition-colors cursor-pointer"
                        >
                          Concluir
                        </button>
                      )}

                      {app.status !== 'confirmado' && app.status !== 'concluido' && (
                        <button
                          id={`btn-confirm-${app.id}`}
                          onClick={() => handleStatusChange(app.id, 'confirmado')}
                          disabled={actionLoading === app.id}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium border border-amber-500/30 transition-colors cursor-pointer"
                        >
                          Confirmar
                        </button>
                      )}

                      {app.status !== 'cancelado' && (
                        <button
                          id={`btn-cancel-${app.id}`}
                          onClick={() => handleStatusChange(app.id, 'cancelado')}
                          disabled={actionLoading === app.id}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 text-xs font-medium border border-rose-800/50 transition-colors cursor-pointer"
                          title="Cancelar agendamento"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        id={`btn-delete-${app.id}`}
                        onClick={() => handleDeleteAppointment(app.id)}
                        disabled={actionLoading === app.id}
                        className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                        title="Excluir do registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: BARBERS (Equipe cadastrada pelo Admin) */}
      {activeTab === 'barbers' && (
        <AdminBarbersManager
          barbers={barbers}
          appointments={appointments}
          onBarbersUpdated={onDataRefresh}
        />
      )}

      {/* TAB 2: SERVICES MANAGEMENT */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-100 text-base">Cardápio de Serviços</h3>
              <p className="text-xs text-stone-400">
                Gerencie valores, durações e descrições dos serviços oferecidos aos clientes.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <div
                key={service.id}
                id={`manage-service-${service.id}`}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-stone-100 text-base">{service.name}</h4>
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      {formatMoney(service.price)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">{service.description}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-800 text-xs text-stone-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {service.duration} minutos
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingService(service);
                        setShowAddServiceModal(true);
                      }}
                      className="text-stone-300 hover:text-amber-400 p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer"
                      title="Editar serviço"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="text-stone-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-stone-800 cursor-pointer"
                      title="Excluir serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BLOCKED SLOTS */}
      {activeTab === 'blocks' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-stone-100 text-base">Bloqueios de Horário</h3>
            <p className="text-xs text-stone-400">
              Impeça agendamentos em horários de almoço, folgas ou compromissos externos.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {blockedSlots.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-stone-900/40 rounded-xl border border-stone-800">
                <p className="text-stone-400 text-sm">Nenhum horário bloqueado no momento.</p>
              </div>
            ) : (
              blockedSlots.map((block) => (
                <div
                  key={block.id}
                  className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-stone-200 text-sm block">
                      {block.reason || 'Bloqueio'}
                    </span>
                    <span className="text-xs text-stone-400">
                      {block.date} às {block.time}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="text-stone-400 hover:text-rose-400 p-2 rounded-lg hover:bg-stone-800 cursor-pointer"
                    title="Remover bloqueio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: RAW JSON DATABASE EXPLORER */}
      {activeTab === 'raw-json' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/80 border border-stone-800 p-4 rounded-2xl">
            <div>
              <h3 className="font-bold text-stone-100 text-base">Arquivo JSON de Persistência</h3>
              <p className="text-xs text-stone-400">
                Localizado em <code className="text-amber-400 font-mono">/data/barber_data.json</code>.
                Atualizado em tempo real a cada agendamento.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/raw-json"
                download="barber_data.json"
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                Baixar barber_data.json
              </a>
              <button
                onClick={onOpenPhpModal}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
                Ver Backend PHP
              </button>
            </div>
          </div>

          <pre className="bg-stone-950 border border-stone-800 p-4 rounded-2xl text-xs font-mono text-stone-300 max-h-96 overflow-y-auto overflow-x-auto scrollbar-thin">
            {JSON.stringify({ settings, barbers, services, appointments, blockedSlots }, null, 2)}
          </pre>
        </div>
      )}

      {/* MODAL: ADD/EDIT SERVICE */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-100 mb-4">
              {editingService?.id ? 'Editar Serviço' : 'Novo Serviço'}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Nome do Serviço *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Barboterapia Premium"
                  value={editingService?.name || ''}
                  onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Preço (R$) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editingService?.price || 0}
                    onChange={(e) => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Duração (min) *</label>
                  <input
                    type="number"
                    step="5"
                    required
                    value={editingService?.duration || 30}
                    onChange={(e) => setEditingService({ ...editingService, duration: parseInt(e.target.value) })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Categoria</label>
                <select
                  value={editingService?.category || 'cabelo'}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="cabelo">Cabelo</option>
                  <option value="barba">Barba</option>
                  <option value="combo">Combo</option>
                  <option value="extra">Extra</option>
                  <option value="quimica">Química</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingService?.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  placeholder="Detalhes sobre o que inclui o serviço..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Salvar no JSON
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL APPOINTMENT (BALCÃO) */}
      {showAddAppointmentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-100 mb-4">Novo Agendamento (Balcão / Telefone)</h3>

            <form onSubmit={handleCreateManualApp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={manualAppForm.clientName}
                  onChange={(e) => setManualAppForm({ ...manualAppForm, clientName: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="(11) 98888-7777"
                  value={manualAppForm.clientPhone}
                  onChange={(e) => setManualAppForm({ ...manualAppForm, clientPhone: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Serviço *</label>
                  <select
                    value={manualAppForm.serviceId}
                    onChange={(e) => setManualAppForm({ ...manualAppForm, serviceId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatMoney(s.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Barbeiro *</label>
                  <select
                    value={manualAppForm.barberId}
                    onChange={(e) => setManualAppForm({ ...manualAppForm, barberId: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  >
                    {barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={manualAppForm.date}
                    onChange={(e) => setManualAppForm({ ...manualAppForm, date: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Horário *</label>
                  <input
                    type="time"
                    required
                    value={manualAppForm.time}
                    onChange={(e) => setManualAppForm({ ...manualAppForm, time: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={manualAppForm.notes}
                  onChange={(e) => setManualAppForm({ ...manualAppForm, notes: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAppointmentModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BLOCK */}
      {showAddBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-stone-100 mb-4">Bloquear Horário na Agenda</h3>

            <form onSubmit={handleSaveBlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Barbeiro</label>
                <select
                  value={blockForm.barberId}
                  onChange={(e) => setBlockForm({ ...blockForm, barberId: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">Todos os Barbeiros</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={blockForm.date}
                    onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Horário *</label>
                  <input
                    type="time"
                    required
                    value={blockForm.time}
                    onChange={(e) => setBlockForm({ ...blockForm, time: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Motivo do Bloqueio</label>
                <input
                  type="text"
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBlockModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Salvar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
