/**
 * Serviço de tarefas agendadas (Cron Jobs)
 *
 * Agenda:
 * - Todos os dias às 7:00 AM (horário do servidor): Sincronizar todas as contas bancárias
 */

import cron from 'node-cron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import openBankingService from './openBanking.service';
import type { OpenBankingTransaction } from '../types';

// Lazy initialization do Supabase (evita erro de variáveis não carregadas)
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('[Cron] Supabase credentials not configured');
    }

    _supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('[Cron] ✅ Supabase client initialized');
  }
  return _supabase;
}

/**
 * Sincroniza transações de uma conta específica
 * UPSERT: Atualiza existentes (status, amount) e insere novas
 * Importante para cartões de crédito onde transações PENDING viram POSTED
 */
async function syncAccountTransactions(account: any, currentAccountBalance?: number): Promise<{ inserted: number; updated: number }> {
  try {
    const { PluggyService } = await import('./providers/pluggy.service');
    const pluggyService = new PluggyService();

    // Detectar se é cartão de crédito
    const isCreditCard = account.account_type === 'card';

    // Buscar transações dos últimos 60 dias
    // Para cartões de crédito, usar método especial que inclui fatura aberta
    let transactions;

    if (isCreditCard) {
      console.log(`[Cron] 💳 Using getAllCreditCardTransactions to include open bill transactions`);
      transactions = await pluggyService.getAllCreditCardTransactions(
        account.access_token,
        account.provider_account_id,
        60 // Últimos 60 dias para pegar faturas de cartão
      );
    } else {
      transactions = await pluggyService.getTransactions(
        account.access_token,
        account.provider_account_id,
        60 // Últimos 60 dias
      );
    }

    if (transactions.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    console.log(`[Cron] 📊 Fetched ${transactions.length} transactions from Pluggy`);

    // Buscar transações existentes para comparar
    const providerTransactionIds = transactions.map(t => t.transaction_id);
    const { data: existingTransactions } = await getSupabase()
      .from('transactions')
      .select('id, transaction_id, status, amount, description')
      .eq('account_id', account.id)
      .in('transaction_id', providerTransactionIds);

    const existingMap = new Map(
      (existingTransactions || []).map((t: any) => [t.transaction_id, t])
    );

    // Separar em novas e para atualizar
    const newTransactions: any[] = [];
    const transactionsToUpdate: any[] = [];

    for (const t of transactions) {
      let amount = t.transaction_amount.amount;

      // Cartão de crédito: inverter valores positivos para negativos (gastos)
      if (isCreditCard && amount > 0) {
        amount = -Math.abs(amount);
      }

      const description = t.remittance_information || '';
      const merchant = t.creditor_name || t.debtor_name || description;

      // Mapear status do Pluggy: POSTED = completed, PENDING = pending
      const pluggyStatus = t.status === 'BOOK' ? 'completed' : 'pending';

      const existing = existingMap.get(t.transaction_id);

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
            updated_at: new Date().toISOString(),
          });
        }
      } else {
        // Transação nova
        newTransactions.push({
          user_id: account.user_id,
          account_id: account.id,
          transaction_id: t.transaction_id,
          date: new Date(t.booking_date).getTime(),
          description: description,
          merchant: merchant,
          amount: amount,
          currency: t.transaction_amount.currency,
          category: 'Não Categorizado',
          type: amount < 0 ? 'debit' : 'credit',
          balance_after: t.balance_after_transaction?.amount as number | undefined,
          reference: description,
          status: pluggyStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    console.log(`[Cron] 📊 New: ${newTransactions.length}, To update: ${transactionsToUpdate.length}`);

    // Calcular balance_after para novas transações se necessário
    const hasPluggyBalance = newTransactions.some(t => t.balance_after !== undefined && t.balance_after !== null);

    if (!hasPluggyBalance && currentAccountBalance !== undefined && newTransactions.length > 0) {
      console.log(`[Cron] 💰 Calculating balance_after from current balance: R$ ${currentAccountBalance.toFixed(2)}`);

      newTransactions.sort((a, b) => b.date - a.date);
      let runningBalance = currentAccountBalance;

      for (let i = 0; i < newTransactions.length; i++) {
        newTransactions[i].balance_after = runningBalance;
        runningBalance = runningBalance - newTransactions[i].amount;
      }
    }

    // Inserir novas transações em batches
    const BATCH_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < newTransactions.length; i += BATCH_SIZE) {
      const batch = newTransactions.slice(i, i + BATCH_SIZE);
      const { error } = await getSupabase()
        .from('transactions')
        .insert(batch);

      if (!error) {
        totalInserted += batch.length;
      } else {
        console.error(`[Cron] ❌ Error inserting batch:`, error.message);
      }
    }

    // Atualizar transações existentes
    let totalUpdated = 0;

    for (const update of transactionsToUpdate) {
      const { id, ...updateData } = update;
      const { error } = await getSupabase()
        .from('transactions')
        .update(updateData)
        .eq('id', id);

      if (!error) {
        totalUpdated++;
      } else {
        console.error(`[Cron] ❌ Error updating transaction ${id}:`, error.message);
      }
    }

    if (totalUpdated > 0) {
      console.log(`[Cron] 🔄 Updated ${totalUpdated} existing transactions (PENDING -> POSTED or amount changes)`);
    }

    return { inserted: totalInserted, updated: totalUpdated };
  } catch (error: any) {
    console.error(`[Cron] ❌ Error syncing account ${account.id}:`, error.message);
    return { inserted: 0, updated: 0 };
  }
}

/**
 * Job: Sincronizar todas as contas bancárias
 * Executa todos os dias às 7:00 AM
 */
async function syncAllBankAccounts(): Promise<void> {
  console.log('[Cron] 🔄 ========================================');
  console.log('[Cron] 🔄 DAILY BANK SYNC - START');
  console.log('[Cron] 🔄 ========================================');
  console.log(`[Cron] 📋 Timestamp: ${new Date().toISOString()}`);

  try {
    // Buscar todas as contas com access_token válido
    const { data: accounts, error } = await getSupabase()
      .from('bank_accounts')
      .select('id, user_id, bank_name, access_token, provider_account_id, account_type')
      .not('access_token', 'is', null);

    if (error) {
      console.error('[Cron] ❌ Error fetching accounts:', error.message);
      return;
    }

    if (!accounts || accounts.length === 0) {
      console.log('[Cron] ℹ️ No accounts to sync');
      return;
    }

    console.log(`[Cron] 📊 Found ${accounts.length} accounts to sync`);

    let successCount = 0;
    let errorCount = 0;
    let totalInserted = 0;
    let totalUpdated = 0;

    // Processar cada conta sequencialmente (para não sobrecarregar a API)
    for (const account of accounts) {
      try {
        console.log(`[Cron] 🔄 Syncing account: ${account.bank_name} (${account.id})`);

        // 1. Disparar updateItem para buscar dados frescos
        await openBankingService.updateItem(account.access_token);

        // 2. Aguardar item ficar pronto (máximo 30s)
        await openBankingService.waitForItemReady(account.access_token, 15);

        // 3. Buscar saldo atualizado do Pluggy
        let updatedBalance = 0;
        let creditLimit: number | null = null;
        try {
          const pluggyAccounts = await openBankingService.getAccounts(account.access_token);
          const matchingAccount = pluggyAccounts.find(pa => pa.id === account.provider_account_id);
          if (matchingAccount && matchingAccount.balance) {
            updatedBalance = matchingAccount.balance.amount;
            console.log(`[Cron] 💰 Balance from Pluggy: R$ ${updatedBalance.toFixed(2)}`);

            // Buscar limite de crédito (cartão ou cheque especial)
            if (matchingAccount.credit_limit) {
              creditLimit = matchingAccount.credit_limit;
              console.log(`[Cron] 💳 Credit limit: R$ ${creditLimit.toFixed(2)}`);
            } else if (matchingAccount.overdraft_limit) {
              creditLimit = matchingAccount.overdraft_limit;
              console.log(`[Cron] 🏦 Overdraft limit: R$ ${creditLimit.toFixed(2)}`);
            }
          }
        } catch (balanceError: any) {
          console.error(`[Cron] ⚠️ Error fetching balance:`, balanceError.message);
        }

        // 4. Sincronizar transações (passar saldo atual para calcular balance_after)
        const syncResult = await syncAccountTransactions(account, updatedBalance);
        totalInserted += syncResult.inserted;
        totalUpdated += syncResult.updated;

        // 5. Atualizar last_sync_at, saldo E limite de crédito
        const updateData: any = {
          balance: updatedBalance,
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        if (creditLimit !== null) {
          updateData.credit_limit = creditLimit;
        }

        await getSupabase()
          .from('bank_accounts')
          .update(updateData)
          .eq('id', account.id);

        const syncSummary = syncResult.inserted > 0 || syncResult.updated > 0
          ? `${syncResult.inserted} new, ${syncResult.updated} updated`
          : 'no changes';
        console.log(`[Cron] ✅ Account ${account.bank_name}: ${syncSummary}, balance R$ ${updatedBalance.toFixed(2)}${creditLimit ? ` (limit: R$ ${creditLimit.toFixed(2)})` : ''}`);
        successCount++;

        // Pequeno delay entre contas para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (accountError: any) {
        console.error(`[Cron] ❌ Error syncing ${account.bank_name}:`, accountError.message);
        errorCount++;
      }
    }

    console.log('[Cron] 🔄 ========================================');
    console.log('[Cron] 🔄 DAILY BANK SYNC - COMPLETE');
    console.log('[Cron] 🔄 ========================================');
    console.log(`[Cron] ✅ Accounts synced successfully: ${successCount}`);
    console.log(`[Cron] ❌ Accounts with errors: ${errorCount}`);
    console.log(`[Cron] 📊 Transactions - New: ${totalInserted}, Updated: ${totalUpdated}`);
    console.log(`[Cron] 📋 Timestamp: ${new Date().toISOString()}`);

  } catch (error: any) {
    console.error('[Cron] ❌ ========================================');
    console.error('[Cron] ❌ DAILY BANK SYNC - FAILED');
    console.error('[Cron] ❌ ========================================');
    console.error(`[Cron] ❌ Error: ${error.message}`);
    console.error(`[Cron] ❌ Stack: ${error.stack || 'N/A'}`);
  }
}

/**
 * Inicializa todos os cron jobs
 */
export function initCronJobs(): void {
  console.log('[Cron] 🕐 Initializing cron jobs...');

  // Sincronização diária às 7:00 AM (horário do servidor)
  // Formato: minuto hora dia-do-mês mês dia-da-semana
  // '0 7 * * *' = às 7:00 de cada dia
  cron.schedule('0 7 * * *', async () => {
    console.log('[Cron] ⏰ Triggered: Daily bank sync (7:00 AM)');
    await syncAllBankAccounts();
  }, {
    timezone: 'America/Sao_Paulo' // Horário de Brasília
  });

  console.log('[Cron] ✅ Cron jobs initialized:');
  console.log('[Cron]    - Daily bank sync: 7:00 AM (America/Sao_Paulo)');

  // Log do próximo horário de execução
  const now = new Date();
  const nextRun = new Date();
  nextRun.setHours(7, 0, 0, 0);
  if (now.getHours() >= 7) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  console.log(`[Cron]    - Next run: ${nextRun.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
}

// Exportar função de sync manual (para testes ou endpoint administrativo)
export { syncAllBankAccounts };
