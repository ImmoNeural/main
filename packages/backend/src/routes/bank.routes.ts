import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import openBankingService from '../services/openBanking.service';
import categorizationService from '../services/categorization.service';
import { syncBudgetsWithTransactions } from '../services/budget.service';
// authMiddleware removido - já é aplicado no app.ts
import { createMockBankAccount } from '../services/providers/mock.service';
import { BankAccount, Transaction } from '../types';

const router = Router();

/**
 * Converte timestamp em milissegundos para formato ISO string (para TIMESTAMPTZ do PostgreSQL)
 */
function toISOString(timestamp: number | undefined): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toISOString();
}

/**
 * Limpa contas duplicadas com saldo zero para um usuário
 * Mantém apenas a conta com saldo maior (ou a mais antiga se todas tiverem saldo zero)
 * Agrupa por provider_account_id, bank_name ou IBAN para identificar duplicatas
 */
async function cleanupDuplicateAccounts(userId: string): Promise<number> {
  try {
    // Buscar todas as contas do usuário (exceto desconectadas)
    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, account_type, balance, iban, provider_account_id, created_at, status')
      .eq('user_id', userId)
      .neq('status', 'disconnected')
      .order('created_at', { ascending: true }); // Mais antigas primeiro

    if (error || !accounts || accounts.length <= 1) {
      return 0; // Nada para limpar
    }

    // Agrupar contas por identificador único (provider_account_id > IBAN > bank_name+type)
    const groups: Map<string, typeof accounts> = new Map();

    for (const account of accounts) {
      // Criar chave de agrupamento
      let groupKey: string;

      if (account.provider_account_id) {
        groupKey = `provider:${account.provider_account_id}`;
      } else if (account.iban) {
        groupKey = `iban:${account.iban.replace(/[\s.\-]/g, '')}`;
      } else {
        groupKey = `bank:${account.bank_name}:${account.account_type}`;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(account);
    }

    // Identificar contas duplicadas para deletar
    const accountsToDelete: string[] = [];

    for (const [groupKey, groupAccounts] of groups) {
      if (groupAccounts.length <= 1) continue; // Não é duplicata

      console.log(`[Bank Cleanup] 🔍 Found ${groupAccounts.length} duplicate accounts for group: ${groupKey}`);

      // Ordenar: primeiro por saldo (maior primeiro), depois por data de criação (mais antiga primeiro)
      groupAccounts.sort((a, b) => {
        const balanceA = a.balance || 0;
        const balanceB = b.balance || 0;

        // Priorizar conta com saldo maior que zero
        if (balanceA > 0 && balanceB <= 0) return -1;
        if (balanceB > 0 && balanceA <= 0) return 1;
        if (balanceA !== balanceB) return balanceB - balanceA; // Maior saldo primeiro

        // Se saldos iguais, manter a mais antiga
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Manter a primeira (melhor candidata), deletar as outras
      const toKeep = groupAccounts[0];
      const toDelete = groupAccounts.slice(1);

      console.log(`[Bank Cleanup] ✅ Keeping: ${toKeep.bank_name} (balance: ${toKeep.balance}, id: ${toKeep.id})`);

      for (const acc of toDelete) {
        console.log(`[Bank Cleanup] 🗑️ Marking for deletion: ${acc.bank_name} (balance: ${acc.balance}, id: ${acc.id})`);
        accountsToDelete.push(acc.id);
      }
    }

    // Deletar contas duplicadas e suas transações
    if (accountsToDelete.length > 0) {
      console.log(`[Bank Cleanup] 🗑️ Deleting ${accountsToDelete.length} duplicate accounts...`);

      // Primeiro, deletar transações das contas duplicadas
      const { error: transError } = await supabase
        .from('transactions')
        .delete()
        .in('account_id', accountsToDelete);

      if (transError) {
        console.error('[Bank Cleanup] ⚠️ Error deleting transactions:', transError);
      }

      // Depois, deletar as contas
      const { error: deleteError } = await supabase
        .from('bank_accounts')
        .delete()
        .in('id', accountsToDelete);

      if (deleteError) {
        console.error('[Bank Cleanup] ⚠️ Error deleting accounts:', deleteError);
        return 0;
      }

      console.log(`[Bank Cleanup] ✅ Successfully deleted ${accountsToDelete.length} duplicate accounts`);
      return accountsToDelete.length;
    }

    return 0;
  } catch (error: any) {
    console.error('[Bank Cleanup] ❌ Error cleaning up duplicates:', error.message);
    return 0;
  }
}

/**
 * GET /api/bank/available
 * Lista os bancos disponíveis para conexão
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    const { country = 'BR' } = req.query;
    const banks = await openBankingService.getAvailableBanks(country as string);
    res.json(banks);
  } catch (error: any) {
    // Retornar erro informativo para o usuário
    const errorMessage = error.message || 'Failed to fetch available banks';

    // Verificar se é erro de configuração
    if (errorMessage.includes('credentials') || errorMessage.includes('PLUGGY')) {
      res.status(503).json({
        error: 'Serviço bancário temporariamente indisponível',
        message: 'O serviço de conexão bancária está temporariamente indisponível. Por favor, tente novamente mais tarde.',
        code: 'BANK_SERVICE_UNAVAILABLE'
      });
    } else if (errorMessage.includes('No banking provider')) {
      res.status(500).json({
        error: 'Configuração incorreta',
        message: 'O serviço de conexão bancária não está configurado corretamente. Entre em contato com o suporte.',
        code: 'BANK_SERVICE_NOT_CONFIGURED'
      });
    } else {
      res.status(500).json({
        error: 'Erro ao carregar bancos',
        message: 'Não foi possível carregar a lista de bancos. Por favor, tente novamente.',
        code: 'BANK_FETCH_ERROR'
      });
    }
  }
});

/**
 * Helper function to get connection limits based on plan type
 * Durante o trial, usuário tem acesso total (como Conectado Plus)
 */
function getMaxConnectionsForPlan(planType: string | null, status: string | null = 'active'): number {
  // Durante o trial, acesso total como Conectado Plus
  if (status === 'trial') {
    return 4; // Igual Conectado Plus
  }

  switch (planType) {
    case 'conectado':
      return 3;
    case 'conectado_plus':
      return 4;
    case 'manual':
    default:
      return 0; // Manual plan cannot use Open Finance
  }
}

/**
 * Helper function to check if user can connect more accounts
 */
async function checkConnectionLimit(userId: string): Promise<{ canConnect: boolean; message?: string; currentCount: number; maxAllowed: number; isTrialUser?: boolean }> {
  // Get user's subscription
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('plan_type, status')
    .eq('user_id', userId)
    .in('status', ['active', 'trial'])
    .maybeSingle();

  if (subError) {
    console.error('[Bank] Error checking subscription:', subError);
    return { canConnect: false, message: 'Erro ao verificar assinatura', currentCount: 0, maxAllowed: 0 };
  }

  const planType = subscription?.plan_type || 'manual';
  const status = subscription?.status || 'active';
  const isTrialUser = status === 'trial';
  const maxConnections = getMaxConnectionsForPlan(planType, status);

  // Count current active connections
  const { data: accounts, error: accountsError } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('user_id', userId)
    .neq('status', 'disconnected');

  if (accountsError) {
    console.error('[Bank] Error counting accounts:', accountsError);
    return { canConnect: false, message: 'Erro ao verificar contas', currentCount: 0, maxAllowed: 0 };
  }

  const currentCount = accounts?.length || 0;

  // Durante o trial, permite acesso total
  if (isTrialUser) {
    if (currentCount >= maxConnections) {
      return {
        canConnect: false,
        message: `Limite de ${maxConnections} conexões atingido durante o período de teste.`,
        currentCount,
        maxAllowed: maxConnections,
        isTrialUser: true
      };
    }
    return { canConnect: true, currentCount, maxAllowed: maxConnections, isTrialUser: true };
  }

  // Check if manual plan (no Open Finance allowed) - only after trial ends
  if (planType === 'manual') {
    return {
      canConnect: false,
      message: 'Open Finance não está disponível no Plano Manual. Faça upgrade para o Plano Conectado ou Conectado Plus.',
      currentCount,
      maxAllowed: 0,
      isTrialUser: false
    };
  }

  // Check if limit reached
  if (currentCount >= maxConnections) {
    const planName = planType === 'conectado' ? 'Conectado' : 'Conectado Plus';
    return {
      canConnect: false,
      message: `Limite de ${maxConnections} conexões atingido no Plano ${planName}. ${planType === 'conectado' ? 'Faça upgrade para o Plano Conectado Plus para conectar até 4 contas.' : 'Desconecte uma conta para adicionar outra.'}`,
      currentCount,
      maxAllowed: maxConnections,
      isTrialUser: false
    };
  }

  return { canConnect: true, currentCount, maxAllowed: maxConnections, isTrialUser: false };
}

/**
 * POST /api/bank/connect-direct
 * Inicia conexão direta com Pluggy (sem pré-selecionar banco)
 * Abre o widget do Pluggy com a lista completa de bancos
 */
router.post('/connect-direct', async (req: Request, res: Response) => {
  console.log('[Bank] 🚀 ====== CONNECT-DIRECT START ======');
  console.log('[Bank] 📋 Timestamp:', new Date().toISOString());

  try {
    const user_id = req.userId!;
    console.log(`[Bank] 👤 User ID: ${user_id}`);

    // Check connection limit based on subscription plan
    const { canConnect, message, currentCount, maxAllowed } = await checkConnectionLimit(user_id);
    if (!canConnect) {
      console.log(`[Bank] ❌ Connection limit reached: ${currentCount}/${maxAllowed}`);
      return res.status(403).json({
        error: 'Limite de conexões atingido',
        message,
        currentCount,
        maxAllowed,
        code: 'CONNECTION_LIMIT_REACHED'
      });
    }

    console.log(`[Bank] ✅ Connection allowed: ${currentCount}/${maxAllowed}`);

    // Importar o serviço Pluggy diretamente para criar token sem connectorId
    const { PluggyService } = await import('../services/providers/pluggy.service');
    const pluggyService = new PluggyService();

    // Criar connect token SEM especificar connectorId
    console.log('[Bank] 📡 Creating direct connect token...');
    const tokenResponse = await (pluggyService as any).createDirectConnectToken(user_id);

    console.log('[Bank] ✅ ====== CONNECT-DIRECT SUCCESS ======');
    console.log(`[Bank] ✅ Connect token created: ${tokenResponse.connectToken.substring(0, 20)}...`);

    res.json({
      connect_token: tokenResponse.connectToken,
      state: tokenResponse.connectToken,
    });
  } catch (error: any) {
    console.error('[Bank] ❌ ====== CONNECT-DIRECT ERROR ======');
    console.error('[Bank] ❌ Error:', error.message);
    console.error('[Bank] ❌ Stack:', error.stack || 'N/A');
    res.status(503).json({
      error: 'Serviço de conexão bancária temporariamente indisponível',
      message: 'Não foi possível iniciar a conexão. Por favor, tente novamente em alguns minutos.',
      code: 'BANK_CONNECTION_UNAVAILABLE'
    });
  }
});

/**
 * POST /api/bank/connect
 * Inicia o processo de conexão com um banco específico
 */
router.post('/connect', async (req: Request, res: Response) => {
  console.log('[Bank] 🚀 ====== CONNECT START ======');
  console.log('[Bank] 📋 Request body:', JSON.stringify(req.body));
  console.log('[Bank] 📋 Timestamp:', new Date().toISOString());

  try {
    const { bank_id } = req.body;
    const user_id = req.userId!; // Obtido do token JWT

    console.log(`[Bank] 📋 Bank ID: ${bank_id}`);
    console.log(`[Bank] 👤 User ID: ${user_id}`);

    if (!bank_id) {
      console.error('[Bank] ❌ Missing bank_id');
      return res.status(400).json({ error: 'bank_id is required' });
    }

    // Check connection limit based on subscription plan
    const { canConnect, message, currentCount, maxAllowed } = await checkConnectionLimit(user_id);
    if (!canConnect) {
      console.log(`[Bank] ❌ Connection limit reached: ${currentCount}/${maxAllowed}`);
      return res.status(403).json({
        error: 'Limite de conexões atingido',
        message,
        currentCount,
        maxAllowed,
        code: 'CONNECTION_LIMIT_REACHED'
      });
    }

    console.log(`[Bank] ✅ Connection allowed: ${currentCount}/${maxAllowed}`);

    try {
      // Tentar autenticação real com Pluggy
      console.log('[Bank] 📡 Initiating Pluggy auth...');
      const authResponse = await openBankingService.initiateAuth({
        bank_id,
        redirect_uri: process.env.OPEN_BANKING_REDIRECT_URI || 'http://localhost:3000/bank/callback',
        user_id,
      });

      console.log('[Bank] ✅ ====== CONNECT SUCCESS ======');
      console.log(`[Bank] ✅ Auth URL generated`);
      res.json(authResponse);
    } catch (pluggyError: any) {
      // Verificar se modo demo está EXPLICITAMENTE habilitado
      const demoModeEnabled = process.env.DEMO_MODE_ENABLED === 'true';

      console.error('[Bank] ❌ Pluggy authentication failed:', pluggyError.message);

      if (demoModeEnabled) {
        // Modo demo só ativa se explicitamente habilitado via variável de ambiente
        console.log('[Bank] 🎭 DEMO_MODE_ENABLED=true, activating demo mode for bank_id:', bank_id);

        const mockState = `DEMO_${bank_id}_${Date.now()}`;
        res.json({
          authorization_url: `demo-mode://connect/${bank_id}`,
          state: mockState,
          consent_id: mockState,
          demo_mode: true,
          bank_id: bank_id,
        });
      } else {
        // Em produção, retornar erro claro ao usuário
        console.error('[Bank] ❌ Demo mode NOT enabled. Returning error to user.');
        console.error('[Bank] ❌ To enable demo mode, set DEMO_MODE_ENABLED=true');

        res.status(503).json({
          error: 'Serviço de conexão bancária temporariamente indisponível',
          message: 'Não foi possível conectar ao banco no momento. Por favor, tente novamente em alguns minutos.',
          details: pluggyError.message,
          code: 'BANK_CONNECTION_UNAVAILABLE'
        });
      }
    }
  } catch (error) {
    console.error('Error initiating bank connection:', error);
    res.status(500).json({ error: 'Failed to initiate bank connection' });
  }
});

/**
 * GET /api/bank/item-status/:itemId
 * Busca o status detalhado de um item no Pluggy (para debug de erros)
 */
router.get('/item-status/:itemId', async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;

    console.log(`[Bank] 🔍 Fetching item status for: ${itemId}`);

    // Buscar detalhes do item do Pluggy
    const itemDetails = await openBankingService.getItemStatus(itemId);

    console.log(`[Bank] 📦 Item status:`, itemDetails);

    res.json(itemDetails);
  } catch (error: any) {
    console.error('[Bank] ❌ Error fetching item status:', error);
    res.status(500).json({
      error: 'Failed to fetch item status',
      message: error.message
    });
  }
});

/**
 * POST /api/bank/callback
 * Processa o callback após autorização do banco
 */
router.post('/callback', async (req: Request, res: Response) => {
  console.log('[Bank] 🏦 ========================================');
  console.log('[Bank] 🏦 ====== BANK CALLBACK START ======');
  console.log('[Bank] 🏦 ========================================');
  console.log('[Bank] 📋 Request body:', JSON.stringify(req.body));
  console.log('[Bank] 📋 Timestamp:', new Date().toISOString());

  try {
    const { code, state, bank_name } = req.body;
    const user_id = req.userId!; // Obtido do token JWT

    console.log('[Bank] 📋 Parsed parameters:');
    console.log(`[Bank]    - code (itemId): ${code}`);
    console.log(`[Bank]    - state: ${state ? state.substring(0, 30) + '...' : 'N/A'}`);
    console.log(`[Bank]    - bank_name: ${bank_name}`);
    console.log(`[Bank]    - user_id: ${user_id}`);

    if (!code || !state) {
      console.error('[Bank] ❌ Missing required parameters: code or state');
      return res.status(400).json({ error: 'code and state are required' });
    }

    // GARANTIR TRIAL: Verificar se usuário tem subscription ativa/trial
    // Se não tiver, criar trial de 7 dias (fallback se falhou no registro)
    try {
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('id, status')
        .eq('user_id', user_id)
        .in('status', ['active', 'trial'])
        .single();

      if (!existingSubscription) {
        console.log('🎁 [Bank Callback] User has no subscription, creating trial now...');

        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 dias de trial

        const { error: trialError } = await supabase
          .from('subscriptions')
          .insert({
            user_id,
            plan_type: 'manual',
            plan_name: 'Trial - Plano Manual',
            plan_price: 0,
            status: 'trial',
            start_date: new Date().toISOString(),
            end_date: trialEndDate.toISOString(),
            trial_end_date: trialEndDate.toISOString(),
            payment_method: null,
            payment_processor: null,
            max_connected_accounts: 0,
            auto_renew: false,
            metadata: {
              trial_days: 7,
              created_on_bank_connect: true
            }
          });

        if (trialError) {
          console.error('⚠️ [Bank Callback] Failed to create trial:', trialError);
        } else {
          console.log('✅ [Bank Callback] Trial created successfully on first bank connection');
        }
      }
    } catch (subscriptionCheckError) {
      console.error('⚠️ [Bank Callback] Error checking subscription:', subscriptionCheckError);
      // Não bloqueia a conexão bancária
    }

    // Verificar se é modo demo
    if (state.startsWith('DEMO_')) {
      console.log('[Bank] 🎭 Processing DEMO MODE callback');
      console.log('[Bank] user_id:', user_id);
      console.log('[Bank] code:', code);
      console.log('[Bank] state:', state);
      console.log('[Bank] bank_name:', bank_name);

      // Extrair bank_id do state: DEMO_341_1234567890
      const parts = state.split('_');
      const bank_id = parts[1];

      console.log('[Bank] Creating mock account for bank_id:', bank_id, 'bank_name:', bank_name);

      try {
        // Criar conta fictícia com transações
        const { account, transactions } = await createMockBankAccount(user_id, bank_id, bank_name);

        console.log(`[Bank] ✅ Demo account created with ${transactions.length} transactions`);

        return res.json({
          success: true,
          demo_mode: true,
          accounts: [{
            id: account.id,
            bank_name: account.bank_name,
            account_number: account.account_number,
            balance: account.balance,
            currency: account.currency,
          }],
        });
      } catch (mockError) {
        console.error('[Bank] ❌ Error creating mock account:', mockError);
        return res.status(500).json({
          error: 'Erro ao criar conta demonstração',
          details: mockError instanceof Error ? mockError.message : String(mockError)
        });
      }
    }

    // Modo real com Pluggy
    console.log('[Bank] 🔄 Processing real Pluggy callback');
    console.log(`[Bank] 🔄 Item ID (code): ${code}`);

    // Trocar código por token (quickMode=true para evitar timeout 504)
    // QuickMode retorna imediatamente sem esperar a sincronização completa
    console.log('[Bank] 🔄 Calling exchangeCodeForToken (quickMode=true)...');
    const tokenResponse = await openBankingService.exchangeCodeForToken(code, state, true);
    const itemStatus = (tokenResponse as any).item_status;

    console.log(`[Bank] ✅ Token exchange completed`);
    console.log(`[Bank] ✅ Item status: ${itemStatus || 'unknown'}`);
    console.log(`[Bank] ✅ Access token: ${tokenResponse.access_token}`);

    // Buscar contas do usuário com retry
    // Se o item ainda está sincronizando, tentar algumas vezes
    console.log('[Bank] 📊 ====== FETCHING ACCOUNTS ======');
    let accounts: any[] = [];
    let fetchAttempts = 0;
    const maxFetchAttempts = 3;

    while (fetchAttempts < maxFetchAttempts && accounts.length === 0) {
      fetchAttempts++;
      try {
        console.log(`[Bank] 📊 Fetching accounts (attempt ${fetchAttempts}/${maxFetchAttempts})...`);
        console.log(`[Bank] 📊 Using access_token: ${tokenResponse.access_token}`);
        accounts = await openBankingService.getAccounts(tokenResponse.access_token);
        console.log(`[Bank] 📊 Found ${accounts.length} accounts`);
        if (accounts.length > 0) {
          accounts.forEach((acc, idx) => {
            console.log(`[Bank] 📊 Account ${idx + 1}: id=${acc.id}, type=${acc.account_type}, name=${acc.name}`);
          });
        }
      } catch (accountError: any) {
        console.error(`[Bank] ❌ Attempt ${fetchAttempts}/${maxFetchAttempts} failed to fetch accounts`);
        console.error(`[Bank] ❌ Error: ${accountError.message}`);
        console.error(`[Bank] ❌ Stack: ${accountError.stack || 'N/A'}`);

        // Se ainda há tentativas, esperar 2 segundos e tentar novamente
        if (fetchAttempts < maxFetchAttempts) {
          console.log(`[Bank] ⏳ Waiting 2s before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // Se não conseguiu buscar contas após todas as tentativas, criar placeholder
    if (accounts.length === 0) {
      console.log(`[Bank] Could not fetch accounts after ${maxFetchAttempts} attempts`);
      if (itemStatus && itemStatus !== 'LOGIN_ERROR') {
        accounts = [{
          id: code, // usar itemId como id temporário
          iban: undefined,
          currency: 'BRL',
          name: bank_name || 'Conta Bancária',
          account_type: 'checking',
          balance: { amount: 0, currency: 'BRL' },
        }];
        console.log(`[Bank] Created placeholder account for syncing item`);
      }
    }

    // Salvar cada conta no banco de dados
    const savedAccounts: BankAccount[] = [];

    for (const account of accounts) {
      const now = Date.now();

      // RECONEXÃO INTELIGENTE: Verificar se já existe uma conta (ativa ou desconectada)
      // com o mesmo IBAN ou provider_account_id para este usuário
      // CORRIGIDO: Usar verificações separadas para evitar problemas com valores null
      // e usar maybeSingle() para permitir 0 resultados sem erro
      let existingAccount = null;

      console.log(`[Bank] Checking for existing account:`, {
        provider_account_id: account.id,
        iban: account.iban,
        account_type: account.account_type,
        user_id
      });

      // Primeiro tentar encontrar por provider_account_id (mais confiável)
      if (account.id) {
        const { data: byProviderId, error: providerError } = await supabase
          .from('bank_accounts')
          .select('id, status, last_sync_at, iban, provider_account_id')
          .eq('user_id', user_id)
          .eq('provider_account_id', account.id)
          .maybeSingle();

        if (providerError) {
          console.log(`[Bank] Error checking provider_account_id:`, providerError);
        }

        if (byProviderId) {
          existingAccount = byProviderId;
          console.log(`[Bank] ✅ Found existing account by provider_account_id: ${byProviderId.id}`);
        }
      }

      // Se não encontrou por provider_id, tentar por IBAN (se disponível)
      if (!existingAccount && account.iban) {
        // Normalizar IBAN para comparação (remover espaços, pontos, traços)
        const normalizedIban = account.iban.replace(/[\s.\-]/g, '');

        const { data: allUserAccounts, error: ibanError } = await supabase
          .from('bank_accounts')
          .select('id, status, last_sync_at, iban, provider_account_id')
          .eq('user_id', user_id);

        if (ibanError) {
          console.log(`[Bank] Error checking IBAN:`, ibanError);
        }

        // Comparar IBANs normalizados
        const matchingAccount = (allUserAccounts || []).find(acc => {
          if (!acc.iban) return false;
          const existingNormalizedIban = acc.iban.replace(/[\s.\-]/g, '');
          return existingNormalizedIban === normalizedIban;
        });

        if (matchingAccount) {
          existingAccount = matchingAccount;
          console.log(`[Bank] ✅ Found existing account by IBAN: ${matchingAccount.id}`);
        }
      }

      // EXTRA: Verificar se já existe conta com mesmo bank_name E account_type para evitar duplicatas
      // Isso previne criar múltiplas contas do mesmo banco/tipo quando reconecta
      if (!existingAccount && bank_name && account.account_type) {
        const { data: byBankType } = await supabase
          .from('bank_accounts')
          .select('id, status, last_sync_at, iban, provider_account_id, account_number')
          .eq('user_id', user_id)
          .eq('bank_name', bank_name)
          .eq('account_type', account.account_type)
          .maybeSingle();

        if (byBankType) {
          // Verificar se os últimos 4 dígitos da conta são iguais (se disponíveis)
          const newAccountLast4 = account.iban?.slice(-4);
          const existingLast4 = byBankType.account_number;

          if (!newAccountLast4 || !existingLast4 || newAccountLast4 === existingLast4) {
            existingAccount = byBankType;
            console.log(`[Bank] ✅ Found existing account by bank_name + account_type: ${byBankType.id}`);
          }
        }
      }

      console.log(`[Bank] Existing account check result:`, existingAccount ? `Found: ${existingAccount.id}` : 'Not found, will create new');

      let accountId: string;
      let isReconnection = false;

      if (existingAccount) {
        // RECONEXÃO: Reativar conta existente e atualizar tokens
        accountId = existingAccount.id;
        isReconnection = true;

        console.log(`[Bank] Reconnecting existing account ${accountId} (status: ${existingAccount.status})`);

        const { error: updateError } = await supabase
          .from('bank_accounts')
          .update({
            bank_name: bank_name || 'Unknown Bank',
            account_number: account.iban?.slice(-4),
            account_type: account.account_type,
            balance: account.balance?.amount || 0,
            currency: account.currency,
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token,
            token_expires_at: toISOString(now + tokenResponse.expires_in * 1000),
            consent_id: state,
            consent_expires_at: toISOString(now + 90 * 24 * 60 * 60 * 1000),
            connected_at: toISOString(now),
            status: 'active',
            updated_at: toISOString(now),
          })
          .eq('id', accountId);

        if (updateError) {
          console.error('Error reconnecting bank account:', updateError);
          continue;
        }
      } else {
        // NOVA CONEXÃO: Criar nova conta
        accountId = uuidv4();

        console.log(`[Bank] Creating new account ${accountId}`);

        // Construir nome da conta incluindo o tipo para distinguir múltiplas contas
        let accountDisplayName = bank_name || 'Unknown Bank';
        const accountTypeLabel: Record<string, string> = {
          'checking': 'Conta Corrente',
          'savings': 'Poupança',
          'card': 'Cartão',
          'investment': 'Investimento',
        };
        // Adicionar tipo de conta ao nome se disponível
        if (account.account_type && accountTypeLabel[account.account_type]) {
          // Verificar se já existe outra conta do mesmo banco para este usuário
          const { data: otherAccountsCount } = await supabase
            .from('bank_accounts')
            .select('id')
            .eq('user_id', user_id)
            .ilike('bank_name', `${bank_name}%`);

          // Se já existe outra conta do mesmo banco, adicionar o tipo ao nome
          if (otherAccountsCount && otherAccountsCount.length > 0) {
            accountDisplayName = `${bank_name} - ${accountTypeLabel[account.account_type]}`;
          }
        }

        const bankAccount: BankAccount = {
          id: accountId,
          user_id,
          bank_name: accountDisplayName,
          account_number: account.iban?.slice(-4),
          iban: account.iban,
          account_type: account.account_type,
          balance: account.balance?.amount || 0,
          currency: account.currency,
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token,
          token_expires_at: now + tokenResponse.expires_in * 1000,
          consent_id: state,
          consent_expires_at: now + 90 * 24 * 60 * 60 * 1000, // 90 dias
          connected_at: now,
          status: 'active',
          provider_account_id: account.id, // ID da conta no provedor (Pluggy, etc)
          created_at: now,
          updated_at: now,
        };

        const { error: insertError } = await supabase
          .from('bank_accounts')
          .insert({
            id: bankAccount.id,
            user_id: bankAccount.user_id,
            bank_name: bankAccount.bank_name,
            account_number: bankAccount.account_number,
            iban: bankAccount.iban,
            account_type: bankAccount.account_type,
            balance: bankAccount.balance,
            currency: bankAccount.currency,
            access_token: bankAccount.access_token,
            refresh_token: bankAccount.refresh_token,
            token_expires_at: toISOString(bankAccount.token_expires_at),
            consent_id: bankAccount.consent_id,
            consent_expires_at: toISOString(bankAccount.consent_expires_at),
            connected_at: toISOString(bankAccount.connected_at),
            status: bankAccount.status,
            provider_account_id: bankAccount.provider_account_id,
            created_at: toISOString(bankAccount.created_at),
            updated_at: toISOString(bankAccount.updated_at),
          });

        if (insertError) {
          console.error('Error inserting bank account:', insertError);
          continue;
        }

        savedAccounts.push(bankAccount);
      }

      // Sincronizar transações com timeout mais longo (Render permite mais tempo)
      // Se timeout, a conta já está salva e user pode sincronizar manualmente
      const forceFullSync = !isReconnection || !existingAccount?.last_sync_at;
      console.log(`[Bank] Starting transaction sync (${forceFullSync ? 'full' : 'incremental'}) with 60s timeout`);

      // Função helper para timeout
      const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T | null> => {
        return Promise.race([
          promise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
        ]);
      };

      // Tentar sync com timeout de 60 segundos (Render permite mais tempo que Vercel)
      const syncResult = await withTimeout(
        syncTransactions(accountId, tokenResponse.access_token, forceFullSync),
        60000
      );

      if (syncResult !== null) {
        // Sync completou a tempo
        console.log(`[Bank] ✅ Sync completed: ${syncResult} transactions`);
        await supabase
          .from('bank_accounts')
          .update({ last_sync_at: toISOString(Date.now()) })
          .eq('id', accountId);
      } else {
        // Sync não completou a tempo - conta está salva, user pode sync depois
        console.log(`[Bank] ⚠️ Sync timeout - account saved, user can sync later`);
      }

      // Adicionar aos resultados se foi reconexão
      if (isReconnection) {
        const { data: reconnectedAccount } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('id', accountId)
          .single();

        if (reconnectedAccount) {
          savedAccounts.push(reconnectedAccount as BankAccount);
        }
      }
    }

    // 🔄 SINCRONIZAR BUDGETS após importação via Open Banking
    try {
      await syncBudgetsWithTransactions(user_id);
    } catch (syncError) {
      console.error('⚠️ [Bank Callback] Erro ao sincronizar budgets (não crítico):', syncError);
    }

    // 🧹 LIMPAR CONTAS DUPLICADAS (saldo zero)
    // Remove automaticamente contas duplicadas com saldo zero que podem ter sido criadas
    try {
      const deletedCount = await cleanupDuplicateAccounts(user_id);
      if (deletedCount > 0) {
        console.log(`[Bank Callback] 🧹 Cleaned up ${deletedCount} duplicate accounts`);
      }
    } catch (cleanupError) {
      console.error('⚠️ [Bank Callback] Erro ao limpar duplicatas (não crítico):', cleanupError);
    }

    // Buscar contas atualizadas após cleanup
    const { data: finalAccounts } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, iban, balance, currency')
      .eq('user_id', user_id)
      .neq('status', 'disconnected')
      .order('created_at', { ascending: false });

    console.log('[Bank] 🏦 ========================================');
    console.log('[Bank] 🏦 ====== BANK CALLBACK SUCCESS ======');
    console.log('[Bank] 🏦 ========================================');
    console.log(`[Bank] ✅ Final accounts count: ${finalAccounts?.length || 0}`);
    (finalAccounts || []).forEach((acc, idx) => {
      console.log(`[Bank] ✅ Account ${idx + 1}: ${acc.bank_name} (${acc.id})`);
    });
    console.log('[Bank] ✅ Timestamp:', new Date().toISOString());

    res.json({
      success: true,
      accounts: (finalAccounts || []).map(acc => ({
        id: acc.id,
        bank_name: acc.bank_name,
        iban: acc.iban,
        balance: acc.balance,
        currency: acc.currency,
      })),
      message: (finalAccounts?.length || 0) > 0
        ? 'Conta conectada com sucesso! Vá para Contas e clique em Sincronizar se as transações ainda não apareceram.'
        : 'Conexão iniciada. A conta pode demorar alguns segundos para aparecer. Atualize a página Contas.',
    });
  } catch (error: any) {
    console.error('[Bank] ❌ ========================================');
    console.error('[Bank] ❌ ====== BANK CALLBACK ERROR ======');
    console.error('[Bank] ❌ ========================================');
    console.error('[Bank] ❌ Error message:', error.message || 'Unknown error');
    console.error('[Bank] ❌ Error name:', error.name || 'N/A');
    console.error('[Bank] ❌ Error code:', error.code || 'N/A');
    console.error('[Bank] ❌ Status:', error.response?.status || 'N/A');
    console.error('[Bank] ❌ Response data:', JSON.stringify(error.response?.data || {}));
    console.error('[Bank] ❌ Stack trace:', error.stack || 'N/A');
    console.error('[Bank] ❌ Request body was:', JSON.stringify(req.body));
    console.error('[Bank] ❌ Timestamp:', new Date().toISOString());

    const errorMessage = error.message || 'Failed to process bank callback';
    res.status(500).json({
      error: errorMessage,
      message: errorMessage,
      code: 'BANK_CALLBACK_ERROR'
    });
  }
});

/**
 * GET /api/bank/accounts
 * Lista todas as contas conectadas
 * NOTA: O saldo (balance) é atualizado via Pluggy quando o usuário clica em "Sincronizar"
 * NOTA: Executa limpeza automática de contas duplicadas com saldo zero
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT

    // 🧹 Limpar contas duplicadas automaticamente ANTES de retornar
    // Isso garante que o usuário nunca veja duplicatas
    try {
      const deletedCount = await cleanupDuplicateAccounts(user_id);
      if (deletedCount > 0) {
        console.log(`[Bank GET] 🧹 Cleaned up ${deletedCount} duplicate accounts for user ${user_id}`);
      }
    } catch (cleanupErr) {
      console.error('[Bank GET] ⚠️ Error cleaning up duplicates:', cleanupErr);
      // Continua mesmo se cleanup falhar
    }

    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user_id)
      .neq('status', 'disconnected')  // Excluir contas desconectadas
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(accounts || []);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

/**
 * POST /api/bank/accounts/:accountId/sync
 * Sincroniza transações de uma conta
 * 1. Dispara updateItem para buscar dados frescos do banco via Open Finance
 * 2. Aguarda brevemente o item ficar pronto (max 10s para evitar timeout)
 * 3. Busca as transações atualizadas
 */
router.post('/accounts/:accountId/sync', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    console.log(`[Bank Sync] 🔄 ====== SYNC START ======`);
    console.log(`[Bank Sync] 📋 Account ID: ${accountId}`);
    console.log(`[Bank Sync] 📋 Timestamp: ${new Date().toISOString()}`);

    const { data: account, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      console.error(`[Bank Sync] ❌ Account not found: ${accountId}`);
      return res.status(404).json({ error: 'Account not found' });
    }

    console.log(`[Bank Sync] 📋 Bank: ${account.bank_name}`);
    console.log(`[Bank Sync] 📋 Access Token (itemId): ${account.access_token}`);

    if (!account.access_token) {
      console.error(`[Bank Sync] ❌ Account has no access token`);
      return res.status(400).json({ error: 'Account has no access token' });
    }

    // 🔄 STEP 1: Disparar updateItem para forçar refresh do banco via Open Finance
    console.log(`[Bank Sync] 🔄 Step 1: Triggering updateItem to refresh bank data...`);
    await openBankingService.updateItem(account.access_token);

    // 🔄 STEP 2: Aguardar brevemente (max 10s = 5 tentativas * 2s para evitar timeout 504)
    console.log(`[Bank Sync] ⏳ Step 2: Waiting briefly for item to be ready (max 10s)...`);
    const isReady = await openBankingService.waitForItemReady(account.access_token, 5);

    if (!isReady) {
      console.log(`[Bank Sync] ⚠️ Item not ready yet, fetching available transactions...`);
    }

    // 🔄 STEP 3: Buscar saldo atualizado do banco via Pluggy
    console.log(`[Bank Sync] 💰 Step 3: Fetching updated balance from Pluggy...`);
    let updatedBalance = account.balance; // Fallback para saldo atual
    let creditLimit: number | null = null;
    try {
      const pluggyAccounts = await openBankingService.getAccounts(account.access_token);
      // Encontrar a conta correspondente pelo provider_account_id
      const matchingAccount = pluggyAccounts.find(pa => pa.id === account.provider_account_id);
      if (matchingAccount && matchingAccount.balance) {
        updatedBalance = matchingAccount.balance.amount;
        console.log(`[Bank Sync] 💰 New balance from Pluggy: R$ ${updatedBalance.toFixed(2)}`);

        // Buscar limite de crédito (cartão ou cheque especial)
        if (matchingAccount.credit_limit) {
          creditLimit = matchingAccount.credit_limit;
          console.log(`[Bank Sync] 💳 Credit limit: R$ ${creditLimit.toFixed(2)}`);
        } else if (matchingAccount.overdraft_limit) {
          creditLimit = matchingAccount.overdraft_limit;
          console.log(`[Bank Sync] 🏦 Overdraft limit: R$ ${creditLimit.toFixed(2)}`);
        }
      } else {
        console.log(`[Bank Sync] ⚠️ Could not find matching account in Pluggy response`);
      }
    } catch (balanceError: any) {
      console.error(`[Bank Sync] ⚠️ Error fetching balance from Pluggy:`, balanceError.message);
    }

    // 🔄 STEP 4: Buscar transações atualizadas (mesmo se não estiver 100% pronto)
    console.log(`[Bank Sync] 📊 Step 4: Fetching transactions...`);
    const transactionCount = await syncTransactions(accountId, account.access_token, false, updatedBalance);

    // Atualizar last_sync_at, saldo E limite de crédito com os valores do Pluggy
    const updateData: any = {
      balance: updatedBalance,
      last_sync_at: toISOString(Date.now()),
      updated_at: toISOString(Date.now())
    };
    if (creditLimit !== null) {
      updateData.credit_limit = creditLimit;
    }

    await supabase
      .from('bank_accounts')
      .update(updateData)
      .eq('id', accountId);

    console.log(`[Bank Sync] 💰 Account balance updated to: R$ ${updatedBalance.toFixed(2)}${creditLimit ? ` (limit: R$ ${creditLimit.toFixed(2)})` : ''}`);

    // 🔄 SINCRONIZAR BUDGETS após sync manual
    try {
      await syncBudgetsWithTransactions(account.user_id);
    } catch (syncError) {
      console.error('⚠️ [Bank Sync] Erro ao sincronizar budgets (não crítico):', syncError);
    }

    console.log(`[Bank Sync] ✅ ====== SYNC SUCCESS ======`);
    console.log(`[Bank Sync] ✅ Transactions synced: ${transactionCount}`);
    console.log(`[Bank Sync] ✅ Timestamp: ${new Date().toISOString()}`);

    res.json({
      success: true,
      transactions_synced: transactionCount,
      message: isReady
        ? 'Dados atualizados com sucesso do banco!'
        : 'Sincronização iniciada! Novas transações podem aparecer em alguns minutos.',
    });
  } catch (error: any) {
    console.error(`[Bank Sync] ❌ ====== SYNC ERROR ======`);
    console.error(`[Bank Sync] ❌ Error: ${error.message}`);
    console.error(`[Bank Sync] ❌ Stack: ${error.stack || 'N/A'}`);
    res.status(500).json({ error: 'Failed to sync account' });
  }
});

// NOTA: Endpoint /diagnose movido para app.ts como rota pública (requer admin_key)

/**
 * DELETE /api/bank/accounts/:accountId
 * Remove uma conta conectada e TODAS as transações associadas (HARD DELETE)
 */
router.delete('/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const user_id = req.userId!;

    console.log('🗑️ Deletando conta e transações:', accountId);

    const { data: account, error: fetchError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user_id) // Verificar que pertence ao usuário
      .single();

    if (fetchError || !account) {
      console.log('❌ Conta não encontrada:', accountId);
      return res.status(404).json({ error: 'Account not found' });
    }

    console.log('📋 Conta encontrada:', account.bank_name);

    // Revogar consentimento no banco (se for Open Finance)
    if (account.access_token) {
      try {
        await openBankingService.revokeConsent(account.access_token);
        console.log('✅ Consentimento revogado com sucesso');
      } catch (error: any) {
        // 404 significa que o item já foi deletado - isso é OK
        if (error.status === 404 || error.response?.status === 404) {
          console.log('ℹ️ Item já foi deletado no banco (404) - continuando...');
        } else {
          console.warn('⚠️ Falha ao revogar consentimento (não crítico):', error.message);
        }
      }
    }

    // 1. DELETAR todas as transações associadas a esta conta
    const { data: deletedTransactions, error: transError } = await supabase
      .from('transactions')
      .delete()
      .eq('account_id', accountId)
      .eq('user_id', user_id)
      .select('id');

    if (transError) {
      console.error('❌ Erro ao deletar transações:', transError);
      throw transError;
    }

    const deletedTransCount = deletedTransactions?.length || 0;
    console.log(`✅ ${deletedTransCount} transações deletadas`);

    // 2. DELETAR a conta bancária
    const { error: deleteError } = await supabase
      .from('bank_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('❌ Erro ao deletar conta:', deleteError);
      throw deleteError;
    }

    console.log('✅ Conta deletada com sucesso:', account.bank_name);

    res.json({
      success: true,
      deletedTransactions: deletedTransCount,
      message: `Conta bancária deletada. ${deletedTransCount} ${deletedTransCount === 1 ? 'transação deletada' : 'transações deletadas'}.`
    });
  } catch (error) {
    console.error('❌ Erro ao deletar conta:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * Função auxiliar para sincronizar transações (OTIMIZADA E INCREMENTAL)
 *
 * Estratégia de otimização:
 * 1. Sincronização incremental: busca apenas transações desde last_sync_at
 * 2. UPSERT: Atualiza transações existentes (status, amount) E insere novas
 * 3. Bulk operations: operações em lote para melhor performance
 *
 * IMPORTANTE para cartões de crédito:
 * - Transações PENDING viram POSTED quando a fatura é paga
 * - Precisamos ATUALIZAR as existentes, não só inserir novas
 */
async function syncTransactions(accountId: string, accessToken: string, forceFullSync: boolean = false, currentAccountBalance?: number): Promise<number> {
  // Buscar dados da conta incluindo last_sync_at, user_id E account_type
  const { data: account, error } = await supabase
    .from('bank_accounts')
    .select('provider_account_id, last_sync_at, user_id, account_type')
    .eq('id', accountId)
    .single();

  if (error || !account || !account.provider_account_id) {
    console.warn(`[Sync] Account ${accountId} has no provider_account_id, skipping transactions sync`);
    return 0;
  }

  // Detectar se é cartão de crédito (lógica invertida de valores)
  const isCreditCard = account.account_type === 'card';
  if (isCreditCard) {
    console.log(`[Sync] 💳 Conta de cartão de crédito detectada - aplicando lógica invertida`);
  }

  // Determinar período de sincronização (incremental ou completo)
  let daysToSync = 365; // Padrão: 1 ano completo (primeira sincronização)

  if (!forceFullSync && account.last_sync_at) {
    // Sincronização incremental: buscar apenas desde a última sincronização
    const lastSyncDate = new Date(account.last_sync_at);
    const now = new Date();
    const daysSinceLastSync = Math.ceil((now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24));

    // Para cartões de crédito, buscar pelo menos 60 dias para pegar faturas pendentes
    const minDays = isCreditCard ? 60 : 7;
    daysToSync = Math.max(Math.min(daysSinceLastSync + 1, 365), minDays);

    console.log(`[Sync] Incremental sync: fetching last ${daysToSync} days (since ${lastSyncDate.toISOString()})`);
  } else {
    console.log(`[Sync] Full sync: fetching last ${daysToSync} days`);
  }

  console.log(`[Sync] Fetching transactions for account ${accountId} (provider: ${account.provider_account_id})`);

  // Buscar transações do provedor
  // Para cartões de crédito, usar método especial que inclui fatura aberta
  let transactions;

  if (isCreditCard) {
    // Importar PluggyService para usar método especial de cartão de crédito
    const { PluggyService } = await import('../services/providers/pluggy.service');
    const pluggyService = new PluggyService();

    console.log(`[Sync] 💳 Using getAllCreditCardTransactions to include open bill transactions`);
    transactions = await pluggyService.getAllCreditCardTransactions(
      accessToken,
      account.provider_account_id,
      daysToSync
    );
  } else {
    transactions = await openBankingService.getTransactions(
      accessToken,
      account.provider_account_id,
      daysToSync
    );
  }

  console.log(`[Sync] Found ${transactions.length} transactions from provider`);

  if (transactions.length === 0) {
    return 0;
  }

  // 💳 CARTÃO DE CRÉDITO: Lógica invertida
  // No cartão de crédito via Open Finance:
  // - Valores POSITIVOS = despesas (compras) → devem virar NEGATIVOS
  // - Valores NEGATIVOS = pagamentos de fatura → devem ser IGNORADOS
  if (isCreditCard) {
    const originalCount = transactions.length;

    // Filtrar: remover pagamentos de fatura (valores negativos)
    transactions = transactions.filter(t => t.transaction_amount.amount > 0);

    const filteredCount = originalCount - transactions.length;
    if (filteredCount > 0) {
      console.log(`[Sync] 💳 Ignorando ${filteredCount} pagamento(s) de fatura (valores negativos)`);
    }

    // Inverter: transformar valores positivos em negativos (despesas)
    transactions = transactions.map(t => ({
      ...t,
      transaction_amount: {
        ...t.transaction_amount,
        amount: -Math.abs(t.transaction_amount.amount) // Garantir que é negativo
      }
    }));

    console.log(`[Sync] 💳 ${transactions.length} transações de cartão processadas (valores invertidos para negativos)`);
  }

  // UPSERT: Buscar transações existentes para comparar (incluindo status e amount)
  const providerTransactionIds = transactions.map(t => t.transaction_id);

  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('id, transaction_id, status, amount, description')
    .eq('account_id', accountId)
    .in('transaction_id', providerTransactionIds);

  // Criar Map para lookup O(1)
  const existingMap = new Map(
    (existingTransactions || []).map((t: any) => [t.transaction_id, t])
  );

  console.log(`[Sync] ${existingMap.size} transactions already exist in database`);

  // Separar em novas transações e transações para atualizar
  const newTransactions: any[] = [];
  const transactionsToUpdate: any[] = [];
  const now = Date.now();

  for (const trans of transactions) {
    const amount = trans.transaction_amount.amount;
    const description = trans.remittance_information || '';
    const merchant = trans.creditor_name || trans.debtor_name || '';

    // Mapear status do Pluggy: BOOK = completed, PDNG = pending
    const pluggyStatus = trans.status === 'BOOK' ? 'completed' : 'pending';

    const existing = existingMap.get(trans.transaction_id);

    if (existing) {
      // Transação já existe - verificar se precisa atualizar
      const needsUpdate =
        existing.status !== pluggyStatus ||
        Math.abs(existing.amount - amount) > 0.01 || // Comparar com tolerância
        existing.description !== description;

      if (needsUpdate) {
        transactionsToUpdate.push({
          id: existing.id,
          status: pluggyStatus,
          amount: amount,
          description: description,
          merchant: merchant,
          updated_at: toISOString(now),
        });
      }
    } else {
      // Transação nova - preparar para inserção
      const categorization = categorizationService.categorizeTransaction(description, merchant);

      newTransactions.push({
        id: uuidv4(),
        user_id: account.user_id,
        account_id: accountId,
        transaction_id: trans.transaction_id,
        date: new Date(trans.booking_date).getTime(),
        amount,
        currency: trans.transaction_amount.currency,
        description,
        merchant,
        category: categorization.category,
        type: amount < 0 ? 'debit' : 'credit',
        balance_after: trans.balance_after_transaction?.amount as number | undefined,
        reference: trans.remittance_information,
        status: pluggyStatus,
        created_at: toISOString(now),
        updated_at: toISOString(now),
      });
    }
  }

  console.log(`[Sync] 📊 New: ${newTransactions.length}, To update: ${transactionsToUpdate.length}`);

  // Calcular balance_after se Pluggy não forneceu e temos o saldo atual da conta
  const hasPluggyBalance = newTransactions.some(t => t.balance_after !== undefined && t.balance_after !== null);

  if (!hasPluggyBalance && currentAccountBalance !== undefined && newTransactions.length > 0) {
    console.log(`[Sync] 💰 Calculating balance_after from current account balance: R$ ${currentAccountBalance.toFixed(2)}`);

    newTransactions.sort((a, b) => b.date - a.date);
    let runningBalance = currentAccountBalance;

    for (let i = 0; i < newTransactions.length; i++) {
      newTransactions[i].balance_after = runningBalance;
      runningBalance = runningBalance - newTransactions[i].amount;
    }

    console.log(`[Sync] 💰 Calculated balance_after for ${newTransactions.length} transactions`);
  } else if (hasPluggyBalance) {
    console.log(`[Sync] 💰 Using balance_after from Pluggy API`);
  }

  // INSERIR novas transações em batches
  const BATCH_SIZE = 1000;
  let totalInserted = 0;

  for (let i = 0; i < newTransactions.length; i += BATCH_SIZE) {
    const batch = newTransactions.slice(i, i + BATCH_SIZE);

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(batch);

    if (insertError) {
      console.error(`[Sync] Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError);
    } else {
      totalInserted += batch.length;
      console.log(`[Sync] Batch ${i / BATCH_SIZE + 1}: inserted ${batch.length} transactions`);
    }
  }

  // ATUALIZAR transações existentes
  let totalUpdated = 0;

  for (const update of transactionsToUpdate) {
    const { id, ...updateData } = update;
    const { error: updateError } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id);

    if (!updateError) {
      totalUpdated++;
    } else {
      console.error(`[Sync] Error updating transaction ${id}:`, updateError);
    }
  }

  if (totalUpdated > 0) {
    console.log(`[Sync] 🔄 Updated ${totalUpdated} existing transactions (PENDING -> POSTED or amount changes)`);
  }

  console.log(`[Sync] ✅ Successfully processed: ${totalInserted} inserted, ${totalUpdated} updated`);

  return totalInserted + totalUpdated;
}

export default router;
