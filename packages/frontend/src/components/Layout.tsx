import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, LogOut, User, ChevronLeft, ChevronRight, Target, CreditCard, Settings, HelpCircle, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCountry } from '../contexts/CountryContext';
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
  const { country, setCountry, toggleCountry } = useCountry();
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
  ];

  // Título da página atual (para a topbar)
  const currentNav =
    navigation.find((n) => location.pathname === n.path) ||
    navigation.find((n) => location.pathname.startsWith(n.path));
  const pageTitle = currentNav?.name || 'Guru do Dindin';

  // Saudação amigável conforme a hora
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = user?.name?.split(' ')[0] || '';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-transparent dark:text-white transition-colors duration-200">
      {/* Interactive Tour */}
      <InteractiveTour run={showOnboarding} onFinish={completeOnboarding} />

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden lg:flex bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white transition-all duration-300 fixed left-0 top-0 bottom-0 z-40 flex-col border-r border-white/5
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo/Header */}
        <div className={`h-16 flex items-center flex-shrink-0 border-b border-white/5 ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'}`}>
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <img src="/logobranco.png" alt="Guru do Dindin" className="h-9 w-auto" />
              <span className="text-[15px] font-bold tracking-tight text-white whitespace-nowrap">
                Guru do Dindin
              </span>
            </div>
          ) : (
            <img src="/logobranco.png" alt="Guru do Dindin" className="h-9 w-auto" />
          )}
        </div>

        {/* Trial Badge */}
        {isTrialActive && !sidebarCollapsed && (
          <div className="px-3 pt-4">
            <div className="bg-gradient-to-r from-amber-400/15 to-amber-500/10 text-amber-300 px-3 py-2.5 rounded-xl text-center border border-amber-400/20">
              <p className="text-[11px] font-bold tracking-wide">✦ TRIAL ATIVO</p>
              <p className="text-[11px] mt-0.5 text-amber-200/80">
                {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {!sidebarCollapsed && (
            <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Menu</p>
          )}
          <ul className="space-y-1 px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = currentNav?.path === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`group relative flex items-center px-3 py-2.5 rounded-xl transition-all duration-200
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-[0_8px_20px_-8px_rgba(33,82,228,0.7)]'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      }
                      ${sidebarCollapsed ? 'justify-center' : 'gap-3'}
                    `}
                    title={item.name}
                    data-tour={item.tourId}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                    {!sidebarCollapsed && (
                      <span className="text-sm font-medium">{item.name}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Country Selector */}
        <div className="px-3 pb-1 flex-shrink-0">
          {!sidebarCollapsed ? (
            <>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">País</p>
              <div className="flex gap-1 px-2">
                <button
                  onClick={() => setCountry('BR')}
                  className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5
                    ${country === 'BR'
                      ? 'bg-primary-500/20 text-white border border-primary-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  title="Brasil"
                >
                  <span className="text-base">🇧🇷</span>
                  <span>BR</span>
                </button>
                <button
                  onClick={() => setCountry('DE')}
                  className={`flex-1 px-2 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5
                    ${country === 'DE'
                      ? 'bg-primary-500/20 text-white border border-primary-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  title="Alemanha"
                >
                  <span className="text-base">🇩🇪</span>
                  <span>DE</span>
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={toggleCountry}
              className="w-full flex items-center justify-center p-2.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors"
              title={country === 'BR' ? 'Mudar para Alemanha' : 'Mudar para Brasil'}
            >
              <span className="text-lg">{country === 'BR' ? '🇧🇷' : '🇩🇪'}</span>
            </button>
          )}
        </div>

        {/* User Section */}
        <div className="border-t border-white/5 p-3 flex-shrink-0 space-y-1">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1 bg-white/[0.04] rounded-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {firstName ? firstName[0].toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {!sidebarCollapsed && <span className="text-sm font-medium">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>
          <button
            onClick={resetOnboarding}
            className={`w-full flex items-center px-3 py-2.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}
            title="Ver tutorial novamente"
          >
            <HelpCircle className="w-5 h-5" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Tutorial</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-3 py-2.5 text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>

        {/* Toggle Button */}
        <div className="border-t border-white/5 p-3 flex-shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-2.5 text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-all duration-200"
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300
        ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
      `}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 ml-14 lg:ml-0 h-14 lg:h-16 px-3 sm:px-5 lg:px-8 flex items-center justify-between
          bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/70">
          <div className="min-w-0">
            <h1 className="text-base lg:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {pageTitle}
            </h1>
            <p className="hidden sm:block text-[11px] lg:text-xs text-slate-400 dark:text-slate-500 -mt-0.5">
              {greeting}{firstName ? `, ${firstName}` : ''} ✦ {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 ml-14 lg:ml-0 px-2 sm:px-3 lg:px-8 pt-3 sm:pt-4 lg:pt-6 pb-4 lg:pb-10 overflow-x-hidden dark:text-white">
          {/* Banner de Status da Assinatura */}
          {isExpired && subscription?.trial_end_date && location.pathname !== '/app/planos' && (
            <div className="mb-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl p-4 shadow-sm">
              <p className="text-center text-red-800 font-bold text-base">⏰ Seu trial de 7 dias expirou!</p>
              <p className="text-center text-red-700 text-sm mt-1">
                <button onClick={() => navigate('/app/planos')} className="underline font-semibold hover:text-red-900">
                  Clique aqui para escolher um plano
                </button>
                {' '}e continuar aproveitando todas as funcionalidades.
              </p>
            </div>
          )}
          {isTrialActive && daysRemaining <= 2 && location.pathname !== '/app/planos' && (
            <div className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 shadow-sm">
              <p className="text-center text-amber-900 font-bold text-base">
                ⚠️ Seu trial expira em {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''}!
              </p>
              <p className="text-center text-amber-800 text-sm mt-1">
                <button onClick={() => navigate('/app/planos')} className="underline font-semibold hover:text-amber-900">
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

      {/* Sidebar Mobile (apenas ícones) */}
      <nav className="lg:hidden fixed left-0 top-0 bottom-0 w-14 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-white/5 z-50 flex flex-col items-center pt-3 pb-4">
        <div className="mb-3 pb-3 border-b border-white/5 w-full flex justify-center">
          <img src="/logobranco.png" alt="Guru" className="w-8 h-8 object-contain" />
        </div>
        <div className="flex-1 flex flex-col items-center space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = currentNav?.path === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200
                  ${isActive ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-[0_8px_16px_-6px_rgba(33,82,228,0.7)]' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}
                `}
                title={item.name}
                data-tour={item.tourId}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
        <div className="pt-3 border-t border-white/5 w-full flex flex-col items-center space-y-1.5">
          <button
            onClick={toggleCountry}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all duration-200"
            title={country === 'BR' ? 'Brasil (mudar para Alemanha)' : 'Alemanha (mudar para Brasil)'}
          >
            <span className="text-base">{country === 'BR' ? '🇧🇷' : '🇩🇪'}</span>
          </button>
          <button onClick={toggleTheme} className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all duration-200" title={isDark ? 'Modo claro' : 'Modo escuro'}>
            {isDark ? <Sun className="w-5 h-5 flex-shrink-0" /> : <Moon className="w-5 h-5 flex-shrink-0" />}
          </button>
          <button onClick={resetOnboarding} className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:bg-white/[0.06] hover:text-white transition-all duration-200" title="Tutorial">
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
          </button>
          <button onClick={handleLogout} className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200" title="Sair">
            <LogOut className="w-5 h-5 flex-shrink-0" />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
