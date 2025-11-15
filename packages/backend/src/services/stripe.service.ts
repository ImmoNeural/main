import Stripe from 'stripe';

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

// URLs base para redirecionamento
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

interface CreateCheckoutSessionParams {
  planType: 'manual' | 'conectado' | 'conectado_plus';
  planName: string;
  planPrice: number;
  userId: string;
  userEmail: string;
  paymentMode: 'payment' | 'subscription';
}

interface CreateCustomerParams {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export class StripeService {
  /**
   * Criar cliente no Stripe
   */
  async createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata || {},
      });
      return customer;
    } catch (error: any) {
      console.error('Error creating Stripe customer:', error.message);
      throw new Error('Falha ao criar cliente no Stripe');
    }
  }

  /**
   * Buscar cliente por email
   */
  async getCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
    try {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1,
      });
      return customers.data[0] || null;
    } catch (error: any) {
      console.error('Error fetching Stripe customer:', error.message);
      return null;
    }
  }

  /**
   * Criar sessão de checkout do Stripe
   * Esta é a forma moderna e recomendada - redireciona para página do Stripe
   */
  async createCheckoutSession(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
    try {
      // Buscar ou criar cliente
      let customer = await this.getCustomerByEmail(params.userEmail);
      if (!customer) {
        customer = await this.createCustomer({
          email: params.userEmail,
          metadata: {
            user_id: params.userId,
          },
        });
      }

      // Configuração base da sessão
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        mode: params.paymentMode,
        success_url: `${FRONTEND_URL}/app/planos?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL}/app/planos?canceled=true`,
        metadata: {
          user_id: params.userId,
          plan_type: params.planType,
        },
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: params.planName,
                description: `Acesso completo ao Guru do Dindin - ${params.planName}`,
              },
              unit_amount: Math.round(params.planPrice * 100), // Stripe usa centavos
              ...(params.paymentMode === 'subscription' && {
                recurring: {
                  interval: 'month',
                },
              }),
            },
            quantity: 1,
          },
        ],
        payment_method_types: ['card'], // Cartão de crédito
      };

      // Criar sessão
      const session = await stripe.checkout.sessions.create(sessionParams);
      return session;
    } catch (error: any) {
      console.error('Error creating Stripe checkout session:', error.message);
      throw new Error('Falha ao criar sessão de pagamento no Stripe');
    }
  }

  /**
   * Criar assinatura recorrente mensal
   */
  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata: metadata || {},
      });
      return subscription;
    } catch (error: any) {
      console.error('Error creating Stripe subscription:', error.message);
      throw new Error('Falha ao criar assinatura no Stripe');
    }
  }

  /**
   * Cancelar assinatura
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error: any) {
      console.error('Error canceling Stripe subscription:', error.message);
      throw new Error('Falha ao cancelar assinatura no Stripe');
    }
  }

  /**
   * Buscar assinatura
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error: any) {
      console.error('Error fetching Stripe subscription:', error.message);
      throw new Error('Falha ao buscar assinatura no Stripe');
    }
  }

  /**
   * Atualizar assinatura
   */
  async updateSubscription(
    subscriptionId: string,
    params: Partial<Stripe.SubscriptionUpdateParams>
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, params);
      return subscription;
    } catch (error: any) {
      console.error('Error updating Stripe subscription:', error.message);
      throw new Error('Falha ao atualizar assinatura no Stripe');
    }
  }

  /**
   * Buscar sessão de checkout
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return session;
    } catch (error: any) {
      console.error('Error fetching Stripe checkout session:', error.message);
      throw new Error('Falha ao buscar sessão de checkout');
    }
  }

  /**
   * Criar portal de gerenciamento de assinatura
   * Permite o usuário gerenciar sua assinatura (cancelar, atualizar, ver faturas)
   */
  async createCustomerPortalSession(customerId: string): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${FRONTEND_URL}/app/planos`,
      });
      return session;
    } catch (error: any) {
      console.error('Error creating customer portal session:', error.message);
      throw new Error('Falha ao criar portal de gerenciamento');
    }
  }

  /**
   * Construir evento do webhook (valida assinatura)
   */
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error: any) {
      console.error('Error constructing webhook event:', error.message);
      throw new Error('Webhook signature verification failed');
    }
  }
}

export const stripeService = new StripeService();
