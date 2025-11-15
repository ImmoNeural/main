import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { stripeService } from '../services/stripe.service';
import { supabase } from '../config/supabase';

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
 * GET /api/subscriptions/current
 * Buscar assinatura atual do usuário
 */
router.get('/current', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

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

    // Salvar assinatura pendente no Supabase
    const { data: subscription, error: dbError } = await supabase
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

    if (dbError) throw dbError;

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
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Validar webhook usando raw body
    const event = stripeService.constructWebhookEvent(
      req.body,
      signature
    );

    console.log('Stripe Webhook Event:', event.type);

    // Processar eventos
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        const userId = session.metadata?.user_id;

        if (!userId) {
          console.warn('User ID not found in session metadata');
          break;
        }

        // Buscar assinatura pelo session ID
        const { data: subscription, error: fetchError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('payment_processor_subscription_id', session.id)
          .single();

        if (!subscription) {
          console.warn('Subscription not found for session:', session.id);
          break;
        }

        // Atualizar status da assinatura
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            start_date: new Date().toISOString(),
            payment_processor_subscription_id: session.subscription || session.id,
          })
          .eq('id', subscription.id);

        if (updateError) throw updateError;

        // Atualizar pagamento
        await supabase
          .from('subscription_payments')
          .update({
            payment_status: 'paid',
            payment_date: new Date().toISOString()
          })
          .eq('payment_processor_payment_id', session.id);

        console.log('Subscription activated:', subscription.id);
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
