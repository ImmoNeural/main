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
 * Desativa todas as conexões bancárias do usuário
 * Chamado quando trial/assinatura expira
 */
async function deactivateBankConnections(userId: string): Promise<void> {
  try {
    console.log(`🔴 Desativando conexões bancárias do usuário: ${userId}`);

    // Atualizar status de todas as contas bancárias para 'disconnected'
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select();

    if (error) {
      console.error('❌ Erro ao desativar conexões bancárias:', error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0} conexão(ões) bancária(s) desativada(s)`);
  } catch (error) {
    console.error('❌ Erro crítico ao desativar conexões:', error);
    // Não propaga erro para não bloquear outras operações
  }
}

/**
 * Reativa todas as conexões bancárias do usuário
 * Chamado quando usuário assina/paga
 */
async function reactivateBankConnections(userId: string): Promise<void> {
  try {
    console.log(`🟢 Reativando conexões bancárias do usuário: ${userId}`);

    // Atualizar status de todas as contas desconectadas para 'active'
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'disconnected')
      .select();

    if (error) {
      console.error('❌ Erro ao reativar conexões bancárias:', error);
      throw error;
    }

    console.log(`✅ ${data?.length || 0} conexão(ões) bancária(s) reativada(s)`);
  } catch (error) {
    console.error('❌ Erro crítico ao reativar conexões:', error);
    // Não propaga erro para não bloquear outras operações
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

      // DESATIVAR CONEXÕES BANCÁRIAS
      await deactivateBankConnections(userId);
    }

    if (isSubscriptionExpired && subscription.status === 'active') {
      await supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('id', subscription.id);

      subscription.status = 'expired';
      console.log('⚠️ Subscription expired for user:', userId);

      // DESATIVAR CONEXÕES BANCÁRIAS
      await deactivateBankConnections(userId);
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

/**
 * Função auxiliar para reativar conexões quando usuário assinar
 * Deve ser chamada após webhook confirmar pagamento
 */
export const handleSubscriptionActivated = async (userId: string): Promise<void> => {
  await reactivateBankConnections(userId);
};
