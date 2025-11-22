import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, PlusCircle, LogOut, User, ChevronLeft, ChevronRight, Target, CreditCard, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { useState } from 'react';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isTrialActive, daysRemaining, isExpired, subscription } = useSubscription();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Budgets', path: '/app/budgets', icon: Target },
    { name: 'Transações', path: '/app/transactions', icon: Receipt },
    { name: 'Contas', path: '/app/accounts', icon: Wallet },
    { name: 'Preferências', path: '/app/preferences', icon: Settings },
    { name: 'Planos', path: '/app/planos', icon: CreditCard },
    // OCULTO: Trial do Pluggy expirou
    // { name: 'Conectar Banco', path: '/app/connect-bank', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
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
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-3 py-2 text-white/80 hover:bg-primary-600 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-3 text-white/80 hover:bg-primary-600 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
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
        <main className="flex-1 px-2 sm:px-3 lg:px-6 py-3 sm:py-4 lg:py-8 overflow-x-hidden pb-20 lg:pb-8">
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
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation - Mobile apenas */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-primary-800 to-primary-700 border-t border-primary-600 z-50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg transition-all duration-200 min-w-0 flex-1 relative
                  ${
                    isActive
                      ? 'bg-white text-primary-700'
                      : 'text-white/80'
                  }
                `}
              >
                <Icon className={`${isActive ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0 mb-0.5`} />
                <span className={`text-[9px] font-medium truncate w-full text-center ${isActive ? 'font-semibold' : ''}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-white/80 min-w-0 flex-1"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 mb-0.5" />
            <span className="text-[9px] font-medium truncate w-full text-center">Sair</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
