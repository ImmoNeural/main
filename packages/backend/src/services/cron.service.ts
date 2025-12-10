/**
 * Serviço de tarefas agendadas (Cron Jobs)
 *
 * Agenda:
 * - Todos os dias às 7:00 AM (horário do servidor): Sincronizar todas as contas bancárias
 */

import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import openBankingService from './openBanking.service';
import type { OpenBankingTransaction } from '../types';

// Inicializar Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Sincroniza transações de uma conta específica
 * (Versão simplificada sem depender de bank.routes.ts)
 */
async function syncAccountTransactions(account: any): Promise<number> {
  try {
    const { PluggyService } = await import('./providers/pluggy.service');
    const pluggyService = new PluggyService();

    // Buscar transações dos últimos 30 dias (para cron diário, não precisa de mais)
    const transactions = await pluggyService.getTransactions(
      account.access_token,
      account.provider_account_id,
      30 // Últimos 30 dias
    );

    if (transactions.length === 0) {
      return 0;
    }

    // Buscar IDs existentes para evitar duplicatas
    const providerTransactionIds = transactions.map(t => t.transaction_id);
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('transaction_id')
      .eq('account_id', account.id)
      .in('transaction_id', providerTransactionIds);

    const existingIds = new Set(
      (existingTransactions || []).map((t: any) => t.transaction_id)
    );

    // Filtrar apenas novas
    const newTransactions = transactions.filter(t => !existingIds.has(t.transaction_id));

    if (newTransactions.length === 0) {
      return 0;
    }

    // Detectar se é cartão de crédito
    const isCreditCard = account.account_type === 'card';

    // Mapear para formato do banco de dados
    const transactionsToInsert = newTransactions.map(t => {
      let amount = t.transaction_amount.amount;

      // Cartão de crédito: inverter valores positivos para negativos
      if (isCreditCard && amount > 0) {
        amount = -Math.abs(amount);
      }

      // Usar remittance_information como descrição (conforme OpenBankingTransaction)
      const description = t.remittance_information || '';
      // Merchant: creditor para receitas, debtor para despesas
      const merchant = t.creditor_name || t.debtor_name || description;

      return {
        user_id: account.user_id,
        account_id: account.id,
        transaction_id: t.transaction_id,
        date: t.booking_date,
        description: description,
        merchant: merchant,
        amount: amount,
        currency: t.transaction_amount.currency,
        category: 'Não Categorizado',
        source: 'open_banking',
      };
    });

    // Inserir em batches
    const BATCH_SIZE = 100;
    let totalInserted = 0;

    for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
      const batch = transactionsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('transactions')
        .insert(batch);

      if (!error) {
        totalInserted += batch.length;
      }
    }

    return totalInserted;
  } catch (error: any) {
    console.error(`[Cron] ❌ Error syncing account ${account.id}:`, error.message);
    return 0;
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
    const { data: accounts, error } = await supabase
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
    let totalTransactions = 0;

    // Processar cada conta sequencialmente (para não sobrecarregar a API)
    for (const account of accounts) {
      try {
        console.log(`[Cron] 🔄 Syncing account: ${account.bank_name} (${account.id})`);

        // 1. Disparar updateItem para buscar dados frescos
        await openBankingService.updateItem(account.access_token);

        // 2. Aguardar item ficar pronto (máximo 30s)
        await openBankingService.waitForItemReady(account.access_token, 15);

        // 3. Sincronizar transações
        const transactionCount = await syncAccountTransactions(account);
        totalTransactions += transactionCount;

        // 4. Atualizar last_sync_at
        await supabase
          .from('bank_accounts')
          .update({
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id);

        console.log(`[Cron] ✅ Account ${account.bank_name}: ${transactionCount} new transactions`);
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
    console.log(`[Cron] 📊 Total new transactions: ${totalTransactions}`);
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
