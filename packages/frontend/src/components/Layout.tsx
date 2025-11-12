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
      {/* Sidebar */}
      <aside
        className={`bg-gradient-to-b from-primary-700 to-primary-900 text-white transition-all duration-300 flex flex-col ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo/Header */}
        <div className="p-4 flex items-center justify-between border-b border-primary-600">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <img
                src="/logobranco.png"
                alt="Guru do Dindin"
                className="h-12 w-auto"
              />
              <span className="text-2xl font-bold text-white">Guru</span>
            </div>
          )}
          {sidebarCollapsed && (
            <img
              src="/logobranco.png"
              alt="Guru do Dindin"
              className="h-12 w-auto mx-auto"
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <ul className="space-y-2 px-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`
                      flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                      ${
                        isActive
                          ? 'bg-white text-primary-700 shadow-lg transform scale-105'
                          : 'text-white/80 hover:bg-primary-600 hover:text-white'
                      }
                      ${sidebarCollapsed ? 'justify-center' : ''}
                    `}
                    title={sidebarCollapsed ? item.name : ''}
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
        <div className="border-t border-primary-600 p-4">
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

        {/* Toggle Button */}
        <div className="border-t border-primary-600 p-3">
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
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-primary-700">
                Guru do Dindin
              </h1>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-6 py-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
