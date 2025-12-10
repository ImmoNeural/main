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
import preferencesRoutes from './routes/preferences.routes';
import subscriptionRoutes from './routes/subscription.routes';
import adminRoutes from './routes/admin.routes';
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

// ROTA PÚBLICA: Listar contas de um usuário (requer admin_key)
// Uso: /api/diagnose/user/:userId/accounts?admin_key=KEY
app.get('/api/diagnose/user/:userId/accounts', async (req, res) => {
  const { userId } = req.params;
  const { admin_key } = req.query;

  const validAdminKey = process.env.ADMIN_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!admin_key || admin_key !== validAdminKey) {
    return res.status(401).json({ error: 'Invalid or missing admin_key' });
  }

  try {
    const { supabase } = await import('./config/supabase');

    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, account_type, last_sync_at, created_at')
      .eq('user_id', userId);

    if (error) {
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    res.json({
      user_id: userId,
      accounts_count: accounts?.length || 0,
      accounts: accounts || [],
      diagnose_urls: (accounts || []).map(a => ({
        bank: a.bank_name,
        url: `/api/bank/accounts/${a.id}/diagnose?admin_key=YOUR_KEY&days=60`
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ROTA PÚBLICA: Diagnóstico de transações (requer admin_key)
// IMPORTANTE: Deve vir ANTES das rotas protegidas /api/bank
app.get('/api/bank/accounts/:accountId/diagnose', async (req, res) => {
  const { accountId } = req.params;
  const { days = 30, admin_key } = req.query;

  // Verificar admin_key
  const validAdminKey = process.env.ADMIN_API_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!admin_key || admin_key !== validAdminKey) {
    return res.status(401).json({ error: 'Invalid or missing admin_key' });
  }

  try {
    const { supabase } = await import('./config/supabase');

    console.log(`[Diagnose] 🔍 ====== DIAGNOSE START ======`);
    console.log(`[Diagnose] 📋 Account ID: ${accountId}`);

    // Buscar conta
    const { data: account, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!account.access_token || !account.provider_account_id) {
      return res.status(400).json({ error: 'Account not properly configured' });
    }

    // 0. Primeiro verificar status do item no Pluggy
    let itemStatus = null;
    try {
      itemStatus = await openBankingService.getItemStatus(account.access_token);
      console.log(`[Diagnose] 📋 Item status: ${itemStatus?.status}`);
    } catch (e: any) {
      console.log(`[Diagnose] ⚠️ Could not get item status:`, e.message);
    }

    // 1. Buscar transações do Pluggy
    console.log(`[Diagnose] 📡 Fetching transactions from Pluggy (last ${days} days)...`);
    let pluggyTransactions: any[] = [];
    let pluggyError = null;
    try {
      pluggyTransactions = await openBankingService.getTransactions(
        account.access_token,
        account.provider_account_id,
        Number(days)
      );
    } catch (e: any) {
      pluggyError = e.message;
      console.error(`[Diagnose] ❌ Pluggy error:`, e.message);
    }

    // 2. Buscar transações do Supabase
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    const { data: supabaseTransactions, error: dbError } = await supabase
      .from('transactions')
      .select('transaction_id, date, description, amount')
      .eq('account_id', accountId)
      .gte('date', daysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (dbError) {
      console.error(`[Diagnose] ❌ DB Error:`, dbError);
    }

    // 3. Comparar (mesmo se Pluggy falhou, mostrar o que temos)
    const pluggyIds = new Set(pluggyTransactions.map(t => t.transaction_id));
    const supabaseIds = new Set((supabaseTransactions || []).map((t: any) => t.transaction_id));

    const missingInSupabase = pluggyTransactions.filter(t => !supabaseIds.has(t.transaction_id));
    const extraInSupabase = (supabaseTransactions || []).filter((t: any) => !pluggyIds.has(t.transaction_id));

    console.log(`[Diagnose] ✅ ====== DIAGNOSE COMPLETE ======`);
    console.log(`[Diagnose] 📊 Pluggy: ${pluggyTransactions.length} transactions`);
    console.log(`[Diagnose] 📊 Supabase: ${(supabaseTransactions || []).length} transactions`);
    console.log(`[Diagnose] 📊 Missing in Supabase: ${missingInSupabase.length}`);

    res.json({
      account: {
        id: account.id,
        bank_name: account.bank_name,
        last_sync_at: account.last_sync_at,
        account_type: account.account_type,
        access_token: account.access_token?.substring(0, 8) + '...', // Mostra só início do token
        provider_account_id: account.provider_account_id,
      },
      item_status: itemStatus ? {
        status: itemStatus.status,
        statusDetail: itemStatus.statusDetail,
        lastUpdatedAt: itemStatus.lastUpdatedAt,
        executionStatus: itemStatus.executionStatus,
        error: itemStatus.error || null,
      } : { error: 'Could not fetch item status' },
      pluggy_error: pluggyError,
      comparison: {
        period_days: Number(days),
        pluggy_count: pluggyTransactions.length,
        supabase_count: (supabaseTransactions || []).length,
        missing_in_supabase: missingInSupabase.length,
        extra_in_supabase: extraInSupabase.length,
      },
      missing_transactions: missingInSupabase.slice(0, 10).map(t => ({
        id: t.transaction_id,
        date: t.booking_date,
        description: t.remittance_information,
        amount: t.transaction_amount.amount,
      })),
      latest_pluggy: pluggyTransactions.slice(0, 5).map(t => ({
        id: t.transaction_id,
        date: t.booking_date,
        description: t.remittance_information,
        amount: t.transaction_amount.amount,
      })),
      latest_supabase: (supabaseTransactions || []).slice(0, 5),
    });
  } catch (error: any) {
    console.error(`[Diagnose] ❌ Error:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Rotas protegidas - requerem autenticação E assinatura ativa
app.use('/api/bank', authMiddleware, checkSubscriptionStatus, requireActiveSubscription, bankRoutes);
app.use('/api/transactions', authMiddleware, checkSubscriptionStatus, requireActiveSubscription, transactionRoutes);
app.use('/api/dashboard', authMiddleware, checkSubscriptionStatus, requireActiveSubscription, dashboardRoutes);
app.use('/api/budgets', authMiddleware, checkSubscriptionStatus, requireActiveSubscription, budgetRoutes);
app.use('/api/preferences', authMiddleware, checkSubscriptionStatus, requireActiveSubscription, preferencesRoutes);

// Admin routes - requerem apenas autenticação (admin check é feito no middleware interno)
app.use('/api/admin', authMiddleware, adminRoutes);

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
