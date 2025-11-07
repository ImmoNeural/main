import { Router, Request, Response } from 'express';
import { startOfDay, subDays, format } from 'date-fns';
import db from '../db/database';
import { authMiddleware } from '../middleware/auth.middleware';
import { DashboardStats, CategoryStats, DailyStats } from '../types';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Retorna estatísticas gerais do dashboard
 */
router.get('/stats', authMiddleware, (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '90' } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();
    const endDate = Date.now();

    // Total de saldo de todas as contas
    const balanceResult = db
      .prepare(
        `SELECT SUM(balance) as total_balance FROM bank_accounts
         WHERE user_id = ? AND status = 'active'`
      )
      .get(user_id) as { total_balance: number };

    // Total de receitas
    const incomeResult = db
      .prepare(
        `SELECT SUM(amount) as total_income FROM transactions t
         INNER JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE ba.user_id = ? AND t.type = 'credit' AND t.date >= ? AND t.date <= ?`
      )
      .get(user_id, startDate, endDate) as { total_income: number };

    // Total de despesas (valor absoluto)
    const expensesResult = db
      .prepare(
        `SELECT SUM(ABS(amount)) as total_expenses FROM transactions t
         INNER JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE ba.user_id = ? AND t.type = 'debit' AND t.date >= ? AND t.date <= ?`
      )
      .get(user_id, startDate, endDate) as { total_expenses: number };

    // Contagem de transações
    const countResult = db
      .prepare(
        `SELECT COUNT(*) as transaction_count FROM transactions t
         INNER JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE ba.user_id = ? AND t.date >= ? AND t.date <= ?`
      )
      .get(user_id, startDate, endDate) as { transaction_count: number };

    const stats: DashboardStats = {
      total_balance: balanceResult.total_balance || 0,
      total_income: incomeResult.total_income || 0,
      total_expenses: expensesResult.total_expenses || 0,
      transaction_count: countResult.transaction_count || 0,
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
router.get('/expenses-by-category', authMiddleware, (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '90' } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();
    const endDate = Date.now();

    const categoryStats = db
      .prepare(
        `SELECT
           category,
           SUM(ABS(amount)) as total,
           COUNT(*) as count
         FROM transactions t
         INNER JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE ba.user_id = ? AND t.type = 'debit' AND t.date >= ? AND t.date <= ?
         GROUP BY category
         ORDER BY total DESC`
      )
      .all(user_id, startDate, endDate) as Array<{
      category: string;
      total: number;
      count: number;
    }>;

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
router.get('/daily-stats', authMiddleware, (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '30' } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();

    // Buscar todas as transações no período
    const transactions = db
      .prepare(
        `SELECT date, amount, type FROM transactions t
         INNER JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE ba.user_id = ? AND t.date >= ?
         ORDER BY date ASC`
      )
      .all(user_id, startDate) as Array<{
      date: number;
      amount: number;
      type: string;
    }>;

    // Agrupar por dia
    const dailyMap = new Map<string, { income: number; expenses: number }>();

    // Inicializar todos os dias com 0
    for (let i = 0; i < daysNum; i++) {
      const date = format(subDays(new Date(), daysNum - i - 1), 'yyyy-MM-dd');
      dailyMap.set(date, { income: 0, expenses: 0 });
    }

    // Preencher com dados reais
    transactions.forEach((trans) => {
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
router.get('/top-merchants', authMiddleware, (req: Request, res: Response) => {
  try {
    const user_id = req.userId!; // Obtido do token JWT
    const { days = '90', limit = '10' } = req.query;

    const daysNum = Number(days);
    const startDate = startOfDay(subDays(new Date(), daysNum)).getTime();
    const endDate = Date.now();

    const topMerchants = db
      .prepare(
        `SELECT
           merchant,
           category,
           SUM(ABS(amount)) as total,
           COUNT(*) as count
         FROM transactions t
         INNER JOIN bank_accounts ba ON t.account_id = ba.id
         WHERE ba.user_id = ? AND t.type = 'debit' AND t.merchant IS NOT NULL
           AND t.merchant != '' AND t.date >= ? AND t.date <= ?
         GROUP BY merchant, category
         ORDER BY total DESC
         LIMIT ?`
      )
      .all(user_id, startDate, endDate, Number(limit)) as Array<{
      merchant: string;
      category: string;
      total: number;
      count: number;
    }>;

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
router.get('/monthly-comparison', authMiddleware, (req: Request, res: Response) => {
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

      const stats = db
        .prepare(
          `SELECT
             SUM(CASE WHEN t.type = 'credit' THEN t.amount ELSE 0 END) as income,
             SUM(CASE WHEN t.type = 'debit' THEN ABS(t.amount) ELSE 0 END) as expenses
           FROM transactions t
           INNER JOIN bank_accounts ba ON t.account_id = ba.id
           WHERE ba.user_id = ? AND t.date >= ? AND t.date <= ?`
        )
        .get(user_id, startDate, endDate) as {
        income: number;
        expenses: number;
      };

      results.push({
        month: format(date, 'yyyy-MM'),
        income: stats.income || 0,
        expenses: stats.expenses || 0,
        net: (stats.income || 0) - (stats.expenses || 0),
      });
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching monthly comparison:', error);
    res.status(500).json({ error: 'Failed to fetch monthly comparison' });
  }
});

export default router;
