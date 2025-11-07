#!/bin/bash

echo "🚀 Building Guru do Dindin for production..."

# 1. Build do Frontend
echo "📦 Building frontend..."
cd packages/frontend
npm install
npm run build
cd ../..

# 2. Build do Backend
echo "📦 Building backend..."
cd packages/backend
npm install
npm run build
cd ../..

# 3. Criar pasta de distribuição
echo "📁 Creating distribution folder..."
rm -rf dist
mkdir -p dist

# 4. Copiar backend compilado
cp -r packages/backend/dist dist/backend
cp -r packages/backend/node_modules dist/backend/
cp packages/backend/package.json dist/backend/
cp packages/backend/.env.example dist/backend/.env

# 5. Copiar frontend compilado
cp -r packages/frontend/dist dist/frontend

# 6. Criar arquivo de inicialização
cat > dist/server.js << 'EOF'
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Servir API do backend
app.use('/api', require('./backend/index.js'));

// Servir frontend estático
app.use(express.static(path.join(__dirname, 'frontend')));

// Todas as outras rotas retornam o index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Guru do Dindin running on port ${PORT}`);
});
EOF

# 7. Criar package.json para o dist
cat > dist/package.json << 'EOF'
{
  "name": "guru-do-dindin",
  "version": "1.0.0",
  "description": "Guru do Dindin - Seu Guru das Finanças",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

echo "✅ Build completed! Distribution folder ready at: ./dist"
echo ""
echo "📦 Next steps:"
echo "1. Upload the 'dist' folder to your cPanel"
echo "2. Configure environment variables in .env"
echo "3. Run 'npm install' in the dist folder"
echo "4. Start the application with 'npm start'"
