import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Bell, BellOff, Check } from 'lucide-react';

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
    'Saiba quando atingir 50%, 75% ou 100% do seu orçamento',
    'Receba alertas ao ultrapassar o limite de uma categoria',
    'Acompanhe suas finanças sem precisar abrir o app',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 via-sky-500 to-sky-600 flex flex-col items-center justify-center p-5">
      {/* Icon */}
      <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-8 shadow-lg">
        <Bell size={48} className="text-white" />
      </div>

      {/* Content Container */}
      <div className="w-full max-w-md">
        {/* Title */}
        <h1 className="text-white text-2xl sm:text-3xl font-bold text-center mb-3 leading-tight">
          Mantenha-se informado
        </h1>

        {/* Subtitle */}
        <p className="text-white/80 text-center mb-10 text-sm sm:text-base leading-relaxed">
          Ative as notificações para receber alertas importantes sobre seus gastos e orçamentos
        </p>

        {/* Benefits - Simple flowing list */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-10">
          <p className="text-white/90 text-sm font-medium mb-4">
            Com as notificações você poderá:
          </p>
          <ul className="space-y-3">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={12} className="text-white" strokeWidth={3} />
                </div>
                <span className="text-white/90 text-sm leading-relaxed">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Enable Button */}
        <button
          onClick={handleEnableNotifications}
          disabled={isRequesting}
          className={`
            w-full py-4 rounded-xl font-semibold text-lg
            flex items-center justify-center gap-2 transition-all duration-200
            bg-white text-sky-600 shadow-lg hover:shadow-xl active:scale-[0.98]
            ${isRequesting ? 'opacity-70 cursor-wait' : ''}
          `}
        >
          {isRequesting ? (
            <>
              <div className="w-5 h-5 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
              Solicitando...
            </>
          ) : (
            <>
              <Bell size={20} />
              Ativar notificações
            </>
          )}
        </button>

        {/* Skip option */}
        <button
          onClick={handleSkip}
          className="w-full mt-4 py-3 text-white/70 text-sm hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <BellOff size={16} />
          Agora não
        </button>
      </div>
    </div>
  );
};

export default NotificationPermission;
