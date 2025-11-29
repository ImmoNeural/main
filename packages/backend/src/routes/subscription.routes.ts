import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { stripeService } from '../services/stripe.service';
import { supabase } from '../config/supabase';
import { handleSubscriptionActivated } from '../middleware/subscription.middleware';

const router = Router();

// Definição dos planos e preços
const PLAN_CONFIGS = {
  manual: {
    name: 'Plano Manual',
    yearlyPrice: 133.90,
    monthlyPrice: 13.90,
    maxAccounts: 0
  },
  conectado: {
    name: 'Plano Conectado',
    yearlyPrice: 249.90,
    monthlyPrice: 29.90,
    maxAccounts: 3
  },
  conectado_plus: {
    name: 'Plano Conectado Plus',
    yearlyPrice: 352.90,
    monthlyPrice: 41.90,
    maxAccounts: 10
  }
} as const;

type PlanType = keyof typeof PLAN_CONFIGS;

/**
 * GET /api/subscriptions/debug
 * DEBUG: Ver todas as assinaturas do usuário (REMOVER EM PRODUÇÃO)
 */
router.get('/debug', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Buscar TODAS as assinaturas do usuário
    const { data: allSubs, error: allError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Buscar todos os pagamentos
    const { data: allPayments, error: payError } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    res.json({
      userId: userId,
      subscriptions: allSubs || [],
      subscriptionsError: allError,
      payments: allPayments || [],
      paymentsError: payError,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/subscriptions/current
 * Buscar assinatura atual do usuário
 */
router.get('/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    console.log('🔍 Fetching subscription for user:', userId);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching subscription:', error);
      throw error;
    }

    console.log('✅ Current subscription:', data ? data.plan_type + ' - ' + data.status : 'none');

    res.json({ subscription: data || null });
  } catch (error: any) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ error: 'Erro ao buscar assinatura' });
  }
});

/**
 * POST /api/subscriptions/create
 * Criar sessão de checkout do Stripe para mudança/upgrade de plano
 * IMPORTANTE: NÃO altera a subscription atual - só o webhook faz isso após pagamento confirmado
 */
router.post('/create', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { planType, paymentCycle } = req.body;

    // Validar plano
    if (!PLAN_CONFIGS[planType as PlanType]) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const planConfig = PLAN_CONFIGS[planType as PlanType];
    const isYearly = paymentCycle === 'yearly';
    const price = isYearly ? planConfig.yearlyPrice : planConfig.monthlyPrice;

    // Buscar dados do usuário
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) throw new Error('Usuário não encontrado');

    // Criar sessão de checkout do Stripe
    // O webhook vai atualizar a subscription quando o pagamento for confirmado
    const checkoutSession = await stripeService.createCheckoutSession({
      planType: planType,
      planName: `${planConfig.name} - ${isYearly ? 'Anual' : 'Mensal'}`,
      planPrice: price,
      userId: userId,
      userEmail: user.email!,
      paymentMode: isYearly ? 'payment' : 'subscription',
    });

    console.log('✅ Checkout session created:', checkoutSession.id);
    console.log('📝 User will be redirected to Stripe. Subscription will be updated by webhook after payment.');

    // NÃO alteramos a subscription aqui!
    // A subscription só será atualizada pelo webhook quando o pagamento for confirmado
    // Isso evita o problema de dados "sumirem" se o usuário cancelar o checkout

    // Retornar URL do Stripe Checkout
    res.json({
      checkoutUrl: checkoutSession.url,
      message: 'Redirecionando para pagamento seguro do Stripe...'
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar assinatura' });
  }
});

/**
 * POST /api/subscriptions/cancel-checkout
 * Usuário cancelou o checkout do Stripe
 * Como NÃO alteramos mais a subscription antes do pagamento, não precisa restaurar nada
 */
router.post('/cancel-checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    console.log('❌ User canceled checkout:', userId);

    // Não precisa fazer nada - a subscription não foi alterada
    // Apenas loga e retorna sucesso
    res.json({ message: 'Checkout cancelado' });
  } catch (error: any) {
    console.error('Error handling canceled checkout:', error);
    res.status(500).json({ error: 'Erro ao processar cancelamento' });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancelar assinatura
 */
router.post('/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Buscar assinatura ativa
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Assinatura ativa não encontrada' });
    }

    // Cancelar no Stripe (se for recorrente)
    if (subscription.payment_processor_subscription_id && subscription.auto_renew) {
      try {
        await stripeService.cancelSubscription(subscription.payment_processor_subscription_id);
      } catch (error) {
        console.error('Error canceling Stripe subscription:', error);
        // Continua mesmo se falhar no Stripe
      }
    }

    // Atualizar no Supabase
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        auto_renew: false
      })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    res.json({ message: 'Assinatura cancelada com sucesso' });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura' });
  }
});

/**
 * GET /api/subscriptions/portal
 * Criar sessão do Customer Portal do Stripe
 * Permite usuário gerenciar sua assinatura (cancelar, ver faturas, etc)
 */
router.get('/portal', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Buscar assinatura ativa
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Assinatura ativa não encontrada' });
    }

    if (!subscription.payment_processor_customer_id) {
      return res.status(400).json({ error: 'Customer ID do Stripe não encontrado' });
    }

    // Criar sessão do portal
    const portalSession = await stripeService.createCustomerPortalSession(
      subscription.payment_processor_customer_id
    );

    res.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Erro ao criar portal de gerenciamento' });
  }
});

/**
 * POST /api/subscriptions/webhook/stripe
 * Webhook do Stripe para notificações de pagamento
 */
router.post('/webhook/stripe', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      console.error('❌ Webhook: Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Validar webhook usando raw body
    const event = stripeService.constructWebhookEvent(
      req.body,
      signature
    );

    console.log('✅ Stripe Webhook Event Received:', event.type);

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.user_id;
        const planType = session.metadata?.plan_type as PlanType;

        console.log('📦 Checkout Session Completed:', {
          sessionId: session.id,
          userId: userId,
          planType: planType,
          customerEmail: session.customer_email,
          paymentStatus: session.payment_status,
        });

        if (!userId) {
          console.warn('⚠️ User ID not found in session metadata');
          break;
        }

        if (!planType || !PLAN_CONFIGS[planType]) {
          console.warn('⚠️ Invalid plan type in session metadata:', planType);
          break;
        }

        const planConfig = PLAN_CONFIGS[planType];

        // Buscar a subscription mais recente do usuário (independente do status)
        console.log('🔍 Searching subscription for user:', userId);
        const { data: userSub, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Error fetching user subscription:', fetchError);
          break;
        }

        if (!userSub) {
          console.error('❌ No subscription found for user:', userId);
          break;
        }

        console.log('✅ Found subscription:', userSub.id, 'with status:', userSub.status);

        // Calcular data de término (1 ano a partir de agora)
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        // Atualizar a subscription do usuário com o novo plano
        console.log('📝 Updating subscription to active with plan:', planType);
        const { data: updated, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            plan_type: planType,
            plan_name: planConfig.name,
            plan_price: planConfig.yearlyPrice,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            trial_end_date: null, // Remove trial quando ativa plano pago
            max_connected_accounts: planConfig.maxAccounts,
            payment_method: 'credit_card',
            payment_processor: 'stripe',
            payment_processor_subscription_id: session.subscription || session.id,
            payment_processor_customer_id: session.customer,
          })
          .eq('id', userSub.id)
          .select();

        if (updateError) {
          console.error('❌ Error updating subscription:', updateError);
          throw updateError;
        }

        console.log('✅ Subscription updated to active with plan:', planType, updated);

        // Atualizar pagamento - buscar por user_id ao invés de subscription_id
        const { data: payment, error: paymentFetchError } = await supabase
          .from('subscription_payments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (payment) {
          await supabase
            .from('subscription_payments')
            .update({
              subscription_id: userSub.id,
              payment_status: 'paid',
              payment_date: new Date().toISOString(),
              payment_processor_payment_id: session.payment_intent || session.id,
            })
            .eq('id', payment.id);
          console.log('✅ Payment updated to paid');
        } else {
          console.warn('⚠️ No payment found for user:', userId);
        }

        // REATIVAR CONEXÕES BANCÁRIAS
        await handleSubscriptionActivated(userId);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;

        // Atualizar status no Supabase
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            auto_renew: false
          })
          .eq('payment_processor_subscription_id', subscription.id);

        console.log('Subscription canceled:', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;

        // Atualizar pagamento como falho
        await supabase
          .from('subscription_payments')
          .update({
            payment_status: 'failed',
            error_message: 'Pagamento falhou'
          })
          .eq('payment_processor_payment_id', invoice.id);

        console.log('Payment failed for invoice:', invoice.id);
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message || 'Erro ao processar webhook' });
  }
});

/**
 * POST /api/subscriptions/extend-trials
 * Estende trials de 7 para 62 dias para usuários existentes
 */
router.post('/extend-trials', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('🔄 Extending trials from 7 to 62 days...');

    // Buscar todas as assinaturas com trial ativo
    const { data: trials, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .in('status', ['trial', 'pending']);

    if (fetchError) {
      console.error('❌ Error fetching trials:', fetchError);
      return res.status(500).json({ error: 'Erro ao buscar trials' });
    }

    if (!trials || trials.length === 0) {
      return res.json({ message: 'Nenhum trial ativo encontrado', updated: 0 });
    }

    console.log(`📊 Found ${trials.length} active trials`);

    const updated = [];
    const skipped = [];

    for (const trial of trials) {
      // Verificar se é trial de 7 dias
      const metadata = trial.metadata || {};
      const currentTrialDays = metadata.trial_days || 0;

      if (currentTrialDays !== 7) {
        skipped.push({
          id: trial.id,
          user_id: trial.user_id,
          reason: `Trial já tem ${currentTrialDays} dias`
        });
        continue;
      }

      // Calcular nova data (adicionar 55 dias extras: 62 - 7 = 55)
      const currentEndDate = new Date(trial.trial_end_date || trial.end_date);
      const newEndDate = new Date(currentEndDate.getTime() + (55 * 24 * 60 * 60 * 1000));

      // Atualizar trial
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          trial_end_date: newEndDate.toISOString(),
          end_date: newEndDate.toISOString(),
          metadata: {
            ...metadata,
            trial_days: 62,
            extended_from: 7,
            extended_at: new Date().toISOString()
          }
        })
        .eq('id', trial.id);

      if (updateError) {
        console.error(`❌ Error updating trial ${trial.id}:`, updateError);
        skipped.push({
          id: trial.id,
          user_id: trial.user_id,
          reason: 'Erro ao atualizar'
        });
      } else {
        console.log(`✅ Extended trial ${trial.id} from 7 to 62 days`);
        updated.push({
          id: trial.id,
          user_id: trial.user_id,
          old_end_date: currentEndDate.toISOString(),
          new_end_date: newEndDate.toISOString()
        });
      }
    }

    res.json({
      message: `Trials estendidos com sucesso!`,
      total: trials.length,
      updated: updated.length,
      skipped: skipped.length,
      details: {
        updated,
        skipped
      }
    });
  } catch (error: any) {
    console.error('❌ Error extending trials:', error);
    res.status(500).json({ error: 'Erro ao estender trials' });
  }
});

export default router;
