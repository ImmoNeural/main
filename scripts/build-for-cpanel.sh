#!/bin/bash

# Script para preparar build para cPanel
# Execute: chmod +x scripts/build-for-cpanel.sh && ./scripts/build-for-cpanel.sh

set -e

echo "🚀 Preparando Guru do Dindin para deploy no cPanel..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Limpar builds anteriores
echo -e "${BLUE}📁 Limpando builds anteriores...${NC}"
rm -rf cpanel-deploy
mkdir -p cpanel-deploy

# 2. Build do Frontend
echo -e "${BLUE}📦 Buildando frontend...${NC}"
cd packages/frontend
npm install
npm run build
cd ../..

# 3. Build do Backend
echo -e "${BLUE}📦 Buildando backend...${NC}"
cd packages/backend
npm install
npm run build
cd ../..

# 4. Criar estrutura de deploy
echo -e "${BLUE}📂 Criando estrutura de deploy...${NC}"

# Backend
mkdir -p cpanel-deploy/backend/dist
mkdir -p cpanel-deploy/backend/data
cp -r packages/backend/dist/* cpanel-deploy/backend/dist/
cp packages/backend/package.json cpanel-deploy/backend/
cp packages/backend/package-lock.json cpanel-deploy/backend/ 2>/dev/null || true

# Frontend
mkdir -p cpanel-deploy/frontend/dist
cp -r packages/frontend/dist/* cpanel-deploy/frontend/dist/

# Arquivos de configuração
cp .htaccess.cpanel cpanel-deploy/.htaccess
cp packages/backend/.env.example cpanel-deploy/backend/.env

# 5. Criar README de instalação
cat > cpanel-deploy/README-INSTALL.md << 'EOF'
# 📦 Instalação no cPanel

## Passos:

### 1. Upload dos arquivos
- Faça upload da pasta `backend` para: `~/public_html/gurudodindin/backend/`
- Faça upload da pasta `frontend` para: `~/public_html/gurudodindin/frontend/`
- Faça upload do arquivo `.htaccess` para: `~/public_html/gurudodindin/`

### 2. Instalar dependências do backend
No Terminal SSH ou cPanel Terminal:
```bash
cd ~/public_html/gurudodindin/backend
npm install --production
```

### 3. Configurar variáveis de ambiente
Edite o arquivo `.env`:
```bash
nano ~/public_html/gurudodindin/backend/.env
```

Configure pelo menos:
```
PORT=3001
NODE_ENV=production
JWT_SECRET=gere-um-secret-seguro-aqui
```

### 4. Configurar Node.js App no cPanel
1. Vá em "Setup Node.js App"
2. Clique em "Create Application"
3. Configure:
   - Application Root: `gurudodindin/backend`
   - Application URL: seu domínio
   - Application Startup File: `dist/index.js`
4. Adicione variáveis de ambiente
5. Clique em "Create"
6. Clique em "Start App"

### 5. Testar
Acesse: https://seu-dominio.com

✅ Pronto!
EOF

# 6. Criar script de instalação automática
cat > cpanel-deploy/install.sh << 'EOF'
#!/bin/bash

echo "🚀 Instalando Guru do Dindin..."

# Instalar dependências do backend
echo "📦 Instalando dependências..."
cd backend
npm install --production

# Criar banco de dados
echo "🗄️ Inicializando banco de dados..."
mkdir -p data
chmod 755 data

# Verificar .env
if [ ! -f .env ]; then
    echo "⚠️ ATENÇÃO: Configure o arquivo .env antes de iniciar!"
    echo "   cp .env .env.local"
    echo "   nano .env"
fi

echo ""
echo "✅ Instalação concluída!"
echo ""
echo "📝 Próximos passos:"
echo "1. Configure o arquivo .env"
echo "2. Configure Node.js App no cPanel"
echo "3. Inicie a aplicação"
EOF

chmod +x cpanel-deploy/install.sh

# 7. Criar arquivo ZIP
echo -e "${BLUE}📦 Criando arquivo ZIP...${NC}"
cd cpanel-deploy
zip -r ../guru-do-dindin-cpanel.zip . -q
cd ..

# 8. Estatísticas
FRONTEND_SIZE=$(du -sh cpanel-deploy/frontend | cut -f1)
BACKEND_SIZE=$(du -sh cpanel-deploy/backend | cut -f1)
ZIP_SIZE=$(du -sh guru-do-dindin-cpanel.zip | cut -f1)

echo ""
echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
echo ""
echo "📊 Estatísticas:"
echo "   Frontend: $FRONTEND_SIZE"
echo "   Backend: $BACKEND_SIZE"
echo "   ZIP total: $ZIP_SIZE"
echo ""
echo "📁 Arquivos gerados:"
echo "   📂 cpanel-deploy/ - Pasta com todos os arquivos"
echo "   📦 guru-do-dindin-cpanel.zip - ZIP pronto para upload"
echo ""
echo -e "${YELLOW}📤 Próximos passos:${NC}"
echo "1. Faça upload do arquivo 'guru-do-dindin-cpanel.zip' para o cPanel"
echo "2. Extraia o ZIP no cPanel File Manager"
echo "3. Siga as instruções em 'README-INSTALL.md'"
echo "4. Ou execute: ssh seu-usuario@seu-dominio.com 'bash -s' < cpanel-deploy/install.sh"
echo ""
