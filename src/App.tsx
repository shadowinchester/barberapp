import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ClientBookingView } from './components/ClientBookingView';
import { BarberDashboardView } from './components/BarberDashboardView';
import { LoginView } from './components/LoginView';
import { PhpModal } from './components/PhpModal';
import { ActiveTab, BarberShopDatabase, User } from './types';
import { fetchDatabase, updateAppointmentStatus } from './services/api';
import { Scissors, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [database, setDatabase] = useState<BarberShopDatabase | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPhpModalOpen, setIsPhpModalOpen] = useState<boolean>(false);

  // User session state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('barber_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active tab state: defaults to 'login' screen if not logged in
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const saved = localStorage.getItem('barber_current_user');
      if (saved) {
        const user = JSON.parse(saved);
        if (user.role === 'admin') return 'admin';
        if (user.role === 'barbeiro') return 'barbeiro';
        return 'cliente';
      }
    } catch {
      // ignore
    }
    return 'login';
  });

  // Load database from API (reading data/barber_data.json)
  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);
      const data = await fetchDatabase();
      setDatabase(data);
    } catch (err: any) {
      console.error('Error fetching database:', err);
      setErrorMessage('Não foi possível sincronizar com o arquivo JSON.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle successful login
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('barber_current_user', JSON.stringify(user));
      localStorage.setItem('barber_client_name', user.name);
      localStorage.setItem('barber_client_phone', user.phone);
    } catch {
      // ignore
    }

    // Direct user to appropriate view according to role
    if (user.role === 'admin') {
      setActiveTab('admin');
    } else if (user.role === 'barbeiro') {
      setActiveTab('barbeiro');
    } else {
      setActiveTab('cliente');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('barber_current_user');
    } catch {
      // ignore
    }
    setActiveTab('login');
  };

  // Client cancellation handler
  const handleClientCancelAppointment = async (id: string) => {
    try {
      await updateAppointmentStatus(id, 'cancelado');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar agendamento');
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onNavigateToLogin={() => setActiveTab('login')}
        onLogout={handleLogout}
        settings={database?.settings}
        onOpenPhpModal={() => setIsPhpModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Error notification if backend fails */}
        {errorMessage && (
          <div className="bg-amber-950/40 border border-amber-700/50 p-3.5 rounded-xl text-xs text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1 font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !database && (
          <div className="py-24 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 animate-spin">
              <Scissors className="w-6 h-6 rotate-45" />
            </div>
            <p className="text-sm text-stone-400">Carregando dados da barbearia...</p>
          </div>
        )}

        {/* Main Views */}
        {database && (
          <>
            {/* TELA DE LOGIN DEDICADA */}
            {activeTab === 'login' ? (
              <LoginView
                onLoginSuccess={handleLoginSuccess}
                onContinueAsGuest={() => setActiveTab('cliente')}
                initialRole="cliente"
                settings={database.settings}
                barbers={database.barbers || []}
              />
            ) : activeTab === 'cliente' ? (
              <ClientBookingView
                services={database.services || []}
                barbers={database.barbers || []}
                appointments={database.appointments || []}
                blockedSlots={database.blockedSlots || []}
                settings={database.settings}
                currentUser={currentUser}
                onOpenLoginModal={() => setActiveTab('login')}
                onAppointmentCreated={loadData}
                onCancelAppointment={handleClientCancelAppointment}
              />
            ) : activeTab === 'barbeiro' ? (
              <BarberDashboardView
                services={database.services || []}
                barbers={database.barbers || []}
                appointments={database.appointments || []}
                blockedSlots={database.blockedSlots || []}
                settings={database.settings}
                currentUser={currentUser}
                initialSubTab="schedule"
                onDataRefresh={loadData}
                onOpenPhpModal={() => setIsPhpModalOpen(true)}
              />
            ) : (
              /* Admin Tab: Equipe de Barbeiros, Serviços, Configurações e Agenda */
              <div className="space-y-4">
                <BarberDashboardView
                  services={database.services || []}
                  barbers={database.barbers || []}
                  appointments={database.appointments || []}
                  blockedSlots={database.blockedSlots || []}
                  settings={database.settings}
                  currentUser={currentUser}
                  initialSubTab="barbers"
                  onDataRefresh={loadData}
                  onOpenPhpModal={() => setIsPhpModalOpen(true)}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800/80 bg-stone-900/60 py-5 text-center text-xs text-stone-500 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © {new Date().getFullYear()} {database?.settings?.shopName || 'Barbearia'} • Sistema Web com dados em JSON
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPhpModalOpen(true)}
              className="text-stone-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Código PHP & Estrutura JSON
            </button>
            <span>•</span>
            <span className="text-amber-500/80">BarberApp v1.0</span>
          </div>
        </div>
      </footer>

      {/* PHP & JSON Code Documentation Modal */}
      <PhpModal isOpen={isPhpModalOpen} onClose={() => setIsPhpModalOpen(false)} />
    </div>
  );
}
