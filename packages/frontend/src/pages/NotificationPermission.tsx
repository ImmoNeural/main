import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Bell, BellOff, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

const NotificationPermission = () => {
  const [isRequesting, setIsRequesting] = useState(false);
  const navigate = useNavigate();

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      if (Capacitor.isNativePlatform()) {
        // Importar dinamicamente para evitar erro em web
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const permission = await LocalNotifications.requestPermissions();

        if (permission.display === 'granted') {
          localStorage.setItem('notifications_enabled', 'true');
        }
      }
      // Marcar que já viu a tela de notificações
      localStorage.setItem('notifications_asked', 'true');
      navigate('/app/dashboard');
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      localStorage.setItem('notifications_asked', 'true');
      navigate('/app/dashboard');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('notifications_asked', 'true');
    localStorage.setItem('notifications_enabled', 'false');
    navigate('/app/dashboard');
  };

  const benefits = [
    {
      icon: TrendingUp,
      title: 'Acompanhe seus gastos',
      description: 'Saiba quando atingir 50%, 75% ou 100% do seu budget mensal',
    },
    {
      icon: AlertTriangle,
      title: 'Alertas de estouro',
      description: 'Receba aviso imediato quando ultrapassar o limite de uma categoria',
    },
    {
      icon: CheckCircle,
      title: 'Controle financeiro',
      description: 'Mantenha suas finanças sob controle sem precisar abrir o app',
    },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Icon */}
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '30px',
        boxShadow: '0 10px 40px rgba(34, 197, 94, 0.3)',
      }}>
        <Bell size={60} color="#ffffff" />
      </div>

      {/* Title */}
      <h1 style={{
        color: '#ffffff',
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: '10px',
        lineHeight: 1.3,
      }}>
        Ative as notificações
      </h1>

      {/* Subtitle */}
      <p style={{
        color: '#94a3b8',
        fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
        textAlign: 'center',
        marginBottom: '40px',
        maxWidth: '400px',
      }}>
        Receba alertas importantes sobre seus gastos e budgets para manter suas finanças sob controle.
      </p>

      {/* Benefits */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '400px',
        marginBottom: '40px',
      }}>
        {benefits.map((benefit, index) => {
          const Icon = benefit.icon;
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '16px',
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '12px',
                border: '1px solid #334155',
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={20} color="#22c55e" />
              </div>
              <div>
                <h3 style={{
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}>
                  {benefit.title}
                </h3>
                <p style={{
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  margin: 0,
                }}>
                  {benefit.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enable Button */}
      <button
        onClick={handleEnableNotifications}
        disabled={isRequesting}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          maxWidth: '400px',
          padding: '18px 32px',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          border: 'none',
          borderRadius: '12px',
          color: '#ffffff',
          fontSize: '1.1rem',
          fontWeight: 600,
          cursor: isRequesting ? 'wait' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: isRequesting ? 0.7 : 1,
        }}
      >
        <Bell size={20} />
        {isRequesting ? 'Solicitando...' : 'Ativar notificações'}
      </button>

      {/* Skip option */}
      <button
        onClick={handleSkip}
        style={{
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'transparent',
          border: 'none',
          color: '#64748b',
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}
      >
        <BellOff size={16} />
        Agora não
      </button>
    </div>
  );
};

export default NotificationPermission;
