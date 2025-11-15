# Sistema de Pagamentos - Guru do Dindin

Sistema completo de assinaturas mensais com integração ao **Asaas** (gateway de pagamento brasileiro).

## ✅ O que foi implementado

### 1. **Banco de Dados (Supabase)**
- ✅ Tabela `subscriptions` - armazena assinaturas dos usuários
- ✅ Tabela `subscription_payments` - histórico de pagamentos
- ✅ ENUMs para tipos de plano, status e métodos de pagamento
- ✅ RLS (Row Level Security) configurado
- ✅ Triggers automáticos para updated_at

**Arquivo:** `supabase-subscription-schema.sql`

### 2. **Backend (API)**
- ✅ Serviço Asaas (`asaas.service.ts`) - integração completa
- ✅ Rotas de assinatura (`subscription.routes.ts`):
  - `GET /api/subscriptions/current` - buscar assinatura atual
  - `POST /api/subscriptions/create` - criar nova assinatura
  - `POST /api/subscriptions/cancel` - cancelar assinatura
  - `POST /api/subscriptions/webhook/asaas` - webhook para notificações
- ✅ Tipos TypeScript para assinaturas

**Arquivos:**
- `packages/backend/src/services/asaas.service.ts`
- `packages/backend/src/routes/subscription.routes.ts`
- `packages/backend/src/app.ts` (rotas registradas)
- `packages/frontend/src/types.ts` (tipos atualizados)

### 3. **Frontend**
- ✅ Página de Planos (`/app/planos`) - protegida por autenticação
  - Design moderno com cards
  - Estilo similar à página de login (gradiente azul/roxo)
  - Exibe imagem `banco.png` no cabeçalho
  - Mostra plano atual do usuário
  - Integração completa com backend
- ✅ Landing Page atualizada:
  - Seção de bancos conectados (Open Finance)
  - Seção de planos com preços
  - Botão "Quero ser assinante" em múltiplos locais
  - Depoimentos de clientes
  - FAQ
  - Design responsivo
- ✅ Redirecionamento inteligente:
  - Não autenticado → `/login`
  - Autenticado → `/app/planos`

**Arquivos:**
- `packages/frontend/src/pages/Plans.tsx`
- `packages/frontend/src/pages/LandingPage.tsx`
- `packages/frontend/src/App.tsx` (rotas atualizadas)

### 4. **Documentação**
- ✅ Guia completo de integração com Asaas
- ✅ Comparação entre Asaas, Mercado Pago e Pagar.me
- ✅ Exemplos de código
- ✅ Instruções de teste no sandbox

**Arquivo:** `GUIA-INTEGRACAO-PAGAMENTOS.md`

---

## 🚀 Como Configurar

### Passo 1: Configurar Supabase

1. Acesse o SQL Editor do Supabase
2. Execute o script `supabase-subscription-schema.sql`
3. Verifique se as tabelas foram criadas:
   ```sql
   SELECT * FROM subscriptions LIMIT 1;
   SELECT * FROM subscription_payments LIMIT 1;
   ```

### Passo 2: Criar Conta no Asaas

1. Acesse https://www.asaas.com
2. Crie uma conta gratuita
3. Ative o modo **Sandbox** para testes
4. Acesse: **Configurações > Integrações > API**
5. Copie sua **API Key** (Sandbox e Produção)

### Passo 3: Configurar Variáveis de Ambiente

Adicione ao `.env` do backend:

```env
# Asaas Payment Gateway
ASAAS_API_KEY=seu_api_key_aqui
ASAAS_SANDBOX=true  # false para produção
```

Certifique-se de que as variáveis do Supabase já estão configuradas:

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=seu_service_key_aqui
SUPABASE_ANON_KEY=seu_anon_key_aqui
```

### Passo 4: Instalar Dependências

Se necessário, instale o axios (já deve estar instalado):

```bash
cd packages/backend
npm install axios
```

### Passo 5: Configurar Webhook no Asaas

1. Acesse: **Configurações > Webhooks** no Asaas
2. Adicione nova URL de webhook:
   ```
   https://seu-backend.render.com/api/subscriptions/webhook/asaas
   ```
3. Selecione os eventos:
   - ✅ PAYMENT_CONFIRMED
   - ✅ PAYMENT_RECEIVED
   - ✅ PAYMENT_OVERDUE
4. Salve

### Passo 6: Testar no Ambiente Sandbox

#### Dados de Teste:

**Cartão de Crédito (APROVADO):**
- Número: `5162 3062 6460 0025`
- CVV: `318`
- Validade: qualquer data futura

**PIX:**
- Gera QR Code automaticamente
- No sandbox, marca como pago após 5 minutos

**Boleto:**
- Gera boleto automaticamente
- No sandbox, marque manualmente como pago

#### Fluxo de Teste:

1. Acesse: http://localhost:5173 (ou sua URL)
2. Faça login ou crie uma conta
3. Clique em "Quero ser assinante"
4. Escolha um plano
5. Selecione método de pagamento
6. Complete o pagamento (use dados de teste)
7. Aguarde webhook atualizar status
8. Verifique no Supabase se a assinatura ficou `active`

### Passo 7: Deploy em Produção

1. **Backend (Render.com):**
   - Configure as variáveis de ambiente
   - Mude `ASAAS_SANDBOX=false`
   - Use a API Key de **produção**
   - Atualize URL do webhook

2. **Frontend (Netlify):**
   - Configure a variável `VITE_API_URL`
   - Deploy automático via Git

3. **Asaas:**
   - Mude para modo produção
   - Atualize webhook URL
   - Teste com cartão real (pequeno valor)

---

## 📊 Planos Disponíveis

### Plano Manual
- **Preço:** R$ 133,90/ano (ou 12x R$ 13,90)
- **Desconto:** 20% OFF
- **Contas conectadas:** 0 (manual)
- **Recursos:**
  - Controle manual de contas
  - Categorias personalizadas
  - Relatórios completos

### Plano Conectado ⭐ (Mais Popular)
- **Preço:** R$ 249,90/ano (ou 12x R$ 29,90)
- **Desconto:** 30% OFF
- **Contas conectadas:** até 3
- **Recursos:**
  - Tudo do Plano Manual
  - Conexão via Open Finance
  - Importação automática

### Plano Conectado Plus
- **Preço:** R$ 352,90/ano (ou 12x R$ 41,90)
- **Desconto:** 30% OFF
- **Contas conectadas:** até 10
- **Recursos:**
  - Tudo do Plano Conectado
  - Multi-empresas/famílias
  - Relatórios PDF/Excel
  - Suporte dedicado 24h

---

## 🔧 Estrutura de Arquivos

```
.
├── supabase-subscription-schema.sql          # Schema do banco
├── GUIA-INTEGRACAO-PAGAMENTOS.md            # Guia detalhado
├── README-SISTEMA-PAGAMENTOS.md             # Este arquivo
│
├── packages/
│   ├── backend/
│   │   └── src/
│   │       ├── services/
│   │       │   └── asaas.service.ts         # Serviço Asaas
│   │       └── routes/
│   │           └── subscription.routes.ts    # Rotas de assinatura
│   │
│   └── frontend/
│       └── src/
│           ├── pages/
│           │   ├── Plans.tsx                # Página de planos
│           │   └── LandingPage.tsx          # Landing page
│           └── types.ts                     # Tipos TypeScript
```

---

## 🎨 Customizações Realizadas

### Design
- ✅ Cores consistentes com autenticação (azul/roxo)
- ✅ Cards modernos com animações
- ✅ Badge "MAIS POPULAR" no plano recomendado
- ✅ Imagem `banco.png` exibida
- ✅ Responsive design (mobile-friendly)

### UX
- ✅ Redirecionamento inteligente baseado em autenticação
- ✅ Mensagens claras de erro
- ✅ Loading states durante processamento
- ✅ Confirmação de método de pagamento

---

## ❓ Próximos Passos (Opcional)

1. **Melhorar seleção de método de pagamento:**
   - Criar modal elegante ao invés de `window.confirm`
   - Mostrar ícones de cartão/PIX/boleto

2. **Página de gerenciamento de assinatura:**
   - Ver histórico de pagamentos
   - Fazer upgrade/downgrade
   - Cancelar assinatura
   - Baixar faturas

3. **Notificações por email:**
   - Confirmação de assinatura
   - Lembrete de vencimento
   - Pagamento confirmado

4. **Dashboard analytics:**
   - Total de assinantes
   - Receita mensal
   - Taxa de conversão

---

## 🐛 Troubleshooting

### Erro: "Failed to create subscription"
- ✅ Verifique se `ASAAS_API_KEY` está configurada
- ✅ Verifique se está no modo correto (sandbox/produção)
- ✅ Confira logs do backend

### Webhook não está funcionando
- ✅ Verifique URL do webhook no Asaas
- ✅ Teste manualmente com cURL
- ✅ Verifique logs no Asaas Dashboard

### Assinatura não ativa após pagamento
- ✅ Verifique se webhook foi recebido
- ✅ Confira logs do servidor
- ✅ Valide eventos selecionados no Asaas

---

## 📞 Suporte

- **Asaas:** https://ajuda.asaas.com
- **Email:** suporte@asaas.com

---

**Sistema implementado com sucesso! 🎉**

Agora você tem um sistema completo de assinaturas recorrentes integrado ao Asaas, pronto para processar pagamentos reais.
