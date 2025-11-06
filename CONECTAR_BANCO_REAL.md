# 🏦 Como Conectar Seu Banco Real (Deutsche Bank)

Guia rápido e simples para conectar sua conta bancária real ao dashboard.

---

## 📋 Resumo do Processo

1. Criar conta gratuita no GoCardless (5 minutos)
2. Copiar suas credenciais
3. Editar **1 arquivo** no seu PC (`.env`)
4. Reiniciar a aplicação
5. Conectar seu banco! 🎉

**Tempo total: ~10 minutos**

---

## 🚀 Passo a Passo

### **Passo 1: Criar Conta no GoCardless (Gratuito)**

1. **Acesse:** https://bankaccountdata.gocardless.com/

2. **Clique em "Sign Up"** (canto superior direito)

3. **Preencha o formulário:**
   - Nome
   - Email
   - Senha
   - Clique em "Create Account"

4. **Confirme seu email:**
   - Abra o email que você recebeu
   - Clique no link de confirmação

5. **Faça login:** https://bankaccountdata.gocardless.com/login/

### **Passo 2: Obter Suas Credenciais**

1. **Após fazer login, vá para:**
   https://bankaccountdata.gocardless.com/user-secrets/

2. **Você verá duas credenciais importantes:**

   ```
   Secret ID:  abc123-def456-ghi789-jkl012
   Secret Key: live_xyz789abc123def456ghi789jkl012mno345pqr678stu901
   ```

3. **IMPORTANTE: Copie e guarde essas credenciais!**
   - Clique no ícone de "copiar" ao lado de cada uma
   - Cole em um arquivo de texto temporário
   - Você vai precisar delas no próximo passo

⚠️ **NUNCA compartilhe essas credenciais com ninguém!**

---

## ⚙️ Passo 3: Configurar a Aplicação

### **3.1: Localize o arquivo `.env`**

O arquivo está em:
```
main/packages/backend/.env
```

**Como abrir:**

**Opção A - VSCode (recomendado):**
1. Abra a pasta `main` no VSCode
2. No Explorer lateral, navegue até: `packages` → `backend` → `.env`
3. Clique para abrir

**Opção B - Editor de texto:**
- **Windows**: Clique com botão direito → Abrir com → Notepad
- **Mac**: Clique com botão direito → Abrir com → TextEdit
- **Linux**: Clique com botão direito → Abrir com → gedit

⚠️ **ATENÇÃO:** Se o arquivo `.env` não existir, crie ele:

```bash
# No terminal, na pasta do projeto:
cp packages/backend/.env.example packages/backend/.env
```

### **3.2: Editar o arquivo `.env`**

Você verá algo assim:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_PATH=./data/database.sqlite

# Open Banking Configuration
OPEN_BANKING_PROVIDER=mock  # ← MUDE ESTA LINHA

# Redirect URI (deve estar registrado no provedor)
OPEN_BANKING_REDIRECT_URI=http://localhost:3000/bank/callback

# GoCardless/Nordigen (Gratuito - Recomendado para Europa)
NORDIGEN_SECRET_ID=your_nordigen_secret_id      # ← MUDE ESTA LINHA
NORDIGEN_SECRET_KEY=your_nordigen_secret_key    # ← MUDE ESTA LINHA

# Tink (Popular na Europa)
TINK_CLIENT_ID=your_tink_client_id
TINK_CLIENT_SECRET=your_tink_client_secret
TINK_API_URL=https://api.tink.com

# Security
SESSION_SECRET=change_this_in_production
JWT_SECRET=change_this_in_production

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### **3.3: Fazer as 3 mudanças necessárias:**

**Mudança 1 - Trocar de mock para nordigen:**
```env
# ANTES:
OPEN_BANKING_PROVIDER=mock

# DEPOIS:
OPEN_BANKING_PROVIDER=nordigen
```

**Mudança 2 - Colar seu Secret ID:**
```env
# ANTES:
NORDIGEN_SECRET_ID=your_nordigen_secret_id

# DEPOIS (cole o Secret ID que você copiou):
NORDIGEN_SECRET_ID=abc123-def456-ghi789-jkl012
```

**Mudança 3 - Colar seu Secret Key:**
```env
# ANTES:
NORDIGEN_SECRET_KEY=your_nordigen_secret_key

# DEPOIS (cole o Secret Key que você copiou):
NORDIGEN_SECRET_KEY=live_xyz789abc123def456ghi789jkl012mno345pqr678stu901
```

**Exemplo de como deve ficar:**
```env
# Open Banking Configuration
OPEN_BANKING_PROVIDER=nordigen

# GoCardless/Nordigen
NORDIGEN_SECRET_ID=abc123-def456-ghi789-jkl012
NORDIGEN_SECRET_KEY=live_xyz789abc123def456ghi789jkl012mno345pqr678stu901
```

### **3.4: Salvar o arquivo**

- **VSCode**: Ctrl+S (Windows/Linux) ou Cmd+S (Mac)
- **Notepad/TextEdit**: Arquivo → Salvar

---

## 🔄 Passo 4: Reiniciar a Aplicação

### **4.1: Parar a aplicação (se estiver rodando)**

No terminal onde a aplicação está rodando, aperte:
```
Ctrl + C
```

### **4.2: Rodar novamente**

```bash
npm run dev
```

Aguarde aparecer:
```
[0] 🚀 Server running on http://localhost:3001
[1] ➜  Local:   http://localhost:3000/
```

---

## 🏦 Passo 5: Conectar Seu Banco Real!

### **5.1: Abra no navegador**
```
http://localhost:3000/connect-bank
```

### **5.2: Selecione seu banco**

Você verá uma lista de bancos. Clique em **"Deutsche Bank"**

(Ou qualquer outro banco alemão: Sparkasse, N26, ING, Commerzbank, etc.)

### **5.3: Leia as permissões**

Você verá uma tela explicando o que a aplicação vai acessar:
- ✅ Ver informações da conta (saldo, IBAN)
- ✅ Ver transações (últimos 90 dias)
- ✅ Acesso por 90 dias

### **5.4: Clique em "Autorizar e Conectar"**

### **5.5: Você será redirecionado para o Deutsche Bank**

⚠️ **IMPORTANTE:** Agora você será redirecionado para o site **REAL** do Deutsche Bank!

1. **Faça login** com suas credenciais do banco (usuário e senha normais)
2. **Selecione a conta** que quer conectar
3. **Autorize o acesso** (clique em confirmar/aceitar)
4. **Você será redirecionado de volta** para o dashboard

### **5.6: Sucesso! 🎉**

Você verá:
- ✅ Sua conta bancária real listada
- ✅ Saldo real da sua conta
- ✅ Transações reais dos últimos 90 dias
- ✅ Gráficos com seus gastos reais
- ✅ Categorização automática das suas despesas

---

## 🔒 Segurança

### **É seguro?**

✅ **SIM!** Aqui está o porquê:

1. **Open Banking é regulamentado pela União Europeia (PSD2)**
   - É uma lei que garante segurança
   - Bancos são obrigados a oferecer acesso seguro

2. **GoCardless é uma empresa confiável:**
   - Registrada e regulamentada
   - Usada por milhares de empresas
   - Não armazena suas credenciais bancárias

3. **Você faz login direto no site do banco:**
   - A aplicação NUNCA vê sua senha do banco
   - Login acontece no site oficial do Deutsche Bank
   - É o mesmo processo que aplicativos como N26, Revolut usam

4. **Acesso apenas de leitura:**
   - A aplicação SÓ pode VER seus dados
   - NÃO pode fazer transferências
   - NÃO pode alterar nada na sua conta

5. **Você controla tudo:**
   - Pode revogar acesso a qualquer momento
   - Acesso expira em 90 dias
   - Você escolhe qual conta conectar

### **O que o GoCardless pode ver?**

- ✅ Saldo da conta
- ✅ Transações dos últimos 90 dias
- ✅ Nome da conta, IBAN, moeda

### **O que o GoCardless NÃO pode ver ou fazer?**

- ❌ Não pode fazer transferências
- ❌ Não pode alterar dados
- ❌ Não tem acesso à sua senha
- ❌ Não pode deletar nada
- ❌ Não pode criar pagamentos

---

## 🔄 Como Revogar o Acesso

Se quiser desconectar a conta depois:

### **Opção 1 - Pelo Dashboard:**
1. Vá em "Contas" (http://localhost:3000/accounts)
2. Clique no ícone de lixeira na conta
3. Confirme

### **Opção 2 - Pelo GoCardless:**
1. Acesse: https://bankaccountdata.gocardless.com/
2. Vá em "Requisitions"
3. Delete a requisição

### **Opção 3 - Pelo Banco:**
1. Faça login no Deutsche Bank
2. Vá em Configurações > Autorizações de Terceiros
3. Revogue o acesso ao GoCardless

---

## ❓ Perguntas Frequentes

### **P: Preciso pagar algo?**
**R:** Não! GoCardless é gratuito para uso pessoal.

### **P: Meus dados ficam salvos onde?**
**R:** No seu computador, em um arquivo SQLite local (`packages/backend/data/database.sqlite`). Nada vai para a internet.

### **P: Posso conectar múltiplas contas?**
**R:** Sim! Conecte quantas quiser. Pode ter contas de bancos diferentes.

### **P: E se eu mudar de ideia depois?**
**R:** É só voltar para modo mock:
```env
OPEN_BANKING_PROVIDER=mock
```

### **P: Os dados são atualizados automaticamente?**
**R:** Sim! Mas você também pode clicar em "Sincronizar" para atualizar manualmente.

### **P: Funciona com outros bancos?**
**R:** Sim! Funciona com:
- Deutsche Bank
- Sparkasse
- Commerzbank
- N26
- ING
- DKB
- Postbank
- Revolut
- E muitos outros bancos europeus

### **P: E se der erro?**
**R:**
1. Verifique se copiou as credenciais corretamente
2. Certifique-se que não há espaços extras
3. Tente gerar novas credenciais no GoCardless
4. Me pergunte! Vou te ajudar

### **P: Preciso deixar a aplicação rodando sempre?**
**R:** Não! Os dados ficam salvos localmente. Pode fechar e abrir quando quiser.

### **P: O que acontece depois de 90 dias?**
**R:** O acesso expira. Você precisa reconectar a conta (mesmo processo, leva 1 minuto).

---

## 🎯 Resumo Visual

```
Você → GoCardless → Deutsche Bank
         ↓
    Seu Dashboard
   (no seu PC)
```

1. Você usa credenciais do GoCardless
2. GoCardless se conecta ao Deutsche Bank (com sua autorização)
3. Dados vêm para seu dashboard local
4. Tudo fica salvo no SEU computador

---

## 📱 Próximos Passos

Depois de conectar:

1. ✅ Explore o dashboard com seus dados reais
2. ✅ Veja seus gastos por categoria
3. ✅ Analise seus padrões de consumo
4. ✅ Configure categorias personalizadas
5. ✅ Conecte outras contas se quiser

---

## 🆘 Precisa de Ajuda?

Se tiver qualquer problema:
1. Verifique se as credenciais estão corretas (sem espaços extras)
2. Certifique-se que mudou `OPEN_BANKING_PROVIDER=nordigen`
3. Veja os logs no terminal (onde rodou `npm run dev`)
4. Me pergunte! Estou aqui para ajudar

---

**Boa sorte! Em 10 minutos você terá seu banco real conectado! 🚀**
