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
 * Criar nova assinatura via Stripe Checkout
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
    const checkoutSession = await stripeService.createCheckoutSession({
      planType: planType,
      planName: `${planConfig.name} - ${isYearly ? 'Anual' : 'Mensal'}`,
      planPrice: price,
      userId: userId,
      userEmail: user.email!,
      paymentMode: isYearly ? 'payment' : 'subscription', // Anual = pagamento único, Mensal = recorrente
    });

    // Calcular data de término
    const endDate = new Date();
    if (isYearly) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Verificar se já existe subscription para este usuário
    const { data: existingSub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('❌ Error checking existing subscription:', fetchError);
      throw fetchError;
    }

    let subscription;

    if (existingSub) {
      // ATUALIZAR assinatura existente
      console.log('🔄 Updating existing subscription for user:', userId);

      // Salvar trial_end_date antigo se existir
      const metadata: any = {
        payment_cycle: paymentCycle,
        stripe_session_id: checkoutSession.id,
      };

      if (existingSub.trial_end_date) {
        metadata.old_trial_end_date = existingSub.trial_end_date;
        console.log('💾 Saving old trial_end_date:', existingSub.trial_end_date);
      }

      const { data: updatedSub, error: updateError } = await supabase
        .from('subscriptions')
        .update({
          plan_type: planType,
          plan_name: planConfig.name,
          plan_price: price,
          status: 'pending',
          end_date: endDate.toISOString(),
          trial_end_date: null, // Remove trial quando muda para plano pago
          payment_method: 'credit_card',
          payment_processor: 'stripe',
          payment_processor_subscription_id: checkoutSession.id,
          payment_processor_customer_id: checkoutSession.customer as string,
          max_connected_accounts: planConfig.maxAccounts,
          auto_renew: !isYearly,
          next_billing_date: isYearly ? endDate.toISOString() : new Date().toISOString(),
          metadata: metadata
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      if (updateError) throw updateError;
      subscription = updatedSub;
      console.log('✅ Subscription updated:', subscription.id);
    } else {
      // CRIAR nova assinatura (caso raro - usuário sem subscription)
      console.log('📝 Creating new subscription for user:', userId);
      const { data: newSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: planType,
          plan_name: planConfig.name,
          plan_price: price,
          status: 'pending',
          end_date: endDate.toISOString(),
          payment_method: 'credit_card',
          payment_processor: 'stripe',
          payment_processor_subscription_id: checkoutSession.id,
          payment_processor_customer_id: checkoutSession.customer as string,
          max_connected_accounts: planConfig.maxAccounts,
          auto_renew: !isYearly,
          next_billing_date: isYearly ? endDate.toISOString() : new Date().toISOString(),
          metadata: {
            payment_cycle: paymentCycle,
            stripe_session_id: checkoutSession.id,
          }
        })
        .select()
        .single();

      if (insertError) throw insertError;
      subscription = newSub;
      console.log('✅ Subscription created:', subscription.id);
    }

    // Registrar pagamento pendente
    await supabase
      .from('subscription_payments')
      .insert({
        subscription_id: subscription.id,
        user_id: userId,
        amount: price,
        payment_method: 'credit_card',
        payment_status: 'pending',
        payment_processor: 'stripe',
        payment_processor_payment_id: checkoutSession.id,
        payment_processor_invoice_url: checkoutSession.url,
        due_date: new Date().toISOString()
      });

    // Retornar URL do Stripe Checkout
    res.json({
      subscription,
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
 * Usuário cancelou o checkout do Stripe - restaurar trial se ainda tiver dias
 */
router.post('/cancel-checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    console.log('❌ User canceled checkout:', userId);

    // Buscar subscription do usuário
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !subscription) {
      console.log('⚠️ No subscription found for user');
      return res.json({ message: 'Checkout cancelado' });
    }

    // Se estava pending e tinha trial_end_date nos metadata, restaurar
    if (subscription.status === 'pending') {
      const oldTrialEndDate = subscription.metadata?.old_trial_end_date;

      if (oldTrialEndDate) {
        const trialEnd = new Date(oldTrialEndDate);
        const now = new Date();

        // Verificar se o trial ainda é válido
        if (trialEnd > now) {
          console.log('🔄 Restoring trial for user:', userId);

          // Restaurar para trial
          await supabase
            .from('subscriptions')
            .update({
              status: 'trial',
              plan_type: 'manual',
              plan_name: 'Trial - Plano Manual',
              plan_price: 0,
              trial_end_date: oldTrialEndDate,
              end_date: oldTrialEndDate,
              payment_method: null,
              payment_processor: null,
              payment_processor_subscription_id: null,
              payment_processor_customer_id: null,
              auto_renew: false,
            })
            .eq('id', subscription.id);

          console.log('✅ Trial restored');
          return res.json({ message: 'Trial restaurado', trialActive: true });
        }
      }
    }

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

        console.log('📦 Checkout Session Completed:', {
          sessionId: session.id,
          userId: userId,
          customerEmail: session.customer_email,
          paymentStatus: session.payment_status,
        });

        if (!userId) {
          console.warn('⚠️ User ID not found in session metadata');
          break;
        }

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

        // Atualizar a subscription do usuário para 'active'
        console.log('📝 Updating subscription status to active...');
        const { data: updated, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            start_date: new Date().toISOString(),
            payment_processor_subscription_id: session.subscription || session.id,
            payment_processor_customer_id: session.customer,
          })
          .eq('id', userSub.id)
          .select();

        if (updateError) {
          console.error('❌ Error updating subscription:', updateError);
          throw updateError;
        }

        console.log('✅ Subscription updated to active:', updated);

        // Atualizar pagamento
        await supabase
          .from('subscription_payments')
          .update({
            payment_status: 'paid',
            payment_date: new Date().toISOString(),
            payment_processor_payment_id: session.payment_intent || session.id,
          })
          .eq('subscription_id', userSub.id);

        console.log('✅ Payment updated to paid');

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

export default router;
