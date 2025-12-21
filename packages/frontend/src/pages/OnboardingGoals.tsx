import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import api from '../services/api';

interface GoalOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const goalOptions: GoalOption[] = [
  {
    id: 'entender_gastos',
    title: 'Entender para onde meu dinheiro está indo',
    description: 'No fim do mês, o saldo não reflete o que eu imaginava.',
    icon: '🔍',
  },
  {
    id: 'gastar_melhor',
    title: 'Gastar melhor e conseguir economizar',
    description: 'Quero cortar excessos e guardar dinheiro com mais constância.',
    icon: '💰',
  },
  {
    id: 'contas_controle',
    title: 'Manter minhas contas sob controle sem me preocupar',
    description: 'Quero receber notificações e saber quanto ainda posso gastar com segurança.',
    icon: '📊',
  },
  {
    id: 'evitar_golpes',
    title: 'Evitar cobranças indevidas e possíveis golpes',
    description: 'Quero ser avisado rapidamente se algo fora do normal acontecer.',
    icon: '🛡️',
  },
];

const OnboardingGoals = () => {
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleConfirm = async () => {
    if (!selectedGoal) return;

    setIsLoading(true);
    try {
      // Save the goal to user preferences
      await api.post('/preferences/goal', { goal: selectedGoal });
      // Ir para tela de notificações APENAS em celular e se ainda não perguntou
      const notificationsAsked = localStorage.getItem('notifications_asked');
      const isMobile = Capacitor.isNativePlatform();
      if (!notificationsAsked && isMobile) {
        navigate('/onboarding/notifications');
      } else {
        // No desktop, marcar como já perguntado e ir direto para dashboard
        localStorage.setItem('notifications_asked', 'true');
        navigate('/app/dashboard');
      }
    } catch (error) {
      console.error('Error saving goal:', error);
      // Navigate anyway - goal is optional
      const notificationsAsked = localStorage.getItem('notifications_asked');
      const isMobile = Capacitor.isNativePlatform();
      if (!notificationsAsked && isMobile) {
        navigate('/onboarding/notifications');
      } else {
        localStorage.setItem('notifications_asked', 'true');
        navigate('/app/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Title */}
      <h1 style={{
        color: '#ffffff',
        fontSize: 'clamp(1.5rem, 4vw, 2rem)',
        fontWeight: 700,
        textAlign: 'center',
        marginBottom: '10px',
        lineHeight: 1.3,
      }}>
        Qual das metas abaixo mais te representa no momento?
      </h1>

      {/* Subtitle */}
      <p style={{
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
        textAlign: 'center',
        marginBottom: '40px',
        maxWidth: '500px',
      }}>
        Queremos entender melhor seus objetivos para te ajudar a alcançá-los.
      </p>

      {/* Goal Options */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '500px',
        marginBottom: '40px',
      }}>
        {goalOptions.map((goal) => (
          <button
            key={goal.id}
            onClick={() => setSelectedGoal(goal.id)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
              padding: '20px',
              background: selectedGoal === goal.id
                ? 'rgba(255, 255, 255, 1)'
                : 'rgba(255, 255, 255, 0.95)',
              border: selectedGoal === goal.id
                ? '3px solid #0ea5e9'
                : '2px solid transparent',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
              boxShadow: selectedGoal === goal.id
                ? '0 8px 25px rgba(0, 0, 0, 0.15)'
                : '0 4px 15px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Radio button */}
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: selectedGoal === goal.id
                ? '2px solid #0ea5e9'
                : '2px solid #9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
              background: '#ffffff',
            }}>
              {selectedGoal === goal.id && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#0ea5e9',
                }} />
              )}
            </div>

            {/* Content */}
            <div>
              <h3 style={{
                color: '#1f2937',
                fontSize: '1.1rem',
                fontWeight: 600,
                marginBottom: '6px',
              }}>
                {goal.title}
              </h3>
              <p style={{
                color: '#6b7280',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                margin: 0,
              }}>
                {goal.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Confirm Button */}
      <button
        onClick={handleConfirm}
        disabled={!selectedGoal || isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          maxWidth: '500px',
          padding: '18px 32px',
          background: selectedGoal
            ? '#ffffff'
            : 'rgba(255, 255, 255, 0.5)',
          border: 'none',
          borderRadius: '12px',
          color: selectedGoal ? '#0284c7' : '#94a3b8',
          fontSize: '1.1rem',
          fontWeight: 600,
          cursor: selectedGoal ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          opacity: isLoading ? 0.7 : 1,
          boxShadow: selectedGoal ? '0 4px 15px rgba(0, 0, 0, 0.2)' : 'none',
        }}
      >
        {isLoading ? 'Salvando...' : 'Confirmar e continuar'}
        {!isLoading && (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        )}
      </button>

      {/* Skip option */}
      <button
        onClick={() => {
          localStorage.setItem('notifications_asked', 'true');
          navigate('/app/dashboard');
        }}
        style={{
          marginTop: '20px',
          background: 'transparent',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '0.9rem',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Pular por enquanto
      </button>
    </div>
  );
};

export default OnboardingGoals;
