# Sistema de Pagamentos - Guru do Dindin

Sistema completo de assinaturas com integração ao **Stripe** (gateway de pagamento internacional usado por empresas como Shopify, Lyft e Amazon).

## ✅ O que foi implementado

### 1. **Banco de Dados (Supabase)**
- ✅ Tabela `subscriptions` - armazena assinaturas dos usuários
- ✅ Tabela `subscription_payments` - histórico de pagamentos
- ✅ ENUMs para tipos de plano, status e métodos de pagamento
- ✅ RLS (Row Level Security) configurado
- ✅ Triggers automáticos para updated_at

**Arquivo:** `supabase-subscription-schema.sql`

### 2. **Backend (API)**
- ✅ Serviço Stripe (`stripe.service.ts`) - integração completa
- ✅ Rotas de assinatura (`subscription.routes.ts`):
  - `GET /api/subscriptions/current` - buscar assinatura atual
  - `POST /api/subscriptions/create` - criar nova assinatura
  - `POST /api/subscriptions/cancel` - cancelar assinatura
  - `GET /api/subscriptions/portal` - portal de gerenciamento (Stripe Customer Portal)
  - `POST /api/subscriptions/webhook/stripe` - webhook para notificações
- ✅ Tipos TypeScript para assinaturas

**Arquivos:**
- `packages/backend/src/services/stripe.service.ts`
- `packages/backend/src/routes/subscription.routes.ts`
- `packages/backend/src/app.ts` (rotas registradas)
- `packages/frontend/src/types.ts` (tipos atualizados)

### 3. **Frontend**
- ✅ Página de Planos (`/app/planos`) - protegida por autenticação
  - Design moderno com cards
  - Estilo limpo (fundo cinza claro)
  - Logo no cabeçalho
  - Mostra plano atual do usuário
  - Integração completa com Stripe Checkout
- ✅ Landing Page atualizada:
  - Seção de bancos conectados (Open Finance)
  - Seção de planos com preços
  - Botão "Planos" no menu (desktop e mobile)
  - Redirecionamento inteligente
  - Depoimentos de clientes
  - FAQ
  - Design responsivo
- ✅ Redirecionamento inteligente:
  - Não autenticado → `/login`
  - Autenticado → `/app/planos` → Stripe Checkout

**Arquivos:**
- `packages/frontend/src/pages/Plans.tsx`
- `packages/frontend/src/pages/LandingPage.tsx`
- `packages/frontend/src/App.tsx` (rotas atualizadas)

### 4. **Documentação**
- ✅ Guia completo de integração com Stripe
- ✅ Instruções passo a passo
- ✅ Exemplos de código
- ✅ Dados de teste
- ✅ Configuração de webhooks

**Arquivo:** `GUIA-INTEGRACAO-STRIPE.md`

---

## 🎯 Por que Stripe?

### Vantagens
- 🌟 **Interface profissional** - Dashboard de última geração
- 📚 **Documentação excelente** - Melhor do mercado
- 🛠️ **SDKs oficiais** - Para todas as linguagens
- 💳 **Stripe Checkout** - Página de pagamento pronta e linda
- 👤 **Customer Portal** - Usuários gerenciam suas assinaturas
- 🔔 **Webhooks confiáveis** - Sistema robusto
- 📊 **Analytics completo** - Relatórios detalhados
- 🌍 **Reconhecimento global** - Usado pelas maiores empresas
- 🛡️ **PCI Compliance** - Stripe cuida da segurança

### O que aceita
- ✅ **Cartão de crédito** (perfeito!)
- ✅ **Cartão de débito**
- ✅ **Parcelamento** (via Installments)
- ⚠️ PIX via parceiros (mais complexo)
- ⚠️ Boleto via parceiros (mais complexo)

---

## 🚀 Como Configurar

### Passo 1: Configurar Supabase

```bash
# Execute o arquivo SQL no Supabase SQL Editor
supabase-subscription-schema.sql
```

### Passo 2: Criar/Acessar Conta no Stripe

1. Acesse: https://stripe.com
2. Faça login ou crie uma conta
3. Complete o cadastro

### Passo 3: Obter Chaves da API

1. Acesse: **Dashboard** > **Developers** > **API keys**
2. Copie:
   - **Secret key** (sk_test_... para desenvolvimento)
   - **Publishable key** (pk_test_... para frontend, se necessário)

### Passo 4: Adicionar variáveis de ambiente

No backend `.env`:
```env
# Stripe (Test Mode para desenvolvimento)
STRIPE_SECRET_KEY=sk_test_sua_chave_aqui
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_webhook_aqui

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

Para produção:
```env
# Stripe (Live Mode)
STRIPE_SECRET_KEY=sk_live_sua_chave_aqui
STRIPE_WEBHOOK_SECRET=whsec_sua_chave_webhook_aqui

# Frontend URL
FRONTEND_URL=https://gurudodindin.com.br
```

### Passo 5: Configurar webhook no Stripe

1. Acesse: **Developers** > **Webhooks**
2. Clique em **Add endpoint**
3. URL: `https://seu-backend.com/api/subscriptions/webhook/stripe`
4. Eventos:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_failed`
5. Copie o **Signing secret** e adicione ao `.env`

### Passo 6: Testar no Sandbox

Use cartões de teste do Stripe:

**Cartão Aprovado:**
```
Número: 4242 4242 4242 4242
CVV: qualquer 3 dígitos
Validade: qualquer data futura
```

Mais cartões: https://stripe.com/docs/testing

---

## 📦 Planos Disponíveis

### Plano Manual
- **R$ 133,90/ano** (ou 12x R$ 13,90)
- **20% OFF** no pagamento anual
- 0 contas conectadas (entrada manual)

### Plano Conectado ⭐ (Mais Popular)
- **R$ 249,90/ano** (ou 12x R$ 29,90)
- **30% OFF** no pagamento anual
- Até 3 contas conectadas via Open Finance

### Plano Conectado Plus
- **R$ 352,90/ano** (ou 12x R$ 41,90)
- **30% OFF** no pagamento anual
- Até 10 contas conectadas
- Suporte dedicado 24h

**Método de pagamento:**
- 💳 Cartão de crédito/débito (via Stripe Checkout)

---

## 🏗️ Fluxo de Pagamento

1. **Usuário escolhe plano** na página `/app/planos`
2. **Frontend chama** `POST /api/subscriptions/create`
3. **Backend cria sessão** no Stripe
4. **Backend retorna** URL do Stripe Checkout
5. **Frontend redireciona** usuário para Stripe
6. **Usuário paga** no Stripe Checkout (página segura)
7. **Stripe processa** pagamento
8. **Stripe envia webhook** para backend
9. **Backend ativa** assinatura no Supabase
10. **Usuário é redirecionado** de volta para `/app/planos?success=true`

---

## 🎨 Stripe Checkout - A Magia

O **Stripe Checkout** é uma página hospedada pelo Stripe:

✅ **100% segura** (PCI compliant)
✅ **Design profissional** (usado por empresas como Shopify)
✅ **Mobile-friendly** (perfeito em celular)
✅ **Múltiplos idiomas** (português incluído)
✅ **Autenticação 3D Secure** (para segurança extra)
✅ **Customizável** (logo e cores da sua marca)

### Customizar

1. Acesse: **Settings** > **Branding**
2. Faça upload do logo
3. Escolha cores
4. Salve

---

## 👤 Customer Portal

O **Customer Portal** permite que usuários:

✅ Vejam suas faturas
✅ Atualizem forma de pagamento
✅ Cancelem assinatura
✅ Façam upgrade/downgrade

**Endpoint:** `GET /api/subscriptions/portal`

### Configurar

1. Acesse: **Settings** > **Billing** > **Customer portal**
2. Ative funcionalidades desejadas
3. Salve

---

## 🔧 Estrutura de Arquivos

```
.
├── supabase-subscription-schema.sql          # Schema do banco
├── GUIA-INTEGRACAO-STRIPE.md                # Guia detalhado
├── README-SISTEMA-PAGAMENTOS.md             # Este arquivo
│
├── packages/
│   ├── backend/
│   │   └── src/
│   │       ├── services/
│   │       │   └── stripe.service.ts         # Serviço Stripe
│   │       └── routes/
│   │           └── subscription.routes.ts    # Rotas de assinatura
│   │
│   └── frontend/
│       └── src/
│           ├── pages/
│           │   ├── Plans.tsx                 # Página de planos
│           │   └── LandingPage.tsx           # Landing page
│           └── types.ts                      # Tipos TypeScript
```

---

## 🐛 Troubleshooting

### Erro: "Invalid API Key"
- Verifique se copiou a chave correta (sk_test_ ou sk_live_)
- Confira variável STRIPE_SECRET_KEY no .env

### Webhook não funciona
- Verifique URL do webhook no Stripe
- Confira STRIPE_WEBHOOK_SECRET
- Use Stripe CLI para testar localmente

### Assinatura não ativa
- Verifique se webhook foi recebido
- Confira logs do servidor
- Valide no Dashboard > Webhooks

---

## 📊 Monitoramento

- **Dashboard Stripe:** https://dashboard.stripe.com
- **Payments:** Ver todos os pagamentos
- **Customers:** Gerenciar clientes
- **Subscriptions:** Acompanhar assinaturas
- **Webhooks:** Logs de eventos
- **Reports:** Relatórios financeiros

---

## 🔒 Segurança

1. ✅ **Nunca** exponha Secret Key no frontend
2. ✅ **Sempre** valide webhooks com signature
3. ✅ Use **HTTPS** em produção
4. ✅ **Não armazene** dados de cartão
5. ✅ Stripe é **PCI compliant** (cuida da segurança)

---

## ✅ Checklist de Produção

- [ ] Criar conta Stripe e completar verificação
- [ ] Obter chaves API (live mode)
- [ ] Configurar variáveis de ambiente
- [ ] Configurar webhook em produção
- [ ] Customizar Stripe Checkout (logo, cores)
- [ ] Configurar Customer Portal
- [ ] Testar fluxo completo com cartão real
- [ ] Ativar modo live
- [ ] Monitorar primeiras transações

---

## 📞 Suporte

- **Documentação:** https://stripe.com/docs
- **Suporte:** https://support.stripe.com
- **Status:** https://status.stripe.com

---

## 💰 Taxas

**Brasil:**
- Cartão de crédito: **4.99% + R$ 0.40** por transação
- Sem mensalidade
- Sem taxa de setup

---

**Sistema implementado com Stripe - pronto para processar pagamentos reais! 🚀**
