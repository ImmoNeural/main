# 🚀 Deploy do Guru do Dindin no cPanel

## 📋 Pré-requisitos

- ✅ cPanel com **Node.js habilitado** (Node.js Selector)
- ✅ Acesso **SSH** ou **Terminal** no cPanel
- ✅ Domínio ou subdomínio configurado (ex: `gurudodindin.seudominio.com`)

---

## 🎯 Método 1: Deploy com Node.js Selector (Recomendado)

### **Passo 1: Preparar os arquivos**

Na sua máquina local, execute:

```bash
# 1. Build do frontend
cd packages/frontend
npm install
npm run build

# 2. Build do backend
cd ../backend
npm install
npm run build
```

### **Passo 2: Estrutura de pastas no cPanel**

Crie esta estrutura no seu cPanel (via File Manager ou FTP):

```
public_html/
└── gurudodindin/
    ├── backend/
    │   ├── dist/           (código compilado do backend)
    │   ├── node_modules/   (será instalado via npm)
    │   ├── data/           (banco de dados SQLite)
    │   ├── package.json
    │   └── .env
    └── frontend/
        └── dist/           (build do React)
```

### **Passo 3: Upload dos arquivos**

**Via FTP/File Manager:**
1. Faça upload de `packages/backend/dist/*` → `gurudodindin/backend/dist/`
2. Faça upload de `packages/backend/package.json` → `gurudodindin/backend/`
3. Faça upload de `packages/frontend/dist/*` → `gurudodindin/frontend/dist/`

### **Passo 4: Configurar Node.js no cPanel**

1. No cPanel, vá em **"Setup Node.js App"**
2. Clique em **"Create Application"**
3. Configure:
   - **Node.js Version:** 18.x ou superior
   - **Application Mode:** Production
   - **Application Root:** `gurudodindin/backend`
   - **Application URL:** seu domínio (ex: `gurudodindin.seudominio.com`)
   - **Application Startup File:** `dist/index.js`
   - **Environment Variables:**
     ```
     PORT=3001
     NODE_ENV=production
     DATABASE_PATH=./data/database.sqlite
     FRONTEND_URL=https://gurudodindin.seudominio.com
     JWT_SECRET=seu-secret-super-seguro-aqui
     OPEN_BANKING_PROVIDER=pluggy
     PLUGGY_CLIENT_ID=seu-client-id
     PLUGGY_CLIENT_SECRET=seu-client-secret
     ```
4. Clique em **"Create"**

### **Passo 5: Instalar dependências**

No Terminal SSH ou cPanel Terminal:

```bash
cd ~/gurudodindin/backend
npm install --production
```

### **Passo 6: Configurar servidor para servir frontend + backend**

Crie um arquivo `.htaccess` em `public_html/gurudodindin/`:

```apache
# Redirecionar API para backend Node.js
RewriteEngine On

# API requests vão para Node.js (porta 3001)
RewriteCond %{REQUEST_URI} ^/api/
RewriteRule ^(.*)$ http://localhost:3001/$1 [P,L]

# Todas as outras rotas servem o frontend
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /frontend/dist/index.html [L]
</apache>
```

### **Passo 7: Iniciar a aplicação**

No cPanel → **Setup Node.js App** → Clique em **"Start App"**

---

## 🎯 Método 2: Deploy Manual (SSH)

### **Passo 1: Conectar via SSH**

```bash
ssh seu-usuario@seu-dominio.com
```

### **Passo 2: Clonar repositório (se estiver no GitHub)**

```bash
cd ~/public_html
git clone https://github.com/seu-usuario/guru-do-dindin.git
cd guru-do-dindin
```

### **Passo 3: Instalar e buildar**

```bash
# Backend
cd packages/backend
npm install --production
npm run build

# Frontend
cd ../frontend
npm install
npm run build

cd ../..
```

### **Passo 4: Configurar variáveis de ambiente**

```bash
cd packages/backend
cp .env.example .env
nano .env
```

Edite o arquivo `.env`:

```env
PORT=3001
NODE_ENV=production
DATABASE_PATH=./data/database.sqlite
FRONTEND_URL=https://seu-dominio.com
JWT_SECRET=gere-um-secret-forte-aqui
OPEN_BANKING_PROVIDER=pluggy
PLUGGY_CLIENT_ID=seu-client-id
PLUGGY_CLIENT_SECRET=seu-client-secret
```

### **Passo 5: Usar PM2 para manter app rodando**

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
cd ~/public_html/guru-do-dindin/packages/backend
pm2 start dist/index.js --name guru-do-dindin

# Salvar configuração
pm2 save

# Auto-start no boot
pm2 startup
```

---

## 🎯 Método 3: Deploy Simplificado (App Única)

Crie um arquivo `server-production.js` na raiz do projeto:

```javascript
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Importar backend
const backendApp = require('./packages/backend/dist/index.js');

// API routes
app.use('/api', backendApp);

// Servir frontend estático
app.use(express.static(path.join(__dirname, 'packages/frontend/dist')));

// SPA fallback - todas as rotas retornam index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'packages/frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Guru do Dindin rodando em http://localhost:${PORT}`);
});
```

Depois faça upload de tudo e rode:

```bash
node server-production.js
```

---

## 📝 Checklist Final

- [ ] Node.js configurado no cPanel (versão 18+)
- [ ] Frontend buildado e uploaded
- [ ] Backend buildado e uploaded
- [ ] Variáveis de ambiente configuradas (.env)
- [ ] Dependências instaladas (npm install)
- [ ] Aplicação iniciada (Start App ou PM2)
- [ ] .htaccess configurado para proxy API
- [ ] Domínio/subdomínio apontando para a pasta correta
- [ ] Banco de dados SQLite com permissões corretas
- [ ] SSL/HTTPS configurado (Let's Encrypt no cPanel)

---

## 🔧 Troubleshooting

### Erro: "Cannot find module"
```bash
cd ~/gurudodindin/backend
npm install --production
```

### Erro: "Permission denied" no database
```bash
cd ~/gurudodindin/backend
mkdir -p data
chmod 755 data
```

### App não inicia
```bash
# Ver logs
cd ~/gurudodindin/backend
pm2 logs guru-do-dindin
```

### API retorna 404
Verifique o `.htaccess` e confirme que o proxy está funcionando:
```bash
curl http://localhost:3001/api/health
```

---

## 🌐 Configurar Domínio

1. No cPanel → **Domains** → **Create New Domain**
2. Digite: `gurudodindin.seudominio.com`
3. Document Root: `/public_html/gurudodindin/frontend/dist`
4. Habilite **SSL/TLS** (Let's Encrypt)

---

## 🔒 Segurança

1. **Gere um JWT_SECRET forte:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. **Configure HTTPS:**
No cPanel → **SSL/TLS Status** → Instale certificado Let's Encrypt

3. **Proteja o .env:**
```bash
chmod 600 ~/gurudodindin/backend/.env
```

---

## 📞 Suporte

Se precisar de ajuda, verifique:
- Logs do cPanel: **Errors** → **Error Log**
- Logs do Node.js: **Setup Node.js App** → **View Logs**
- Logs do PM2: `pm2 logs guru-do-dindin`

---

🎉 **Pronto!** Seu Guru do Dindin está no ar! 🚀
