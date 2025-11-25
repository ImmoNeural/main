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
      // Usa trial_end_date se existir, caso contrário usa end_date
      const dateToUse = trialEndDate || endDate;
      if ((sub.status === 'trial' || sub.status === 'pending') && dateToUse) {
        const diffTime = dateToUse.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysRemaining = Math.max(0, daysRemaining);
      }

      // Verificar se expirou
      const isTrialExpired = !!((sub.status === 'trial' || sub.status === 'pending') && dateToUse && now > dateToUse);
      const isSubscriptionExpired = !!(endDate && now > endDate);

      // Trial ativo = acesso completo (igual a subscription ativa)
      const isTrialActiveCalc = (sub.status === 'trial' || sub.status === 'pending') && !isTrialExpired;
      // Subscription ativa = status 'active' OU trial ativo (ambos têm acesso completo)
      const isSubscriptionActiveCalc = (sub.status === 'active' && !isSubscriptionExpired) || isTrialActiveCalc;
      const isExpiredCalc = sub.status === 'expired' || sub.status === 'canceled' || isTrialExpired || isSubscriptionExpired;

      console.log('🎯 [useSubscription] Calculated state:', {
        isTrialActive: isTrialActiveCalc,
        isSubscriptionActive: isSubscriptionActiveCalc,
        isExpired: isExpiredCalc,
        daysRemaining
      });

      setData({
        subscription: sub,
        isLoading: false,
        isTrialActive: isTrialActiveCalc,
        isSubscriptionActive: isSubscriptionActiveCalc,
        isExpired: isExpiredCalc,
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
