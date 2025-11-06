# Configuração Open Banking - Conectar com Bancos Reais

Este guia explica como conectar seu Deutsche Bank (ou outro banco europeu) ao dashboard usando Open Banking.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Opção 1: GoCardless/Nordigen (Recomendado)](#opção-1-gocardlessnordigen-recomendado)
3. [Opção 2: Tink](#opção-2-tink)
4. [Configuração do Projeto](#configuração-do-projeto)
5. [Testando a Conexão](#testando-a-conexão)
6. [Solução de Problemas](#solução-de-problemas)

---

## Visão Geral

O dashboard suporta três modos de operação:

- **Mock Mode**: Dados simulados para desenvolvimento (padrão)
- **Nordigen Mode**: Usando GoCardless/Nordigen (gratuito)
- **Tink Mode**: Usando Tink (pago, mas muito popular)

## Opção 1: GoCardless/Nordigen (Recomendado)

**✨ Por que escolher Nordigen:**
- ✅ **Gratuito** para uso pessoal
- ✅ Excelente cobertura de bancos europeus
- ✅ Suporta Deutsche Bank, Commerzbank, Sparkasse, N26, ING, etc.
- ✅ Fácil de configurar
- ✅ API bem documentada

### Passo 1: Criar Conta no GoCardless

1. Acesse: https://bankaccountdata.gocardless.com/
2. Clique em **"Sign Up"** no canto superior direito
3. Preencha os dados:
   - Nome
   - Email
   - Senha
4. Confirme seu email

### Passo 2: Obter Credenciais

1. Faça login no [Portal de Desenvolvimento](https://bankaccountdata.gocardless.com/user-secrets/)
2. Você verá duas credenciais:
   - **Secret ID** (exemplo: `abc123-def456-ghi789`)
   - **Secret Key** (exemplo: `live_xyz789...`)
3. **IMPORTANTE**: Copie e guarde essas credenciais em local seguro!

### Passo 3: Configurar o Projeto

1. Navegue até a pasta do backend:
   ```bash
   cd packages/backend
   ```

2. Crie um arquivo `.env` (se não existir):
   ```bash
   cp .env.example .env
   ```

3. Edite o arquivo `.env` e configure:
   ```env
   # Escolha o provedor Nordigen
   OPEN_BANKING_PROVIDER=nordigen

   # Cole suas credenciais do GoCardless
   NORDIGEN_SECRET_ID=seu_secret_id_aqui
   NORDIGEN_SECRET_KEY=seu_secret_key_aqui

   # Mantenha o redirect URI
   OPEN_BANKING_REDIRECT_URI=http://localhost:3000/bank/callback
   ```

### Passo 4: Registrar Bancos (Opcional)

O Nordigen não requer registro prévio de bancos. Você pode conectar qualquer banco europeu suportado imediatamente!

### Passo 5: Testar

```bash
# Da raiz do projeto
npm run dev
```

1. Acesse: http://localhost:3000
2. Clique em **"Conectar Banco"**
3. Selecione **"Deutsche Bank"**
4. Você será redirecionado para o Deutsche Bank
5. Faça login com suas credenciais reais
6. Autorize o acesso
7. Será redirecionado de volta com seus dados reais!

---

## Opção 2: Tink

**✨ Por que escolher Tink:**
- ✅ Muito popular e confiável
- ✅ Interface de usuário polida
- ✅ Boa documentação
- ❌ Pago (mas tem trial gratuito)

### Passo 1: Criar Conta no Tink

1. Acesse: https://console.tink.com/
2. Clique em **"Sign Up"**
3. Preencha os dados e crie uma conta

### Passo 2: Criar uma Aplicação

1. No [Tink Console](https://console.tink.com/), clique em **"Create new app"**
2. Preencha:
   - **App name**: "Bank Dashboard" (ou qualquer nome)
   - **Description**: "Dashboard de gastos pessoais"
3. Clique em **"Create"**

### Passo 3: Configurar a Aplicação

1. Na sua aplicação, vá em **"App settings"**
2. Em **"Redirect URIs"**, adicione:
   ```
   http://localhost:3000/bank/callback
   ```
3. Salve as alterações

### Passo 4: Obter Credenciais

1. Na aba **"Credentials"**, você verá:
   - **Client ID** (exemplo: `abc123def456...`)
   - **Client Secret** (clique para revelar)
2. Copie ambos

### Passo 5: Configurar Permissões

1. Na aba **"User scopes"**, habilite:
   - ✅ `accounts:read`
   - ✅ `transactions:read`
   - ✅ `user:read`
2. Salve as alterações

### Passo 6: Configurar o Projeto

1. Edite o arquivo `packages/backend/.env`:
   ```env
   # Escolha o provedor Tink
   OPEN_BANKING_PROVIDER=tink

   # Cole suas credenciais do Tink
   TINK_CLIENT_ID=seu_client_id_aqui
   TINK_CLIENT_SECRET=seu_client_secret_aqui
   TINK_API_URL=https://api.tink.com

   # Mantenha o redirect URI
   OPEN_BANKING_REDIRECT_URI=http://localhost:3000/bank/callback
   ```

### Passo 7: Testar

```bash
npm run dev
```

Acesse http://localhost:3000 e conecte seu banco!

---

## Configuração do Projeto

### Estrutura de Arquivos

```
packages/
├── backend/
│   ├── .env                          # Suas configurações (NÃO commitar!)
│   ├── .env.example                  # Template de configuração
│   └── src/
│       └── services/
│           ├── openBanking.service.ts      # Serviço principal
│           └── providers/
│               ├── nordigen.service.ts     # Implementação Nordigen
│               ├── tink.service.ts         # Implementação Tink
│               └── provider.factory.ts     # Factory de provedores
└── frontend/
    └── src/
        └── pages/
            └── ConnectBank.tsx       # Interface de conexão
```

### Variáveis de Ambiente Completas

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./data/database.sqlite

# Open Banking - Escolha um provedor
OPEN_BANKING_PROVIDER=nordigen  # ou 'tink' ou 'mock'

# Redirect URI
OPEN_BANKING_REDIRECT_URI=http://localhost:3000/bank/callback

# GoCardless/Nordigen
NORDIGEN_SECRET_ID=seu_secret_id
NORDIGEN_SECRET_KEY=seu_secret_key

# Tink
TINK_CLIENT_ID=seu_client_id
TINK_CLIENT_SECRET=seu_client_secret
TINK_API_URL=https://api.tink.com

# Security
SESSION_SECRET=change_this_in_production
JWT_SECRET=change_this_in_production

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

---

## Testando a Conexão

### 1. Modo Mock (Desenvolvimento)

```env
OPEN_BANKING_PROVIDER=mock
```

- Usa dados simulados
- Não precisa de credenciais
- Perfeito para desenvolvimento

### 2. Conectar Deutsche Bank

1. Configure o provedor (Nordigen ou Tink)
2. Inicie o servidor:
   ```bash
   npm run dev
   ```
3. Acesse: http://localhost:3000/connect-bank
4. Selecione "Deutsche Bank"
5. Será redirecionado para o site do Deutsche Bank
6. Faça login com suas credenciais REAIS
7. Autorize o acesso às suas contas
8. Será redirecionado de volta
9. Suas contas e transações reais aparecerão no dashboard!

### 3. Verificar Dados

Após conectar, você verá:

- ✅ Saldo real da sua conta
- ✅ Transações dos últimos 90 dias
- ✅ Categorização automática de gastos
- ✅ Gráficos e análises baseados em dados reais

---

## Solução de Problemas

### Erro: "Failed to authenticate with Nordigen"

**Causa**: Credenciais inválidas

**Solução**:
1. Verifique se copiou corretamente o `NORDIGEN_SECRET_ID` e `NORDIGEN_SECRET_KEY`
2. Certifique-se de não ter espaços extras nas variáveis
3. Regenere as credenciais no portal do GoCardless

### Erro: "No accounts found"

**Causa**: Autorização não completada ou banco não suportado

**Solução**:
1. Verifique se completou o processo de autorização no banco
2. Confirme que seu banco está na lista de instituições suportadas
3. Tente reconectar a conta

### Erro: "Redirect URI mismatch"

**Causa**: URI de redirecionamento não configurado no provedor

**Solução**:
1. **Nordigen**: Não precisa registrar URI (funciona automaticamente)
2. **Tink**: Adicione `http://localhost:3000/bank/callback` nas configurações da aplicação

### Banco não aparece na lista

**Solução**:
1. Verifique se seu banco está disponível no provedor:
   - Nordigen: https://bankaccountdata.gocardless.com/institutions/
   - Tink: https://console.tink.com/providers
2. Se o banco não estiver listado, escolha outro provedor

### Conexão expira rapidamente

**Causa**: Token ou consent expirado

**Solução**:
1. Nordigen: Consentimentos duram 90 dias
2. Tink: Consentimentos duram 90 dias
3. Reconecte a conta quando expirar
4. Implemente refresh automático (TODO futuro)

---

## Produção

### Checklist para Deploy

- [ ] Use HTTPS para o redirect URI
- [ ] Configure URLs de produção no provedor
- [ ] Use variáveis de ambiente seguras
- [ ] Não commite o arquivo `.env`
- [ ] Adicione `.env` ao `.gitignore`
- [ ] Configure backup do banco de dados
- [ ] Implemente logging adequado
- [ ] Configure rate limiting
- [ ] Adicione monitoramento de erros

### URLs de Produção

```env
# Exemplo para produção
OPEN_BANKING_REDIRECT_URI=https://seu-dominio.com/bank/callback
FRONTEND_URL=https://seu-dominio.com
```

---

## Recursos Adicionais

### Documentação Oficial

- **GoCardless/Nordigen**: https://developer.gocardless.com/bank-account-data/
- **Tink**: https://docs.tink.com/

### Bancos Suportados

#### Nordigen (principais na Alemanha)
- Deutsche Bank
- Commerzbank
- Sparkasse
- ING-DiBa
- N26
- DKB
- Postbank
- Comdirect
- Santander
- E muitos outros...

#### Tink (principais na Alemanha)
- Deutsche Bank
- Commerzbank
- Sparkasse
- ING-DiBa
- N26
- DKB
- E muitos outros...

### Suporte

Se tiver problemas:
1. Verifique os logs do backend: `packages/backend/logs/`
2. Verifique o console do navegador (F12)
3. Consulte a documentação oficial do provedor
4. Abra uma issue no GitHub do projeto

---

## Próximos Passos

Após conectar com sucesso:

1. ✅ Explore o dashboard com seus dados reais
2. ✅ Configure categorias personalizadas
3. ✅ Analise seus gastos mensais
4. ✅ Conecte múltiplas contas bancárias
5. ✅ Configure alertas de gastos (TODO)
6. ✅ Exporte relatórios (TODO)

**Aproveite seu dashboard bancário! 🎉**
