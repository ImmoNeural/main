# 💰 Dashboard Bancário - FinanzGuru

Sistema completo de gestão de gastos bancários com integração Open Banking (PSD2), similar ao aplicativo FinanzGuru.

## 🎯 Funcionalidades

### ✅ Implementado

- **Integração Open Banking (PSD2)**
  - Conexão segura com contas bancárias via APIs padronizadas
  - Suporte para múltiplos bancos europeus
  - Renovação automática de tokens
  - Revogação de acesso

- **Importação de Transações**
  - Sincronização automática dos últimos 90 dias
  - Categorização automática inteligente
  - Suporte para múltiplas contas
  - Edição manual de categorias

- **Dashboard Completo**
  - Visão geral de saldo, receitas e despesas
  - Gráficos interativos (receitas vs despesas, categorias)
  - Estatísticas por período (30/60/90 dias)
  - Top comerciantes/gastos
  - Comparação mensal

- **Gestão de Transações**
  - Listagem com filtros avançados
  - Busca por descrição/comerciante
  - Filtro por categoria e tipo
  - Exportação para CSV
  - Atualização de categorias

- **Gestão de Contas**
  - Listagem de contas conectadas
  - Sincronização manual
  - Desconexão de contas
  - Status de conexão

## 🏗️ Arquitetura

### Stack Tecnológica

**Backend:**
- Node.js + Express
- TypeScript
- SQLite (fácil migração para PostgreSQL)
- Better-SQLite3
- Axios para chamadas HTTP

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Recharts (gráficos)
- React Router v6
- Lucide React (ícones)

### Estrutura do Projeto

```
bank-expense-dashboard/
├── packages/
│   ├── backend/          # API Backend
│   │   ├── src/
│   │   │   ├── db/       # Database e migrations
│   │   │   ├── routes/   # Rotas da API
│   │   │   ├── services/ # Lógica de negócio
│   │   │   ├── types/    # Tipos TypeScript
│   │   │   └── index.ts  # Entry point
│   │   └── package.json
│   └── frontend/         # React Frontend
│       ├── src/
│       │   ├── components/ # Componentes React
│       │   ├── pages/      # Páginas
│       │   ├── services/   # API client
│       │   └── types.ts    # Tipos TypeScript
│       └── package.json
└── package.json          # Root workspace
```

## 🚀 Instalação e Execução

### Pré-requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0

### Instalação

1. **Clone o repositório:**
```bash
git clone <repository-url>
cd bank-expense-dashboard
```

2. **Instale as dependências:**
```bash
npm install
npm run install:all
```

3. **Configure as variáveis de ambiente:**

Backend:
```bash
cd packages/backend
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/database.sqlite

# Para produção, configure um provedor de Open Banking real
OPEN_BANKING_API_URL=https://api.openbanking.example.com
OPEN_BANKING_CLIENT_ID=your_client_id
OPEN_BANKING_CLIENT_SECRET=your_client_secret
OPEN_BANKING_REDIRECT_URI=http://localhost:3000/bank/callback

FRONTEND_URL=http://localhost:3000
```

### Executar em Desenvolvimento

**Opção 1: Executar tudo de uma vez (recomendado)**
```bash
npm run dev
```

**Opção 2: Executar separadamente**

Terminal 1 - Backend:
```bash
npm run dev:backend
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

### Acessar a aplicação

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/api/health

## 📡 API Endpoints

### Bancos

- `GET /api/bank/available` - Lista bancos disponíveis
- `POST /api/bank/connect` - Inicia conexão com banco
- `POST /api/bank/callback` - Processa callback de autorização
- `GET /api/bank/accounts` - Lista contas conectadas
- `POST /api/bank/accounts/:id/sync` - Sincroniza transações
- `DELETE /api/bank/accounts/:id` - Remove conta

### Transações

- `GET /api/transactions` - Lista transações (com filtros)
- `GET /api/transactions/:id` - Busca transação específica
- `PATCH /api/transactions/:id/category` - Atualiza categoria
- `GET /api/transactions/categories/list` - Lista categorias

### Dashboard

- `GET /api/dashboard/stats` - Estatísticas gerais
- `GET /api/dashboard/expenses-by-category` - Gastos por categoria
- `GET /api/dashboard/daily-stats` - Estatísticas diárias
- `GET /api/dashboard/top-merchants` - Top comerciantes
- `GET /api/dashboard/monthly-comparison` - Comparação mensal

## 🔒 Segurança e Open Banking

### Como funciona

1. **Autorização**: O usuário seleciona seu banco e é redirecionado para o site oficial do banco
2. **Consentimento**: O usuário autoriza o acesso no site do banco (nunca compartilha credenciais)
3. **Token de Acesso**: O sistema recebe um token de acesso válido por 90 dias
4. **Sincronização**: As transações são importadas automaticamente via API segura
5. **Revogação**: O usuário pode revogar o acesso a qualquer momento

### Provedores de Open Banking

Para produção, recomendamos usar um destes provedores:

**Europa:**
- [Tink](https://tink.com) - Ampla cobertura europeia
- [GoCardless](https://gocardless.com/bank-account-data/) - Excelente para UK e Europa
- [Salt Edge](https://www.saltedge.com) - Cobertura global

**USA/UK:**
- [Plaid](https://plaid.com) - Líder nos EUA

**Alemanha:**
- [FinAPI](https://www.finapi.io) - Especializado no mercado alemão

### Implementação com Provedor Real

1. Registre-se no provedor escolhido
2. Obtenha suas credenciais (Client ID, Client Secret)
3. Configure no `.env`:
```env
OPEN_BANKING_API_URL=https://api.tink.com
OPEN_BANKING_CLIENT_ID=seu_client_id
OPEN_BANKING_CLIENT_SECRET=seu_client_secret
```
4. Atualize `openBanking.service.ts` com as URLs reais da API

## 🎨 Categorias Automáticas

O sistema categoriza transações automaticamente usando keywords:

- 🛒 **Supermercado**: REWE, EDEKA, Aldi, Lidl, etc.
- 🍽️ **Restaurantes**: McDonald's, Restaurants, Cafés, etc.
- 🚗 **Transporte**: Uber, Shell, Deutsche Bahn, etc.
- 🛍️ **Compras**: Amazon, Zalando, MediaMarkt, etc.
- ⚕️ **Saúde**: Apotheke, Arzt, Hospital, etc.
- 🎬 **Entretenimento**: Netflix, Spotify, Cinema, etc.
- 📄 **Contas**: Vodafone, Energia, Água, Aluguel, etc.
- 💰 **Salário**: Pagamentos de salário
- 💸 **Transferências**: Transferências SEPA
- 📚 **Educação**: Cursos, Universidade, etc.
- 🏠 **Casa**: Móveis, Construção, etc.

Você pode editar manualmente qualquer categoria na interface.

## 🚀 Build para Produção

```bash
# Build completo
npm run build

# Build backend
npm run build:backend

# Build frontend
npm run build:frontend
```

### Deploy

**Backend:**
```bash
cd packages/backend
npm run build
npm start
```

**Frontend:**
Os arquivos buildados estarão em `packages/frontend/dist/`.
Faça deploy em qualquer servidor de arquivos estáticos (Netlify, Vercel, etc.)

## 🗄️ Banco de Dados

### SQLite (Desenvolvimento)

O projeto usa SQLite por padrão para facilitar o desenvolvimento.

### Migrar para PostgreSQL (Produção)

1. Instale o driver:
```bash
cd packages/backend
npm install pg
npm install --save-dev @types/pg
```

2. Atualize `database.ts`:
```typescript
import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
```

3. Converta as queries de SQLite para PostgreSQL

## 🧪 Dados de Demonstração

O sistema inclui dados mock para demonstração:

- 6 bancos disponíveis
- Transações de exemplo dos últimos 90 dias
- Categorização automática
- Múltiplos comerciantes

## 📝 Próximos Passos

### Melhorias Futuras

- [ ] Autenticação de usuários (JWT, OAuth)
- [ ] Suporte multi-usuário
- [ ] Notificações de gastos
- [ ] Orçamentos e metas
- [ ] Análise de tendências com IA
- [ ] App mobile (React Native)
- [ ] Relatórios em PDF
- [ ] Integração com cartões de crédito
- [ ] Alertas de gastos incomuns
- [ ] Previsão de gastos futuros

## 📄 Licença

Este projeto é fornecido como está, para fins educacionais e de demonstração.

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

## ⚠️ Aviso Legal

Este é um projeto de demonstração. Para uso em produção:

1. Implemente autenticação robusta
2. Use um provedor de Open Banking certificado
3. Implemente medidas de segurança adicionais
4. Faça auditoria de segurança
5. Siga as regulamentações PSD2/GDPR
6. Use HTTPS em produção
7. Implemente rate limiting
8. Configure logs adequados
9. Faça backups regulares

## 📞 Suporte

Para dúvidas ou sugestões, abra uma issue no repositório.

---

**Desenvolvido com ❤️ usando React, TypeScript e Open Banking**
