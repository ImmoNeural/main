import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Check, ArrowRight } from 'lucide-react';
import api from '../services/api';

interface GoalOption {
  id: string;
  title: string;
  description: string;
}

const goalOptions: GoalOption[] = [
  {
    id: 'entender_gastos',
    title: 'Entender para onde meu dinheiro está indo',
    description: 'No fim do mês, o saldo não reflete o que eu imaginava.',
  },
  {
    id: 'gastar_melhor',
    title: 'Gastar melhor e conseguir economizar',
    description: 'Quero cortar excessos e guardar dinheiro com mais constância.',
  },
  {
    id: 'contas_controle',
    title: 'Manter minhas contas sob controle',
    description: 'Quero saber quanto ainda posso gastar com segurança.',
  },
  {
    id: 'evitar_golpes',
    title: 'Evitar cobranças indevidas e golpes',
    description: 'Quero ser avisado se algo fora do normal acontecer.',
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
      // Marcar goals como completados para liberar o tutorial
      localStorage.setItem('guru_goals_completed', 'true');
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
      // Marcar goals como completados mesmo em caso de erro
      localStorage.setItem('guru_goals_completed', 'true');
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
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-sky-500 to-sky-600 flex flex-col items-center justify-center p-5">
      {/* Logo */}
      <div className="w-20 h-20 mb-8">
        <img
          src="/logo.png"
          alt="Guru do Dindin"
          className="w-full h-full object-contain brightness-0 invert"
        />
      </div>

      {/* Content Container */}
      <div className="w-full max-w-md">
        {/* Title */}
        <h1 className="text-white text-2xl sm:text-3xl font-bold text-center mb-3 leading-tight">
          Qual é seu principal objetivo?
        </h1>

        {/* Subtitle */}
        <p className="text-white/80 text-center mb-10 text-sm sm:text-base">
          Selecione a opção que mais combina com você
        </p>

        {/* Goal Options - Flowing list style */}
        <div className="space-y-3 mb-10">
          {goalOptions.map((goal) => {
            const isSelected = selectedGoal === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id)}
                className={`
                  w-full text-left p-4 rounded-xl transition-all duration-200
                  ${isSelected
                    ? 'bg-white shadow-lg'
                    : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
                    flex items-center justify-center transition-all
                    ${isSelected
                      ? 'bg-sky-500 border-sky-500'
                      : 'border-white/50 bg-transparent'
                    }
                  `}>
                    {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>

                  {/* Text */}
                  <div>
                    <p className={`
                      font-semibold text-[15px] leading-snug
                      ${isSelected ? 'text-gray-900' : 'text-white'}
                    `}>
                      {goal.title}
                    </p>
                    <p className={`
                      text-sm mt-1 leading-relaxed
                      ${isSelected ? 'text-gray-500' : 'text-white/70'}
                    `}>
                      {goal.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedGoal || isLoading}
          className={`
            w-full py-4 rounded-xl font-semibold text-lg
            flex items-center justify-center gap-2 transition-all duration-200
            ${selectedGoal
              ? 'bg-white text-sky-600 shadow-lg hover:shadow-xl active:scale-[0.98]'
              : 'bg-white/30 text-white/60 cursor-not-allowed'
            }
            ${isLoading ? 'opacity-70' : ''}
          `}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              Continuar
              <ArrowRight size={20} />
            </>
          )}
        </button>

        {/* Skip option */}
        <button
          onClick={() => {
            localStorage.setItem('guru_goals_completed', 'true');
            localStorage.setItem('notifications_asked', 'true');
            navigate('/app/dashboard');
          }}
          className="w-full mt-4 py-3 text-white/70 text-sm hover:text-white transition-colors"
        >
          Pular por enquanto
        </button>
      </div>
    </div>
  );
};

export default OnboardingGoals;
