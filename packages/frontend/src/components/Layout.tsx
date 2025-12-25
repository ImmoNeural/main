import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, LogOut, User, ChevronLeft, ChevronRight, Target, CreditCard, Settings, PlusCircle, HelpCircle, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { useOnboarding } from '../hooks/useOnboarding';
import { useBudgetNotifications } from '../hooks/useBudgetNotifications';
import { useState } from 'react';
import ImpersonationBanner from './ImpersonationBanner';
import InteractiveTour from './InteractiveTour';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { isTrialActive, daysRemaining, isExpired, subscription } = useSubscription();
  const { showOnboarding, completeOnboarding, resetOnboarding } = useOnboarding();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Verificar budgets e enviar notificações em mobile
  useBudgetNotifications();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, tourId: 'dashboard-page' },
    { name: 'Budgets', path: '/app/budgets', icon: Target, tourId: 'budgets-page' },
    { name: 'Transações', path: '/app/transactions', icon: Receipt, tourId: 'transactions-page' },
    { name: 'Contas', path: '/app/accounts', icon: Wallet, tourId: 'accounts-page' },
    { name: 'Preferências', path: '/app/preferences', icon: Settings },
    { name: 'Planos', path: '/app/planos', icon: CreditCard },
    { name: 'Conectar Banco', path: '/app/connect-bank', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 dark:bg-slate-900 dark:text-white transition-colors duration-200">
      {/* Interactive Tour */}
      <InteractiveTour
        run={showOnboarding}
        onFinish={completeOnboarding}
      />
      {/* Sidebar - Desktop apenas */}
      <aside
        className={`hidden lg:flex bg-gradient-to-b from-primary-700 to-primary-900 text-white transition-all duration-300 fixed left-0 top-0 bottom-0 z-40 flex-col
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo/Header */}
        <div className="p-4 flex items-center justify-center border-b border-primary-600 flex-shrink-0">
          {!sidebarCollapsed ? (
            <div className="flex items-center space-x-3">
              <img
                src="/logobranco.png"
                alt="Guru do Dindin"
                className="h-12 w-auto"
              />
              <span className="text-xl font-bold text-white whitespace-nowrap">Guru do Dindin</span>
            </div>
          ) : (
            <img
              src="/logobranco.png"
              alt="Guru do Dindin"
              className="h-12 w-auto mx-auto"
            />
          )}
        </div>

        {/* Trial Badge - Topo */}
        {isTrialActive && !sidebarCollapsed && (
          <div className="px-3 pb-2">
            <div className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-center border border-yellow-300">
              <p className="text-xs font-bold">🎉 TRIAL ATIVO</p>
              <p className="text-xs mt-1">
                {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto">
          <ul className="space-y-2 px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`
                      flex items-center px-4 py-3 rounded-xl transition-all duration-200 relative
                      ${
                        isActive
                          ? 'bg-white text-primary-700 shadow-lg'
                          : 'text-white/80 hover:bg-primary-600 hover:text-white'
                      }
                      ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}
                    `}
                    title={item.name}
                    data-tour={item.tourId}
                  >
                    <Icon className={`${isActive ? 'w-7 h-7' : 'w-6 h-6'} flex-shrink-0`} />
                    {!sidebarCollapsed && (
                      <span className={`text-base font-medium ${isActive ? 'font-semibold' : ''}`}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t border-primary-600 p-4 flex-shrink-0">
          {!sidebarCollapsed ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 px-3 py-2 bg-primary-600 rounded-lg">
                <User className="w-5 h-5 text-white/80" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-white/60 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="w-full flex items-center space-x-3 px-3 py-2 text-white/80 hover:bg-primary-600 rounded-lg transition-colors"
                title={isDark ? 'Modo claro' : 'Modo escuro'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="text-sm font-medium">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>
              <button
                onClick={resetOnboarding}
                className="w-full flex items-center space-x-3 px-3 py-2 text-white/80 hover:bg-primary-600 rounded-lg transition-colors"
                title="Ver tutorial novamente"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Tutorial</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2 text-white/80 hover:bg-primary-600 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center p-3 text-white/80 hover:bg-primary-600 rounded-lg transition-colors"
                title={isDark ? 'Modo claro' : 'Modo escuro'}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={resetOnboarding}
                className="w-full flex items-center justify-center p-3 text-white/80 hover:bg-primary-600 rounded-lg transition-colors"
                title="Ver tutorial"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-3 text-white/80 hover:bg-primary-600 rounded-lg transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <div className="border-t border-primary-600 p-3 flex-shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-3 text-white bg-primary-600 hover:bg-primary-500 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-6 h-6" />
            ) : (
              <ChevronLeft className="w-6 h-6" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300
        ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
      `}>
        {/* Page Content */}
        <main className="flex-1 ml-14 lg:ml-0 px-2 sm:px-3 lg:px-6 pt-10 sm:pt-4 lg:pt-8 pb-3 sm:pb-4 lg:pb-8 overflow-x-hidden dark:text-white">
          {/* Banner de Status da Assinatura - Aparece em todas as páginas */}
          {isExpired && subscription?.trial_end_date && location.pathname !== '/app/planos' && (
            <div className="mb-4 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4 shadow-lg animate-pulse">
              <p className="text-center text-red-800 font-bold text-base">
                ⏰ Seu trial de 7 dias expirou!
              </p>
              <p className="text-center text-red-700 text-sm mt-1">
                <button
                  onClick={() => navigate('/app/planos')}
                  className="underline font-semibold hover:text-red-900"
                >
                  Clique aqui para escolher um plano
                </button>
                {' '}e continuar aproveitando todas as funcionalidades.
              </p>
            </div>
          )}
          {isTrialActive && daysRemaining <= 2 && location.pathname !== '/app/planos' && (
            <div className="mb-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 rounded-xl p-4 shadow-lg">
              <p className="text-center text-yellow-900 font-bold text-base">
                ⚠️ Seu trial expira em {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}!
              </p>
              <p className="text-center text-yellow-800 text-sm mt-1">
                <button
                  onClick={() => navigate('/app/planos')}
                  className="underline font-semibold hover:text-yellow-900"
                >
                  Escolha um plano agora
                </button>
                {' '}para não perder acesso às suas finanças.
              </p>
            </div>
          )}
          <ImpersonationBanner />
          <Outlet />
        </main>
      </div>

      {/* Left Sidebar Navigation - Mobile apenas (apenas ícones) */}
      <nav className="lg:hidden fixed left-0 top-0 bottom-0 w-14 bg-gradient-to-b from-primary-800 to-primary-700 border-r border-primary-600 z-50 flex flex-col items-center py-4">
        {/* Logo pequeno no topo */}
        <div className="mb-4 pb-3 border-b border-primary-600 w-full flex justify-center">
          <img
            src="/logobranco.png"
            alt="Guru"
            className="w-8 h-8 object-contain"
          />
        </div>

        {/* Navigation icons */}
        <div className="flex-1 flex flex-col items-center space-y-2 overflow-y-auto pt-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200
                  ${
                    isActive
                      ? 'bg-white text-primary-700 shadow-lg'
                      : 'text-white/80 hover:bg-primary-600'
                  }
                `}
                title={item.name}
                data-tour={item.tourId}
              >
                <Icon className={`${isActive ? 'w-5 h-5' : 'w-5 h-5'} flex-shrink-0`} />
              </Link>
            );
          })}
        </div>

        {/* Botões no fundo */}
        <div className="pt-3 border-t border-primary-600 w-full flex flex-col items-center space-y-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-white/80 hover:bg-primary-600 transition-all duration-200"
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          </button>
          <button
            onClick={resetOnboarding}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-white/80 hover:bg-primary-600 transition-all duration-200"
            title="Tutorial"
          >
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-white/80 hover:bg-primary-600 transition-all duration-200"
            title="Sair"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
