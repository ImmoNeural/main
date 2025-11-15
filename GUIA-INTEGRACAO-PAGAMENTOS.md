# Guia de Integração de Pagamentos - Guru do Dindin

Este guia explica como integrar sistemas de pagamento brasileiros para processar assinaturas.

## 📋 Sistemas de Pagamento Recomendados

### 1. **Asaas** (Recomendado) ⭐

**Por que escolher:**
- ✅ Sistema 100% brasileiro
- ✅ Muito fácil de integrar
- ✅ Suporte a assinaturas recorrentes
- ✅ Aceita cartão de crédito, PIX e boleto
- ✅ Taxas competitivas (2,99% + R$ 0,49 por transação)
- ✅ Dashboard completo
- ✅ API bem documentada
- ✅ Webhooks para notificações automáticas

**Documentação:** https://docs.asaas.com

**Passos para integração:**

1. **Criar conta no Asaas:**
   - Acesse: https://www.asaas.com
   - Crie uma conta gratuita
   - Ative o modo sandbox para testes

2. **Obter API Key:**
   - Acesse: Configurações > Integrações > API
   - Copie sua API Key (Production e Sandbox)
   - Adicione ao `.env`:
     ```env
     ASAAS_API_KEY=seu_api_key_aqui
     ASAAS_SANDBOX=true  # false para produção
     ```

3. **Instalar SDK (opcional) ou usar fetch:**
   ```bash
   npm install asaas
   ```

4. **Fluxo de Assinatura:**
   ```
   Usuário escolhe plano
   → Cria customer no Asaas
   → Cria subscription no Asaas
   → Asaas retorna link de pagamento
   → Usuário paga
   → Webhook notifica sistema
   → Atualiza status no Supabase
   ```

### 2. **Mercado Pago**

**Por que escolher:**
- ✅ Marca conhecida
- ✅ Suporte a assinaturas
- ✅ Aceita cartão, PIX e boleto
- ✅ Taxas: 4,99% + R$ 0,39

**Documentação:** https://www.mercadopago.com.br/developers

**Passos básicos:**
1. Criar conta em https://www.mercadopago.com.br
2. Obter credentials em https://www.mercadopago.com.br/developers/panel
3. Instalar SDK: `npm install mercadopago`
4. Configurar no `.env`:
   ```env
   MERCADOPAGO_ACCESS_TOKEN=seu_token_aqui
   ```

### 3. **Pagar.me**

**Por que escolher:**
- ✅ Sistema brasileiro robusto
- ✅ Muito usado por startups
- ✅ Suporte excelente
- ✅ Taxas: 3,99% + R$ 0,39

**Documentação:** https://docs.pagar.me

---

## 🚀 Implementação com Asaas (Detalhado)

### Passo 1: Configurar Backend

Crie o arquivo `packages/backend/src/services/asaas.service.ts`:

```typescript
import axios from 'axios';

const ASAAS_API_URL = process.env.ASAAS_SANDBOX === 'true'
  ? 'https://sandbox.asaas.com/api/v3'
  : 'https://www.asaas.com/api/v3';

const asaasApi = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'access_token': process.env.ASAAS_API_KEY,
    'Content-Type': 'application/json'
  }
});

export class AsaasService {
  // Criar cliente
  async createCustomer(data: {
    name: string;
    email: string;
    cpfCnpj?: string;
    phone?: string;
  }) {
    const response = await asaasApi.post('/customers', data);
    return response.data;
  }

  // Criar assinatura
  async createSubscription(data: {
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    nextDueDate: string;
    cycle: 'MONTHLY' | 'YEARLY';
    description: string;
  }) {
    const response = await asaasApi.post('/subscriptions', data);
    return response.data;
  }

  // Criar pagamento único
  async createPayment(data: {
    customer: string;
    billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
    value: number;
    dueDate: string;
    description: string;
  }) {
    const response = await asaasApi.post('/payments', data);
    return response.data;
  }

  // Buscar assinatura
  async getSubscription(id: string) {
    const response = await asaasApi.get(`/subscriptions/${id}`);
    return response.data;
  }

  // Cancelar assinatura
  async cancelSubscription(id: string) {
    const response = await asaasApi.delete(`/subscriptions/${id}`);
    return response.data;
  }
}

export const asaasService = new AsaasService();
```

### Passo 2: Criar Rotas de Assinatura

Crie `packages/backend/src/routes/subscription.routes.ts`:

```typescript
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { asaasService } from '../services/asaas.service';
import { supabase } from '../config/supabase';

const router = Router();

// Criar assinatura
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { planType, billingType } = req.body;

    // Definir valores dos planos
    const planPrices = {
      manual: { yearly: 133.90, monthly: 13.90 },
      conectado: { yearly: 249.90, monthly: 29.90 },
      conectado_plus: { yearly: 352.90, monthly: 41.90 }
    };

    const plan = planPrices[planType as keyof typeof planPrices];
    if (!plan) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    // Buscar usuário
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError) throw userError;

    // Criar customer no Asaas
    const customer = await asaasService.createCustomer({
      name: userData.user.user_metadata.name || userData.user.email,
      email: userData.user.email
    });

    // Criar assinatura no Asaas
    const subscription = await asaasService.createSubscription({
      customer: customer.id,
      billingType: billingType,
      value: plan.yearly,
      nextDueDate: new Date().toISOString().split('T')[0],
      cycle: 'YEARLY',
      description: `Assinatura Anual - Plano ${planType}`
    });

    // Salvar no Supabase
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_type: planType,
        plan_name: `Plano ${planType}`,
        plan_price: plan.yearly,
        status: 'pending',
        payment_method: billingType.toLowerCase(),
        payment_processor: 'asaas',
        payment_processor_subscription_id: subscription.id,
        payment_processor_customer_id: customer.id,
        max_connected_accounts: planType === 'manual' ? 0 : planType === 'conectado' ? 3 : 10
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      subscription: data,
      paymentUrl: subscription.invoiceUrl
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Erro ao criar assinatura' });
  }
});

// Webhook do Asaas
router.post('/webhook/asaas', async (req, res) => {
  try {
    const event = req.body;

    if (event.event === 'PAYMENT_CONFIRMED') {
      // Atualizar assinatura para ativa
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          start_date: new Date().toISOString()
        })
        .eq('payment_processor_subscription_id', event.payment.subscription);

      if (error) throw error;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Erro no webhook' });
  }
});

export default router;
```

### Passo 3: Registrar Rotas

Em `packages/backend/src/index.ts`, adicione:

```typescript
import subscriptionRoutes from './routes/subscription.routes';

app.use('/api/subscriptions', subscriptionRoutes);
```

### Passo 4: Configurar Webhook no Asaas

1. Acesse: Configurações > Webhooks no Asaas
2. Adicione a URL: `https://seu-dominio.com/api/subscriptions/webhook/asaas`
3. Selecione eventos:
   - PAYMENT_CONFIRMED
   - PAYMENT_RECEIVED
   - PAYMENT_OVERDUE

### Passo 5: Atualizar Frontend

Em `packages/frontend/src/pages/Plans.tsx`, atualize o `handleSelectPlan`:

```typescript
const handleSelectPlan = async (plan: Plan) => {
  if (loading) return;

  setLoading(true);
  try {
    const response = await fetch('/api/subscriptions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        planType: plan.type,
        billingType: 'CREDIT_CARD' // ou permitir usuário escolher
      })
    });

    const data = await response.json();

    if (data.paymentUrl) {
      // Redirecionar para página de pagamento
      window.location.href = data.paymentUrl;
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Erro ao processar assinatura. Tente novamente.');
  } finally {
    setLoading(false);
  }
};
```

---

## 🧪 Testando no Ambiente Sandbox

### Dados de Teste Asaas:

**Cartão de Crédito (APROVADO):**
- Número: 5162 3062 6460 0025
- CVV: 318
- Validade: qualquer data futura

**PIX:**
- Gera QR Code automaticamente
- No sandbox, marca como pago automaticamente após 5 minutos

**Boleto:**
- Gera boleto automaticamente
- No sandbox, pode marcar manualmente como pago

---

## 📊 Monitoramento

- **Dashboard Asaas:** https://www.asaas.com/login
- **Logs de Webhook:** Configurações > Webhooks > Ver logs
- **Transações:** Financeiro > Cobranças

---

## 🔒 Segurança

1. **Nunca exponha API Keys no frontend**
2. **Use HTTPS em produção**
3. **Valide webhooks** (Asaas envia header de autenticação)
4. **Armazene dados sensíveis criptografados**

---

## ✅ Checklist de Implementação

- [ ] Criar conta no Asaas
- [ ] Obter API Key (sandbox e produção)
- [ ] Configurar variáveis de ambiente
- [ ] Implementar serviço Asaas
- [ ] Criar rotas de assinatura
- [ ] Configurar webhooks
- [ ] Testar fluxo completo no sandbox
- [ ] Ajustar interface de usuário
- [ ] Testar com dados reais
- [ ] Lançar em produção

---

## 📞 Suporte

- **Asaas:** https://ajuda.asaas.com
- **Email:** suporte@asaas.com
- **WhatsApp:** Disponível no dashboard

---

**Boa sorte com a implementação! 🚀**
