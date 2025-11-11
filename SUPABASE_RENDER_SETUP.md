# 🔐 Configuração do Supabase Auth no Render

## ⚠️ PROBLEMA ATUAL
A autenticação está falando porque o backend no Render não tem as credenciais do Supabase configuradas.

---

## 📋 Passo 1: Obter Credenciais do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto "Guru do Dindin"
3. Vá em **Settings** (⚙️ ícone de engrenagem no menu lateral)
4. Clique em **API**

### Copie estas 3 informações:

**a) Project URL**
```
Exemplo: https://xyzabcdefg.supabase.co
```
☝️ Este será o valor de `SUPABASE_URL`

**b) Project API keys → anon/public**
```
Exemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
☝️ Este será o valor de `SUPABASE_ANON_KEY`

**c) Project API keys → service_role** (⚠️ SECRETO!)
```
Exemplo: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
☝️ Este será o valor de `SUPABASE_SERVICE_ROLE_KEY`

---

## 📋 Passo 2: Configurar no Render

1. Acesse: https://dashboard.render.com/
2. Selecione seu serviço de **backend** (gurudodindin-api ou similar)
3. No menu lateral, clique em **Environment**
4. Clique em **Add Environment Variable**

### Adicione estas 3 variáveis:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | Cole a Project URL do passo 1a |
| `SUPABASE_ANON_KEY` | Cole a anon key do passo 1b |
| `SUPABASE_SERVICE_ROLE_KEY` | Cole a service_role key do passo 1c |

5. Clique em **Save Changes**

---

## 📋 Passo 3: Aguardar Deploy

Após salvar as variáveis, o Render vai automaticamente:
1. ✅ Reiniciar o serviço
2. ✅ Aplicar as novas configurações

**Aguarde 2-3 minutos** para o deploy completar.

Você pode acompanhar o progresso em:
- **Logs** (menu lateral do Render)

---

## 🎯 Passo 4: Criar Nova Conta

⚠️ **IMPORTANTE**: Como migramos de SQLite para Supabase, você precisa criar uma nova conta:

1. Acesse seu site no Netlify
2. Clique em **"Criar conta"** ou **"Registrar"**
3. Preencha:
   - Nome
   - Email
   - Senha (mínimo 6 caracteres)
4. Faça login com as novas credenciais

---

## ✅ Verificação

Se tudo estiver correto, você verá nos logs do Render:

```
🔐 Login attempt for: seu@email.com
✅ User authenticated: xxxxx-xxxx-xxxx-xxxx-xxxxxxxxx
```

---

## 🚨 Se Ainda Não Funcionar

1. **Verifique os logs do Render:**
   - Render Dashboard → Seu backend → Logs
   - Procure por mensagens de erro

2. **Verifique as variáveis:**
   - Render Dashboard → Seu backend → Environment
   - Confirme que as 3 variáveis estão lá

3. **Force um novo deploy:**
   - Render Dashboard → Seu backend
   - Clique em **Manual Deploy** → **Deploy latest commit**

---

## 📞 Suporte

Se continuar com erro, me envie:
- Print dos logs do Render
- Mensagem de erro exata que aparece no frontend
