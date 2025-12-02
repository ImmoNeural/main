import { Router, Request, Response } from 'express';
import { startOfDay, subDays, format, startOfWeek, endOfWeek, getWeek, getYear, startOfMonth, subMonths } from 'date-fns';
import { supabase } from '../config/supabase';
// authMiddleware removido - já é aplicado no app.ts
import { DashboardStats, CategoryStats, DailyStats, WeeklyStats } from '../types';

const router = Router();

/**
 * Converte período em dias para início de mês completo
 * Ex: Se hoje é 13/11/2025 e period=365 (12 meses), retorna 01/12/2024
 *
 * Lógica: "Últimos N meses" = mês atual + (N-1) meses anteriores
 * - Últimos 12 meses = novembro/2025 + 11 meses anteriores = dezembro/2024 até novembro/2025
 */
function getStartDateFromPeriod(days: number): number {
  const monthsMap: Record<number, number> = {
    30: 1,    // 1 mês (atual)
    60: 2,    // 2 meses (atual + 1 anterior)
    90: 3,    // 3 meses (atual + 2 anteriores)
    180: 6,   // 6 meses (atual + 5 anteriores)
    365: 12,  // 12 meses (atual + 11 anteriores)
  };

  const totalMonths = monthsMap[days] || Math.ceil(days / 30);

  // Subtrair (totalMonths - 1) para incluir o mês atual
  // Ex: 12 meses → subtrair 11 → vai para dezembro/2024 (se hoje é nov/2025)
  const monthsToSubtract = totalMonths - 1;
  const startDate = startOfMonth(subMonths(new Date(), monthsToSubtract));

  console.log(`📅 Período: ${days} dias = ${totalMonths} meses (mês atual + ${monthsToSubtract} anteriores)`);
  console.log(`📅 Data início: ${format(startDate, 'dd/MM/yyyy')} (${startDate.getTime()})`);
  console.log(`📅 Data fim: ${format(new Date(), 'dd/MM/yyyy')}`);

  return startDate.getTime();
}

/**
 * GET /api/dashboard/stats
 * Retorna estatísticas gerais do dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '365', account_id } = req.query; // Padrão: 12 meses

    const daysNum = Number(days);
    const startDate = getStartDateFromPeriod(daysNum); // Usa meses completos
    const endDate = Date.now();

    console.log(`📊 Dashboard stats: user=${user_id.substring(0, 8)}..., account_id=${account_id || 'ALL'}`);

    // Total de saldo de todas as contas + buscar saldo inicial
    // NOTA: Excluir cartões de crédito (account_type = 'card') do saldo total
    let accountsQuery = supabase
      .from('bank_accounts')
      .select('id, balance, initial_balance, initial_balance_date, account_type')
      .eq('user_id', user_id)
      .eq('status', 'active');

    // Se account_id for especificado, filtrar apenas essa conta
    if (account_id) {
      accountsQuery = accountsQuery.eq('id', account_id as string);
    }

    const { data: accounts, error: accountsError } = await accountsQuery;

    if (accountsError) throw accountsError;

    // Excluir cartões de crédito do saldo total (cartões não representam dinheiro disponível)
    const nonCreditCardAccounts = accounts?.filter(acc => acc.account_type !== 'card') || [];
    const total_balance = nonCreditCardAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Buscar saldo inicial salvo na conta (calculado durante importação)
    const initial_balance = accounts && accounts.length > 0 && accounts[0].initial_balance !== undefined
      ? accounts[0].initial_balance
      : null;

    if (initial_balance !== null) {
      console.log(`💰 Saldo Inicial (salvo na conta): R$ ${initial_balance.toFixed(2)}`);
      if (accounts[0].initial_balance_date) {
        console.log(`📅 Data do saldo inicial: ${format(accounts[0].initial_balance_date, 'dd/MM/yyyy')}`);
      }
    } else {
      console.log(`⚠️ Saldo inicial não encontrado na conta - aguardando importação de CSV`);
    }

    // Buscar todas as transações no período
    let transactionsQuery = supabase
      .from('transactions')
      .select('amount, type, category, account_id, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .limit(10000); // Limite alto para garantir todos os dados

    // Se account_id for especificado, filtrar apenas transações dessa conta
    if (account_id) {
      transactionsQuery = transactionsQuery.eq('account_id', account_id as string);
    }

    const { data: transactions, error: transactionsError } = await transactionsQuery;

    if (transactionsError) throw transactionsError;

    // 💰 Buscar saldo atual da conta (balance_after da transação mais recente)
    let recentTransactionQuery = supabase
      .from('transactions')
      .select('balance_after, date, account_id, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .not('balance_after', 'is', null)
      .order('date', { ascending: false }) // Ordena por data DESC para pegar a mais recente
      .limit(1);

    // Se account_id for especificado, filtrar apenas transações dessa conta
    if (account_id) {
      recentTransactionQuery = recentTransactionQuery.eq('account_id', account_id as string);
    }

    const { data: mostRecentTransaction, error: recentError } = await recentTransactionQuery;

    // Atualizar saldo da conta com o saldo da transação mais recente
    if (mostRecentTransaction && mostRecentTransaction.length > 0) {
      const currentBalance = mostRecentTransaction[0].balance_after;
      console.log(`💰 Saldo atual encontrado na transação mais recente: R$ ${currentBalance.toFixed(2)} (data: ${format(mostRecentTransaction[0].date, 'dd/MM/yyyy HH:mm')})`);

      // Atualizar a conta específica ou todas as contas ativas do usuário
      let updateQuery = supabase
        .from('bank_accounts')
        .update({
          balance: currentBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('status', 'active');

      // Se account_id for especificado, atualizar apenas essa conta
      if (account_id) {
        updateQuery = updateQuery.eq('id', account_id as string);
      }

      const { error: updateBalanceError } = await updateQuery;

      if (updateBalanceError) {
        console.error('⚠️ Erro ao atualizar saldo das contas:', updateBalanceError);
      } else {
        console.log(`✅ Saldo das contas atualizado para: R$ ${currentBalance.toFixed(2)}`);
      }
    }

    // Calcular agregações
    let total_income = 0;
    let total_expenses = 0;
    const transaction_count = transactions?.length || 0;

    console.log(`\n📊 DEBUG: Calculando stats para ${transaction_count} transações`);

    transactions?.forEach((tx) => {
      // Calcular totais gerais
      if (tx.type === 'credit') {
        total_income += tx.amount;
      } else if (tx.type === 'debit') {
        total_expenses += Math.abs(tx.amount);
      }
    });

    console.log(`\n✅ RESULTADO:`);
    console.log(`   Saldo Inicial: ${initial_balance !== null ? `R$ ${initial_balance.toFixed(2)}` : 'Não definido'}`);
    console.log(`   Total Income: R$ ${total_income.toFixed(2)}`);
    console.log(`   Total Expenses (todos débitos): R$ ${total_expenses.toFixed(2)}\n`);

    const stats: DashboardStats = {
      total_balance,
      total_income,
      total_expenses,
      initial_balance,
      transaction_count,
      period_start: new Date(startDate).toISOString(),
      period_end: new Date(endDate).toISOString(),
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

/**
 * GET /api/dashboard/expenses-by-category
 * Retorna despesas agrupadas por categoria
 */
router.get('/expenses-by-category', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '365', account_id } = req.query; // Padrão: 12 meses

    const daysNum = Number(days);
    const startDate = getStartDateFromPeriod(daysNum); // Usa meses completos
    const endDate = Date.now();

    console.log(`📊 Expenses by category: user=${user_id.substring(0, 8)}..., account_id=${account_id || 'ALL'}`);

    let query = supabase
      .from('transactions')
      .select('category, amount, account_id, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .eq('type', 'debit')
      .gte('date', startDate)
      .lte('date', endDate)
      .limit(10000); // Limite alto para garantir todos os dados

    // Se account_id for especificado, filtrar apenas transações dessa conta
    if (account_id) {
      query = query.eq('account_id', account_id as string);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Agrupar por categoria
    const categoryMap = new Map<string, { total: number; count: number }>();

    transactions?.forEach((tx) => {
      const category = tx.category || 'Sem Categoria';
      const existing = categoryMap.get(category) || { total: 0, count: 0 };
      existing.total += Math.abs(tx.amount);
      existing.count += 1;
      categoryMap.set(category, existing);
    });

    // Converter para array e calcular percentagens
    const categoryStats = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
    }));

    // Ordenar por total decrescente
    categoryStats.sort((a, b) => b.total - a.total);

    // Calcular total para percentagens
    const totalExpenses = categoryStats.reduce((sum, cat) => sum + cat.total, 0);

    const result: CategoryStats[] = categoryStats.map((cat) => ({
      category: cat.category,
      total: cat.total,
      count: cat.count,
      percentage: totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0,
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    res.status(500).json({ error: 'Failed to fetch expenses by category' });
  }
});

/**
 * GET /api/dashboard/daily-stats
 * Retorna estatísticas diárias
 */
router.get('/daily-stats', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '30', account_id } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();

    // Buscar todas as transações no período
    let query = supabase
      .from('transactions')
      .select('date, amount, type, account_id, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .gte('date', startDate)
      .order('date', { ascending: true })
      .limit(10000); // Limite alto para garantir todos os dados

    // Se account_id for especificado, filtrar apenas transações dessa conta
    if (account_id) {
      query = query.eq('account_id', account_id as string);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Agrupar por dia
    const dailyMap = new Map<string, { income: number; expenses: number }>();

    // Inicializar todos os dias com 0
    for (let i = 0; i < daysNum; i++) {
      const date = format(subDays(new Date(), daysNum - i - 1), 'yyyy-MM-dd');
      dailyMap.set(date, { income: 0, expenses: 0 });
    }

    // Preencher com dados reais
    transactions?.forEach((trans) => {
      const date = format(new Date(trans.date), 'yyyy-MM-dd');
      const day = dailyMap.get(date) || { income: 0, expenses: 0 };

      if (trans.type === 'credit') {
        day.income += trans.amount;
      } else {
        day.expenses += Math.abs(trans.amount);
      }

      dailyMap.set(date, day);
    });

    // Converter para array e calcular saldo acumulado
    let runningBalance = 0;
    const result: DailyStats[] = Array.from(dailyMap.entries()).map(([date, data]) => {
      runningBalance += data.income - data.expenses;
      return {
        date,
        income: data.income,
        expenses: data.expenses,
        balance: runningBalance,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ error: 'Failed to fetch daily stats' });
  }
});

/**
 * GET /api/dashboard/top-merchants
 * Retorna os comerciantes com mais gastos
 */
router.get('/top-merchants', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '90', limit = '10', account_id } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();
    const endDate = Date.now();

    let query = supabase
      .from('transactions')
      .select('merchant, category, amount, account_id, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .eq('type', 'debit')
      .not('merchant', 'is', null)
      .neq('merchant', '')
      .gte('date', startDate)
      .lte('date', endDate)
      .limit(10000); // Limite alto para garantir todos os dados

    // Se account_id for especificado, filtrar apenas transações dessa conta
    if (account_id) {
      query = query.eq('account_id', account_id as string);
    }

    const { data: transactions, error } = await query;

    if (error) throw error;

    // Agrupar por merchant e category
    const merchantMap = new Map<string, { category: string; total: number; count: number }>();

    transactions?.forEach((tx) => {
      const key = `${tx.merchant}|${tx.category}`;
      const existing = merchantMap.get(key) || { category: tx.category || '', total: 0, count: 0 };
      existing.total += Math.abs(tx.amount);
      existing.count += 1;
      merchantMap.set(key, existing);
    });

    // Converter para array e ordenar
    const topMerchants = Array.from(merchantMap.entries())
      .map(([key, data]) => {
        const [merchant] = key.split('|');
        return {
          merchant,
          category: data.category,
          total: data.total,
          count: data.count,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, Number(limit));

    res.json(topMerchants);
  } catch (error) {
    console.error('Error fetching top merchants:', error);
    res.status(500).json({ error: 'Failed to fetch top merchants' });
  }
});

/**
 * GET /api/dashboard/monthly-comparison
 * Compara gastos mensais
 */
router.get('/monthly-comparison', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { months = '6', account_id } = req.query;

    const monthsNum = Number(months);
    const results: Array<{
      month: string;
      income: number;
      expenses: number;
      net: number;
    }> = [];

    for (let i = monthsNum - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const startDate = new Date(year, month - 1, 1).getTime();
      const endDate = new Date(year, month, 0, 23, 59, 59).getTime();

      let query = supabase
        .from('transactions')
        .select('type, amount, account_id, bank_accounts!inner(user_id)')
        .eq('bank_accounts.user_id', user_id)
        .gte('date', startDate)
        .lte('date', endDate)
        .limit(10000); // Limite alto para garantir todos os dados

      // Se account_id for especificado, filtrar apenas transações dessa conta
      if (account_id) {
        query = query.eq('account_id', account_id as string);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      let income = 0;
      let expenses = 0;

      transactions?.forEach((tx) => {
        if (tx.type === 'credit') {
          income += tx.amount;
        } else if (tx.type === 'debit') {
          expenses += Math.abs(tx.amount);
        }
      });

      results.push({
        month: format(date, 'yyyy-MM'),
        income,
        expenses,
        net: income - expenses,
      });
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching monthly comparison:', error);
    res.status(500).json({ error: 'Failed to fetch monthly comparison' });
  }
});

/**
 * GET /api/dashboard/weekly-stats
 * Retorna estatísticas semanais com categorias
 * IMPORTANTE: Filtra transações por DATA (não por semana completa)
 * Ex: Se período é "últimos 3 meses" (set/out/nov), só conta transações >= 01/09,
 * mesmo que a semana 36 comece em 31/08
 */
router.get('/weekly-stats', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { days = '365', account_id } = req.query; // Padrão: 365 dias (12 meses)

    const daysNum = Number(days);
    const endDate = Date.now();
    const startDate = getStartDateFromPeriod(daysNum); // Usa meses completos

    console.log(`📊 Weekly stats request: user=${user_id.substring(0, 8)}..., days=${daysNum}, account_id=${account_id || 'ALL'}`);
    console.log(`📅 Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    console.log(`🔍 Start timestamp: ${startDate}, End timestamp: ${endDate}`);

    // Primeiro, verificar TOTAL de transações do usuário (sem filtro de data)
    const { count: totalCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('bank_accounts.user_id', user_id);

    console.log(`📈 Total transactions in database for user: ${totalCount}`);

    // Buscar todas as transações no período
    // IMPORTANTE: Filtra por DATA desde início do mês
    let query = supabase
      .from('transactions')
      .select('date, amount, type, category, account_id, bank_accounts!inner(user_id)', { count: 'exact' })
      .eq('bank_accounts.user_id', user_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .limit(10000); // Limite alto para garantir que pegue todos os dados

    // Se account_id for especificado, filtrar apenas transações dessa conta
    if (account_id) {
      query = query.eq('account_id', account_id as string);
    }

    const { data: transactions, error, count } = await query;

    console.log(`📊 Query returned ${transactions?.length || 0} transactions (count: ${count})`);

    if (error) {
      console.error('❌ Error fetching transactions:', error);
      throw error;
    }

    if (transactions && transactions.length > 0) {
      console.log(`📅 First transaction date: ${format(new Date(transactions[0].date), 'yyyy-MM-dd')}`);
      console.log(`📅 Last transaction date: ${format(new Date(transactions[transactions.length - 1].date), 'yyyy-MM-dd')}`);
    }

    // Agrupar por semana
    const weeklyMap = new Map<string, WeeklyStats>();

    transactions?.forEach((trans) => {
      const transDate = new Date(trans.date);
      const weekStart = startOfWeek(transDate, { weekStartsOn: 0 }); // Domingo
      const weekEnd = endOfWeek(transDate, { weekStartsOn: 0 });
      const weekNumber = getWeek(transDate, { weekStartsOn: 0 });
      const year = getYear(transDate);
      const weekKey = `${year}-W${weekNumber}`;

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          weekNumber,
          year,
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
          expenses: { total: 0, byCategory: [] },
          income: { total: 0, byCategory: [] },
        });
      }

      const week = weeklyMap.get(weekKey)!;
      const category = trans.category || 'Outros';
      const amount = Math.abs(trans.amount);

      if (trans.type === 'debit') {
        week.expenses.total += amount;
        const catIndex = week.expenses.byCategory.findIndex(c => c.category === category);
        if (catIndex >= 0) {
          week.expenses.byCategory[catIndex].amount += amount;
        } else {
          week.expenses.byCategory.push({ category, amount });
        }
      } else {
        week.income.total += amount;
        const catIndex = week.income.byCategory.findIndex(c => c.category === category);
        if (catIndex >= 0) {
          week.income.byCategory[catIndex].amount += amount;
        } else {
          week.income.byCategory.push({ category, amount });
        }
      }
    });

    // Converter para array e ordenar por data
    const result: WeeklyStats[] = Array.from(weeklyMap.values())
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.weekNumber - b.weekNumber;
      });

    console.log(`✅ Returning ${result.length} weeks (found ${transactions?.length || 0} transactions in period of ${daysNum} days)`);
    console.log(`📊 Weeks: ${result.map(w => `${w.year}-W${w.weekNumber}`).join(', ')}`);

    res.json(result);
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

/**
 * GET /api/dashboard/monthly-stats-by-category
 * Retorna estatísticas mensais com categorias (transação por transação)
 */
router.get('/monthly-stats-by-category', async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { months = '12', category, account_id } = req.query;

    const monthsNum = Number(months);
    const results: Array<{
      month: string;
      monthLabel: string;
      expenses: { total: number; byCategory: Array<{ category: string; amount: number }> };
      income: { total: number; byCategory: Array<{ category: string; amount: number }> };
    }> = [];

    console.log(`📊 Monthly stats by category request: months=${monthsNum}, category=${category || 'all'}, account_id=${account_id || 'ALL'}`);

    for (let i = monthsNum - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const startDate = new Date(year, month - 1, 1).getTime();
      const endDate = new Date(year, month, 0, 23, 59, 59).getTime();

      let query = supabase
        .from('transactions')
        .select('type, amount, category, date, account_id, bank_accounts!inner(user_id)')
        .eq('bank_accounts.user_id', user_id)
        .gte('date', startDate)
        .lte('date', endDate)
        .limit(10000);

      // Se account_id for especificado, filtrar apenas transações dessa conta
      if (account_id) {
        query = query.eq('account_id', account_id as string);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Agrupar por categoria
      const expensesByCategory = new Map<string, number>();
      const incomeByCategory = new Map<string, number>();
      let totalExpenses = 0;
      let totalIncome = 0;

      transactions?.forEach((tx) => {
        const cat = tx.category || 'Outros';
        const amount = Math.abs(tx.amount);

        if (tx.type === 'debit') {
          totalExpenses += amount;
          expensesByCategory.set(cat, (expensesByCategory.get(cat) || 0) + amount);
        } else if (tx.type === 'credit') {
          totalIncome += amount;
          incomeByCategory.set(cat, (incomeByCategory.get(cat) || 0) + amount);
        }
      });

      results.push({
        month: format(date, 'yyyy-MM'),
        monthLabel: format(date, 'MMM/yyyy'),
        expenses: {
          total: totalExpenses,
          byCategory: Array.from(expensesByCategory.entries()).map(([category, amount]) => ({
            category,
            amount,
          })),
        },
        income: {
          total: totalIncome,
          byCategory: Array.from(incomeByCategory.entries()).map(([category, amount]) => ({
            category,
            amount,
          })),
        },
      });
    }

    console.log(`✅ Returning ${results.length} months with transaction-level aggregation`);
    res.json(results);
  } catch (error) {
    console.error('Error fetching monthly stats by category:', error);
    res.status(500).json({ error: 'Failed to fetch monthly stats by category' });
  }
});

export default router;
