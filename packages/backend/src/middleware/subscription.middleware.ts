import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

// Estender o tipo Request do Express para incluir subscription
declare global {
  namespace Express {
    interface Request {
      subscription?: any;
      isTrialExpired?: boolean;
      isSubscriptionActive?: boolean;
    }
  }
}

/**
 * Middleware para verificar status de assinatura
 * Adiciona informações de assinatura ao request
 */
export const checkSubscriptionStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      // Não está autenticado, deixa passar (authMiddleware cuida disso)
      return next();
    }

    // Buscar assinatura ativa ou trial
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error checking subscription:', error);
    }

    // Se não tem assinatura, marca como expirado
    if (!subscription) {
      req.subscription = null;
      req.isTrialExpired = true;
      req.isSubscriptionActive = false;
      return next();
    }

    // Verificar se trial expirou
    const now = new Date();
    const trialEndDate = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;
    const endDate = subscription.end_date ? new Date(subscription.end_date) : null;

    const isTrialExpired = subscription.status === 'trial' && trialEndDate && now > trialEndDate;
    const isSubscriptionExpired = endDate && now > endDate;

    // Atualizar status no Supabase se expirou
    if (isTrialExpired && subscription.status === 'trial') {
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', subscription.id);

      subscription.status = 'expired';
      console.log('⚠️ Trial expired for user:', userId);
    }

    if (isSubscriptionExpired && subscription.status === 'active') {
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', subscription.id);

      subscription.status = 'expired';
      console.log('⚠️ Subscription expired for user:', userId);
    }

    // Adicionar ao request
    req.subscription = subscription;
    req.isTrialExpired = subscription.status === 'expired' || subscription.status === 'canceled';
    req.isSubscriptionActive = subscription.status === 'active';

    next();
  } catch (error) {
    console.error('❌ Subscription middleware error:', error);
    next(); // Continua mesmo com erro
  }
};

/**
 * Middleware para BLOQUEAR acesso se assinatura inativa
 * Redireciona para página de planos se trial expirou
 */
export const requireActiveSubscription = (req: Request, res: Response, next: NextFunction) => {
  // Rotas que NÃO precisam de assinatura ativa
  const exemptPaths = [
    '/api/subscriptions',
    '/api/auth',
    '/api/health',
  ];

  // Verificar se é rota isenta
  const isExempt = exemptPaths.some(path => req.path.startsWith(path));
  if (isExempt) {
    return next();
  }

  // Se não tem assinatura ou expirou, bloqueia
  if (req.isTrialExpired && !req.isSubscriptionActive) {
    console.log('🚫 Access blocked - subscription required for user:', req.userId);
    return res.status(403).json({
      error: 'Assinatura necessária',
      message: 'Seu período de teste expirou. Por favor, escolha um plano para continuar.',
      redirectTo: '/app/planos',
      trialExpired: true,
    });
  }

  next();
};
