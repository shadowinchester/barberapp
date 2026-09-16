import React, { useState } from 'react';
import {
  Scissors,
  User as UserIcon,
  ShieldCheck,
  Phone,
  Lock,
  ArrowRight,
  UserPlus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Info
} from 'lucide-react';
import { User, UserRole, Barber } from '../types';
import { loginUser, registerClient } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialRole?: UserRole;
  shopName?: string;
  barbers?: Barber[];
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialRole = 'cliente',
  shopName = 'Barbearia Dom navalha',
  barbers = []
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [viewMode, setViewMode] = useState<'login' | 'register'>('login');

  // Login form fields
  const [loginCredential, setLoginCredential] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register form fields ("Novo por aqui?")
  const [regName, setRegName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('123');

  // Status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Mask phone helper
  const maskPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, isReg: boolean) => {
    const formatted = maskPhone(e.target.value);
    if (isReg) {
      setRegPhone(formatted);
    } else {
      setLoginCredential(formatted);
    }
  };

  // Quick Demo fill
  const handleQuickDemo = async (role: UserRole) => {
    setSelectedRole(role);
    setViewMode('login');
    setErrorMessage(null);
    setIsLoading(true);

    let cred = 'admin';
    let pass = '123';

    if (role === 'barbeiro') {
      cred = barbers[0]?.login || 'rodrigo';
      pass = '123';
    } else if (role === 'cliente') {
      cred = '(11) 99888-7766';
      pass = '123';
    }

    try {
      const user = await loginUser(role, cred, pass);
      setSuccessMessage(`Conectado com sucesso como ${user.name}!`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao logar em modo demonstração.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginCredential.trim()) {
      setErrorMessage(
        selectedRole === 'cliente'
          ? 'Informe seu WhatsApp / Telefone para entrar.'
          : 'Informe seu usuário ou telefone cadastrado.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const user = await loginUser(selectedRole, loginCredential.trim(), loginPassword.trim() || undefined);
      setSuccessMessage(`Bem-vindo de volta, ${user.name}!`);
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register Client Submit ("Novo por aqui?")
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regName.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    const cleanPhoneDigits = regPhone.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 10) {
      setErrorMessage('Informe um WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }

    setIsLoading(true);
    try {
      const user = await registerClient(regName.trim(), regPhone.trim(), regPassword.trim() || '123');
      setSuccessMessage('Cadastro concluído! Acessando a barbearia...');
      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao cadastrar cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-stone-800 bg-stone-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-inner">
              <Scissors className="w-5 h-5 rotate-45" />
            </div>
            <div>
              <h2 className="font-bold text-base text-stone-100 flex items-center gap-2">
                {viewMode === 'register' ? 'Novo por aqui? Cadastre-se' : 'Acesse sua Conta'}
              </h2>
              <p className="text-xs text-stone-400">{shopName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {viewMode === 'login' ? (
            <>
              {/* Profile Role Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2">
                  Selecione o seu perfil de acesso:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Cliente */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('cliente');
                      setErrorMessage(null);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      selectedRole === 'cliente'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm'
                        : 'bg-stone-950/50 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <UserIcon className="w-5 h-5 mb-1 text-amber-500" />
                    <span>Cliente</span>
                  </button>

                  {/* Barbeiro */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('barbeiro');
                      setErrorMessage(null);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      selectedRole === 'barbeiro'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm'
                        : 'bg-stone-950/50 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <Scissors className="w-5 h-5 mb-1 text-amber-500 rotate-45" />
                    <span>Barbeiro</span>
                  </button>

                  {/* Admin */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole('admin');
                      setErrorMessage(null);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition-all ${
                      selectedRole === 'admin'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm'
                        : 'bg-stone-950/50 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5 mb-1 text-amber-500" />
                    <span>Admin</span>
                  </button>
                </div>
              </div>

              {/* Notice for Barbers */}
              {selectedRole === 'barbeiro' && (
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300/90 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Os barbeiros são cadastrados pelo <strong>Administrador</strong> no painel de equipe. Use seu usuário ou telefone cadastrado.
                  </span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1.5">
                    {selectedRole === 'cliente'
                      ? 'Telefone / WhatsApp ou Nome'
                      : 'Usuário ou Telefone de Acesso'}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                    <input
                      type="text"
                      value={loginCredential}
                      onChange={(e) =>
                        selectedRole === 'cliente'
                          ? handlePhoneChange(e, false)
                          : setLoginCredential(e.target.value)
                      }
                      placeholder={
                        selectedRole === 'cliente'
                          ? '(11) 98765-4321 ou seu nome'
                          : selectedRole === 'barbeiro'
                          ? 'rodrigo ou (11) 99111-2233'
                          : 'admin ou telefone'
                      }
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-medium text-stone-300">
                      Senha de Acesso
                    </label>
                    <span className="text-[11px] text-stone-500">Padrão demo: 123</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 animate-spin rotate-45" />
                      Validando...
                    </span>
                  ) : (
                    <>
                      <span>Entrar como {selectedRole.toUpperCase()}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Call to action "Novo por aqui?" for clients */}
              <div className="pt-3 border-t border-stone-800 text-center">
                <p className="text-xs text-stone-400 mb-2">Novo por aqui?</p>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('register');
                    setErrorMessage(null);
                  }}
                  className="w-full py-2.5 bg-stone-800 hover:bg-stone-700/80 border border-stone-700 text-amber-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Cadastre-se com Nome e Telefone (10 segundos)
                </button>
              </div>

              {/* Quick Demo Login shortcuts */}
              <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span className="font-semibold text-stone-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    Acesso Rápido para Avaliação (1 clique):
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin')}
                    className="py-1.5 px-2 bg-stone-900 hover:bg-amber-500/20 hover:text-amber-300 border border-stone-700/70 rounded-lg text-stone-300 font-medium transition-colors"
                  >
                    👑 Demo Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('barbeiro')}
                    className="py-1.5 px-2 bg-stone-900 hover:bg-amber-500/20 hover:text-amber-300 border border-stone-700/70 rounded-lg text-stone-300 font-medium transition-colors"
                  >
                    ✂️ Demo Barbeiro
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('cliente')}
                    className="py-1.5 px-2 bg-stone-900 hover:bg-amber-500/20 hover:text-amber-300 border border-stone-700/70 rounded-lg text-stone-300 font-medium transition-colors"
                  >
                    👤 Demo Cliente
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Register Client Form ("Novo por aqui?") */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Faça seu cadastro rápido para agendar horários em 1 clique e acompanhar seus cortes na barbearia.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Seu Nome Completo *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ex: Matheus Oliveira"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  WhatsApp / Celular com DDD *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={(e) => handlePhoneChange(e, true)}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Usado para identificação e lembretes do seu agendamento.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Senha Simples de Acesso (opcional)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="123"
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Scissors className="w-4 h-4 animate-spin rotate-45" />
                    Criando seu cadastro...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cadastrar e Acessar Barbearia</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-stone-400 hover:text-amber-400 underline transition-colors"
                >
                  Já tem conta cadastrada? Clique para fazer login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
