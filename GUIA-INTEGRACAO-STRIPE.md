# Guia de Integração com Stripe - Guru do Dindin

Este guia explica como configurar e usar o Stripe para processar assinaturas.

## 🎯 Por que Stripe?

- ✅ **Interface profissional** - Dashboard melhor do mercado
- ✅ **Documentação excelente** - Muito completa e clara
- ✅ **SDKs oficiais** - Para Node.js, Python, Ruby, etc
- ✅ **Stripe Checkout** - Página de pagamento pronta e segura
- ✅ **Customer Portal** - Usuários gerenciam suas próprias assinaturas
- ✅ **Webhooks confiáveis** - Sistema robusto de notificações
- ✅ **Reconhecimento global** - Marca confiável mundialmente
- ✅ **PCI Compliance** - Stripe cuida de toda a segurança

## 💰 Taxas no Brasil

- **Cartão de crédito:** 4.99% + R$ 0.40 por transação
- **Sem mensalidade**
- **Sem taxa de setup**

---

## 🚀 Passo a Passo para Configurar

### 1. Criar/Acessar Conta no Stripe

1. Acesse: https://stripe.com
2. Faça login ou crie uma conta
3. Complete o cadastro da sua empresa

### 2. Obter Chaves da API

1. Acesse o **Dashboard** do Stripe
2. Clique em **Developers** > **API keys**
3. Você verá duas chaves:
   - **Publishable key** (começa com `pk_`)
   - **Secret key** (começa com `sk_`)

**⚠️ IMPORTANTE:**
- Use as chaves de **test** para desenvolvimento
- Use as chaves de **live** apenas em produção
- **NUNCA** exponha a Secret Key no frontend

### 3. Configurar Variáveis de Ambiente

Adicione ao `.env` do backend:

```env
# Stripe - Test Mode (Desenvolvimento)
STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_webhook_aqui

# Frontend URL (para redirecionamento)
FRONTEND_URL=http://localhost:5173
```

Para produção:

```env
# Stripe - Live Mode (Produção)
STRIPE_SECRET_KEY=sk_live_sua_chave_aqui
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_webhook_aqui

# Frontend URL (para redirecionamento)
FRONTEND_URL=https://gurudodindin.com.br
```

### 4. Configurar Webhook

1. Acesse: **Developers** > **Webhooks** no Dashboard
2. Clique em **Add endpoint**
3. URL do endpoint:
   ```
   https://seu-backend.com/api/subscriptions/webhook/stripe
   ```
4. Selecione os eventos:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`
   - ✅ `invoice.payment_succeeded`
5. Copie o **Signing secret** e adicione ao `.env` como `STRIPE_WEBHOOK_SECRET`

### 5. Testar no Modo de Desenvolvimento

#### Dados de Teste (Cartões)

**Cartão Aprovado:**
```
Número: 4242 4242 4242 4242
CVV: qualquer 3 dígitos
Validade: qualquer data futura
```

**Cartão que Requer Autenticação 3D Secure:**
```
Número: 4000 0027 6000 3184
CVV: qualquer 3 dígitos
Validade: qualquer data futura
```

**Cartão Recusado:**
```
Número: 4000 0000 0000 0002
CVV: qualquer 3 dígitos
Validade: qualquer data futura
```

Mais cartões de teste: https://stripe.com/docs/testing

---

## 🏗️ Arquitetura Implementada

### Backend

**Arquivo: `packages/backend/src/services/stripe.service.ts`**

Funções disponíveis:
- `createCustomer()` - Criar cliente no Stripe
- `getCustomerByEmail()` - Buscar cliente por email
- `createCheckoutSession()` - Criar sessão de pagamento
- `createSubscription()` - Criar assinatura recorrente
- `cancelSubscription()` - Cancelar assinatura
- `getSubscription()` - Buscar assinatura
- `createCustomerPortalSession()` - Portal de gerenciamento
- `constructWebhookEvent()` - Validar webhooks

**Arquivo: `packages/backend/src/routes/subscription.routes.ts`**

Endpoints:
- `GET /api/subscriptions/current` - Assinatura atual
- `POST /api/subscriptions/create` - Criar assinatura
- `POST /api/subscriptions/cancel` - Cancelar assinatura
- `GET /api/subscriptions/portal` - Portal de gerenciamento
- `POST /api/subscriptions/webhook/stripe` - Receber eventos

### Frontend

**Arquivo: `packages/frontend/src/pages/Plans.tsx`**

Fluxo:
1. Usuário escolhe plano
2. Frontend chama `/api/subscriptions/create`
3. Backend cria sessão no Stripe
4. Frontend redireciona para `checkoutUrl` (Stripe Checkout)
5. Usuário paga no Stripe
6. Stripe envia webhook para backend
7. Backend ativa assinatura no Supabase
8. Usuário é redirecionado de volta

---

## 🎨 Stripe Checkout - A Página de Pagamento

O **Stripe Checkout** é uma página hospedada pelo Stripe que:

✅ É **100% segura** (PCI compliant)
✅ Tem **design profissional**
✅ É **mobile-friendly**
✅ Suporta **múltiplos idiomas**
✅ Aceita **cartões de crédito/débito**
✅ Tem **autenticação 3D Secure** integrada
✅ Mostra **logo da sua empresa**
✅ É **customizável** (cores, logo)

### Customizar Stripe Checkout

1. Acesse: **Settings** > **Branding** no Dashboard
2. Faça upload do logo
3. Escolha cores do brand
4. Salve

---

## 🛡️ Webhooks - Como Funcionam

Webhooks são notificações que o Stripe envia quando algo acontece:

### Eventos Principais

**`checkout.session.completed`**
- Disparado quando o pagamento é confirmado
- Ativa a assinatura no banco de dados

**`customer.subscription.deleted`**
- Disparado quando assinatura é cancelada
- Atualiza status no banco

**`invoice.payment_failed`**
- Disparado quando pagamento falha
- Notifica usuário (você pode implementar)

### Testar Webhooks Localmente

Use o **Stripe CLI**:

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escutar webhooks
stripe listen --forward-to localhost:3000/api/subscriptions/webhook/stripe
```

O CLI te dará um `webhook secret` temporário para usar no `.env`.

---

## 👤 Customer Portal - Gerenciamento pelo Usuário

O **Customer Portal** permite que usuários:

✅ Vejam faturas
✅ Atualizem forma de pagamento
✅ Cancelem assinatura
✅ Façam upgrade/downgrade

### Como Usar

Backend já tem endpoint implementado:
```
GET /api/subscriptions/portal
```

Retorna URL do portal. Basta redirecionar o usuário.

### Configurar Customer Portal

1. Acesse: **Settings** > **Billing** > **Customer portal**
2. Ative funcionalidades desejadas:
   - ✅ Cancelar assinatura
   - ✅ Atualizar forma de pagamento
   - ✅ Ver faturas
3. Configure mensagens customizadas
4. Salve

---

## 📊 Dashboard do Stripe

O Dashboard oferece:

- **Payments:** Todos os pagamentos
- **Customers:** Seus clientes
- **Subscriptions:** Assinaturas ativas
- **Invoices:** Faturas geradas
- **Disputes:** Contestações (chargebacks)
- **Reports:** Relatórios financeiros
- **Logs:** Logs de API e webhooks

Acesse: https://dashboard.stripe.com

---

## 🔒 Segurança

### Boas Práticas

1. ✅ **Nunca** exponha Secret Key no frontend
2. ✅ **Sempre** valide webhooks com signature
3. ✅ Use **HTTPS** em produção
4. ✅ **Não armazene** dados de cartão
5. ✅ Use **ambiente de test** para desenvolvimento
6. ✅ **Revogue** chaves comprometidas imediatamente

### Validação de Webhooks

O código já valida automaticamente usando:

```typescript
stripeService.constructWebhookEvent(req.body, signature)
```

Isso garante que o webhook veio realmente do Stripe.

---

## 🐛 Troubleshooting

### Erro: "Invalid API Key"
- ✅ Verifique se copiou a chave correta
- ✅ Certifique-se de usar `sk_test_` ou `sk_live_`
- ✅ Confira se a variável `STRIPE_SECRET_KEY` está setada

### Erro: "Webhook signature verification failed"
- ✅ Verifique `STRIPE_WEBHOOK_SECRET`
- ✅ Certifique-se que o body está como raw (não JSON parsed)
- ✅ Use Stripe CLI para testar localmente

### Pagamento não ativa assinatura
- ✅ Verifique se webhook foi recebido
- ✅ Confira logs do servidor
- ✅ Valide eventos no Dashboard > Developers > Webhooks

### Redirecionamento falha
- ✅ Verifique `FRONTEND_URL` no `.env`
- ✅ Certifique-se que URLs de success/cancel estão corretas

---

## 🚀 Deploy em Produção

### Checklist

- [ ] Trocar chaves de test para live
- [ ] Configurar webhook em produção
- [ ] Ativar modo live no Stripe
- [ ] Configurar Customer Portal
- [ ] Personalizar Stripe Checkout (logo, cores)
- [ ] Testar fluxo completo com cartão real (valor pequeno)
- [ ] Configurar notificações de email (Stripe envia automaticamente)
- [ ] Revisar políticas de cancelamento

### Ativar Modo Live

1. Complete verificação da conta no Stripe
2. Adicione informações bancárias (para receber pagamentos)
3. Ative modo **Live** no Dashboard
4. Use chaves `sk_live_` e `pk_live_`

---

## 📞 Suporte

- **Documentação:** https://stripe.com/docs
- **Suporte:** https://support.stripe.com
- **Status:** https://status.stripe.com
- **Comunidade:** https://github.com/stripe

---

## ✅ Vantagens Implementadas

✅ **Stripe Checkout** - Página de pagamento profissional
✅ **Customer Portal** - Usuários gerenciam suas assinaturas
✅ **Webhooks validados** - Segurança garantida
✅ **Suporte a recorrência** - Mensalidades automáticas
✅ **Pagamento único** - Para planos anuais
✅ **Dashboard completo** - Relatórios e analytics
✅ **Mobile-friendly** - Funciona perfeitamente em celular

---

**Sistema pronto para processar pagamentos reais com Stripe! 🎉**
