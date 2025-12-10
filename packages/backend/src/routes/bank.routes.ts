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

    console.log('[Bank] 🏦 ========================================');
    console.log('[Bank] 🏦 ====== BANK CALLBACK SUCCESS ======');
    console.log('[Bank] 🏦 ========================================');
    console.log(`[Bank] ✅ Saved ${savedAccounts.length} accounts`);
    savedAccounts.forEach((acc, idx) => {
      console.log(`[Bank] ✅ Account ${idx + 1}: ${acc.bank_name} (${acc.id})`);
    });
    console.log('[Bank] ✅ Timestamp:', new Date().toISOString());

    res.json({
      success: true,
      accounts: savedAccounts.map(acc => ({
        id: acc.id,
        bank_name: acc.bank_name,
        iban: acc.iban,
        balance: acc.balance,
        currency: acc.currency,
      })),
      message: savedAccounts.length > 0
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
 * Lista todas as contas conectadas com saldo calculado a partir das transações
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT

    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('id, user_id, bank_name, account_number, iban, account_type, balance, initial_balance, currency, connected_at, last_sync_at, status, created_at, updated_at')
      .eq('user_id', user_id)
      .neq('status', 'disconnected')  // Excluir contas desconectadas
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!accounts || accounts.length === 0) {
      return res.json([]);
    }

    // 💰 Calcular saldo real para cada conta (exceto cartões de crédito)
    const accountsWithCalculatedBalance = await Promise.all(
      accounts.map(async (account) => {
        // Cartões de crédito não têm saldo calculado
        if (account.account_type === 'card') {
          return { ...account, balance: 0 };
        }

        // Buscar soma de todas as transações da conta
        const { data: transactionsSum, error: txError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('account_id', account.id);

        if (txError) {
          console.error(`⚠️ Erro ao calcular saldo da conta ${account.id}:`, txError);
          return account;
        }

        // Calcular: initial_balance + soma das transações
        const sum = (transactionsSum || []).reduce((total, tx) => total + (tx.amount || 0), 0);
        const calculatedBalance = (account.initial_balance || 0) + sum;

        // Atualizar no banco se diferente
        if (Math.abs(calculatedBalance - (account.balance || 0)) > 0.01) {
          await supabase
            .from('bank_accounts')
            .update({ balance: calculatedBalance, updated_at: new Date().toISOString() })
            .eq('id', account.id);
        }

        return { ...account, balance: calculatedBalance };
      })
    );

    res.json(accountsWithCalculatedBalance);
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

    // 🔄 STEP 3: Buscar transações atualizadas (mesmo se não estiver 100% pronto)
    console.log(`[Bank Sync] 📊 Step 3: Fetching transactions...`);
    const transactionCount = await syncTransactions(accountId, account.access_token);

    // Atualizar last_sync_at
    await supabase
      .from('bank_accounts')
      .update({
        last_sync_at: toISOString(Date.now()),
        updated_at: toISOString(Date.now())
      })
      .eq('id', accountId);

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
 * 2. Verificação em lote: busca todos transaction_ids existentes de uma vez
 * 3. Bulk insert: insere todas as novas transações em uma única operação
 *
 * Performance:
 * - Antes: N queries (1 por transação) = 1000 transações = 1000 queries
 * - Depois: 3 queries fixas (account + existing + bulk insert) = 3 queries
 * - Melhoria: ~333x mais rápido para 1000 transações
 */
async function syncTransactions(accountId: string, accessToken: string, forceFullSync: boolean = false): Promise<number> {
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

    // Adicionar 1 dia extra para garantir que não perdemos nenhuma transação
    daysToSync = Math.min(daysSinceLastSync + 1, 365);

    console.log(`[Sync] Incremental sync: fetching last ${daysToSync} days (since ${lastSyncDate.toISOString()})`);
  } else {
    console.log(`[Sync] Full sync: fetching last ${daysToSync} days`);
  }

  console.log(`[Sync] Fetching transactions for account ${accountId} (provider: ${account.provider_account_id})`);

  // Buscar transações do provedor
  let transactions = await openBankingService.getTransactions(
    accessToken,
    account.provider_account_id,
    daysToSync
  );

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

  // OTIMIZAÇÃO: Buscar todos os transaction_ids existentes de uma só vez
  const providerTransactionIds = transactions.map(t => t.transaction_id);

  const { data: existingTransactions } = await supabase
    .from('transactions')
    .select('transaction_id')
    .eq('account_id', accountId)
    .in('transaction_id', providerTransactionIds);

  // Criar Set para lookup O(1)
  const existingIds = new Set(
    (existingTransactions || []).map((t: any) => t.transaction_id)
  );

  console.log(`[Sync] ${existingIds.size} transactions already exist in database`);

  // Filtrar apenas transações novas
  const newTransactions = transactions.filter(t => !existingIds.has(t.transaction_id));

  console.log(`[Sync] ${newTransactions.length} new transactions to insert`);

  if (newTransactions.length === 0) {
    return 0;
  }

  // Preparar dados para bulk insert
  const now = Date.now();
  const transactionsToInsert = newTransactions.map(trans => {
    const amount = trans.transaction_amount.amount;
    const description = trans.remittance_information || '';
    const merchant = trans.creditor_name || trans.debtor_name || '';

    // Categorizar automaticamente
    const categorization = categorizationService.categorizeTransaction(description, merchant);

    return {
      id: uuidv4(),
      user_id: account.user_id, // Adicionar user_id para queries mais eficientes
      account_id: accountId,
      transaction_id: trans.transaction_id,
      date: new Date(trans.booking_date).getTime(), // BIGINT em ms
      amount,
      currency: trans.transaction_amount.currency,
      description,
      merchant,
      category: categorization.category,
      type: amount < 0 ? 'debit' : 'credit',
      // NOTA: balance_after geralmente é null porque o Pluggy não retorna balance_after_transaction
      // Isso impede o cálculo preciso do saldo acumulado real (que deveria ser: saldo inicial + deltas)
      // Por enquanto, o saldo acumulado é calculado apenas a partir dos deltas de transações
      balance_after: trans.balance_after_transaction?.amount,
      reference: trans.remittance_information,
      status: 'completed',
      created_at: toISOString(now), // TIMESTAMPTZ
      updated_at: toISOString(now), // TIMESTAMPTZ
    };
  });

  // OTIMIZAÇÃO: Bulk insert - inserir todas as transações de uma vez
  // Dividir em batches de 1000 para evitar limites do Supabase
  const BATCH_SIZE = 1000;
  let totalInserted = 0;

  for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
    const batch = transactionsToInsert.slice(i, i + BATCH_SIZE);

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

  console.log(`[Sync] Successfully inserted ${totalInserted} new transactions`);

  return totalInserted;
}

export default router;
