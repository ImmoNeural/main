import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, Wallet, PlusCircle, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
    { name: 'Transações', path: '/app/transactions', icon: Receipt },
    { name: 'Contas', path: '/app/accounts', icon: Wallet },
    { name: 'Conectar Banco', path: '/app/connect-bank', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Sempre visível, collapsed no mobile */}
      <aside
        className={`bg-gradient-to-b from-primary-700 to-primary-900 text-white transition-all duration-300 fixed left-0 top-0 bottom-0 z-40 flex flex-col
          w-20
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        {/* Logo/Header - Fixed at top */}
        <div className="p-3 lg:p-4 flex items-center justify-center border-b border-primary-600 flex-shrink-0">
          {/* Mobile: sempre mostra apenas logo */}
          <div className="lg:hidden">
            <img
              src="/logobranco.png"
              alt="Guru do Dindin"
              className="h-10 w-auto"
            />
          </div>

          {/* Desktop: mostra logo + texto ou apenas logo */}
          <div className="hidden lg:block w-full">
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
        </div>

        {/* Navigation - Scrollable middle section */}
        <nav className="flex-1 py-4 lg:py-6 overflow-y-auto">
          <ul className="space-y-2 px-2 lg:px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`
                      flex items-center justify-center lg:justify-start space-x-3 px-3 lg:px-4 py-3 rounded-xl transition-all duration-200
                      ${
                        isActive
                          ? 'bg-white text-primary-700 shadow-lg'
                          : 'text-white/80 hover:bg-primary-600 hover:text-white'
                      }
                      ${sidebarCollapsed ? 'lg:justify-center' : ''}
                    `}
                    title={item.name}
                  >
                    <Icon className={`${isActive ? 'w-6 h-6 lg:w-7 lg:h-7' : 'w-5 h-5 lg:w-6 lg:h-6'} flex-shrink-0`} />
                    {/* Texto visível apenas no desktop quando expandido */}
                    {!sidebarCollapsed && (
                      <span className={`hidden lg:inline text-base font-medium ${isActive ? 'font-semibold' : ''}`}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section - Fixed at bottom */}
        <div className="border-t border-primary-600 p-3 lg:p-4 flex-shrink-0">
          {/* Mobile: apenas botão de logout */}
          <div className="lg:hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-3 text-white/80 hover:bg-primary-600 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop: info completa quando expandido, apenas ícone quando collapsed */}
          <div className="hidden lg:block">
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
              <div className="space-y-3">
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
        </div>

        {/* Toggle Button - Fixed at bottom - Hidden on mobile */}
        <div className="hidden lg:block border-t border-primary-600 p-3 flex-shrink-0">
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

      {/* Main Content - Adjusted for fixed sidebar */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300
        ml-20
        ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
      `}>
        {/* Page Content */}
        <main className="flex-1 px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
