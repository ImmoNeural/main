import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface GoalOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const goalOptions: GoalOption[] = [
  {
    id: 'quitar_dividas',
    title: 'Quitar dívidas',
    description: 'Quero me organizar para sair do vermelho e viver mais tranquilo(a).',
    icon: '💳',
  },
  {
    id: 'comecar_poupar',
    title: 'Começar a poupar',
    description: 'Preciso conhecer melhor meus gastos para começar a economizar.',
    icon: '🐷',
  },
  {
    id: 'evoluir_gestao',
    title: 'Evoluir minha gestão',
    description: 'Quero um controle mais eficiente, para sair da planilha ou caderninho.',
    icon: '📊',
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
      navigate('/app/dashboard');
    } catch (error) {
      console.error('Error saving goal:', error);
      // Navigate anyway - goal is optional
      navigate('/app/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

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
        color: '#94a3b8',
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
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(30, 41, 59, 0.8)',
              border: selectedGoal === goal.id
                ? '2px solid #22c55e'
                : '2px solid #334155',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
          >
            {/* Radio button */}
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: selectedGoal === goal.id
                ? '2px solid #22c55e'
                : '2px solid #64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px',
            }}>
              {selectedGoal === goal.id && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#22c55e',
                }} />
              )}
            </div>

            {/* Content */}
            <div>
              <h3 style={{
                color: '#ffffff',
                fontSize: '1.1rem',
                fontWeight: 600,
                marginBottom: '6px',
              }}>
                {goal.title}
              </h3>
              <p style={{
                color: '#94a3b8',
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
            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
            : '#334155',
          border: 'none',
          borderRadius: '12px',
          color: '#ffffff',
          fontSize: '1.1rem',
          fontWeight: 600,
          cursor: selectedGoal ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          opacity: isLoading ? 0.7 : 1,
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
        onClick={() => navigate('/app/dashboard')}
        style={{
          marginTop: '20px',
          background: 'transparent',
          border: 'none',
          color: '#64748b',
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
