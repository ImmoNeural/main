// IMPORTANTE: Carregar .env ANTES de qualquer outro import!
// Isso garante que process.env está populado antes dos services serem instanciados
import './config/env';

import express from 'express';
import cors from 'cors';
// import { initDatabase } from './db/database'; // SQLite - desabilitado
// import authRoutes from './routes/auth.routes'; // SQLite auth - desabilitado
import authRoutes from './routes/auth.supabase.routes'; // ✅ Supabase Auth
import bankRoutes from './routes/bank.routes';
import transactionRoutes from './routes/transaction.routes';
import dashboardRoutes from './routes/dashboard.routes';
import budgetRoutes from './routes/budget.routes';
import subscriptionRoutes from './routes/subscription.routes';
import { authMiddleware } from './middleware/auth.middleware';
import { checkSubscriptionStatus, requireActiveSubscription } from './middleware/subscription.middleware';
import openBankingService from './services/openBanking.service';

const app = express();

// Middleware - CORS configurado para aceitar Netlify e localhost
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://gurudodindin.com.br',
      'http://gurudodindin.com.br',
      process.env.FRONTEND_URL,
    ];

    // Permitir qualquer domínio *.netlify.app
    if (!origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.render.com') ||
        origin.endsWith('.gurudodindin.com.br')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// IMPORTANTE: Raw body para webhook do Stripe (precisa verificar assinatura)
app.use('/api/subscriptions/webhook/stripe', express.raw({ type: 'application/json' }));

// JSON parser para todas as outras rotas (limite aumentado para suportar CSVs grandes)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// SQLite desabilitado - usando Supabase agora
// initDatabase();

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes); // Subscription não precisa de verificação (tem rotas públicas)

// ROTA PÚBLICA: Listar bancos disponíveis (NÃO requer autenticação nem subscription)
// Isso permite que usuários vejam os bancos antes de se cadastrar ou durante trial
app.get('/api/bank/available', async (req, res) => {
  console.log('\n🏦 ===============================================');
  console.log('🏦 GET /api/bank/available - LISTA DE BANCOS (ROTA PÚBLICA)');
  console.log('🏦 ===============================================');

  try {
    const { country = 'BR' } = req.query;
    console.log('🌍 Country:', country);
    console.log('🔧 OPEN_BANKING_PROVIDER:', process.env.OPEN_BANKING_PROVIDER || 'NOT SET');
    console.log('🔑 PLUGGY_CLIENT_ID:', process.env.PLUGGY_CLIENT_ID ? 'SET ✅' : 'NOT SET ❌');
    console.log('🔑 PLUGGY_CLIENT_SECRET:', process.env.PLUGGY_CLIENT_SECRET ? 'SET ✅' : 'NOT SET ❌');

    const banks = await openBankingService.getAvailableBanks(country as string);

    console.log(`\n✅ Retornando ${banks.length} bancos`);
    if (banks.length > 0) {
      console.log('   Primeiro banco:', {
        id: banks[0].id,
        name: banks[0].name,
        country: banks[0].country
      });
    }
    console.log('🏦 ===============================================\n');

    res.json(banks);
  } catch (error) {
    console.error('❌ Error fetching available banks:', error);
    console.log('🏦 ===============================================\n');
    res.status(500).json({ error: 'Failed to fetch available banks' });
  }
});

// Rotas protegidas - requerem autenticação E assinatura ativa
app.use('/api/bank', authMiddleware, checkSubscriptionStatus, requireActiveSubscription, bankRoutes);
app.use('/api/transactions', authMiddleware, checkSubscriptionStatus, requireActiveSubscription, transactionRoutes);
app.use('/api/dashboard', authMiddleware, checkSubscriptionStatus, requireActiveSubscription, dashboardRoutes);
app.use('/api/budgets', authMiddleware, checkSubscriptionStatus, requireActiveSubscription, budgetRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
});

// Export the app for serverless use (Vercel)
export default app;
