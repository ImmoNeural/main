# 🔧 Como Configurar o Pluggy no Render

## ❌ Problema
Os bancos simulados aparecem ao invés dos bancos reais da API do Pluggy.

## ✅ Solução
Configurar as variáveis de ambiente no Render.

---

## 📋 Passo a Passo

### 1️⃣ Obter Credenciais do Pluggy

1. Acesse: https://dashboard.pluggy.ai/signup
2. Crie uma conta (se ainda não tiver)
3. Crie uma aplicação
4. Copie:
   - **Client ID** (vai aparecer algo como: `abc123...`)
   - **Client Secret** (vai aparecer algo como: `def456...`)

---

### 2️⃣ Configurar no Render

1. Acesse o **Render Dashboard**: https://dashboard.render.com/
2. Clique no seu serviço **gurudodindin-api** (backend)
3. Vá em **"Environment"** (menu lateral esquerdo)
4. Clique em **"Add Environment Variable"**
5. Adicione **3 variáveis**:

#### ✅ Variável 1: OPEN_BANKING_PROVIDER
```
Key:   OPEN_BANKING_PROVIDER
Value: pluggy
```

#### ✅ Variável 2: PLUGGY_CLIENT_ID
```
Key:   PLUGGY_CLIENT_ID
Value: [Cole aqui o Client ID que você copiou do Pluggy]
```

#### ✅ Variável 3: PLUGGY_CLIENT_SECRET
```
Key:   PLUGGY_CLIENT_SECRET
Value: [Cole aqui o Client Secret que você copiou do Pluggy]
```

6. Clique em **"Save Changes"**
7. O Render vai **reiniciar o serviço automaticamente**

---

## 🔍 Como Verificar se Funcionou

Após salvar as variáveis:

1. Espere o Render terminar de reiniciar (1-2 minutos)
2. Acesse os **logs do Render** (aba "Logs")
3. Procure por:

```
🏦 GET /api/bank/available - LISTA DE BANCOS
🔧 OPEN_BANKING_PROVIDER: pluggy
🔑 PLUGGY_CLIENT_ID: SET
🔑 PLUGGY_CLIENT_SECRET: SET
```

Se aparecer **"SET"** nas duas últimas linhas, está correto! ✅

---

## 🎯 Testando

1. Acesse a página **"Conectar Banco"** no app
2. Você deve ver os **bancos brasileiros reais** (Santander, Itaú, Bradesco, etc.)
3. Não deve aparecer mais "MODO DEMONSTRAÇÃO"

---

## ⚠️ Importante

- As credenciais do Pluggy são **gratuitas** para até 100 conexões/mês
- Nunca compartilhe o **Client Secret** publicamente
- Se os bancos ainda não aparecerem, veja os logs e me envie

---

## 📞 Suporte

Se os bancos ainda não aparecerem depois de configurar:
1. Veja os **logs do Render**
2. Procure por erros relacionados ao Pluggy
3. Me envie os logs para eu analisar
