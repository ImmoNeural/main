import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { authApi } from '../services/api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase handles the OAuth callback automatically
        // We just need to get the session and sync with our backend
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          setError('Erro ao processar autenticação. Tente novamente.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!session?.user) {
          console.error('No session user');
          setError('Sessão não encontrada. Redirecionando...');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Set the Supabase token temporarily so the API interceptor can use it
        const supabaseToken = session.access_token;
        localStorage.setItem('token', supabaseToken);

        // Sync with our backend
        const response = await authApi.oauthCallback({
          provider_id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email?.split('@')[0] ||
                'Usuário',
          avatar_url: session.user.user_metadata?.avatar_url ||
                      session.user.user_metadata?.picture,
          provider: session.user.app_metadata?.provider || 'oauth',
        });

        const { user: userData, isNewUser } = response.data;
        // Keep using the Supabase token (already set)
        localStorage.setItem('user', JSON.stringify(userData));

        // Route based on whether this is a new user (bank connection feature removed)
        if (isNewUser) {
          // New user: clear onboarding flags and go to goals
          localStorage.removeItem('guru_onboarding_completed');
          localStorage.removeItem('guru_onboarding_skipped');
          localStorage.removeItem('notifications_asked');
          navigate('/onboarding/goals');
        } else {
          navigate('/app/dashboard');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #0284c7 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Logo */}
      <div style={{
        width: '100px',
        height: '100px',
        marginBottom: '30px',
      }}>
        <img
          src="/logo.png"
          alt="Guru do Dindin"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)',
          }}
        />
      </div>

      {error ? (
        <>
          <h1 style={{
            color: '#ffffff',
            fontSize: '1.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '10px',
          }}>
            Ops! Algo deu errado
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '1rem',
            textAlign: 'center',
            marginBottom: '20px',
          }}>
            {error}
          </p>
        </>
      ) : (
        <>
          <h1 style={{
            color: '#ffffff',
            fontSize: '1.5rem',
            fontWeight: 700,
            textAlign: 'center',
            marginBottom: '10px',
          }}>
            Autenticando...
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '1rem',
            textAlign: 'center',
            marginBottom: '20px',
          }}>
            Aguarde enquanto processamos seu login.
          </p>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTopColor: '#ffffff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </>
      )}
    </div>
  );
};

export default AuthCallback;
