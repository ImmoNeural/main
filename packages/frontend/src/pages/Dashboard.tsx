import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, Receipt, ArrowRight, RefreshCw } from 'lucide-react';
import { dashboardApi, transactionApi } from '../services/api';
import type { DashboardStats, CategoryStats, WeeklyStats, Transaction } from '../types';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { getAllCategoryColors } from '../utils/colors';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(90);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, categoryRes, weeklyRes, transactionsRes] = await Promise.all([
        dashboardApi.getStats(period),
        dashboardApi.getExpensesByCategory(period),
        dashboardApi.getWeeklyStats(12), // 12 semanas
        transactionApi.getTransactions({ limit: 10 }),
      ]);

      setStats(statsRes.data);
      setCategoryStats(categoryRes.data);
      setWeeklyStats(weeklyRes.data);
      setRecentTransactions(transactionsRes.data.transactions);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Obter TODAS as entradas únicas com seus tipos (D ou R)
  // Isso garante que "Investimentos (D)" e "Investimentos (R)" terão cores DIFERENTES
  const allUniqueEntries = new Set<string>();

  // Adicionar despesas com sufixo _D
  weeklyStats.forEach((week) => {
    week.expenses.byCategory.forEach((cat) => allUniqueEntries.add(`${cat.category}_D`));
  });

  // Adicionar receitas com sufixo _R
  weeklyStats.forEach((week) => {
    week.income.byCategory.forEach((cat) => allUniqueEntries.add(`${cat.category}_R`));
  });

  // Adicionar categorias do gráfico pizza (são apenas despesas)
  categoryStats.forEach((cat) => allUniqueEntries.add(`${cat.category}_PIE`));

  // Criar mapa de cores único para cada entrada
  const categoryColorMap = getAllCategoryColors(Array.from(allUniqueEntries));

  // Preparar dados para o gráfico semanal
  const weeklyChartData = weeklyStats.map((week) => {
    const data: any = {
      week: `S${week.weekNumber}`,
      weekLabel: `Semana ${week.weekNumber}/${week.year}`,
      dateRange: `${format(new Date(week.startDate), 'dd/MM')} - ${format(new Date(week.endDate), 'dd/MM')}`,
    };

    // Adicionar despesas por categoria
    week.expenses.byCategory.forEach((cat) => {
      data[`expense_${cat.category}`] = cat.amount;
    });

    // Adicionar receitas por categoria
    week.income.byCategory.forEach((cat) => {
      data[`income_${cat.category}`] = cat.amount;
    });

    return data;
  });

  // Criar arrays de categorias para despesas e receitas
  const expenseCategories = Array.from(
    new Set(weeklyStats.flatMap((w) => w.expenses.byCategory.map((c) => c.category)))
  );
  const incomeCategories = Array.from(
    new Set(weeklyStats.flatMap((w) => w.income.byCategory.map((c) => c.category)))
  );

  // Tooltip customizado para o gráfico semanal
  const CustomWeeklyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const weekData = weeklyChartData.find((d) => d.week === label);
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{weekData?.weekLabel}</p>
          <p className="text-sm text-gray-600 mb-2">{weekData?.dateRange}</p>

          {payload.filter((p: any) => p.dataKey.startsWith('expense_')).length > 0 && (
            <>
              <p className="font-semibold text-red-600 mt-2">Despesas:</p>
              {payload
                .filter((p: any) => p.dataKey.startsWith('expense_'))
                .map((entry: any, index: number) => {
                  const category = entry.dataKey.replace('expense_', '');
                  return (
                    <div key={index} className="flex justify-between items-center gap-4">
                      <span className="flex items-center gap-1">
                        <span
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        {category}:
                      </span>
                      <span className="font-medium">{formatCurrency(entry.value)}</span>
                    </div>
                  );
                })}
            </>
          )}

          {payload.filter((p: any) => p.dataKey.startsWith('income_')).length > 0 && (
            <>
              <p className="font-semibold text-green-600 mt-2">Receitas:</p>
              {payload
                .filter((p: any) => p.dataKey.startsWith('income_'))
                .map((entry: any, index: number) => {
                  const category = entry.dataKey.replace('income_', '');
                  return (
                    <div key={index} className="flex justify-between items-center gap-4">
                      <span className="flex items-center gap-1">
                        <span
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        {category}:
                      </span>
                      <span className="font-medium">{formatCurrency(entry.value)}</span>
                    </div>
                  );
                })}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Tooltip customizado para o gráfico pizza
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.category}</p>
          <p className="text-sm text-gray-600">
            {formatCurrency(data.total)} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visão geral dos seus gastos</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="input"
          >
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button onClick={loadDashboardData} className="btn-primary">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats?.total_balance || 0)}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <Wallet className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Receitas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats?.total_income || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Despesas</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(stats?.total_expenses || 0)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Transações</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.transaction_count || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Receipt className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Stats Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Receitas vs Despesas (12 semanas)</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip content={<CustomWeeklyTooltip />} />
              <Legend />

              {/* Barras de despesas empilhadas */}
              {expenseCategories.map((category) => (
                <Bar
                  key={`expense_${category}`}
                  dataKey={`expense_${category}`}
                  stackId="expenses"
                  fill={categoryColorMap.get(`${category}_D`) || '#ef4444'}
                  name={`${category} (D)`}
                />
              ))}

              {/* Barras de receitas empilhadas */}
              {incomeCategories.map((category) => (
                <Bar
                  key={`income_${category}`}
                  dataKey={`income_${category}`}
                  stackId="income"
                  fill={categoryColorMap.get(`${category}_R`) || '#10b981'}
                  name={`${category} (R)`}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Despesas por Categoria</h2>
          <ResponsiveContainer width="100%" height={480}>
            <PieChart>
              <Pie
                data={categoryStats}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="45%"
                outerRadius={100}
                label={false}
              >
                {categoryStats.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={categoryColorMap.get(`${entry.category}_PIE`) || '#94a3b8'}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={80}
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => {
                  const data = categoryStats.find((c) => c.category === value);
                  return `${value} (${data?.percentage.toFixed(1)}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Bar Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Top Categorias de Gastos</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryStats.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Bar dataKey="total" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Transações Recentes</h2>
          <Link to="/transactions" className="text-primary-600 hover:text-primary-700 flex items-center">
            Ver todas
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="space-y-3">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getCategoryIcon(transaction.category)}</div>
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.merchant || transaction.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(transaction.date), 'dd/MM/yyyy')} • {transaction.category}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${
                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'credit' ? '+' : '-'}
                  {formatCurrency(Math.abs(transaction.amount))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const getCategoryIcon = (category?: string) => {
  const icons: Record<string, string> = {
    'Supermercado': '🛒',
    'Alimentação': '🍽️',
    'Restaurantes': '🍽️',
    'Transporte': '🚗',
    'Compras': '🛍️',
    'Saúde': '⚕️',
    'Entretenimento': '🎬',
    'Contas': '📄',
    'Salário': '💰',
    'Transferências': '💸',
    'Transferência': '💸',
    'Educação': '📚',
    'Casa': '🏠',
    'Outros': '📊',
  };
  return icons[category || 'Outros'] || '📊';
};

export default Dashboard;
