import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  Scissors,
  CheckCircle2,
  Phone,
  Sparkles,
  Search,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  XCircle,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { Service, Barber, Appointment, BlockedSlot, ShopSettings, User } from '../types';
import { createAppointment } from '../services/api';

interface ClientBookingViewProps {
  services: Service[];
  barbers: Barber[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  settings: ShopSettings;
  currentUser?: User | null;
  onOpenLoginModal?: () => void;
  onAppointmentCreated: () => void;
  onCancelAppointment: (id: string) => void;
}

export const ClientBookingView: React.FC<ClientBookingViewProps> = ({
  services,
  barbers,
  appointments,
  blockedSlots,
  settings,
  currentUser,
  onOpenLoginModal,
  onAppointmentCreated,
  onCancelAppointment,
}) => {
  // Navigation between "Novo Agendamento" and "Meus Agendamentos"
  const [subView, setSubView] = useState<'booking' | 'my-appointments'>('booking');

  // Booking Flow Steps
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('any');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState<string>(currentUser?.name || '');
  const [clientPhone, setClientPhone] = useState<string>(currentUser?.phone || '');
  const [notes, setNotes] = useState<string>('');
  const [saveLocalInfo, setSaveLocalInfo] = useState<boolean>(true);

  // Filter category for services
  const [serviceCategory, setServiceCategory] = useState<string>('todos');

  // Loading & error states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // "Meus Agendamentos" search state
  const [searchPhone, setSearchPhone] = useState<string>(currentUser?.phone || '');

  // Keep state synced if currentUser logs in
  useEffect(() => {
    if (currentUser) {
      setClientName(currentUser.name);
      setClientPhone(currentUser.phone);
      setSearchPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Load saved client profile from localStorage for fast 1-click booking if not logged in
  useEffect(() => {
    if (currentUser) return;
    try {
      const savedName = localStorage.getItem('barber_client_name');
      const savedPhone = localStorage.getItem('barber_client_phone');
      if (savedName) setClientName(savedName);
      if (savedPhone) {
        setClientPhone(savedPhone);
        setSearchPhone(savedPhone);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  // Format date helper (YYYY-MM-DD)
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize selectedDate with today on mount
  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(getTodayString());
    }
  }, [selectedDate]);

  // Generate next 14 available dates
  const availableDates = useMemo(() => {
    const dates = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const dayOfWeek = d.getDay();

      // Check if day is within shop's working days
      const isWorkingDay = settings.workingDays?.includes(dayOfWeek) ?? (dayOfWeek !== 0);

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      dates.push({
        dateStr,
        dayOfWeekName: dayNames[dayOfWeek],
        dayOfMonth: day,
        monthName: monthNames[d.getMonth()],
        isToday: i === 0,
        isTomorrow: i === 1,
        isWorkingDay
      });
    }
    return dates;
  }, [settings]);

  // Generate all time slots based on settings
  const generatedSlots = useMemo(() => {
    const slots: string[] = [];
    const openTime = settings.openTime || '08:00';
    const closeTime = settings.closeTime || '19:30';
    const interval = settings.slotInterval || 30;

    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    for (let m = openMinutes; m < closeMinutes; m += interval) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
  }, [settings]);

  // Determine availability of each slot for the selected date and barber
  const slotAvailability = useMemo(() => {
    return generatedSlots.map((time) => {
      // Check lunch time
      if (settings.lunchStart && settings.lunchEnd) {
        if (time >= settings.lunchStart && time < settings.lunchEnd) {
          return { time, available: false, reason: 'Intervalo de almoço' };
        }
      }

      // Check blocked slots
      const isBlocked = blockedSlots.some(
        (b) =>
          b.date === selectedDate &&
          b.time === time &&
          (b.barberId === 'all' || selectedBarberId === 'any' || b.barberId === selectedBarberId)
      );
      if (isBlocked) {
        return { time, available: false, reason: 'Indisponível' };
      }

      // Check if slot is booked by existing appointment
      if (selectedBarberId === 'any') {
        // If "any barber" is selected, available if AT LEAST ONE barber is free
        const bookedBarberIds = appointments
          .filter((a) => a.date === selectedDate && a.time === time && a.status !== 'cancelado')
          .map((a) => a.barberId);

        const hasFreeBarber = barbers.some((b) => !bookedBarberIds.includes(b.id));
        return {
          time,
          available: hasFreeBarber,
          reason: hasFreeBarber ? 'Disponível' : 'Todos os barbeiros ocupados'
        };
      } else {
        // Specific barber
        const isBooked = appointments.some(
          (a) =>
            a.date === selectedDate &&
            a.time === time &&
            a.barberId === selectedBarberId &&
            a.status !== 'cancelado'
        );
        return {
          time,
          available: !isBooked,
          reason: isBooked ? 'Horário já reservado' : 'Disponível'
        };
      }
    });
  }, [generatedSlots, selectedDate, selectedBarberId, appointments, barbers, blockedSlots, settings]);

  // Selected service object
  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId),
    [services, selectedServiceId]
  );

  // Format currency
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Format Brazilian phone input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);

    if (val.length > 6) {
      val = `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
    } else if (val.length > 2) {
      val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
    } else if (val.length > 0) {
      val = `(${val}`;
    }
    setClientPhone(val);
  };

  // Filtered services
  const filteredServices = useMemo(() => {
    if (serviceCategory === 'todos') return services.filter((s) => s.active !== false);
    return services.filter((s) => s.category === serviceCategory && s.active !== false);
  }, [services, serviceCategory]);

  // Submit appointment handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId || !selectedDate || !selectedTime || !clientName.trim() || !clientPhone.trim()) {
      setSubmitError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Resolve barber ID if "any"
    let finalBarberId = selectedBarberId;
    if (finalBarberId === 'any') {
      const bookedBarberIds = appointments
        .filter((a) => a.date === selectedDate && a.time === selectedTime && a.status !== 'cancelado')
        .map((a) => a.barberId);
      const freeBarber = barbers.find((b) => !bookedBarberIds.includes(b.id));
      finalBarberId = freeBarber ? freeBarber.id : barbers[0]?.id || 'b1';
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const newApp = await createAppointment({
        clientName,
        clientPhone,
        serviceId: selectedServiceId,
        barberId: finalBarberId,
        date: selectedDate,
        time: selectedTime,
        notes
      });

      // Save client details for future 1-click visits
      if (saveLocalInfo) {
        localStorage.setItem('barber_client_name', clientName.trim());
        localStorage.setItem('barber_client_phone', clientPhone.trim());
      }

      setConfirmedAppointment(newApp);
      onAppointmentCreated();
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao realizar agendamento. Tente outro horário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Appointments filtered by phone search
  const clientAppointments = useMemo(() => {
    if (!searchPhone.trim()) return [];
    const cleanSearch = searchPhone.replace(/\D/g, '');
    return appointments.filter((a) => a.clientPhone.replace(/\D/g, '').includes(cleanSearch));
  }, [appointments, searchPhone]);

  // Reset booking form
  const handleNewBooking = () => {
    setConfirmedAppointment(null);
    setSelectedServiceId('');
    setSelectedTime('');
    setCurrentStep(1);
    setSubmitError(null);
  };

  // WhatsApp reminder message builder
  const buildWhatsAppLink = (app: Appointment) => {
    const shopPhone = (settings.phone || '11987654321').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Olá ${settings.shopName || 'Barbearia'}! Sou ${app.clientName} e agendei o serviço *${app.serviceName}* com *${app.barberName}* no dia *${app.date}* às *${app.time}*. (Código: #${app.id.slice(-6)})`
    );
    return `https://api.whatsapp.com/send?phone=55${shopPhone}&text=${text}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Sub-navigation Switcher (Novo Agendamento vs Meus Agendamentos) */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-2 bg-stone-900/90 p-1 rounded-xl border border-stone-800">
          <button
            id="subview-booking-btn"
            onClick={() => {
              setSubView('booking');
              setConfirmedAppointment(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              subView === 'booking'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800'
            }`}
          >
            <Scissors className="w-4 h-4" />
            Agendar Horário
          </button>
          <button
            id="subview-my-appointments-btn"
            onClick={() => setSubView('my-appointments')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              subView === 'my-appointments'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-sm'
                : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            Meus Agendamentos
          </button>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1 justify-end">
            <Sparkles className="w-3.5 h-3.5" />
            Sem filas e 100% online
          </span>
          <p className="text-xs text-stone-400">Cancelamento grátis até 1h antes</p>
        </div>
      </div>

      {/* VIEW 1: MY APPOINTMENTS CONSULTATION */}
      {subView === 'my-appointments' && (
        <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-6 shadow-xl">
          <div className="max-w-md mx-auto mb-8 text-center">
            <h2 className="text-xl font-bold text-stone-100 mb-2">Consultar Meus Agendamentos</h2>
            <p className="text-sm text-stone-400 mb-4">
              Informe seu número de WhatsApp para ver o histórico e status de seus agendamentos.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                <input
                  id="client-search-phone-input"
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {searchPhone.trim() && (
            <div className="space-y-3">
              {clientAppointments.length === 0 ? (
                <div className="text-center py-10 bg-stone-950/40 rounded-xl border border-stone-800/80">
                  <CalendarIcon className="w-10 h-10 text-stone-600 mx-auto mb-2" />
                  <p className="text-stone-300 font-medium">Nenhum agendamento localizado para este telefone.</p>
                  <p className="text-xs text-stone-500 mt-1">Verifique o DDD e os números digitados.</p>
                </div>
              ) : (
                clientAppointments.map((app) => (
                  <div
                    key={app.id}
                    id={`client-appointment-card-${app.id}`}
                    className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-stone-700"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-100 text-base">{app.serviceName}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            app.status === 'confirmado'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                              : app.status === 'concluido'
                              ? 'bg-blue-950/80 text-blue-400 border border-blue-800'
                              : app.status === 'cancelado'
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {app.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1 text-stone-300">
                          <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                          {app.date} às {app.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-stone-400" />
                          Barbeiro: {app.barberName}
                        </span>
                        <span className="font-medium text-amber-400">
                          {formatMoney(app.servicePrice)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={buildWhatsAppLink(app)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium border border-emerald-500/30 flex items-center gap-1 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>

                      {app.status !== 'cancelado' && app.status !== 'concluido' && (
                        <button
                          id={`cancel-btn-${app.id}`}
                          onClick={() => {
                            if (window.confirm('Deseja realmente cancelar este agendamento?')) {
                              onCancelAppointment(app.id);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-medium border border-rose-500/30 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SUCCESS BOOKING CARD */}
      {subView === 'booking' && confirmedAppointment && (
        <div className="bg-stone-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-2xl animate-fade-in">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-stone-100 mb-1">Agendamento Confirmado!</h2>
          <p className="text-sm text-stone-400 mb-6">
            Tudo pronto! Seu horário foi reservado com sucesso no nosso sistema.
          </p>

          <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 text-left mb-6 space-y-2.5">
            <div className="flex justify-between items-center text-sm border-b border-stone-800/80 pb-2">
              <span className="text-stone-400">Cliente:</span>
              <span className="text-stone-100 font-semibold">{confirmedAppointment.clientName}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-stone-800/80 pb-2">
              <span className="text-stone-400">Serviço:</span>
              <span className="text-amber-400 font-semibold">{confirmedAppointment.serviceName}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-stone-800/80 pb-2">
              <span className="text-stone-400">Profissional:</span>
              <span className="text-stone-200">{confirmedAppointment.barberName}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-stone-800/80 pb-2">
              <span className="text-stone-400">Data e Horário:</span>
              <span className="text-stone-100 font-semibold">
                {confirmedAppointment.date} às {confirmedAppointment.time}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Valor Estimado:</span>
              <span className="text-amber-400 font-bold text-base">
                {formatMoney(confirmedAppointment.servicePrice)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <a
              id="btn-whatsapp-confirmation"
              href={buildWhatsAppLink(confirmedAppointment)}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
            >
              <MessageCircle className="w-5 h-5" />
              Notificar / Enviar no WhatsApp da Barbearia
            </a>

            <button
              id="btn-make-another-booking"
              onClick={handleNewBooking}
              className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-medium text-sm transition-colors cursor-pointer"
            >
              Fazer Outro Agendamento
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: ACTIVE BOOKING STEPS */}
      {subView === 'booking' && !confirmedAppointment && (
        <div>
          {/* Step Progress Tracker */}
          <div className="mb-8">
            <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
              {[
                { step: 1, label: 'Serviço', icon: Scissors },
                { step: 2, label: 'Barbeiro', icon: UserIcon },
                { step: 3, label: 'Data & Hora', icon: CalendarIcon },
                { step: 4, label: 'Cadastro', icon: CheckCircle2 },
              ].map((item) => {
                const IconComponent = item.icon;
                const isActive = currentStep === item.step;
                const isPassed = currentStep > item.step;

                return (
                  <button
                    key={item.step}
                    id={`step-indicator-${item.step}`}
                    onClick={() => {
                      // Allow navigating back to completed steps
                      if (item.step < currentStep) {
                        setCurrentStep(item.step as any);
                      }
                    }}
                    disabled={item.step > currentStep}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                        : isPassed
                        ? 'bg-stone-900 border-stone-700 text-stone-300 cursor-pointer'
                        : 'bg-stone-950/40 border-stone-800/60 text-stone-600 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 text-xs font-bold ${
                        isActive
                          ? 'bg-amber-500 text-stone-950'
                          : isPassed
                          ? 'bg-stone-700 text-stone-200'
                          : 'bg-stone-900 text-stone-600'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 1: CHOOSE SERVICE */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-stone-100">Selecione o Serviço</h2>
                  <p className="text-sm text-stone-400">
                    Escolha um dos nossos serviços especializados para iniciar seu agendamento.
                  </p>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'todos', label: 'Todos' },
                    { id: 'cabelo', label: 'Cabelo' },
                    { id: 'barba', label: 'Barba' },
                    { id: 'combo', label: 'Combos' },
                    { id: 'extra', label: 'Extras' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      id={`category-pill-${cat.id}`}
                      onClick={() => setServiceCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        serviceCategory === cat.id
                          ? 'bg-amber-500 text-stone-950 font-semibold'
                          : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Cards Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredServices.map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <div
                      key={service.id}
                      id={`service-card-${service.id}`}
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50 shadow-lg shadow-amber-500/10'
                          : 'bg-stone-900/80 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 text-amber-500">
                          <CheckCircle2 className="w-5 h-5 fill-amber-500 text-stone-950" />
                        </div>
                      )}

                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2 pr-6">
                          <h3 className="font-semibold text-stone-100 text-base">{service.name}</h3>
                        </div>
                        <p className="text-xs text-stone-400 leading-relaxed mb-4">
                          {service.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-stone-800/80 mt-auto">
                        <span className="flex items-center gap-1 text-xs text-stone-400 bg-stone-950 px-2 py-1 rounded-md border border-stone-800">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {service.duration} min
                        </span>
                        <span className="text-lg font-bold text-amber-400">
                          {formatMoney(service.price)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 1 Footer Action */}
              <div className="flex justify-end pt-4">
                <button
                  id="step1-continue-btn"
                  disabled={!selectedServiceId}
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  Continuar para Barbeiro
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE BARBER */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-stone-100">Escolha o Profissional</h2>
                  <p className="text-sm text-stone-400">
                    Selecione seu barbeiro preferido ou opte por qualquer profissional disponível.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Option: Any Available Barber */}
                <div
                  id="barber-option-any"
                  onClick={() => setSelectedBarberId('any')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                    selectedBarberId === 'any'
                      ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                      : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 font-bold">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-stone-100 text-base">Qualquer Barbeiro</h3>
                      {selectedBarberId === 'any' && (
                        <CheckCircle2 className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-1">
                      O primeiro profissional com horário vago no momento escolhido.
                    </p>
                  </div>
                </div>

                {/* Individual Barbers */}
                {barbers.map((barber) => {
                  const isSelected = selectedBarberId === barber.id;
                  return (
                    <div
                      key={barber.id}
                      id={`barber-card-${barber.id}`}
                      onClick={() => setSelectedBarberId(barber.id)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                          : 'bg-stone-900/80 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <img
                        referrerPolicy="no-referrer"
                        src={barber.avatar}
                        alt={barber.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-stone-700"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-stone-100 text-base">{barber.name}</h3>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-amber-500" />}
                        </div>
                        <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                          {barber.specialty}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 2 Actions */}
              <div className="flex justify-between pt-4">
                <button
                  id="step2-back-btn"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl text-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  id="step2-continue-btn"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  Continuar para Horários
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DATE & TIME SELECTION */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-100">Escolha a Data e Horário</h2>
                <p className="text-sm text-stone-400">
                  Selecione o dia e o horário mais conveniente para o seu atendimento.
                </p>
              </div>

              {/* Horizontal Date Picker Slider */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                  1. Selecione o Dia
                </label>
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                  {availableDates.map((item) => {
                    const isSelected = selectedDate === item.dateStr;
                    return (
                      <button
                        key={item.dateStr}
                        id={`date-pill-${item.dateStr}`}
                        disabled={!item.isWorkingDay}
                        onClick={() => {
                          setSelectedDate(item.dateStr);
                          setSelectedTime(''); // Reset time when date changes
                        }}
                        className={`flex flex-col items-center min-w-[70px] p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 border-amber-500 font-bold shadow-md shadow-amber-500/20'
                            : item.isWorkingDay
                            ? 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                            : 'bg-stone-950/40 border-stone-900 text-stone-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className="text-[11px] uppercase tracking-wider">
                          {item.isToday ? 'Hoje' : item.isTomorrow ? 'Amanhã' : item.dayOfWeekName}
                        </span>
                        <span className="text-xl font-bold my-0.5">{item.dayOfMonth}</span>
                        <span className="text-[10px] opacity-80">{item.monthName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    2. Selecione o Horário Disponível
                  </label>
                  <span className="text-xs text-stone-400">
                    Duração: {selectedService?.duration || 30} minutos
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {slotAvailability.map((slot) => {
                    const isSelected = selectedTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        id={`time-slot-${slot.time.replace(':', '-')}`}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md shadow-amber-500/20'
                            : slot.available
                            ? 'bg-stone-900 border-stone-800 text-stone-200 hover:border-amber-500/50 hover:bg-stone-850 cursor-pointer'
                            : 'bg-stone-950/50 border-stone-900 text-stone-600 line-through cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3 Actions */}
              <div className="flex justify-between pt-4">
                <button
                  id="step3-back-btn"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl text-sm flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  id="step3-continue-btn"
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-stone-950 font-bold rounded-xl text-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  Continuar para Cadastro
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: FAST REGISTRATION & CONFIRMATION */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-stone-100">Cadastro Rápido & Confirmação</h2>
                <p className="text-sm text-stone-400">
                  Preencha apenas seu nome e WhatsApp para confirmar a reserva em instantes.
                </p>
              </div>

              {/* Summary of Selected Order */}
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-stone-800 pb-3">
                  <div>
                    <span className="text-xs text-stone-400 block">Serviço Escolhido</span>
                    <span className="font-semibold text-stone-100 text-base">
                      {selectedService?.name}
                    </span>
                  </div>
                  <span className="text-base font-bold text-amber-400">
                    {formatMoney(selectedService?.price || 0)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-stone-300 pt-1">
                  <div>
                    <span className="text-stone-500 block">Data</span>
                    <span className="font-medium text-stone-200">{selectedDate}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Horário</span>
                    <span className="font-medium text-amber-400">{selectedTime}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">Profissional</span>
                    <span className="font-medium text-stone-200">
                      {selectedBarberId === 'any'
                        ? 'Primeiro Disponível'
                        : barbers.find((b) => b.id === selectedBarberId)?.name || 'Barbeiro'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fast Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {submitError && (
                  <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-4 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Seu Nome Completo *
                    </label>
                    <input
                      id="input-client-name"
                      type="text"
                      required
                      placeholder="Ex: Lucas Ferreira"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      WhatsApp / Celular *
                    </label>
                    <input
                      id="input-client-phone"
                      type="text"
                      required
                      placeholder="(11) 98123-4567"
                      value={clientPhone}
                      onChange={handlePhoneChange}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-3 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Observações (Opcional)
                  </label>
                  <textarea
                    id="input-client-notes"
                    rows={2}
                    placeholder="Ex: Prefiro acabamento bem alinhado na lâmina, pele sensível..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="save-local-info-checkbox"
                    checked={saveLocalInfo}
                    onChange={(e) => setSaveLocalInfo(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-stone-900 border-stone-700"
                  />
                  <label htmlFor="save-local-info-checkbox" className="text-xs text-stone-400 cursor-pointer">
                    Salvar meus dados neste navegador para agendamentos rápidos no futuro
                  </label>
                </div>

                {/* Step 4 Actions */}
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    id="step4-back-btn"
                    onClick={() => setCurrentStep(3)}
                    className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl text-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Voltar
                  </button>

                  <button
                    type="submit"
                    id="btn-confirm-appointment"
                    disabled={isSubmitting}
                    className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-bold rounded-xl text-base flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {isSubmitting ? 'Confirmando...' : 'Finalizar Agendamento'}
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
