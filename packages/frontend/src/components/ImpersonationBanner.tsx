import { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';

/**
 * Banner que aparece quando admin está impersonando outro usuário
 * Mostra informações do usuário e permite parar a impersonação
 */
const ImpersonationBanner = () => {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se está impersonando
    const userId = localStorage.getItem('impersonate_user_id');
    const userName = localStorage.getItem('impersonate_user_name');
    setImpersonatedUserId(userId);
    setImpersonatedUserName(userName);

    // Listener para mudanças no localStorage
    const handleStorageChange = () => {
      setImpersonatedUserId(localStorage.getItem('impersonate_user_id'));
      setImpersonatedUserName(localStorage.getItem('impersonate_user_name'));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('impersonation-changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('impersonation-changed', handleStorageChange);
    };
  }, []);

  const stopImpersonation = () => {
    localStorage.removeItem('impersonate_user_id');
    localStorage.removeItem('impersonate_user_name');
    setImpersonatedUserId(null);
    setImpersonatedUserName(null);

    // Disparar evento para atualizar outros componentes
    window.dispatchEvent(new Event('impersonation-changed'));

    // Recarregar a página para buscar dados do usuário real
    window.location.reload();
  };

  if (!impersonatedUserId) {
    return null;
  }

  return (
    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4" />
        <span className="text-sm font-medium">
          Visualizando como: {impersonatedUserName || impersonatedUserId}
        </span>
        <span className="text-xs opacity-75">
          ({impersonatedUserId.substring(0, 8)}...)
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-sm transition"
      >
        <X className="w-4 h-4" />
        Parar
      </button>
    </div>
  );
};

export default ImpersonationBanner;
