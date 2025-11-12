import { Router, Request, Response } from 'express';
import { startOfDay, subDays, format, startOfWeek, endOfWeek, getWeek, getYear } from 'date-fns';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.supabase.middleware';
import { DashboardStats, CategoryStats, DailyStats, WeeklyStats } from '../types';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Retorna estatísticas gerais do dashboard
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '90' } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();
    const endDate = Date.now();

    // Total de saldo de todas as contas
    const { data: accounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select('balance')
      .eq('user_id', user_id)
      .eq('status', 'active');

    if (accountsError) throw accountsError;

    const total_balance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;

    // Buscar todas as transações no período
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('amount, type, category, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .limit(10000); // Limite alto para garantir todos os dados

    if (transactionsError) throw transactionsError;

    // Calcular agregações
    let total_income = 0;
    let total_expenses = 0;
    let investment_balance = 0;
    const transaction_count = transactions?.length || 0;

    transactions?.forEach((tx) => {
      // Calcular investimentos: soma TODAS transações categorizadas como Investimentos
      if (tx.category === 'Investimentos') {
        investment_balance += Math.abs(tx.amount);
      }

      // Calcular totais gerais
      if (tx.type === 'credit') {
        total_income += tx.amount;
      } else if (tx.type === 'debit') {
        total_expenses += Math.abs(tx.amount);
      }
    });

    const stats: DashboardStats = {
      total_balance,
      total_income,
      total_expenses,
      investment_balance,
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
router.get('/expenses-by-category', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '90' } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();
    const endDate = Date.now();

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('category, amount, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .eq('type', 'debit')
      .gte('date', startDate)
      .lte('date', endDate)
      .limit(10000); // Limite alto para garantir todos os dados

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
router.get('/daily-stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '30' } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();

    // Buscar todas as transações no período
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('date, amount, type, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .gte('date', startDate)
      .order('date', { ascending: true })
      .limit(10000); // Limite alto para garantir todos os dados

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
router.get('/top-merchants', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '90', limit = '10' } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();
    const endDate = Date.now();

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('merchant, category, amount, bank_accounts!inner(user_id)')
      .eq('bank_accounts.user_id', user_id)
      .eq('type', 'debit')
      .not('merchant', 'is', null)
      .neq('merchant', '')
      .gte('date', startDate)
      .lte('date', endDate)
      .limit(10000); // Limite alto para garantir todos os dados

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
router.get('/monthly-comparison', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { months = '6' } = req.query;

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

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('type, amount, bank_accounts!inner(user_id)')
        .eq('bank_accounts.user_id', user_id)
        .gte('date', startDate)
        .lte('date', endDate)
        .limit(10000); // Limite alto para garantir todos os dados

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
 */
router.get('/weekly-stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { weeks = '12' } = req.query; // Padrão: 12 semanas (~ 3 meses)

    const weeksNum = Number(weeks);
    const endDate = new Date();
    const startDate = subDays(endDate, weeksNum * 7);

    console.log(`📊 Weekly stats request: user=${user_id.substring(0, 8)}..., weeks=${weeksNum}, date range=${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    console.log(`🔍 Start timestamp: ${startDate.getTime()}, End timestamp: ${endDate.getTime()}`);

    // Primeiro, verificar TOTAL de transações do usuário (sem filtro de data)
    const { count: totalCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('bank_accounts.user_id', user_id);

    console.log(`📈 Total transactions in database for user: ${totalCount}`);

    // Buscar todas as transações no período
    // IMPORTANTE: Sem limit() para buscar TODAS as transações do período
    const { data: transactions, error, count } = await supabase
      .from('transactions')
      .select('date, amount, type, category, bank_accounts!inner(user_id)', { count: 'exact' })
      .eq('bank_accounts.user_id', user_id)
      .gte('date', startDate.getTime())
      .lte('date', endDate.getTime())
      .order('date', { ascending: true })
      .limit(10000); // Limite alto para garantir que pegue todos os dados

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

    console.log(`✅ Returning ${result.length} weeks (found ${transactions?.length || 0} transactions in period)`);
    console.log(`📊 Weeks: ${result.map(w => `${w.year}-W${w.weekNumber}`).join(', ')}`);

    if (result.length < weeksNum) {
      console.warn(`⚠️ WARNING: Expected ${weeksNum} weeks but only got ${result.length} weeks!`);
      console.warn(`⚠️ This means there are NO transactions for ${weeksNum - result.length} weeks in the period`);
    }

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
router.get('/monthly-stats-by-category', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id = req.userId!;
    const { months = '12', category } = req.query;

    const monthsNum = Number(months);
    const results: Array<{
      month: string;
      monthLabel: string;
      expenses: { total: number; byCategory: Array<{ category: string; amount: number }> };
      income: { total: number; byCategory: Array<{ category: string; amount: number }> };
    }> = [];

    console.log(`📊 Monthly stats by category request: months=${monthsNum}, category=${category || 'all'}`);

    for (let i = monthsNum - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const startDate = new Date(year, month - 1, 1).getTime();
      const endDate = new Date(year, month, 0, 23, 59, 59).getTime();

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('type, amount, category, date, bank_accounts!inner(user_id)')
        .eq('bank_accounts.user_id', user_id)
        .gte('date', startDate)
        .lte('date', endDate)
        .limit(10000);

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
