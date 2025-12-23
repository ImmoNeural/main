import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { Transaction, DashboardStats, CategoryStats, WeeklyStats } from '../types';

// Demo transactions parsed from CSV data
// Original CSV format: Data, Descricao, valor, saldo, Subcategoria
const generateDemoTransactions = (): Transaction[] => {
  const csvData = [
    { date: '04.06.2025', description: 'FINANCIAMENTO VEICULAR', amount: -2103.53, category: 'Empréstimos e Financiamentos', subcategory: 'Empréstimos Bancários' },
    { date: '04.06.2025', description: 'NETFLIX.COM', amount: -22.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '05.06.2025', description: 'Crédito PIX', amount: 1500.00, category: 'Receitas', subcategory: 'Transferências Recebidas' },
    { date: '06.06.2025', description: 'BRADESCO SEGUROS', amount: -233.01, category: 'Seguros', subcategory: 'Seguro Auto' },
    { date: '10.06.2025', description: 'Débito Automático', amount: -1200.00, category: 'Moradia', subcategory: 'Condomínio' },
    { date: '10.06.2025', description: 'SMART FIT', amount: -102.90, category: 'Saúde e Bem-Estar', subcategory: 'Academia' },
    { date: '15.06.2025', description: 'IFOOD *RESTAURANTE', amount: -45.90, category: 'Alimentação', subcategory: 'Restaurantes e Delivery' },
    { date: '16.06.2025', description: 'Crédito PIX', amount: 8500.00, category: 'Receitas', subcategory: 'Salário' },
    { date: '18.06.2025', description: 'POSTO IPIRANGA', amount: -250.00, category: 'Transporte', subcategory: 'Combustível' },
    { date: '20.06.2025', description: 'SUPERMERCADO EXTRA', amount: -680.50, category: 'Alimentação', subcategory: 'Supermercado' },
    { date: '22.06.2025', description: 'FARMACIA DROGASIL', amount: -89.90, category: 'Saúde e Bem-Estar', subcategory: 'Farmácia' },
    { date: '25.06.2025', description: 'UBER *TRIP', amount: -32.50, category: 'Transporte', subcategory: 'Transporte por App' },

    { date: '04.07.2025', description: 'FINANCIAMENTO VEICULAR', amount: -2103.53, category: 'Empréstimos e Financiamentos', subcategory: 'Empréstimos Bancários' },
    { date: '04.07.2025', description: 'NETFLIX.COM', amount: -22.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '05.07.2025', description: 'Crédito PIX', amount: 2000.00, category: 'Receitas', subcategory: 'Transferências Recebidas' },
    { date: '06.07.2025', description: 'BRADESCO SEGUROS', amount: -233.01, category: 'Seguros', subcategory: 'Seguro Auto' },
    { date: '10.07.2025', description: 'Débito Automático', amount: -1200.00, category: 'Moradia', subcategory: 'Condomínio' },
    { date: '10.07.2025', description: 'SMART FIT', amount: -102.90, category: 'Saúde e Bem-Estar', subcategory: 'Academia' },
    { date: '12.07.2025', description: 'AMAZON PRIME', amount: -14.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '15.07.2025', description: 'IFOOD *HAMBURGUER', amount: -58.90, category: 'Alimentação', subcategory: 'Restaurantes e Delivery' },
    { date: '16.07.2025', description: 'Crédito PIX', amount: 8500.00, category: 'Receitas', subcategory: 'Salário' },
    { date: '18.07.2025', description: 'POSTO SHELL', amount: -280.00, category: 'Transporte', subcategory: 'Combustível' },
    { date: '20.07.2025', description: 'SUPERMERCADO CARREFOUR', amount: -720.30, category: 'Alimentação', subcategory: 'Supermercado' },
    { date: '23.07.2025', description: 'CINEMA UCI', amount: -65.00, category: 'Lazer e Entretenimento', subcategory: 'Cinema e Shows' },
    { date: '25.07.2025', description: '99 *CORRIDA', amount: -28.00, category: 'Transporte', subcategory: 'Transporte por App' },
    { date: '28.07.2025', description: 'LIVRARIA CULTURA', amount: -89.90, category: 'Educação', subcategory: 'Livros e Materiais' },

    { date: '04.08.2025', description: 'FINANCIAMENTO VEICULAR', amount: -2103.53, category: 'Empréstimos e Financiamentos', subcategory: 'Empréstimos Bancários' },
    { date: '04.08.2025', description: 'NETFLIX.COM', amount: -22.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '05.08.2025', description: 'Crédito PIX', amount: 1800.00, category: 'Receitas', subcategory: 'Transferências Recebidas' },
    { date: '06.08.2025', description: 'BRADESCO SEGUROS', amount: -233.01, category: 'Seguros', subcategory: 'Seguro Auto' },
    { date: '08.08.2025', description: 'ENERGIA ELÉTRICA', amount: -320.45, category: 'Moradia', subcategory: 'Energia Elétrica' },
    { date: '10.08.2025', description: 'Débito Automático', amount: -1200.00, category: 'Moradia', subcategory: 'Condomínio' },
    { date: '10.08.2025', description: 'SMART FIT', amount: -102.90, category: 'Saúde e Bem-Estar', subcategory: 'Academia' },
    { date: '14.08.2025', description: 'IFOOD *PIZZA', amount: -72.00, category: 'Alimentação', subcategory: 'Restaurantes e Delivery' },
    { date: '16.08.2025', description: 'Crédito PIX', amount: 8500.00, category: 'Receitas', subcategory: 'Salário' },
    { date: '18.08.2025', description: 'POSTO IPIRANGA', amount: -260.00, category: 'Transporte', subcategory: 'Combustível' },
    { date: '20.08.2025', description: 'SUPERMERCADO EXTRA', amount: -695.80, category: 'Alimentação', subcategory: 'Supermercado' },
    { date: '22.08.2025', description: 'DROGARIA SAO PAULO', amount: -156.00, category: 'Saúde e Bem-Estar', subcategory: 'Farmácia' },
    { date: '25.08.2025', description: 'UBER *TRIP', amount: -45.00, category: 'Transporte', subcategory: 'Transporte por App' },
    { date: '27.08.2025', description: 'SPOTIFY', amount: -21.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },

    { date: '04.09.2025', description: 'FINANCIAMENTO VEICULAR', amount: -2103.53, category: 'Empréstimos e Financiamentos', subcategory: 'Empréstimos Bancários' },
    { date: '04.09.2025', description: 'NETFLIX.COM', amount: -22.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '05.09.2025', description: 'Crédito PIX', amount: 3000.00, category: 'Receitas', subcategory: 'Freelance' },
    { date: '06.09.2025', description: 'BRADESCO SEGUROS', amount: -233.01, category: 'Seguros', subcategory: 'Seguro Auto' },
    { date: '10.09.2025', description: 'Débito Automático', amount: -1200.00, category: 'Moradia', subcategory: 'Condomínio' },
    { date: '10.09.2025', description: 'SMART FIT', amount: -102.90, category: 'Saúde e Bem-Estar', subcategory: 'Academia' },
    { date: '12.09.2025', description: 'AMAZON PRIME', amount: -14.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '15.09.2025', description: 'OUTBACK STEAKHOUSE', amount: -189.00, category: 'Alimentação', subcategory: 'Restaurantes e Delivery' },
    { date: '16.09.2025', description: 'Crédito PIX', amount: 8500.00, category: 'Receitas', subcategory: 'Salário' },
    { date: '18.09.2025', description: 'POSTO BR', amount: -290.00, category: 'Transporte', subcategory: 'Combustível' },
    { date: '20.09.2025', description: 'SUPERMERCADO PÃO DE AÇÚCAR', amount: -850.00, category: 'Alimentação', subcategory: 'Supermercado' },
    { date: '23.09.2025', description: 'CONSULTA MÉDICA', amount: -350.00, category: 'Saúde e Bem-Estar', subcategory: 'Consultas Médicas' },
    { date: '25.09.2025', description: 'UBER *TRIP', amount: -38.00, category: 'Transporte', subcategory: 'Transporte por App' },

    { date: '04.10.2025', description: 'FINANCIAMENTO VEICULAR', amount: -2103.53, category: 'Empréstimos e Financiamentos', subcategory: 'Empréstimos Bancários' },
    { date: '04.10.2025', description: 'NETFLIX.COM', amount: -22.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '05.10.2025', description: 'Crédito PIX', amount: 1200.00, category: 'Receitas', subcategory: 'Transferências Recebidas' },
    { date: '06.10.2025', description: 'BRADESCO SEGUROS', amount: -233.01, category: 'Seguros', subcategory: 'Seguro Auto' },
    { date: '08.10.2025', description: 'GÁS COMGÁS', amount: -85.00, category: 'Moradia', subcategory: 'Gás' },
    { date: '10.10.2025', description: 'Débito Automático', amount: -1200.00, category: 'Moradia', subcategory: 'Condomínio' },
    { date: '10.10.2025', description: 'SMART FIT', amount: -102.90, category: 'Saúde e Bem-Estar', subcategory: 'Academia' },
    { date: '14.10.2025', description: 'IFOOD *SUSHI', amount: -120.00, category: 'Alimentação', subcategory: 'Restaurantes e Delivery' },
    { date: '16.10.2025', description: 'Crédito PIX', amount: 8500.00, category: 'Receitas', subcategory: 'Salário' },
    { date: '18.10.2025', description: 'POSTO SHELL', amount: -275.00, category: 'Transporte', subcategory: 'Combustível' },
    { date: '20.10.2025', description: 'SUPERMERCADO EXTRA', amount: -710.00, category: 'Alimentação', subcategory: 'Supermercado' },
    { date: '22.10.2025', description: 'FARMACIA DROGASIL', amount: -98.50, category: 'Saúde e Bem-Estar', subcategory: 'Farmácia' },
    { date: '25.10.2025', description: '99 *CORRIDA', amount: -35.00, category: 'Transporte', subcategory: 'Transporte por App' },
    { date: '28.10.2025', description: 'CURSO UDEMY', amount: -27.90, category: 'Educação', subcategory: 'Cursos Online' },

    { date: '04.11.2025', description: 'FINANCIAMENTO VEICULAR', amount: -2103.53, category: 'Empréstimos e Financiamentos', subcategory: 'Empréstimos Bancários' },
    { date: '04.11.2025', description: 'NETFLIX.COM', amount: -22.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '05.11.2025', description: 'Crédito PIX', amount: 2500.00, category: 'Receitas', subcategory: 'Freelance' },
    { date: '06.11.2025', description: 'BRADESCO SEGUROS', amount: -233.01, category: 'Seguros', subcategory: 'Seguro Auto' },
    { date: '08.11.2025', description: 'ENERGIA ELÉTRICA', amount: -285.30, category: 'Moradia', subcategory: 'Energia Elétrica' },
    { date: '10.11.2025', description: 'Débito Automático', amount: -1200.00, category: 'Moradia', subcategory: 'Condomínio' },
    { date: '10.11.2025', description: 'SMART FIT', amount: -102.90, category: 'Saúde e Bem-Estar', subcategory: 'Academia' },
    { date: '12.11.2025', description: 'AMAZON PRIME', amount: -14.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '15.11.2025', description: 'IFOOD *RESTAURANTE', amount: -95.00, category: 'Alimentação', subcategory: 'Restaurantes e Delivery' },
    { date: '16.11.2025', description: 'Crédito PIX', amount: 8500.00, category: 'Receitas', subcategory: 'Salário' },
    { date: '18.11.2025', description: 'POSTO IPIRANGA', amount: -300.00, category: 'Transporte', subcategory: 'Combustível' },
    { date: '20.11.2025', description: 'SUPERMERCADO CARREFOUR', amount: -780.00, category: 'Alimentação', subcategory: 'Supermercado' },
    { date: '22.11.2025', description: 'CONSULTA DENTISTA', amount: -280.00, category: 'Saúde e Bem-Estar', subcategory: 'Dentista' },
    { date: '25.11.2025', description: 'UBER *TRIP', amount: -42.00, category: 'Transporte', subcategory: 'Transporte por App' },
    { date: '27.11.2025', description: 'SPOTIFY', amount: -21.90, category: 'Lazer e Entretenimento', subcategory: 'Streamings e Assinaturas' },
    { date: '30.11.2025', description: 'BLACK FRIDAY COMPRAS', amount: -450.00, category: 'Compras', subcategory: 'Vestuário' },
  ];

  // Convert CSV data to Transaction format
  const parseDate = (dateStr: string): number => {
    const [day, month, year] = dateStr.split('.');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
  };

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
    subcategory: item.subcategory,
    type: item.amount > 0 ? 'credit' : 'debit' as 'credit' | 'debit',
    status: 'completed' as const,
    created_at: parseDate(item.date),
    updated_at: parseDate(item.date),
  }));
};

// Calculate demo dashboard stats
const calculateDemoStats = (transactions: Transaction[]): DashboardStats => {
  const totalIncome = transactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    total_balance: totalIncome - totalExpenses,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    initial_balance: 5000,
    transaction_count: transactions.length,
    period_start: '2025-06-01',
    period_end: '2025-11-30',
  };
};

// Calculate demo category stats
const calculateDemoCategoryStats = (transactions: Transaction[]): CategoryStats[] => {
  const categoryTotals = new Map<string, { total: number; count: number }>();

  transactions
    .filter(t => t.type === 'debit')
    .forEach(t => {
      const cat = t.category || 'Outros';
      const current = categoryTotals.get(cat) || { total: 0, count: 0 };
      categoryTotals.set(cat, {
        total: current.total + t.amount,
        count: current.count + 1,
      });
    });

  const totalExpenses = Array.from(categoryTotals.values()).reduce((sum, c) => sum + c.total, 0);

  return Array.from(categoryTotals.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percentage: (data.total / totalExpenses) * 100,
    }))
    .sort((a, b) => b.total - a.total);
};

// Calculate demo monthly stats by category
const calculateDemoMonthlyStats = (transactions: Transaction[]) => {
  const monthlyData = new Map<string, {
    expenses: Map<string, number>;
    income: Map<string, number>;
  }>();

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
          byCategory: Array.from(data.expenses.entries()).map(([category, amount]) => ({
            category,
            amount,
          })),
        },
        income: {
          total: Array.from(data.income.values()).reduce((sum, v) => sum + v, 0),
          byCategory: Array.from(data.income.entries()).map(([category, amount]) => ({
            category,
            amount,
          })),
        },
      };
    });
};

interface DemoDataContextType {
  isDemoMode: boolean;
  setDemoMode: (active: boolean) => void;
  demoTransactions: Transaction[];
  demoStats: DashboardStats;
  demoCategoryStats: CategoryStats[];
  demoMonthlyStats: ReturnType<typeof calculateDemoMonthlyStats>;
  demoWeeklyStats: WeeklyStats[];
}

const DemoDataContext = createContext<DemoDataContextType | null>(null);

export const DemoDataProvider = ({ children }: { children: ReactNode }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Generate demo data once and memoize
  const demoData = useMemo(() => {
    const transactions = generateDemoTransactions();
    return {
      demoTransactions: transactions,
      demoStats: calculateDemoStats(transactions),
      demoCategoryStats: calculateDemoCategoryStats(transactions),
      demoMonthlyStats: calculateDemoMonthlyStats(transactions),
      demoWeeklyStats: [] as WeeklyStats[],
    };
  }, []);

  const setDemoMode = useCallback((active: boolean) => {
    console.log(`🎮 Demo mode ${active ? 'activated' : 'deactivated'}`);
    setIsDemoMode(active);
  }, []);

  const value = useMemo(() => ({
    isDemoMode,
    setDemoMode,
    ...demoData,
  }), [isDemoMode, setDemoMode, demoData]);

  return (
    <DemoDataContext.Provider value={value}>
      {children}
    </DemoDataContext.Provider>
  );
};

// Default values for when context is not available (fallback)
const defaultDemoData: DemoDataContextType = {
  isDemoMode: false,
  setDemoMode: () => {},
  demoTransactions: [],
  demoStats: {
    total_balance: 0,
    total_income: 0,
    total_expenses: 0,
    initial_balance: 0,
    transaction_count: 0,
    period_start: '',
    period_end: '',
  },
  demoCategoryStats: [],
  demoMonthlyStats: [],
  demoWeeklyStats: [],
};

export const useDemoData = () => {
  const context = useContext(DemoDataContext);
  // Return default values if context is not available (prevents crash)
  if (!context) {
    console.warn('useDemoData: Context not available, using defaults');
    return defaultDemoData;
  }
  return context;
};

export default DemoDataContext;
