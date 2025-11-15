import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionApi } from '../services/api';

interface SubscriptionData {
  subscription: any;
  isLoading: boolean;
  isTrialActive: boolean;
  isSubscriptionActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  planType: string | null;
}

export const useSubscription = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<SubscriptionData>({
    subscription: null,
    isLoading: true,
    isTrialActive: false,
    isSubscriptionActive: false,
    isExpired: false,
    daysRemaining: 0,
    planType: null,
  });

  const fetchSubscription = async () => {
    try {
      console.log('🔄 [useSubscription] Fetching subscription data...');
      const { data: response } = await subscriptionApi.getCurrentSubscription();

      console.log('📦 [useSubscription] Response:', response);

      if (!response.subscription) {
        // Sem assinatura
        console.log('⚠️ [useSubscription] No subscription found');
        setData({
          subscription: null,
          isLoading: false,
          isTrialActive: false,
          isSubscriptionActive: false,
          isExpired: true,
          daysRemaining: 0,
          planType: null,
        });
        return;
      }

      const sub = response.subscription;
      const now = new Date();
      const trialEndDate = sub.trial_end_date ? new Date(sub.trial_end_date) : null;
      const endDate = sub.end_date ? new Date(sub.end_date) : null;

      console.log('📋 [useSubscription] Subscription found:', {
        status: sub.status,
        plan_type: sub.plan_type,
        trial_end_date: trialEndDate?.toISOString(),
        end_date: endDate?.toISOString(),
        now: now.toISOString()
      });

      // Calcular dias restantes
      let daysRemaining = 0;
      if (sub.status === 'trial' && trialEndDate) {
        const diffTime = trialEndDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, daysRemaining);
      }

      // Verificar se expirou
      const isTrialExpired = !!(sub.status === 'trial' && trialEndDate && now > trialEndDate);
      const isSubscriptionExpired = !!(endDate && now > endDate);

      console.log('🎯 [useSubscription] Calculated state:', {
        isTrialActive: sub.status === 'trial' && !isTrialExpired,
        isSubscriptionActive: sub.status === 'active' && !isSubscriptionExpired,
        isExpired: sub.status === 'expired' || sub.status === 'canceled' || isTrialExpired || isSubscriptionExpired,
        daysRemaining
      });

      setData({
        subscription: sub,
        isLoading: false,
        isTrialActive: sub.status === 'trial' && !isTrialExpired,
        isSubscriptionActive: sub.status === 'active' && !isSubscriptionExpired,
        isExpired: sub.status === 'expired' || sub.status === 'canceled' || isTrialExpired || isSubscriptionExpired,
        daysRemaining,
        planType: sub.plan_type,
      });

      // Redirecionar se expirou
      if (isTrialExpired || isSubscriptionExpired || sub.status === 'expired') {
        console.warn('⚠️ Assinatura expirada - redirecionando para /planos');
        navigate('/app/planos');
      }
    } catch (error: any) {
      // Se retornar 403 (assinatura necessária), redireciona
      if (error.response?.status === 403) {
        console.warn('⚠️ Acesso bloqueado - assinatura necessária');
        navigate('/app/planos');
      }

      setData({
        subscription: null,
        isLoading: false,
        isTrialActive: false,
        isSubscriptionActive: false,
        isExpired: true,
        daysRemaining: 0,
        planType: null,
      });
    }
  };

  useEffect(() => {
    fetchSubscription();

    // Verificar a cada 30 segundos
    const interval = setInterval(fetchSubscription, 30000);

    return () => clearInterval(interval);
  }, []);

  return data;
};
