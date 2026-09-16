import React from 'react';
import {
  Scissors,
  Calendar,
  Clock,
  MapPin,
  Phone,
  LogOut,
  LogIn,
} from 'lucide-react';
import { ActiveTab, ShopSettings, User } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: User | null;
  onNavigateToLogin: () => void;
  onLogout: () => void;
  settings?: ShopSettings;
  onOpenPhpModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onNavigateToLogin,
  onLogout,
  settings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-900/95 backdrop-blur border-b border-stone-800 text-stone-100 shadow-md">
      {/* Top micro bar with contact & info */}
      <div className="bg-stone-950/80 px-4 py-1.5 text-xs text-stone-400 border-b border-stone-800/60 hidden sm:block">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              {settings?.address || 'Rua das Palmeiras, 342 - Centro'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Seg - Sáb: {settings?.openTime || '08:00'} às {settings?.closeTime || '19:30'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`tel:${settings?.phone?.replace(/\D/g, '')}`}
              className="flex items-center gap-1.5 text-stone-300 hover:text-amber-400 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-amber-500" />
              <span>{settings?.phone || '(11) 98765-4321'}</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main navigation & actions */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand identity */}
        <button
          onClick={() => {
            if (currentUser?.role === 'admin') setActiveTab('admin');
            else if (currentUser?.role === 'barbeiro') setActiveTab('barbeiro');
            else if (currentUser?.role === 'cliente') setActiveTab('cliente');
            else setActiveTab('login');
          }}
          className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-inner">
            <Scissors className="w-5 h-5 rotate-45" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-stone-100">
              {settings?.shopName || 'Barbearia Dom navalha'}
            </h1>
            <p className="text-xs text-stone-400 hidden sm:block">
              Sistema de Agendamento e Gestão
            </p>
          </div>
        </button>

        {/* Center/Right Nav: Contextual to login state */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser ? (
            /* When logged in: show role-specific links and clean user profile with logout */
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser.role === 'admin' && (
                <div className="flex items-center gap-1 bg-stone-950/80 p-1 rounded-xl border border-stone-800">
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'admin'
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                        : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    Painel Admin
                  </button>
                  <button
                    onClick={() => setActiveTab('cliente')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'cliente'
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    Visão Cliente
                  </button>
                </div>
              )}

              {currentUser.role === 'barbeiro' && (
                <button
                  onClick={() => setActiveTab('barbeiro')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'barbeiro'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Minha Agenda
                </button>
              )}

              {currentUser.role === 'cliente' && (
                <button
                  onClick={() => setActiveTab('cliente')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'cliente'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  Agendamentos
                </button>
              )}

              {/* User profile info & Sair */}
              <div className="flex items-center gap-2 bg-stone-950/90 border border-stone-800 p-1.5 pl-3 rounded-xl">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-stone-200 line-clamp-1 max-w-[120px] sm:max-w-[150px]">
                    {currentUser.name}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      currentUser.role === 'admin'
                        ? 'text-amber-400'
                        : currentUser.role === 'barbeiro'
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>

                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800/80 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Sair da conta"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          ) : (
            /* When NOT logged in: only "Agendar Horário" and "Entrar". No "trocar de usuário" button! */
            <div className="flex items-center gap-2">
              <button
                id="btn-nav-booking"
                onClick={() => setActiveTab('cliente')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'cliente'
                    ? 'bg-stone-800 text-amber-400 border border-amber-500/40'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Agendar Horário</span>
              </button>

              <button
                id="btn-nav-login"
                onClick={onNavigateToLogin}
                className={`px-3.5 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-amber-400 text-stone-950 shadow-amber-500/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/20'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
