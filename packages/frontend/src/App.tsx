import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  const [showSplash, setShowSplash] = useState(isMobile);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  // Show animated splash on mobile
  if (showSplash) {
    return <AnimatedSplash onFinish={handleSplashFinish} />;
  }

  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          {/* Google Analytics */}
          <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />

          {/* Structured Data para SEO */}
          <StructuredData />

          <Routes>
            {/* Rota pública - Homepage (no mobile vai direto para login) */}
            <Route path="/" element={isMobile ? <Navigate to="/login" replace /> : <LandingPage />} />

            {/* Rotas públicas de autenticação */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Onboarding após cadastro */}
            <Route
              path="/onboarding/goals"
              element={
                <ProtectedRoute>
                  <OnboardingGoals />
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
  );
}

export default App;
