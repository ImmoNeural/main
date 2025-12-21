import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { bankApi } from '../services/api';
import SEO from '../components/SEO';

// Ícones SVG do Google e Facebook
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginWithFacebook } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // Verificar se é primeiro acesso (sem contas bancárias)
      try {
        const accountsResponse = await bankApi.getAccounts();

        if (!accountsResponse.data || accountsResponse.data.length === 0) {
          // Primeiro acesso: redirecionar para conectar banco
          navigate('/app/connect-bank');
          return;
        }
      } catch (accountsError) {
        console.warn('Could not check accounts, redirecting to dashboard');
      }

      // Usuário com contas vai para dashboard
      navigate('/app/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSocialLoading('google');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Erro ao fazer login com Google');
      setSocialLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    setError('');
    setSocialLoading('facebook');
    try {
      await loginWithFacebook();
    } catch (err: any) {
      console.error('Facebook login error:', err);
      setError(err.message || 'Erro ao fazer login com Facebook');
      setSocialLoading(null);
    }
  };

  return (
    <>
      <SEO
        title="Login - Acesse sua conta"
        description="Faça login no Guru do Dindin e gerencie suas finanças pessoais de forma inteligente. Controle seus gastos, orçamentos e muito mais."
        keywords="login, entrar, acessar conta, guru do dindin, finanças"
      />

    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600 px-4 py-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo e título */}
        <div className="text-center mb-4 animate-fade-in">
          <div className="inline-flex items-center justify-center mb-3">
            <img
              src="/logo.png"
              alt="Guru do Dindin"
              className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Guru do Dindin</h1>
          <p className="text-white/80 text-base">Seu Guru das Finanças</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 animate-slide-up">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Bem-vindo de volta!</h2>
            <p className="text-gray-600 text-sm">Entre com sua conta para continuar</p>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-gray-900"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-white text-gray-900"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Botão de login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2.5 px-4 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="mt-4 flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-sm text-gray-500">ou continue com</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Botões de login social */}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || socialLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {socialLoading === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <GoogleIcon />
              )}
              <span className="text-sm font-medium text-gray-700">Google</span>
            </button>
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={loading || socialLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {socialLoading === 'facebook' ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <FacebookIcon />
              )}
              <span className="text-sm font-medium text-gray-700">Facebook</span>
            </button>
          </div>

          {/* Link para registro */}
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-sm">
              Não tem uma conta?{' '}
              <Link
                to="/register"
                className="text-primary-600 font-medium hover:text-primary-700 transition-colors"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-white/60 text-xs">
          <p>© 2025 Guru do Dindin. Todos os direitos reservados.</p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out 0.2s both;
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
    </>
  );
};

export default Login;
