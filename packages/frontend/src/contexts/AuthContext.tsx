import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { authApi } from '../services/api';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { SocialLogin } from '@capgo/capacitor-social-login';

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

  // Refs para evitar race conditions e chamadas duplicadas
  const isProcessingOAuth = useRef(false);
  const hasProcessedSession = useRef(false);

  // Verificar autenticação no carregamento inicial
  useEffect(() => {
    let isMounted = true;

    // Inicializar Social Login no mobile
    if (Capacitor.isNativePlatform()) {
      SocialLogin.initialize({
        google: {
          webClientId: '1052845276050-b4s3ccf30hunbgg4ulqcsn8e7sgpj6et.apps.googleusercontent.com',
        },
      }).catch(err => console.log('SocialLogin init error:', err));
    }

    const initAuth = async () => {
      // Verificar se já tem sessão do Supabase (para OAuth)
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user && !hasProcessedSession.current) {
        hasProcessedSession.current = true;
        // Já tem sessão OAuth, usar ela
        const supabaseToken = session.access_token;
        localStorage.setItem('token', supabaseToken);

        try {
          const response = await authApi.oauthCallback({
            provider_id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name ||
                  session.user.user_metadata?.name ||
                  session.user.email?.split('@')[0] || 'Usuário',
            avatar_url: session.user.user_metadata?.avatar_url ||
                        session.user.user_metadata?.picture,
            provider: session.user.app_metadata?.provider || 'oauth',
          });

          if (isMounted) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
            setUser(response.data.user);
          }
        } catch (error) {
          console.error('Error syncing OAuth session:', error);
          // Tentar fallback para checkAuth normal
          await checkAuth();
        }
      } else {
        // Sem sessão OAuth, verificar token local
        await checkAuth();
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listener para mudanças de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event);

      // Evitar processar se já está processando ou se já processou
      if (isProcessingOAuth.current || hasProcessedSession.current) {
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        isProcessingOAuth.current = true;
        hasProcessedSession.current = true;

        try {
          const supabaseToken = session.access_token;
          localStorage.setItem('token', supabaseToken);

          const response = await authApi.oauthCallback({
            provider_id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name ||
                  session.user.user_metadata?.name ||
                  session.user.email?.split('@')[0] || 'Usuário',
            avatar_url: session.user.user_metadata?.avatar_url ||
                        session.user.user_metadata?.picture,
            provider: session.user.app_metadata?.provider || 'oauth',
          });

          if (isMounted) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
            setUser(response.data.user);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error syncing OAuth user:', error);
        } finally {
          isProcessingOAuth.current = false;
        }
      } else if (event === 'SIGNED_OUT') {
        hasProcessedSession.current = false;
        if (isMounted) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    });

    // Listener para deep links no mobile (OAuth callback)
    let appUrlListener: any = null;
    if (Capacitor.isNativePlatform()) {
      appUrlListener = App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
        console.log('📱 Deep link received:', event.url);

        // Verificar se é um callback de OAuth
        if (event.url.includes('login-callback') && !isProcessingOAuth.current) {
          isProcessingOAuth.current = true;

          try {
            // Extrair os parâmetros da URL
            const url = new URL(event.url.replace('com.gurudodindin.app://', 'https://app/'));
            const accessToken = url.searchParams.get('access_token') ||
                               url.hash?.match(/access_token=([^&]*)/)?.[1];
            const refreshToken = url.searchParams.get('refresh_token') ||
                                url.hash?.match(/refresh_token=([^&]*)/)?.[1];

            if (accessToken) {
              // Definir a sessão no Supabase
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });

              if (error) {
                console.error('Error setting session:', error);
                isProcessingOAuth.current = false;
                return;
              }

              if (data.session?.user) {
                hasProcessedSession.current = true;

                // Sincronizar com backend
                const response = await authApi.oauthCallback({
                  provider_id: data.session.user.id,
                  email: data.session.user.email || '',
                  name: data.session.user.user_metadata?.full_name ||
                        data.session.user.user_metadata?.name ||
                        data.session.user.email?.split('@')[0] || 'Usuário',
                  avatar_url: data.session.user.user_metadata?.avatar_url ||
                              data.session.user.user_metadata?.picture,
                  provider: data.session.user.app_metadata?.provider || 'oauth',
                });

                localStorage.setItem('token', accessToken);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                // Marcar se é novo usuário para redirecionar corretamente
                if (response.data.isNewUser) {
                  localStorage.setItem('oauth_new_user', 'true');
                }

                if (isMounted) {
                  setUser(response.data.user);
                  setIsLoading(false);
                }

                // NÃO usar window.location.href - deixar React Router navegar via estado
                // A mudança de isAuthenticated vai triggar o redirect em Login/Register
              }
            }
          } catch (error) {
            console.error('Error handling deep link:', error);
          } finally {
            isProcessingOAuth.current = false;
          }
        }
      });
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (appUrlListener) {
        appUrlListener.remove();
      }
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

    return response;
  };

  const loginWithGoogle = async () => {
    // Reset flags antes de iniciar novo OAuth
    isProcessingOAuth.current = false;
    hasProcessedSession.current = false;

    // No mobile, usar Google Sign-In nativo (abre dentro do app)
    if (Capacitor.isNativePlatform()) {
      try {
        isProcessingOAuth.current = true;

        // Login nativo com Google usando @capgo/capacitor-social-login
        const result = await SocialLogin.login({
          provider: 'google',
          options: {},
        });

        console.log('📱 Google native sign-in result:', result);

        if (result.provider === 'google' && result.result) {
          const googleResult = result.result as any;
          const idToken = googleResult.idToken;

          if (idToken) {
            // Usar o idToken para autenticar com Supabase
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
            });

            if (error) {
              console.error('Supabase auth error:', error);
              throw new Error(error.message);
            }

            if (data.session?.user) {
              hasProcessedSession.current = true;

              // Sincronizar com backend
              const response = await authApi.oauthCallback({
                provider_id: data.session.user.id,
                email: data.session.user.email || googleResult.email || '',
                name: data.session.user.user_metadata?.full_name ||
                      googleResult.name ||
                      googleResult.givenName ||
                      data.session.user.email?.split('@')[0] || 'Usuário',
                avatar_url: data.session.user.user_metadata?.avatar_url ||
                            googleResult.imageUrl,
                provider: 'google',
              });

              localStorage.setItem('token', data.session.access_token);
              localStorage.setItem('user', JSON.stringify(response.data.user));
              setUser(response.data.user);

              if (response.data.isNewUser) {
                localStorage.setItem('oauth_new_user', 'true');
              }
            }
          }
        }
      } catch (error: any) {
        console.error('Google native login error:', error);
        isProcessingOAuth.current = false;
        throw new Error(error.message || 'Erro ao fazer login com Google');
      } finally {
        isProcessingOAuth.current = false;
      }
    } else {
      // No web, usar OAuth redirect normal
      const redirectUrl = `${window.location.origin}/auth/callback`;

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
    }
  };

  const loginWithFacebook = async () => {
    // Reset flags antes de iniciar novo OAuth
    isProcessingOAuth.current = false;
    hasProcessedSession.current = false;

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

  const logout = async () => {
    // Limpar flags
    hasProcessedSession.current = false;
    isProcessingOAuth.current = false;

    // Logout do Supabase
    await supabase.auth.signOut();

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Limpar dados de impersonação
    localStorage.removeItem('impersonate_user_id');
    localStorage.removeItem('impersonate_user_name');
    localStorage.removeItem('impersonate_admin_id');

    setUser(null);

    // Chamar endpoint de logout (opcional)
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
