# 🔧 Instruções para Correção do Sistema de Assinaturas

## 📋 Problemas Corrigidos

1. ✅ **Trial automático de 7 dias** ao criar nova conta
2. ✅ **UI melhorada** na página de planos (mostra status correto)
3. ✅ **Schema SQL corrigido** para permitir backend salvar dados no Supabase

---

## 🚨 AÇÃO NECESSÁRIA: Executar SQL no Supabase

O Supabase não estava salvando as assinaturas porque as **políticas RLS estavam bloqueando** o backend de fazer INSERT/UPDATE.

### Passo 1: Acessar o SQL Editor do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **"SQL Editor"**

### Passo 2: Executar o Script de Correção

1. Copie TODO o conteúdo do arquivo: **`supabase-subscription-schema-fixed.sql`**
2. Cole no SQL Editor
3. Clique em **"Run"** (ou pressione Ctrl+Enter)
4. Aguarde a mensagem de sucesso

### Passo 3: Verificar se funcionou

No final do script, você verá uma query que mostra todas as políticas. Confirme que existem:

**Tabela `subscriptions`:**
- ✅ Permitir insert de assinaturas
- ✅ Permitir update de assinaturas
- ✅ Usuários podem ver suas próprias assinaturas

**Tabela `subscription_payments`:**
- ✅ Permitir insert de pagamentos
- ✅ Permitir update de pagamentos
- ✅ Usuários podem ver seus próprios pagamentos

---

## 🔐 Verificar Variáveis de Ambiente no Render.com

### Certifique-se de que estão configuradas:

#### Backend (Render.com):
```
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGxxxxxxxxxxxxxxxx
SUPABASE_ANON_KEY=eyJhbGxxxxxxxxxxxxxxxx
FRONTEND_URL=https://mycleverbot.com.br
```

#### ⚠️ IMPORTANTE:
- Use **`sk_test_`** para testes (não `sk_live_`)
- Use **`whsec_`** do webhook de TEST (https://dashboard.stripe.com/test/webhooks)
- A `SUPABASE_SERVICE_ROLE_KEY` é ESSENCIAL - sem ela, o backend não consegue salvar dados

### Onde encontrar as chaves do Supabase:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Clique em **Settings** → **API**
4. Copie:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** (clique em "Reveal") → `SUPABASE_SERVICE_ROLE_KEY` ⚠️

---

## ✨ Funcionalidades Implementadas

### 1. Trial Automático de 7 Dias

Quando um novo usuário se registra:
- ✅ Recebe automaticamente 7 dias grátis
- ✅ Pode testar todas as funcionalidades do plano Manual
- ✅ Mensagem: "Você ganhou 7 dias grátis para testar"

### 2. Página de Planos Melhorada

**Status exibidos:**

🎉 **Em Trial:**
```
"Período de teste ativo! Restam X dias grátis"
Botão: "Fazer Upgrade"
```

⚠️ **Sem Plano:**
```
"Você não possui um plano ativo"
Botão: "Assinar Agora"
```

✅ **Com Plano Ativo:**
```
"Plano ativo: [nome do plano]"
Botão: "Plano Atual" (desabilitado)
```

### 3. Sistema de Pagamento

**Fluxo completo:**
1. Usuário clica em "Assinar Agora"
2. Backend cria sessão no Stripe Checkout
3. Salva assinatura com status `pending` no Supabase
4. Redireciona para Stripe (página segura)
5. Usuário paga com cartão
6. Stripe envia webhook para backend
7. Backend atualiza status para `active`
8. Usuário volta para a página de planos

---

## 🧪 Como Testar

### 1. Criar Nova Conta
1. Acesse seu site e clique em "Registrar"
2. Crie uma nova conta
3. Verifique se aparece a mensagem: "Você ganhou 7 dias grátis para testar"

### 2. Verificar Trial
1. Após logar, vá em **"Planos"** no menu
2. Deve aparecer: "🎉 Período de teste ativo! Restam 7 dias grátis"
3. Botão do Plano Manual deve mostrar: "Fazer Upgrade"

### 3. Testar Pagamento (Modo TEST)
1. Clique em "Assinar Agora" em qualquer plano
2. Será redirecionado para o Stripe Checkout
3. Use o cartão de teste: **4242 4242 4242 4242**
   - CVC: 123
   - Data: 12/25
4. Clique em "Pagar"
5. Deve voltar para a página de planos
6. Status deve mudar para: "✅ Plano ativo"

### 4. Verificar no Supabase
1. Acesse: https://supabase.com/dashboard
2. Vá em **Table Editor** → **subscriptions**
3. Deve ter registros com:
   - `status = 'trial'` para usuários novos
   - `status = 'active'` para quem pagou
   - `plan_type` correto (manual/conectado/conectado_plus)

---

## 🐛 Solução de Problemas

### Problema: "Supabase não está salvando assinatura"
**Solução:** Execute o script `supabase-subscription-schema-fixed.sql`

### Problema: "Unexpected token '<', '<!DOCTYPE'..."
**Solução:** Já corrigido - frontend agora usa axios corretamente

### Problema: "Sua carta foi recusada... modo Live"
**Solução:** Troque `STRIPE_SECRET_KEY` para `sk_test_...` no Render.com

### Problema: "Webhook não está sendo chamado"
**Solução:**
1. Verifique URL do webhook no Stripe: https://dashboard.stripe.com/test/webhooks
2. URL deve ser: `https://SEU-BACKEND.onrender.com/api/subscriptions/webhook/stripe`
3. Atualize `STRIPE_WEBHOOK_SECRET` com o secret correto

---

## 📞 Próximos Passos

1. ✅ Execute o script SQL no Supabase
2. ✅ Verifique variáveis de ambiente no Render.com
3. ✅ Aguarde redeploy do backend
4. ✅ Teste criar nova conta (deve ganhar trial)
5. ✅ Teste fazer upgrade do trial para plano pago
6. ✅ Verifique se dados são salvos no Supabase

---

## 🎉 Quando Tudo Funcionar

Quando você testar e confirmar que:
- ✅ Novos usuários recebem 7 dias de trial
- ✅ Página de planos mostra status correto
- ✅ Pagamento com cartão teste funciona
- ✅ Dados são salvos no Supabase
- ✅ Webhook atualiza status para "active"

**Você está pronto para produção!** 🚀

Para ir para produção:
1. Troque `STRIPE_SECRET_KEY` para `sk_live_...`
2. Crie novo webhook em https://dashboard.stripe.com/webhooks (sem /test/)
3. Atualize `STRIPE_WEBHOOK_SECRET` com novo secret
4. Ative sua conta Stripe (verificação de identidade)
