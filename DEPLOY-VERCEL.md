# 🚀 Deploy do Guru do Dindin no Vercel (GRATUITO)

## ✨ Por que Vercel?

- ✅ **Totalmente GRATUITO** (plano Hobby)
- ✅ **Deploy em 2 minutos** - Super fácil!
- ✅ SSL/HTTPS automático
- ✅ Performance global (CDN)
- ✅ Deploy automático a cada push no GitHub
- ✅ Suporte nativo a Node.js e React
- ✅ URL grátis: `seu-app.vercel.app`
- ✅ Pode usar domínio próprio

---

## 📋 Pré-requisitos

- ✅ Conta no GitHub (gratuita)
- ✅ Código do Guru do Dindin no GitHub

---

## 🎯 Passo a Passo Completo

### **Passo 1: Criar conta no Vercel**

1. Acesse: https://vercel.com
2. Clique em **"Sign Up"** (Criar conta)
3. Escolha **"Continue with GitHub"** (Continuar com GitHub)
4. Faça login no GitHub e autorize o Vercel

### **Passo 2: Preparar o repositório**

No seu repositório GitHub, certifique-se de que está no branch correto:

```bash
# Sincronizar com o repositório
git pull origin claude/review-example-011CUs1fvaKkgh1rks31FTYi
```

### **Passo 3: Criar arquivo de configuração do Vercel**

No seu projeto local, crie um arquivo `vercel.json` na raiz:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "packages/backend/dist/index.js",
      "use": "@vercel/node"
    },
    {
      "src": "packages/frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "packages/backend/dist/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "packages/frontend/dist/$1"
    }
  ]
}
```

Commit e push:

```bash
git add vercel.json
git commit -m "Adiciona configuração do Vercel"
git push
```

### **Passo 4: Importar projeto no Vercel**

1. No Vercel, clique em **"Add New..."** → **"Project"**
2. Selecione seu repositório do GitHub
3. Clique em **"Import"**

### **Passo 5: Configurar Build Settings**

Na tela de configuração:

**Framework Preset:** `Other`

**Build & Development Settings:**
```
Build Command: npm run build:vercel
Output Directory: packages/frontend/dist
Install Command: npm install
```

**Root Directory:** deixe em branco

### **Passo 6: Adicionar variáveis de ambiente**

Clique em **"Environment Variables"** e adicione:

```
NODE_ENV = production
JWT_SECRET = [gere um secret forte - veja abaixo]
DATABASE_PATH = /tmp/database.sqlite
FRONTEND_URL = https://seu-app.vercel.app
OPEN_BANKING_PROVIDER = pluggy
PLUGGY_CLIENT_ID = 7015037f-203b-4f6c-9f9c-ca154f2c203d
PLUGGY_CLIENT_SECRET = 95d02985-474e-4067-a708-81949ac095b0
```

**Para gerar JWT_SECRET:**
No terminal local:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### **Passo 7: Deploy!**

1. Clique em **"Deploy"**
2. Aguarde 1-2 minutos
3. ✅ Pronto! Seu app está no ar!

Você receberá uma URL como:
```
https://guru-do-dindin.vercel.app
```

---

## 🌐 Conectar Domínio Próprio (Opcional)

Se você tem um domínio (ex: `gurudodindin.com`):

1. No projeto do Vercel, vá em **"Settings"** → **"Domains"**
2. Adicione seu domínio
3. Siga as instruções para configurar DNS

**Configurar no Hostgator:**
- Vá em **"Zone Editor"** ou **"DNS Management"**
- Adicione um registro:
  - Type: `CNAME`
  - Name: `@` ou `gurudodindin`
  - Value: `cname.vercel-dns.com`

---

## 📦 Scripts necessários no package.json

Adicione ao `package.json` na raiz do projeto:

```json
{
  "scripts": {
    "build:vercel": "npm install --prefix packages/backend && npm run build --prefix packages/backend && npm install --prefix packages/frontend && npm run build --prefix packages/frontend"
  }
}
```

---

## 🔧 Alternativa: Vercel CLI (mais controle)

Se preferir deploy via linha de comando:

```bash
# Instalar Vercel CLI
npm install -g vercel

# Fazer login
vercel login

# Deploy
vercel

# Deploy para produção
vercel --prod
```

---

## 🎯 Checklist Final

- [ ] Conta criada no Vercel
- [ ] Vercel conectado ao GitHub
- [ ] vercel.json criado
- [ ] Scripts de build adicionados
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] App acessível na URL do Vercel

---

## ⚠️ Limitações do Plano Gratuito

- ✅ Banda ilimitada
- ✅ 100 GB/mês de transferência
- ✅ SSL automático
- ⚠️ Banco de dados SQLite é **temporário** (reseta em cada deploy)
  - **Solução:** Usar PostgreSQL gratuito (veja seção abaixo)

---

## 🗄️ Banco de Dados Permanente (Recomendado)

O SQLite no Vercel é temporário. Para produção, use **Neon** (PostgreSQL grátis):

### **1. Criar conta no Neon**

1. Acesse: https://neon.tech
2. Crie conta (gratuito)
3. Crie um novo projeto
4. Copie a connection string

### **2. Adicionar variável no Vercel**

```
DATABASE_URL = postgresql://user:pass@host/database
```

### **3. Atualizar código para usar PostgreSQL**

(Podemos fazer isso depois se quiser produção real)

---

## 🆘 Troubleshooting

### Erro: "Build failed"
- Verifique se o script `build:vercel` está correto
- Veja os logs de build no Vercel

### Erro: "Function timeout"
- Aumente o timeout nas configurações do Vercel
- Otimize queries do banco

### Erro: "Module not found"
- Certifique-se de que todas as dependências estão no package.json
- Rode `npm install` localmente para verificar

---

## 💰 Comparação de Custos

| Serviço | Preço | Node.js | SSL | Deploy Fácil |
|---------|-------|---------|-----|--------------|
| **Vercel** | **GRÁTIS** | ✅ | ✅ | ✅ Sim |
| Hostgator Brasil | R$ 20-100/mês | ❌ Não | ✅ | ❌ Difícil |
| Railway | Grátis/$5/mês | ✅ | ✅ | ✅ Sim |
| Render | Grátis | ✅ | ✅ | ✅ Sim |

---

## 🎉 Pronto!

Agora você tem seu Guru do Dindin rodando **GRÁTIS** no Vercel com:
- ✅ HTTPS automático
- ✅ Performance global
- ✅ Deploy automático
- ✅ Zero configuração de servidor

🚀 Muito melhor que cPanel tradicional!
