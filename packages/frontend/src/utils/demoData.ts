// Demo data for tutorial - simple utility file
import type { Transaction, DashboardStats, CategoryStats } from '../types';

// Generate demo transactions based on realistic Brazilian financial data
// Uses relative dates (last 6 months) so data always appears in current period
const generateDemoData = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDay = now.getDate();

  // Generate data for current month and 5 previous months
  const months: Array<{ year: number; month: number; maxDay: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - i, 1);
    // For current month, only use days up to current day
    // For past months, use all days
    const isCurrentMonth = i === 0;
    const maxDay = isCurrentMonth ? currentDay : 31;
    months.push({ year: date.getFullYear(), month: date.getMonth() + 1, maxDay });
  }

  const baseTransactions = [
    { day: 4, description: 'FINANCIAMENTO VEICULAR', amount: -2103.53, category: 'Empréstimos e Financiamentos' },
    { day: 4, description: 'NETFLIX.COM', amount: -22.90, category: 'Lazer e Entretenimento' },
    { day: 5, description: 'Crédito PIX', amount: 1500.00, category: 'Receitas' },
    { day: 6, description: 'BRADESCO SEGUROS', amount: -233.01, category: 'Seguros' },
    { day: 10, description: 'Débito Automático', amount: -1200.00, category: 'Moradia' },
    { day: 10, description: 'SMART FIT', amount: -102.90, category: 'Saúde e Bem-Estar' },
    { day: 12, description: 'IFOOD *RESTAURANTE', amount: -45.90, category: 'Alimentação' },
    { day: 13, description: 'Crédito PIX', amount: 8500.00, category: 'Receitas' },
    { day: 14, description: 'POSTO IPIRANGA', amount: -250.00, category: 'Transporte' },
    { day: 15, description: 'SUPERMERCADO EXTRA', amount: -680.50, category: 'Alimentação' },
    { day: 17, description: 'FARMACIA DROGASIL', amount: -89.90, category: 'Saúde e Bem-Estar' },
    { day: 19, description: 'UBER *TRIP', amount: -32.50, category: 'Transporte' },
  ];

  // Add some variation to make each month slightly different
  const variations = [
    { description: 'IFOOD *HAMBURGUER', amount: -58.90 },
    { description: 'POSTO SHELL', amount: -280.00 },
    { description: 'SUPERMERCADO CARREFOUR', amount: -720.30 },
    { description: '99 *CORRIDA', amount: -28.00 },
    { description: 'OUTBACK STEAKHOUSE', amount: -189.00 },
    { description: 'SUPERMERCADO PÃO DE AÇÚCAR', amount: -850.00 },
  ];

  const allTransactions: Array<{
    date: string;
    description: string;
    amount: number;
    category: string;
  }> = [];

  months.forEach((m, monthIndex) => {
    baseTransactions.forEach((tx, txIndex) => {
      // Skip transactions for days that haven't happened yet in current month
      if (tx.day > m.maxDay) {
        return;
      }

      // Use variation for some transactions
      let finalTx = { ...tx };
      if (txIndex === 6 && monthIndex > 0) { // IFOOD variation
        finalTx = { ...tx, ...variations[monthIndex % variations.length] };
      }

      const dateStr = `${String(finalTx.day).padStart(2, '0')}.${String(m.month).padStart(2, '0')}.${m.year}`;
      allTransactions.push({
        date: dateStr,
        description: finalTx.description,
        amount: finalTx.amount,
        category: finalTx.category,
      });
    });
  });

  return allTransactions;
};

// Regenerate demo data on each call to ensure dates are always current
const getDemoDataCached = (() => {
  let cache: ReturnType<typeof generateDemoData> | null = null;
  let lastGenerated: number = 0;

  return () => {
    const now = Date.now();
    // Regenerate if more than 1 minute has passed
    if (!cache || now - lastGenerated > 60000) {
      cache = generateDemoData();
      lastGenerated = now;
    }
    return cache;
  };
})();

// Parse date string to timestamp
const parseDate = (dateStr: string): number => {
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
};

// Generate demo transactions
export const getDemoTransactions = (): Transaction[] => {
  const csvData = getDemoDataCached();
  return csvData.map((item, index) => ({
    id: `demo-${index + 1}`,
    account_id: 'demo-account',
    transaction_id: `demo-tx-${index + 1}`,
    date: parseDate(item.date),
    amount: Math.abs(item.amount),
    currency: 'BRL',
    description: item.description,
    merchant: item.description,
    category: item.category,
    type: (item.amount > 0 ? 'credit' : 'debit') as 'credit' | 'debit',
    status: 'completed' as const,
    created_at: parseDate(item.date),
    updated_at: parseDate(item.date),
  }));
};

// Calculate demo stats
export const getDemoStats = (): DashboardStats => {
  const transactions = getDemoTransactions();
  const totalIncome = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);

  // Calculate dynamic date range
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const periodStart = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
  const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return {
    total_balance: totalIncome - totalExpenses,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    initial_balance: 5000,
    transaction_count: transactions.length,
    period_start: periodStart,
    period_end: periodEnd,
  };
};

// Calculate demo category stats
export const getDemoCategoryStats = (): CategoryStats[] => {
  const transactions = getDemoTransactions();
  const categoryTotals = new Map<string, { total: number; count: number }>();

  transactions.filter(t => t.type === 'debit').forEach(t => {
    const cat = t.category || 'Outros';
    const current = categoryTotals.get(cat) || { total: 0, count: 0 };
    categoryTotals.set(cat, { total: current.total + t.amount, count: current.count + 1 });
  });

  const totalExpenses = Array.from(categoryTotals.values()).reduce((sum, c) => sum + c.total, 0);

  return Array.from(categoryTotals.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
};

// Calculate demo monthly stats
export const getDemoMonthlyStats = () => {
  const transactions = getDemoTransactions();
  const monthlyData = new Map<string, { expenses: Map<string, number>; income: Map<string, number> }>();

  transactions.forEach(t => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { expenses: new Map(), income: new Map() });
    }

    const data = monthlyData.get(monthKey)!;
    const category = t.category || 'Outros';

    if (t.type === 'debit') {
      data.expenses.set(category, (data.expenses.get(category) || 0) + t.amount);
    } else {
      data.income.set(category, (data.income.get(category) || 0) + t.amount);
    }
  });

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => {
      const [year, monthNum] = month.split('-');
      const monthLabel = `${monthNames[parseInt(monthNum) - 1]}/${year}`;

      return {
        month,
        monthLabel,
        expenses: {
          total: Array.from(data.expenses.values()).reduce((sum, v) => sum + v, 0),
          byCategory: Array.from(data.expenses.entries()).map(([category, amount]) => ({ category, amount })),
        },
        income: {
          total: Array.from(data.income.values()).reduce((sum, v) => sum + v, 0),
          byCategory: Array.from(data.income.entries()).map(([category, amount]) => ({ category, amount })),
        },
      };
    });
};
