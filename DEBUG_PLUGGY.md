# 🔍 Guia Rápido de Debug - Pluggy + Santander

## ⚡ TESTE RÁPIDO (5 minutos)

### **1. Sincronizar Código**

```bash
cd caminho/para/main
git pull origin claude/review-example-011CUs1fvaKkgh1rks31FTYi
npm install
```

### **2. Verificar .env**

Seu arquivo está correto! ✅

```env
OPEN_BANKING_PROVIDER=pluggy
PLUGGY_CLIENT_ID=7015037f-203b-4f6c-9f9c-ca154f2c203d
PLUGGY_CLIENT_SECRET=95d02985-474e-4067-a708-81949ac095b0
```

### **3. Rodar e Testar**

```bash
# Terminal 1 - Rodar aplicação
npm run dev

# Deixe este terminal ABERTO e VISÍVEL!
```

### **4. Acessar e Conectar**

1. Abra: http://localhost:3000/connect-bank

2. **OLHE O TERMINAL AGORA!** Você deve ver:
   ```
   [OpenBanking] Getting banks for country: BR, provider: pluggy
   [Pluggy] Fetching connectors for country: BR
   [Pluggy] Authenticating with Client ID: 7015037f...
   [Pluggy] ✅ Authentication successful!
   [Pluggy] Found 50 connectors
   ```

3. **Clique em "Santander"**

4. **Clique em "Autorizar e Conectar"**

5. **OLHE O TERMINAL DE NOVO!** Você deve ver:
   ```
   [Pluggy] Initiating auth for bank ID: 201
   [Pluggy] Creating item with connector ID: 201
   [Pluggy] ✅ Item created successfully! Item ID: xxx
   [Pluggy] Auth URL generated: https://connect.pluggy.ai?itemId=...
   ```

---

## 📋 O QUE PRECISO QUE VOCÊ ME ENVIE:

**Copie e cole TUDO que aparecer no terminal**, principalmente:

1. **Ao carregar a página `/connect-bank`:**
   - Linhas que começam com `[OpenBanking]`
   - Linhas que começam com `[Pluggy]`

2. **Ao clicar em "Autorizar e Conectar":**
   - Todas as linhas de log
   - Se der erro, copie a mensagem completa

3. **Quantos bancos aparecem na lista?**
   - Aparece Santander?
   - Aparece outros bancos brasileiros?

4. **O que acontece quando clica em conectar?**
   - Abre uma nova janela?
   - Fica na mesma página?
   - Mostra dados simulados ou reais?

---

## 🎯 Cenários Possíveis:

### **Cenário A: Logs mostram sucesso mas não redireciona**

Se você ver no terminal:
```
[Pluggy] ✅ Item created successfully!
[Pluggy] Auth URL generated: https://connect.pluggy.ai...
```

MAS não redireciona → **Problema no frontend!**

### **Cenário B: Erro de autenticação**

Se você ver:
```
[Pluggy] ❌ Error obtaining API Key: 401
```

→ **Credenciais erradas!**

### **Cenário C: Poucos bancos aparecem**

Se aparecer menos de 20 bancos → **Não está buscando da API**

### **Cenário D: Redireciona mas mostra dados simulados**

Se redireciona mas volta com dados fake → **Problema no callback**

---

## 🚨 IMPORTANTE

**NÃO feche o terminal!** Preciso ver os logs para saber exatamente o que está acontecendo.

---

## ✅ Checklist Rápido

Antes de testar, confirme:

- [ ] Rodou `git pull`
- [ ] Rodou `npm install`
- [ ] Arquivo `.env` tem `OPEN_BANKING_PROVIDER=pluggy`
- [ ] Terminal está aberto e visível
- [ ] Acessou http://localhost:3000/connect-bank

---

**Me envie os logs do terminal e as respostas! 🔍**
