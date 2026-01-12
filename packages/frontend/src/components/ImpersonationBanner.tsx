import { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Banner que aparece quando admin está impersonando outro usuário
 * Mostra informações do usuário e permite parar a impersonação
 * Só mostra se o admin logado for o mesmo que iniciou a impersonação
 */
const ImpersonationBanner = () => {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null);

  useEffect(() => {
    const checkImpersonation = async () => {
      // Verificar se está impersonando
      const userId = localStorage.getItem('impersonate_user_id');
      const userName = localStorage.getItem('impersonate_user_name');
      const adminId = localStorage.getItem('impersonate_admin_id');

      // Se há impersonação, verificar se o usuário atual é o admin que iniciou
      if (userId && adminId) {
        const { data: { user } } = await supabase.auth.getUser();

        // Se o usuário logado não for o admin que iniciou a impersonação, limpar
        if (!user || user.id !== adminId) {
          localStorage.removeItem('impersonate_user_id');
          localStorage.removeItem('impersonate_user_name');
          localStorage.removeItem('impersonate_admin_id');
          setImpersonatedUserId(null);
          setImpersonatedUserName(null);
          return;
        }
      }

      setImpersonatedUserId(userId);
      setImpersonatedUserName(userName);
    };

    checkImpersonation();

    // Listener para mudanças no localStorage
    const handleStorageChange = () => {
      checkImpersonation();
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
    localStorage.removeItem('impersonate_admin_id');
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
