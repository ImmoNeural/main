import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<any>;
  loginWithGoogle: () => Promise<void>;
  loginWithFacebook: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticação no carregamento inicial
  useEffect(() => {
    checkAuth();

    // Listener para mudanças de autenticação do Supabase (OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        // Usuário logou via OAuth - sincronizar com nosso backend
        try {
          const response = await authApi.oauthCallback({
            provider_id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
            avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            provider: session.user.app_metadata?.provider || 'oauth',
          });

          const { token, user: userData } = response.data;
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
        } catch (error) {
          console.error('Error syncing OAuth user:', error);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        // Validar token com o backend
        const response = await authApi.getMe();
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Token inválido, limpar storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const { token, user: userData } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await authApi.register(name, email, password);
    const { token, user: userData } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return response; // Retornar response para acessar mensagem de trial
  };

  const loginWithGoogle = async () => {
    const redirectUrl = Capacitor.isNativePlatform()
      ? 'com.gurudodindin.app://login-callback'
      : `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google login error:', error);
      throw new Error(error.message);
    }
  };

  const loginWithFacebook = async () => {
    const redirectUrl = Capacitor.isNativePlatform()
      ? 'com.gurudodindin.app://login-callback'
      : `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: redirectUrl,
        scopes: 'email,public_profile',
      },
    });

    if (error) {
      console.error('Facebook login error:', error);
      throw new Error(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);

    // Chamar endpoint de logout (opcional, apenas para registro)
    authApi.logout().catch(console.error);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
