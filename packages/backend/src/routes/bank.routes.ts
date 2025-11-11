import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import openBankingService from '../services/openBanking.service';
import categorizationService from '../services/categorization.service';
import { authMiddleware } from '../middleware/auth.supabase.middleware';
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
    const { country = 'BR' } = req.query; // Padrão BR para Brasil
    const banks = await openBankingService.getAvailableBanks(country as string);
    res.json(banks);
  } catch (error) {
    console.error('Error fetching available banks:', error);
    res.status(500).json({ error: 'Failed to fetch available banks' });
  }
});

/**
 * POST /api/bank/connect
 * Inicia o processo de conexão com um banco
 */
router.post('/connect', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { bank_id } = req.body;
    const user_id = req.userId!; // Obtido do token JWT

    if (!bank_id) {
      return res.status(400).json({ error: 'bank_id is required' });
    }

    try {
      // Tentar autenticação real com Pluggy
      const authResponse = await openBankingService.initiateAuth({
        bank_id,
        redirect_uri: process.env.OPEN_BANKING_REDIRECT_URI || 'http://localhost:3000/bank/callback',
        user_id,
      });

      res.json(authResponse);
    } catch (pluggyError) {
      // Se falhar com Pluggy (credenciais expiradas, etc), usar modo demo
      console.log('[Bank] ⚠️ Pluggy authentication failed, activating DEMO MODE');
      console.log('[Bank] 🎭 Demo mode activated for bank_id:', bank_id);

      // Retornar URL de demonstração
      const mockState = `DEMO_${bank_id}_${Date.now()}`;
      res.json({
        authorization_url: `demo-mode://connect/${bank_id}`,
        state: mockState,
        consent_id: mockState,
        demo_mode: true,
        bank_id: bank_id,
      });
    }
  } catch (error) {
    console.error('Error initiating bank connection:', error);
    res.status(500).json({ error: 'Failed to initiate bank connection' });
  }
});

/**
 * POST /api/bank/callback
 * Processa o callback após autorização do banco
 */
router.post('/callback', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { code, state, bank_name } = req.body;
    const user_id = req.userId!; // Obtido do token JWT

    if (!code || !state) {
      return res.status(400).json({ error: 'code and state are required' });
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
    console.log('[Bank] Processing real Pluggy callback');

    // Trocar código por token
    const tokenResponse = await openBankingService.exchangeCodeForToken(code, state);

    // Buscar contas do usuário
    const accounts = await openBankingService.getAccounts(tokenResponse.access_token);

    // Salvar cada conta no banco de dados
    const savedAccounts: BankAccount[] = [];

    for (const account of accounts) {
      const now = Date.now();

      // RECONEXÃO INTELIGENTE: Verificar se já existe uma conta (ativa ou desconectada)
      // com o mesmo IBAN ou provider_account_id para este usuário
      const { data: existingAccount } = await supabase
        .from('bank_accounts')
        .select('id, status, last_sync_at')
        .eq('user_id', user_id)
        .or(`iban.eq.${account.iban},provider_account_id.eq.${account.id}`)
        .single();

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

        const bankAccount: BankAccount = {
          id: accountId,
          user_id,
          bank_name: bank_name || 'Unknown Bank',
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

      // Sincronizar transações
      // - Se é reconexão e tem last_sync_at: sync incremental
      // - Se é nova conexão ou primeira sync: sync completo
      const forceFullSync = !isReconnection || !existingAccount?.last_sync_at;

      console.log(`[Bank] Starting transaction sync (${forceFullSync ? 'full' : 'incremental'})`);

      await syncTransactions(accountId, tokenResponse.access_token, forceFullSync);

      // Atualizar last_sync_at após sincronização bem-sucedida
      await supabase
        .from('bank_accounts')
        .update({ last_sync_at: toISOString(Date.now()) })
        .eq('id', accountId);

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

    res.json({
      success: true,
      accounts: savedAccounts.map(acc => ({
        id: acc.id,
        bank_name: acc.bank_name,
        iban: acc.iban,
        balance: acc.balance,
        currency: acc.currency,
      })),
    });
  } catch (error) {
    console.error('Error processing callback:', error);
    res.status(500).json({ error: 'Failed to process bank callback' });
  }
});

/**
 * GET /api/bank/accounts
 * Lista todas as contas conectadas
 */
router.get('/accounts', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT

    const { data: accounts, error } = await supabase
      .from('bank_accounts')
      .select('id, user_id, bank_name, account_number, iban, account_type, balance, currency, connected_at, last_sync_at, status, created_at, updated_at')
      .eq('user_id', user_id)
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
 */
router.post('/accounts/:accountId/sync', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const { data: account, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!account.access_token) {
      return res.status(400).json({ error: 'Account has no access token' });
    }

    const transactionCount = await syncTransactions(accountId, account.access_token);

    // Atualizar last_sync_at
    await supabase
      .from('bank_accounts')
      .update({
        last_sync_at: toISOString(Date.now()),
        updated_at: toISOString(Date.now())
      })
      .eq('id', accountId);

    res.json({
      success: true,
      transactions_synced: transactionCount,
    });
  } catch (error) {
    console.error('Error syncing account:', error);
    res.status(500).json({ error: 'Failed to sync account' });
  }
});

/**
 * DELETE /api/bank/accounts/:accountId
 * Remove uma conta conectada
 */
router.delete('/accounts/:accountId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const { data: account, error: fetchError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (fetchError || !account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Revogar consentimento no banco
    if (account.access_token) {
      try {
        await openBankingService.revokeConsent(account.access_token);
      } catch (error) {
        console.warn('Failed to revoke consent:', error);
      }
    }

    // Soft delete: Marcar conta como desconectada, preservando dados históricos
    const { error: updateError } = await supabase
      .from('bank_accounts')
      .update({
        status: 'disconnected',
        access_token: null,
        refresh_token: null,
        updated_at: Date.now()
      })
      .eq('id', accountId);

    if (updateError) {
      throw updateError;
    }

    res.json({
      success: true,
      message: 'Bank account disconnected. Historical data preserved.'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
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
  // Buscar dados da conta incluindo last_sync_at
  const { data: account, error } = await supabase
    .from('bank_accounts')
    .select('provider_account_id, last_sync_at')
    .eq('id', accountId)
    .single();

  if (error || !account || !account.provider_account_id) {
    console.warn(`[Sync] Account ${accountId} has no provider_account_id, skipping transactions sync`);
    return 0;
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
  const transactions = await openBankingService.getTransactions(
    accessToken,
    account.provider_account_id,
    daysToSync
  );

  console.log(`[Sync] Found ${transactions.length} transactions from provider`);

  if (transactions.length === 0) {
    return 0;
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
      account_id: accountId,
      transaction_id: trans.transaction_id,
      date: new Date(trans.booking_date).getTime(), // BIGINT em ms
      amount,
      currency: trans.transaction_amount.currency,
      description,
      merchant,
      category: categorization.category,
      type: amount < 0 ? 'debit' : 'credit',
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
