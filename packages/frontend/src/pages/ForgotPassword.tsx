import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // Usar Supabase para enviar email de recuperação de senha
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError('Erro ao enviar email de recuperação. Verifique se o email está correto.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <p className="text-white/80 text-base">Recuperar senha</p>
        </div>

        {/* Card de recuperação */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 animate-slide-up">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Esqueceu sua senha?</h2>
            <p className="text-gray-600 text-sm">
              Digite seu email e enviaremos instruções para redefinir sua senha
            </p>
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 animate-shake">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Mensagem de sucesso */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3 animate-slide-down">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-semibold mb-1">Email enviado com sucesso!</p>
                <p>Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
              </div>
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
                  disabled={success}
                />
              </div>
            </div>

            {/* Botão de enviar */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2.5 px-4 rounded-lg font-medium hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Email enviado!</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Enviar instruções</span>
                </>
              )}
            </button>
          </form>

          {/* Link para voltar */}
          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-primary-600 text-sm font-medium hover:text-primary-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para login
            </Link>
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

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
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

        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;
