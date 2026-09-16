import React, { useState } from 'react';
import {
  Scissors,
  Plus,
  Trash2,
  Edit2,
  Phone,
  ShieldCheck,
  UserCheck,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  Lock,
  User
} from 'lucide-react';
import { Barber, Appointment } from '../types';
import { createBarber, updateBarber, deleteBarber } from '../services/api';

interface AdminBarbersManagerProps {
  barbers: Barber[];
  appointments: Appointment[];
  onBarbersUpdated: () => void;
}

const AVATAR_PRESETS = [
  {
    label: 'Barbeiro Moderno',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  },
  {
    label: 'Barbeiro Clássico',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  },
  {
    label: 'Mestre da Navalha',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
  },
  {
    label: 'Especialista em Barba',
    url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80'
  },
  {
    label: 'Estilo Urbano',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80'
  }
];

export const AdminBarbersManager: React.FC<AdminBarbersManagerProps> = ({
  barbers,
  appointments,
  onBarbersUpdated,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  // Form fields
  const [formName, setFormName] = useState<string>('');
  const [formSpecialty, setFormSpecialty] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formAvatar, setFormAvatar] = useState<string>(AVATAR_PRESETS[0].url);
  const [formLogin, setFormLogin] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('123');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openNewBarberModal = () => {
    setEditingBarber(null);
    setFormName('');
    setFormSpecialty('Degradê, Navalha e Barboterapia');
    setFormPhone('');
    setFormAvatar(AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].url);
    setFormLogin('');
    setFormPassword('123');
    setErrorMessage(null);
    setShowModal(true);
  };

  const openEditBarberModal = (barber: Barber) => {
    setEditingBarber(barber);
    setFormName(barber.name);
    setFormSpecialty(barber.specialty);
    setFormPhone(barber.phone);
    setFormAvatar(barber.avatar);
    setFormLogin(barber.login || barber.name.toLowerCase().split(' ')[0]);
    setFormPassword('');
    setErrorMessage(null);
    setShowModal(true);
  };

  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) {
      setFormPhone(raw);
    } else if (raw.length <= 7) {
      setFormPhone(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    } else {
      setFormPhone(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`);
    }
  };

  const handleSaveBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formName.trim() || !formPhone.trim()) {
      setErrorMessage('Nome completo e telefone do barbeiro são obrigatórios.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingBarber) {
        await updateBarber(editingBarber.id, {
          name: formName.trim(),
          specialty: formSpecialty.trim(),
          phone: formPhone.trim(),
          avatar: formAvatar.trim(),
          login: formLogin.trim() || undefined,
          password: formPassword.trim() || undefined,
        });
        setSuccessMessage('Barbeiro atualizado com sucesso!');
      } else {
        await createBarber({
          name: formName.trim(),
          specialty: formSpecialty.trim(),
          phone: formPhone.trim(),
          avatar: formAvatar.trim(),
          login: formLogin.trim() || formName.toLowerCase().split(' ')[0],
          password: formPassword.trim() || '123',
        });
        setSuccessMessage('Novo barbeiro cadastrado com sucesso!');
      }

      onBarbersUpdated();
      setTimeout(() => {
        setShowModal(false);
        setSuccessMessage(null);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar barbeiro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBarber = async (barberId: string, name: string) => {
    if (
      !window.confirm(
        `Tem certeza de que deseja excluir o barbeiro "${name}"? Os agendamentos anteriores ainda serão preservados no histórico.`
      )
    ) {
      return;
    }

    try {
      await deleteBarber(barberId);
      onBarbersUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir barbeiro.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900/90 border border-stone-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <Scissors className="w-5 h-5 rotate-45" />
            </span>
            <h2 className="text-lg font-bold text-stone-100">Equipe de Barbeiros</h2>
          </div>
          <p className="text-xs text-stone-400">
            Cadastre os profissionais da barbearia. Cada barbeiro recebe um login para acessar seu próprio painel de agendamentos.
          </p>
        </div>

        <button
          onClick={openNewBarberModal}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Barbeiro
        </button>
      </div>

      {/* Barbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {barbers.map((barber) => {
          const barberAppointments = appointments.filter((a) => a.barberId === barber.id);
          const activeAppointments = barberAppointments.filter(
            (a) => a.status === 'confirmado' || a.status === 'pendente'
          );

          return (
            <div
              key={barber.id}
              className="bg-stone-900 border border-stone-800 rounded-2xl p-5 flex flex-col justify-between hover:border-stone-700 transition-all shadow-md group"
            >
              <div>
                <div className="flex items-start gap-3.5 mb-4">
                  <img
                    src={barber.avatar}
                    alt={barber.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-stone-700 shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-bold text-sm text-stone-100 truncate">{barber.name}</h3>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                        Ativo
                      </span>
                    </div>
                    <p className="text-xs text-amber-400 font-medium mt-0.5 line-clamp-1">
                      {barber.specialty}
                    </p>
                    <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-1">
                      <Phone className="w-3 h-3 text-stone-500" />
                      {barber.phone}
                    </p>
                  </div>
                </div>

                {/* Info tags */}
                <div className="grid grid-cols-2 gap-2 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80 text-xs mb-4">
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase">Login de Acesso</span>
                    <span className="font-mono text-stone-300 font-semibold text-[11px]">
                      {barber.login || barber.name.toLowerCase().split(' ')[0]}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 block uppercase">Agendamentos</span>
                    <span className="font-semibold text-amber-400 text-[11px]">
                      {activeAppointments.length} agendados
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-800 text-xs">
                <span className="text-stone-500 text-[11px]">ID: {barber.id}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditBarberModal(barber)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-800 transition-colors"
                    title="Editar barbeiro"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {barbers.length > 1 && (
                    <button
                      onClick={() => handleDeleteBarber(barber.id, barber.name)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Excluir barbeiro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create or Edit Barber */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-stone-800 bg-stone-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center">
                  <Scissors className="w-4 h-4 rotate-45" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-100">
                    {editingBarber ? 'Editar Dados do Barbeiro' : 'Cadastrar Novo Barbeiro'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Cadastrado pelo administrador com login para acesso
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveBarber} className="p-6 overflow-y-auto space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Nome Completo do Barbeiro *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Felipe 'Clipper' Costa"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Especialidades e Técnicas
                </label>
                <input
                  type="text"
                  value={formSpecialty}
                  onChange={(e) => setFormSpecialty(e.target.value)}
                  placeholder="Ex: Degradê navalhado, Barboterapia e Desenhos"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(11) 99888-7766"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    Usuário de Login (opcional)
                  </label>
                  <input
                    type="text"
                    value={formLogin}
                    onChange={(e) => setFormLogin(e.target.value)}
                    placeholder="Ex: felipecosta"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Senha de Acesso do Barbeiro
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingBarber ? 'Deixe em branco para manter a atual' : 'Padrão: 123'}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3.5 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-2">
                  Foto / Avatar do Barbeiro
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={formAvatar}
                    alt="Preview"
                    className="w-12 h-12 rounded-xl object-cover border border-amber-500/50 shrink-0"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formAvatar}
                      onChange={(e) => setFormAvatar(e.target.value)}
                      placeholder="URL da imagem..."
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-stone-300"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormAvatar(preset.url)}
                      className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        formAvatar === preset.url
                          ? 'border-amber-500 scale-105'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-9 h-9 object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-amber-500/20"
                >
                  {isLoading ? 'Salvando...' : editingBarber ? 'Atualizar Barbeiro' : 'Salvar Barbeiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
