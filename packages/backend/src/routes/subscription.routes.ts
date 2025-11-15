import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { asaasService } from '../services/asaas.service';
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
router.get('/current', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

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
 * Criar nova assinatura
 */
router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { planType, billingType, paymentCycle } = req.body;

    // Validar plano
    if (!PLAN_CONFIGS[planType as PlanType]) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const planConfig = PLAN_CONFIGS[planType as PlanType];
    const isYearly = paymentCycle === 'yearly';
    const price = isYearly ? planConfig.yearlyPrice : planConfig.monthlyPrice * 12;

    // Buscar dados do usuário
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) throw userError;

    // Verificar se já existe customer no Asaas
    let asaasCustomer = await asaasService.getCustomerByEmail(user.email!);

    // Se não existe, criar
    if (!asaasCustomer) {
      asaasCustomer = await asaasService.createCustomer({
        name: user.user_metadata?.name || user.email!.split('@')[0],
        email: user.email!,
        cpfCnpj: user.user_metadata?.cpf
      });
    }

    // Criar assinatura ou pagamento único
    let asaasSubscription;
    let paymentUrl;

    if (isYearly) {
      // Pagamento anual (único)
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const payment = await asaasService.createPayment({
        customer: asaasCustomer.id,
        billingType: billingType,
        value: price,
        dueDate: new Date().toISOString().split('T')[0],
        description: `${planConfig.name} - Assinatura Anual`,
        externalReference: `${userId}_${planType}_yearly`
      });

      asaasSubscription = payment;
      paymentUrl = payment.invoiceUrl || payment.bankSlipUrl;
    } else {
      // Assinatura mensal recorrente
      asaasSubscription = await asaasService.createSubscription({
        customer: asaasCustomer.id,
        billingType: billingType,
        value: planConfig.monthlyPrice,
        nextDueDate: new Date().toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: `${planConfig.name} - Assinatura Mensal`,
        externalReference: `${userId}_${planType}_monthly`
      });

      paymentUrl = asaasSubscription.invoiceUrl;
    }

    // Calcular data de término
    const endDate = new Date();
    if (isYearly) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Salvar assinatura no Supabase
    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: planType,
        plan_name: planConfig.name,
        plan_price: price,
        status: 'pending',
        end_date: endDate.toISOString(),
        payment_method: billingType.toLowerCase(),
        payment_processor: 'asaas',
        payment_processor_subscription_id: asaasSubscription.id,
        payment_processor_customer_id: asaasCustomer.id,
        max_connected_accounts: planConfig.maxAccounts,
        auto_renew: !isYearly,
        next_billing_date: isYearly ? endDate.toISOString() : new Date().toISOString(),
        metadata: {
          payment_cycle: paymentCycle,
          asaas_payment_id: asaasSubscription.id
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
        payment_method: billingType.toLowerCase(),
        payment_status: 'pending',
        payment_processor: 'asaas',
        payment_processor_payment_id: asaasSubscription.id,
        payment_processor_invoice_url: paymentUrl,
        due_date: new Date().toISOString()
      });

    res.json({
      subscription,
      paymentUrl,
      message: 'Assinatura criada com sucesso. Complete o pagamento para ativar.'
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
router.post('/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

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

    // Cancelar no Asaas (se for recorrente)
    if (subscription.payment_processor_subscription_id && subscription.auto_renew) {
      try {
        await asaasService.cancelSubscription(subscription.payment_processor_subscription_id);
      } catch (error) {
        console.error('Error canceling Asaas subscription:', error);
        // Continua mesmo se falhar no Asaas
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
 * POST /api/subscriptions/webhook/asaas
 * Webhook do Asaas para notificações de pagamento
 */
router.post('/webhook/asaas', async (req: Request, res: Response) => {
  try {
    const event = req.body;

    console.log('Asaas Webhook Event:', event.event);

    // Processar eventos de pagamento
    if (event.event === 'PAYMENT_CONFIRMED' || event.event === 'PAYMENT_RECEIVED') {
      const paymentId = event.payment.id;

      // Buscar assinatura pelo payment_id
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('payment_processor_subscription_id', paymentId)
        .single();

      if (!subscription) {
        console.warn('Subscription not found for payment:', paymentId);
        return res.json({ received: true });
      }

      // Atualizar status da assinatura
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          start_date: new Date().toISOString()
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
        .eq('payment_processor_payment_id', paymentId);

      console.log('Subscription activated:', subscription.id);
    }

    // Processar eventos de pagamento vencido
    if (event.event === 'PAYMENT_OVERDUE') {
      const paymentId = event.payment.id;

      await supabase
        .from('subscription_payments')
        .update({
          payment_status: 'failed',
          error_message: 'Pagamento vencido'
        })
        .eq('payment_processor_payment_id', paymentId);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

export default router;
