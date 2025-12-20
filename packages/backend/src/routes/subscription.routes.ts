import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { stripeService } from '../services/stripe.service';
import { emailService } from '../services/email.service';
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

    // Buscar subscription atual para calcular dias restantes do trial
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['trial', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Calcular dias restantes do trial do sistema
    let trialDaysRemaining = 0;
    let chargeDate: Date | null = null;

    if (currentSub && currentSub.trial_end_date) {
      const now = new Date();
      const trialEndDate = new Date(currentSub.trial_end_date);
      const diffTime = trialEndDate.getTime() - now.getTime();
      trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      trialDaysRemaining = Math.max(0, trialDaysRemaining); // Não pode ser negativo

      if (trialDaysRemaining > 0) {
        chargeDate = trialEndDate;
      }
    }

    console.log('📅 Trial days remaining:', trialDaysRemaining, 'Charge date:', chargeDate);

    // Criar sessão de checkout do Stripe
    // O webhook vai atualizar a subscription quando o pagamento for confirmado
    const checkoutSession = await stripeService.createCheckoutSession({
      planType: planType,
      planName: `${planConfig.name} - ${isYearly ? 'Anual' : 'Mensal'}`,
      planPrice: price,
      userId: userId,
      userEmail: user.email!,
      paymentMode: isYearly ? 'payment' : 'subscription',
      trialDaysRemaining: isYearly ? 0 : trialDaysRemaining, // Trial só para mensal
    });

    console.log('✅ Checkout session created:', checkoutSession.id);
    console.log('📝 User will be redirected to Stripe. Subscription will be updated by webhook after payment.');

    // NÃO alteramos a subscription aqui!
    // A subscription só será atualizada pelo webhook quando o pagamento for confirmado
    // Isso evita o problema de dados "sumirem" se o usuário cancelar o checkout

    // Retornar URL do Stripe Checkout com informação sobre quando será cobrado
    res.json({
      checkoutUrl: checkoutSession.url,
      message: trialDaysRemaining > 0
        ? `Seu cartão será cobrado em ${trialDaysRemaining} dia(s), no dia ${chargeDate?.toLocaleDateString('pt-BR')}.`
        : 'Redirecionando para pagamento seguro do Stripe...',
      trialDaysRemaining,
      chargeDate: chargeDate?.toISOString() || null,
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
 * Cancelar assinatura (ativa ou trial)
 * Se ainda estiver dentro dos 7 dias de registro, volta para trial
 */
router.post('/cancel', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Buscar assinatura ativa OU trial
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'trial', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    console.log('🔄 Canceling subscription:', subscription.id, 'status:', subscription.status);

    // Cancelar no Stripe (se tiver ID do Stripe)
    if (subscription.payment_processor_subscription_id) {
      try {
        await stripeService.cancelSubscription(subscription.payment_processor_subscription_id);
        console.log('✅ Canceled on Stripe:', subscription.payment_processor_subscription_id);
      } catch (error: any) {
        // Se o erro for porque não existe no Stripe, continua
        if (error.message?.includes('No such subscription')) {
          console.log('⚠️ Subscription not found on Stripe, continuing...');
        } else {
          console.error('Error canceling Stripe subscription:', error);
        }
        // Continua mesmo se falhar no Stripe
      }
    }

    // Verificar se usuário ainda está dentro dos 7 dias desde o registro
    const createdAt = new Date(subscription.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const stillInTrialPeriod = daysSinceCreation < 7;

    console.log('📅 Days since creation:', daysSinceCreation, 'Still in trial period:', stillInTrialPeriod);

    let updateData: any;
    let responseMessage: string;

    if (stillInTrialPeriod) {
      // Voltar para trial - calcular dias restantes
      const trialEndDate = new Date(createdAt);
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      updateData = {
        status: 'trial',
        plan_type: subscription.plan_type, // Manter o tipo do plano
        plan_name: null,
        plan_price: null,
        trial_end_date: trialEndDate.toISOString(),
        end_date: trialEndDate.toISOString(),
        start_date: null,
        next_billing_date: null,
        canceled_at: new Date().toISOString(),
        auto_renew: false,
        payment_processor_subscription_id: null,
        payment_processor_customer_id: subscription.payment_processor_customer_id, // Manter customer ID
        payment_method: null,
      };
      responseMessage = `Assinatura cancelada. Você voltou para o período de teste (${7 - daysSinceCreation} dias restantes).`;
      console.log('✅ Reverting to trial status');
    } else {
      // Fora do período de trial - cancelar definitivamente
      updateData = {
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        auto_renew: false,
        payment_processor_subscription_id: null,
      };
      responseMessage = 'Assinatura cancelada com sucesso.';
      console.log('✅ Subscription fully canceled (outside trial period)');
    }

    // Atualizar no Supabase
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    console.log('✅ Subscription updated in database');
    res.json({
      message: responseMessage,
      revertedToTrial: stillInTrialPeriod,
      daysRemaining: stillInTrialPeriod ? 7 - daysSinceCreation : 0
    });
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura' });
  }
});

/**
 * POST /api/subscriptions/refund
 * Reembolsar pagamento de um usuário (admin only ou próprio usuário)
 *
 * Body params:
 * - user_id (opcional): ID do usuário para reembolsar (admin only)
 * - payment_intent_id (opcional): ID específico do PaymentIntent para reembolsar
 * - amount (opcional): Valor em centavos para reembolso parcial
 */
router.post('/refund', authMiddleware, async (req: Request, res: Response) => {
  try {
    const requesterId = req.userId!;
    const { user_id, payment_intent_id, amount } = req.body;

    // Determinar qual usuário será reembolsado
    const targetUserId = user_id || requesterId;

    // Se for para outro usuário, verificar se é admin
    if (user_id && user_id !== requesterId) {
      // Verificar se o solicitante é admin
      const { data: { user: requesterUser } } = await supabase.auth.admin.getUserById(requesterId);
      const adminEmails = ['neurekaai@gmail.com'];

      if (!requesterUser?.email || !adminEmails.includes(requesterUser.email)) {
        return res.status(403).json({ error: 'Apenas administradores podem reembolsar outros usuários' });
      }
    }

    console.log('💸 Processing refund request:', { targetUserId, payment_intent_id, amount });

    // Buscar assinatura do usuário
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !subscription) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    if (!subscription.payment_processor_customer_id) {
      return res.status(400).json({ error: 'Usuário não possui customer ID no Stripe' });
    }

    let paymentIntentToRefund = payment_intent_id;

    // Se não foi especificado um payment_intent, buscar o mais recente
    if (!paymentIntentToRefund) {
      const paymentIntents = await stripeService.listPaymentIntents(
        subscription.payment_processor_customer_id,
        5
      );

      // Encontrar o pagamento mais recente que foi bem-sucedido
      const successfulPayment = paymentIntents.find(pi => pi.status === 'succeeded');

      if (!successfulPayment) {
        return res.status(404).json({
          error: 'Nenhum pagamento encontrado para reembolsar',
          hint: 'O usuário pode estar no período de trial (7 dias) e ainda não foi cobrado'
        });
      }

      paymentIntentToRefund = successfulPayment.id;
      console.log('💸 Found payment to refund:', paymentIntentToRefund);
    }

    // Criar o reembolso
    const refund = await stripeService.createRefund(
      paymentIntentToRefund,
      amount, // undefined = reembolso total
      'requested_by_customer'
    );

    // Atualizar subscription_payments no Supabase
    const { error: updateError } = await supabase
      .from('subscription_payments')
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', targetUserId)
      .eq('payment_processor_payment_id', paymentIntentToRefund);

    if (updateError) {
      console.warn('⚠️ Could not update subscription_payments:', updateError);
    }

    // Atualizar status da subscription para trial ou canceled
    const createdAt = new Date(subscription.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const stillInTrialPeriod = daysSinceCreation < 7;

    if (stillInTrialPeriod) {
      const trialEndDate = new Date(createdAt);
      trialEndDate.setDate(trialEndDate.getDate() + 7);

      await supabase
        .from('subscriptions')
        .update({
          status: 'trial',
          plan_name: null,
          plan_price: null,
          trial_end_date: trialEndDate.toISOString(),
          end_date: trialEndDate.toISOString(),
          start_date: null,
          next_billing_date: null,
          auto_renew: false,
          payment_processor_subscription_id: null,
          payment_method: null,
        })
        .eq('id', subscription.id);
    } else {
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          auto_renew: false,
          payment_processor_subscription_id: null,
        })
        .eq('id', subscription.id);
    }

    // Cancelar assinatura no Stripe também
    if (subscription.payment_processor_subscription_id) {
      try {
        await stripeService.cancelSubscription(subscription.payment_processor_subscription_id);
      } catch (e) {
        console.warn('⚠️ Could not cancel Stripe subscription:', e);
      }
    }

    res.json({
      success: true,
      message: 'Reembolso processado com sucesso',
      refund: {
        id: refund.id,
        amount: refund.amount / 100, // Converter de centavos para reais
        currency: refund.currency,
        status: refund.status,
      },
      revertedToTrial: stillInTrialPeriod,
    });
  } catch (error: any) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar reembolso' });
  }
});

/**
 * GET /api/subscriptions/payments
 * Listar pagamentos de um usuário (para admin ver histórico)
 */
router.get('/payments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const targetUserId = (req.query.user_id as string) || userId;

    // Se for para outro usuário, verificar se é admin
    if (targetUserId !== userId) {
      const { data: { user: requesterUser } } = await supabase.auth.admin.getUserById(userId);
      const adminEmails = ['neurekaai@gmail.com'];

      if (!requesterUser?.email || !adminEmails.includes(requesterUser.email)) {
        return res.status(403).json({ error: 'Apenas administradores podem ver pagamentos de outros usuários' });
      }
    }

    // Buscar assinatura
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('payment_processor_customer_id')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!subscription?.payment_processor_customer_id) {
      return res.json({ payments: [], message: 'Usuário sem histórico de pagamentos no Stripe' });
    }

    // Buscar pagamentos no Stripe
    const paymentIntents = await stripeService.listPaymentIntents(
      subscription.payment_processor_customer_id,
      20
    );

    const payments = paymentIntents.map(pi => ({
      id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency,
      status: pi.status,
      created: new Date(pi.created * 1000).toISOString(),
      description: pi.description,
      canRefund: pi.status === 'succeeded',
    }));

    res.json({ payments });
  } catch (error: any) {
    console.error('Error listing payments:', error);
    res.status(500).json({ error: 'Erro ao listar pagamentos' });
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
          mode: session.mode,
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

        // Calcular data de término (1 MÊS a partir de agora para cobrança mensal)
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        // Determinar se é assinatura recorrente (subscription) ou pagamento único (payment)
        const isRecurring = session.mode === 'subscription';

        // Atualizar a subscription do usuário com o novo plano
        console.log('📝 Updating subscription to active with plan:', planType, 'recurring:', isRecurring);
        const { data: updated, error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            plan_type: planType,
            plan_name: planConfig.name,
            plan_price: planConfig.monthlyPrice,
            start_date: new Date().toISOString(),
            end_date: endDate.toISOString(),
            next_billing_date: isRecurring ? endDate.toISOString() : null,
            trial_end_date: null, // Remove trial quando ativa plano pago
            max_connected_accounts: planConfig.maxAccounts,
            payment_method: 'credit_card',
            payment_processor: 'stripe',
            payment_processor_subscription_id: session.subscription || session.id,
            payment_processor_customer_id: session.customer,
            auto_renew: isRecurring,
          })
          .eq('id', userSub.id)
          .select();

        if (updateError) {
          console.error('❌ Error updating subscription:', updateError);
          throw updateError;
        }

        console.log('✅ Subscription updated to active with plan:', planType, updated);

        // Buscar ou CRIAR pagamento
        const { data: existingPayment, error: paymentFetchError } = await supabase
          .from('subscription_payments')
          .select('*')
          .eq('user_id', userId)
          .eq('payment_status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingPayment) {
          // Atualizar pagamento existente
          await supabase
            .from('subscription_payments')
            .update({
              subscription_id: userSub.id,
              payment_status: 'paid',
              payment_date: new Date().toISOString(),
              payment_processor_payment_id: session.payment_intent || session.id,
              amount: planConfig.monthlyPrice,
            })
            .eq('id', existingPayment.id);
          console.log('✅ Payment updated to paid');
        } else {
          // CRIAR novo registro de pagamento
          const { error: insertError } = await supabase
            .from('subscription_payments')
            .insert({
              subscription_id: userSub.id,
              user_id: userId,
              amount: planConfig.monthlyPrice,
              payment_method: 'credit_card',
              payment_status: 'paid',
              payment_processor: 'stripe',
              payment_processor_payment_id: session.payment_intent || session.id,
              payment_date: new Date().toISOString(),
              due_date: new Date().toISOString(),
            });

          if (insertError) {
            console.error('❌ Error creating payment record:', insertError);
          } else {
            console.log('✅ Payment record CREATED');
          }
        }

        // REATIVAR CONEXÕES BANCÁRIAS
        await handleSubscriptionActivated(userId);

        // Enviar email de confirmação de compra
        try {
          // Verificar se estava no trial (session.subscription indica trial ativo)
          const stripeSubscription = session.subscription ? await stripeService.getSubscription(session.subscription) : null;
          const isTrialActive = stripeSubscription?.trial_end ? new Date(stripeSubscription.trial_end * 1000) > new Date() : false;
          const trialDaysRemaining = isTrialActive && stripeSubscription?.trial_end
            ? Math.ceil((stripeSubscription.trial_end * 1000 - Date.now()) / (1000 * 60 * 60 * 24))
            : 0;

          // Buscar nome do usuário
          const { data: userData } = await supabase.auth.admin.getUserById(userId);
          const userName = userData?.user?.user_metadata?.name || userData?.user?.email?.split('@')[0] || 'Usuário';

          // Data da próxima cobrança
          const nextBillingDate = isTrialActive && stripeSubscription?.trial_end
            ? new Date(stripeSubscription.trial_end * 1000)
            : endDate;

          emailService.sendPurchaseConfirmationEmail(
            session.customer_email || userData?.user?.email,
            userName,
            planConfig.name,
            planConfig.monthlyPrice,
            nextBillingDate,
            isTrialActive,
            trialDaysRemaining
          ).catch((err) => {
            console.error('⚠️ Error sending purchase confirmation email:', err);
          });

          console.log('📧 Purchase confirmation email queued for:', session.customer_email);
        } catch (emailError) {
          console.error('⚠️ Error preparing purchase email:', emailError);
        }

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

      case 'invoice.paid': {
        // Pagamento recorrente mensal bem-sucedido
        const invoice = event.data.object as any;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;
        const amountPaid = (invoice.amount_paid || 0) / 100; // Converter de centavos

        console.log('📦 Invoice Paid (Recurring):', {
          invoiceId: invoice.id,
          customerId,
          subscriptionId,
          amountPaid,
        });

        // Buscar subscription pelo payment_processor_customer_id
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('payment_processor_customer_id', customerId)
          .in('status', ['active', 'trial', 'pending'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError || !subscription) {
          console.warn('⚠️ Subscription not found for customer:', customerId);
          break;
        }

        // Atualizar end_date da subscription (+1 mês)
        const newEndDate = new Date();
        newEndDate.setMonth(newEndDate.getMonth() + 1);

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            end_date: newEndDate.toISOString(),
            next_billing_date: newEndDate.toISOString(),
          })
          .eq('id', subscription.id);

        // Criar registro de pagamento
        const { error: paymentError } = await supabase
          .from('subscription_payments')
          .insert({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            amount: amountPaid,
            payment_method: 'credit_card',
            payment_status: 'paid',
            payment_processor: 'stripe',
            payment_processor_payment_id: invoice.payment_intent || invoice.id,
            payment_date: new Date().toISOString(),
            due_date: new Date().toISOString(),
          });

        if (paymentError) {
          console.error('❌ Error recording recurring payment:', paymentError);
        } else {
          console.log('✅ Recurring payment recorded for subscription:', subscription.id);
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;

        console.log('❌ Invoice Payment Failed:', invoice.id);

        // Atualizar pagamento como falho
        await supabase
          .from('subscription_payments')
          .update({
            payment_status: 'failed',
            error_message: 'Pagamento falhou'
          })
          .eq('payment_processor_payment_id', invoice.id);

        // Também buscar por subscription ID e marcar como falho se necessário
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('payment_processor_subscription_id', invoice.subscription)
          .single();

        if (subscription) {
          // Criar registro de pagamento falho
          await supabase
            .from('subscription_payments')
            .insert({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              amount: (invoice.amount_due || 0) / 100,
              payment_method: 'credit_card',
              payment_status: 'failed',
              payment_processor: 'stripe',
              payment_processor_payment_id: invoice.id,
              due_date: new Date().toISOString(),
              error_message: 'Pagamento recusado pelo cartão',
            });
        }

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
