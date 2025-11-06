import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import openBankingService from '../services/openBanking.service';
import categorizationService from '../services/categorization.service';
import { BankAccount, Transaction } from '../types';

const router = Router();

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
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { bank_id, user_id = 'demo_user' } = req.body;

    if (!bank_id) {
      return res.status(400).json({ error: 'bank_id is required' });
    }

    const authResponse = await openBankingService.initiateAuth({
      bank_id,
      redirect_uri: process.env.OPEN_BANKING_REDIRECT_URI || 'http://localhost:3000/bank/callback',
      user_id,
    });

    res.json(authResponse);
  } catch (error) {
    console.error('Error initiating bank connection:', error);
    res.status(500).json({ error: 'Failed to initiate bank connection' });
  }
});

/**
 * POST /api/bank/callback
 * Processa o callback após autorização do banco
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, bank_name, user_id = 'demo_user' } = req.body;

    if (!code || !state) {
      return res.status(400).json({ error: 'code and state are required' });
    }

    // Trocar código por token
    const tokenResponse = await openBankingService.exchangeCodeForToken(code, state);

    // Buscar contas do usuário
    const accounts = await openBankingService.getAccounts(tokenResponse.access_token);

    // Salvar cada conta no banco de dados
    const savedAccounts: BankAccount[] = [];

    for (const account of accounts) {
      const accountId = uuidv4();
      const now = Date.now();

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

      const stmt = db.prepare(`
        INSERT INTO bank_accounts (
          id, user_id, bank_name, account_number, iban, account_type,
          balance, currency, access_token, refresh_token, token_expires_at,
          consent_id, consent_expires_at, connected_at, status, provider_account_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        bankAccount.id,
        bankAccount.user_id,
        bankAccount.bank_name,
        bankAccount.account_number,
        bankAccount.iban,
        bankAccount.account_type,
        bankAccount.balance,
        bankAccount.currency,
        bankAccount.access_token,
        bankAccount.refresh_token,
        bankAccount.token_expires_at,
        bankAccount.consent_id,
        bankAccount.consent_expires_at,
        bankAccount.connected_at,
        bankAccount.status,
        bankAccount.provider_account_id,
        bankAccount.created_at,
        bankAccount.updated_at
      );

      savedAccounts.push(bankAccount);

      // Buscar e salvar transações dos últimos 90 dias
      await syncTransactions(accountId, tokenResponse.access_token);
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
router.get('/accounts', (req: Request, res: Response) => {
  try {
    const { user_id = 'demo_user' } = req.query;

    const accounts = db
      .prepare(
        `SELECT id, user_id, bank_name, account_number, iban, account_type,
         balance, currency, connected_at, last_sync_at, status, created_at, updated_at
         FROM bank_accounts WHERE user_id = ? ORDER BY created_at DESC`
      )
      .all(user_id) as BankAccount[];

    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

/**
 * POST /api/bank/accounts/:accountId/sync
 * Sincroniza transações de uma conta
 */
router.post('/accounts/:accountId/sync', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const account = db
      .prepare('SELECT * FROM bank_accounts WHERE id = ?')
      .get(accountId) as BankAccount | undefined;

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (!account.access_token) {
      return res.status(400).json({ error: 'Account has no access token' });
    }

    const transactionCount = await syncTransactions(accountId, account.access_token);

    // Atualizar last_sync_at
    db.prepare('UPDATE bank_accounts SET last_sync_at = ?, updated_at = ? WHERE id = ?')
      .run(Date.now(), Date.now(), accountId);

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
router.delete('/accounts/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const account = db
      .prepare('SELECT * FROM bank_accounts WHERE id = ?')
      .get(accountId) as BankAccount | undefined;

    if (!account) {
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

    // Deletar conta (cascata deletará transações)
    db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(accountId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

/**
 * Função auxiliar para sincronizar transações
 */
async function syncTransactions(accountId: string, accessToken: string): Promise<number> {
  // Buscar o provider_account_id do banco de dados
  const account = db
    .prepare('SELECT provider_account_id FROM bank_accounts WHERE id = ?')
    .get(accountId) as { provider_account_id?: string } | undefined;

  if (!account || !account.provider_account_id) {
    console.warn(`[Sync] Account ${accountId} has no provider_account_id, skipping transactions sync`);
    return 0;
  }

  console.log(`[Sync] Fetching transactions for account ${accountId} (provider: ${account.provider_account_id})`);

  const transactions = await openBankingService.getTransactions(
    accessToken,
    account.provider_account_id, // Usar o ID da conta no provedor
    90
  );

  console.log(`[Sync] Found ${transactions.length} transactions`);

  let count = 0;

  for (const trans of transactions) {
    const transId = uuidv4();
    const now = Date.now();
    const amount = trans.transaction_amount.amount;
    const description = trans.remittance_information || '';
    const merchant = trans.creditor_name || trans.debtor_name || '';

    // Categorizar automaticamente
    const categorization = categorizationService.categorizeTransaction(description, merchant);

    const transaction: Transaction = {
      id: transId,
      account_id: accountId,
      transaction_id: trans.transaction_id,
      date: new Date(trans.booking_date).getTime(),
      amount,
      currency: trans.transaction_amount.currency,
      description,
      merchant,
      category: categorization.category,
      type: amount < 0 ? 'debit' : 'credit',
      balance_after: trans.balance_after_transaction?.amount,
      reference: trans.remittance_information,
      status: 'completed',
      created_at: now,
      updated_at: now,
    };

    // Verificar se a transação já existe
    const existing = db
      .prepare('SELECT id FROM transactions WHERE account_id = ? AND transaction_id = ?')
      .get(accountId, trans.transaction_id);

    if (!existing) {
      const stmt = db.prepare(`
        INSERT INTO transactions (
          id, account_id, transaction_id, date, amount, currency, description,
          merchant, category, type, balance_after, reference, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        transaction.id,
        transaction.account_id,
        transaction.transaction_id,
        transaction.date,
        transaction.amount,
        transaction.currency,
        transaction.description,
        transaction.merchant,
        transaction.category,
        transaction.type,
        transaction.balance_after,
        transaction.reference,
        transaction.status,
        transaction.created_at,
        transaction.updated_at
      );

      count++;
    }
  }

  return count;
}

export default router;
