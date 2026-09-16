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
  Calendar,
  Info
} from 'lucide-react';
import { User, UserRole, Barber, ShopSettings } from '../types';
import { loginUser, registerClient } from '../services/api';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
  initialRole?: UserRole;
  settings?: ShopSettings;
  barbers?: Barber[];
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
  initialRole = 'cliente',
  settings,
  barbers = [],
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [clientMode, setClientMode] = useState<'login' | 'register'>('login');

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

  const shopName = settings?.shopName || 'Barbearia Dom navalha';

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
    setErrorMessage(null);
    setIsLoading(true);

    let cred = 'admin';
    let pass = role === 'admin' ? 'admin' : '123';

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
      }, 400);
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
          ? 'Informe seu WhatsApp / Telefone ou Nome para entrar.'
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
      }, 400);
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
      setSuccessMessage(`Cadastro realizado com sucesso! Bem-vindo, ${user.name}.`);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao cadastrar cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto py-4 px-2 sm:px-0">
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur">
        {/* Top visual header */}
        <div className="p-6 sm:p-8 text-center border-b border-stone-800/80 bg-gradient-to-b from-stone-950/90 to-stone-900 relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-amber-500/10">
            <Scissors className="w-8 h-8 rotate-45" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-100 tracking-tight">
            {shopName}
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-md mx-auto">
            Acesse sua conta para agendar horários, acompanhar seus cortes ou gerenciar a barbearia.
          </p>

          {/* Role selector tabs */}
          <div className="mt-6">
            <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2.5 text-left sm:text-center">
              Selecione seu perfil de acesso:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Cliente */}
              <button
                type="button"
                id="login-role-cliente"
                onClick={() => {
                  setSelectedRole('cliente');
                  setErrorMessage(null);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'cliente'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                }`}
              >
                <UserIcon className="w-5 h-5 mb-1.5 text-amber-500" />
                <span>Cliente</span>
              </button>

              {/* Barbeiro */}
              <button
                type="button"
                id="login-role-barbeiro"
                onClick={() => {
                  setSelectedRole('barbeiro');
                  setErrorMessage(null);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'barbeiro'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                }`}
              >
                <Scissors className="w-5 h-5 mb-1.5 text-amber-500 rotate-45" />
                <span>Barbeiro</span>
              </button>

              {/* Admin */}
              <button
                type="button"
                id="login-role-admin"
                onClick={() => {
                  setSelectedRole('admin');
                  setErrorMessage(null);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-md'
                    : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                }`}
              >
                <ShieldCheck className="w-5 h-5 mb-1.5 text-amber-500" />
                <span>Admin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* If Role is Barbeiro: Information Note */}
          {selectedRole === 'barbeiro' && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300/90 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Barbeiros são cadastrados pelo <strong>Administrador</strong> na aba de equipe. Utilize seu usuário ou WhatsApp cadastrado para acessar sua agenda.
              </span>
            </div>
          )}

          {/* If Role is Cliente: Sub-navigation between "Já sou cliente" and "Novo por aqui?" */}
          {selectedRole === 'cliente' && (
            <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800">
              <button
                type="button"
                onClick={() => {
                  setClientMode('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  clientMode === 'login'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Já tenho cadastro
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientMode('register');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  clientMode === 'register'
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Novo por aqui? (10s)</span>
              </button>
            </div>
          )}

          {/* Form Rendering */}
          {selectedRole === 'cliente' && clientMode === 'register' ? (
            /* REGISTRATION FORM FOR NEW CLIENTS */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Cadastre-se rapidamente com apenas Nome e WhatsApp para agendar horários em 1 clique e receber lembretes.
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
                  Usado para confirmações e lembretes automáticos do seu corte.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Senha Simples (opcional)
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
                    <span>Concluir Cadastro e Agendar</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* STANDARD LOGIN FORM (FOR CLIENTS, BARBERS & ADMIN) */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  {selectedRole === 'cliente'
                    ? 'WhatsApp / Telefone ou Nome Cadastrado'
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
                  <span className="text-[11px] text-stone-500">
                    {selectedRole === 'admin' ? 'Senha: admin' : 'Padrão demo: 123'}
                  </span>
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
                    Validando acesso...
                  </span>
                ) : (
                  <>
                    <span>Entrar como {selectedRole.toUpperCase()}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick 1-click Demo logins */}
          <div className="bg-stone-950/70 p-4 rounded-2xl border border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Acesso Rápido para Avaliação (1 clique):
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="py-2 px-2.5 bg-stone-900 hover:bg-amber-500/20 hover:text-amber-300 border border-stone-700/80 rounded-xl text-stone-300 font-medium transition-colors text-center"
              >
                👑 Demo Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('barbeiro')}
                className="py-2 px-2.5 bg-stone-900 hover:bg-amber-500/20 hover:text-amber-300 border border-stone-700/80 rounded-xl text-stone-300 font-medium transition-colors text-center"
              >
                ✂️ Demo Barbeiro
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('cliente')}
                className="py-2 px-2.5 bg-stone-900 hover:bg-amber-500/20 hover:text-amber-300 border border-stone-700/80 rounded-xl text-stone-300 font-medium transition-colors text-center"
              >
                👤 Demo Cliente
              </button>
            </div>
          </div>

          {/* Option to bypass login and continue as guest */}
          <div className="pt-2 text-center border-t border-stone-800/80">
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="text-xs text-stone-400 hover:text-amber-400 flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer py-1"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Deseja apenas agendar um corte sem login? Clique aqui para ver horários</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
