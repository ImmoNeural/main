import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Budgets from './pages/Budgets';
import BudgetDetails from './pages/BudgetDetails';
import Preferences from './pages/Preferences';
import ConnectBank from './pages/ConnectBank';
import Plans from './pages/Plans';
import AdminTransactions from './pages/admin/AdminTransactions';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LandingPage from './pages/LandingPage';
import OnboardingGoals from './pages/OnboardingGoals';
import NotificationPermission from './pages/NotificationPermission';
import AuthCallback from './pages/AuthCallback';
import PrivacyPolicy from './pages/PrivacyPolicy';
import DataDeletion from './pages/DataDeletion';
import TermsOfService from './pages/TermsOfService';
import ProtectedRoute from './components/ProtectedRoute';
import GoogleAnalytics from './components/GoogleAnalytics';
import StructuredData from './components/StructuredData';
import AnimatedSplash from './components/AnimatedSplash';
import { Capacitor } from '@capacitor/core';

// Google Analytics Measurement ID
// IMPORTANTE: Substitua pelo seu próprio ID do Google Analytics
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

// Detectar se está rodando no mobile (Capacitor)
const isMobile = Capacitor.isNativePlatform();

// Verificar se deve pular o splash (já está autenticado)
const shouldSkipSplash = () => {
  return !!localStorage.getItem('token');
};

// Componente para redirecionar após splash no mobile
const MobileRedirect = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const hasOpenedAppBefore = localStorage.getItem('has_opened_app');
    const token = localStorage.getItem('token');

    if (isAuthenticated || token) {
      // Usuário logado → vai para o app
      navigate('/app/dashboard', { replace: true });
    } else if (hasOpenedAppBefore) {
      // Usuário já abriu o app antes mas não está logado → Login
      navigate('/login', { replace: true });
    } else {
      // Primeira vez abrindo o app → Cadastro
      localStorage.setItem('has_opened_app', 'true');
      navigate('/register', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Mostrar tela de loading enquanto verifica
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #1d4ed8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.3)',
        borderTopColor: '#ffffff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

function App() {
  // No mobile, mostrar splash apenas se NÃO estiver autenticado e não voltou de OAuth
  // Isso evita que a animação rode novamente após OAuth
  const [showSplash, setShowSplash] = useState(isMobile && !shouldSkipSplash());

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Show animated splash on mobile
  if (showSplash) {
    return <AnimatedSplash onFinish={handleSplashFinish} />;
  }

  return (
    <ThemeProvider>
      <HelmetProvider>
        <AuthProvider>
          <BrowserRouter>
          {/* Google Analytics */}
          <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />

          {/* Structured Data para SEO */}
          <StructuredData />

          <Routes>
            {/* Rota pública - Homepage (no mobile redireciona baseado no estado) */}
            <Route path="/" element={isMobile ? <MobileRedirect /> : <LandingPage />} />

            {/* Rotas públicas de autenticação */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Páginas públicas legais */}
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/termos" element={<TermsOfService />} />
            <Route path="/exclusao-dados" element={<DataDeletion />} />

            {/* Onboarding após cadastro */}
            <Route
              path="/onboarding/goals"
              element={
                <ProtectedRoute>
                  <OnboardingGoals />
                </ProtectedRoute>
              }
            />

            {/* Permissão de notificações */}
            <Route
              path="/onboarding/notifications"
              element={
                <ProtectedRoute>
                  <NotificationPermission />
                </ProtectedRoute>
              }
            />

            {/* Rotas protegidas */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="budgets" element={<Budgets />} />
              <Route path="budgets/:categoryName/:tipoCusto" element={<BudgetDetails />} />
              <Route path="preferences" element={<Preferences />} />
              <Route path="connect-bank" element={<ConnectBank />} />
              <Route path="planos" element={<Plans />} />
              {/* Admin routes */}
              <Route path="admin/transactions" element={<AdminTransactions />} />
            </Route>

            {/* Rota padrão - manter wildcards funcionando */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </HelmetProvider>
    </ThemeProvider>
  );
}

export default App;
