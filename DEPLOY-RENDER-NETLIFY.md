# 🚀 Deploy Completo - Backend (Render) + Frontend (Netlify)

Este guia mostra como fazer deploy GRATUITO do seu app completo.

## 📋 Pré-requisitos

- Conta no GitHub (já tem ✅)
- Conta no Render.com (criar grátis em https://render.com)
- Conta no Netlify (já tem ✅)

---

## 🎯 PASSO 1: Deploy do Backend no Render

### 1.1 Criar conta no Render
1. Acesse https://render.com
2. Clique em **"Get Started"**
3. Faça login com GitHub (mais fácil)

### 1.2 Criar Web Service
1. No dashboard do Render, clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub
3. Selecione o repositório `ImmoNeural/main`
4. Configure:
   - **Name**: `gurudodindin-api` (ou outro nome)
   - **Region**: `Oregon (US West)` (ou mais próximo)
   - **Branch**: `claude/review-example-011CUs1fvaKkgh1rks31FTYi` (ou `main` depois do merge)
   - **Root Directory**: deixe em branco
   - **Runtime**: `Node`
   - **Build Command**:
     ```
     cd packages/backend && npm install && npm run build && npm run migrate
     ```
   - **Start Command**:
     ```
     cd packages/backend && npm start
     ```
   - **Plan**: `Free`

### 1.3 Configurar Variáveis de Ambiente

Na seção **Environment Variables**, adicione:

```
NODE_ENV=production
PORT=3001
DATABASE_PATH=./data/database.sqlite
OPEN_BANKING_PROVIDER=mock
FRONTEND_URL=https://seu-site.netlify.app
OPEN_BANKING_REDIRECT_URI=https://seu-site.netlify.app/bank/callback
```

**Importante**: O Render vai gerar automaticamente `JWT_SECRET` e `SESSION_SECRET` se você adicionar essas variáveis sem valor (use o botão "Generate").

### 1.4 Deploy!

1. Clique em **"Create Web Service"**
2. Aguarde o deploy (leva ~3-5 minutos)
3. Anote a URL do backend (algo como: `https://gurudodindin-api.onrender.com`)

---

## 🎨 PASSO 2: Atualizar Frontend para usar o Backend

### 2.1 Atualizar variáveis de ambiente do Netlify

No painel do Netlify:
1. Vá em **Site settings** → **Environment variables**
2. Adicione:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://gurudodindin-api.onrender.com/api` (substitua pela SUA URL do Render)

### 2.2 OU atualizar o netlify.toml

Edite o arquivo `netlify.toml` e mude a linha do redirect da API:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://gurudodindin-api.onrender.com/api/:splat"
  status = 200
```

### 2.3 Redeploy do Frontend

No Netlify:
1. Vá em **Deploys**
2. Clique em **Trigger deploy** → **Deploy site**

---

## ✅ PASSO 3: Testar!

1. Acesse seu site no Netlify (ex: `https://seu-site.netlify.app`)
2. Tente criar uma conta
3. Faça login
4. Teste conectar um banco (modo demo)

---

## 🔧 Troubleshooting

### Backend não inicia no Render
- Verifique os logs em **Logs** no painel do Render
- Certifique-se que todas as variáveis de ambiente estão configuradas

### Frontend não conecta com Backend
- Verifique o console do navegador (F12 → Console)
- Confirme que a URL do backend está correta
- Verifique se o CORS está configurado no backend

### CORS Error
O backend já está configurado para aceitar requisições do frontend. Se houver erro:
1. Vá no código do backend em `packages/backend/src/app.ts`
2. Verifique se `FRONTEND_URL` está correto nas variáveis de ambiente

---

## 💰 Custos

- **Render Free Tier**: 750 horas/mês GRÁTIS
- **Netlify Free Tier**: 100 GB bandwidth/mês GRÁTIS
- **Total**: R$ 0,00 💰

---

## 📝 Próximos Passos

Depois que tudo funcionar:

1. **Fazer merge do branch para main**:
   ```bash
   git checkout main
   git merge claude/review-example-011CUs1fvaKkgh1rks31FTYi
   git push origin main
   ```

2. **Configurar Netlify e Render para usar branch main**

3. **Configurar Open Banking real** (se quiser usar bancos reais):
   - Pluggy para bancos brasileiros
   - Nordigen para bancos europeus

---

## 🆘 Precisa de ajuda?

Me chame e vou te ajudar! 🚀
