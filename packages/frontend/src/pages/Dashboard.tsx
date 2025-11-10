import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, Receipt, ArrowRight, RefreshCw, MousePointerClick } from 'lucide-react';
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
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAllCategoryColors } from '../utils/colors';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(90);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [period]);

  // Inicializar categoria selecionada com a de maior gasto
  useEffect(() => {
    if (!selectedCategory && categoryStats.length > 0) {
      setSelectedCategory(categoryStats[0].category);
    }
  }, [categoryStats]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Calcular número de semanas baseado no período
      const weeks = Math.ceil(period / 7);
      console.log(`📊 Loading dashboard data: period=${period} days, weeks=${weeks}`);

      const [statsRes, categoryRes, weeklyRes, transactionsRes] = await Promise.all([
        dashboardApi.getStats(period),
        dashboardApi.getExpensesByCategory(period),
        dashboardApi.getWeeklyStats(weeks),
        transactionApi.getTransactions({ limit: 10 }),
      ]);

      console.log(`📈 Received weekly stats: ${weeklyRes.data.length} weeks`);

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

  const getMonthsCount = () => {
    return Math.round(period / 30);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Coletar TODAS as categorias únicas (despesas + receitas)
  const allCategories = new Set<string>();
  weeklyStats.forEach((week) => {
    week.expenses.byCategory.forEach((cat) => allCategories.add(cat.category));
    week.income.byCategory.forEach((cat) => allCategories.add(cat.category));
  });
  categoryStats.forEach((cat) => allCategories.add(cat.category));

  // Criar mapa de cores ÚNICO para todas as categorias
  const categoryColorMap = getAllCategoryColors(Array.from(allCategories));

  // Preparar dados para o gráfico semanal
  const weeklyChartData = weeklyStats.map((week) => {
    const data: any = {
      week: `S${week.weekNumber}`,
      weekLabel: `Semana ${week.weekNumber}/${week.year}`,
      dateRange: `${format(parseISO(week.startDate), 'dd/MM')} - ${format(parseISO(week.endDate), 'dd/MM')}`,
    };

    // Adicionar despesas
    week.expenses.byCategory.forEach((cat) => {
      data[`expense_${cat.category}`] = cat.amount;
    });

    // Adicionar receitas
    week.income.byCategory.forEach((cat) => {
      data[`income_${cat.category}`] = cat.amount;
    });

    return data;
  });

  // Categorias de despesas e receitas
  const expenseCategories = Array.from(
    new Set(weeklyStats.flatMap((w) => w.expenses.byCategory.map((c) => c.category)))
  );
  const incomeCategories = Array.from(
    new Set(weeklyStats.flatMap((w) => w.income.byCategory.map((c) => c.category)))
  );

  // Preparar dados mensais para o detalhamento da categoria selecionada
  const getCategoryMonthlyData = (category: string) => {
    // Agrupar dados semanais em mensais
    const monthlyMap = new Map<string, { amount: number; monthLabel: string }>();

    weeklyStats.forEach((week) => {
      const categoryExpense = week.expenses.byCategory.find((c) => c.category === category);
      const amount = categoryExpense?.amount || 0;

      // Usar parseISO para garantir interpretação correta da data
      const weekDate = parseISO(week.startDate);
      const monthKey = format(weekDate, 'yyyy-MM');
      // Capitalizar primeira letra: Jan, Fev, Mar, etc.
      const monthLabel = format(weekDate, 'MMM/yy', { locale: ptBR })
        .replace(/^\w/, (c) => c.toUpperCase());

      if (monthlyMap.has(monthKey)) {
        monthlyMap.get(monthKey)!.amount += amount;
      } else {
        monthlyMap.set(monthKey, { amount, monthLabel });
      }
    });

    // Converter para array e ordenar por data
    return Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, data]) => ({
        month: data.monthLabel,
        monthKey,
        amount: data.amount,
      }));
  };

  // Tooltip customizado para o gráfico semanal
  const CustomWeeklyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const weekData = weeklyChartData.find((d) => d.week === label);
      return (
        <div className="bg-white p-4 border-2 border-gray-200 rounded-xl shadow-xl">
          <p className="font-bold text-gray-900 text-base">{weekData?.weekLabel}</p>
          <p className="text-sm text-gray-600 mb-3">{weekData?.dateRange}</p>

          {payload.filter((p: any) => p.dataKey.startsWith('expense_')).length > 0 && (
            <>
              <p className="font-bold text-red-600 mt-2 mb-1">💸 Despesas:</p>
              {payload
                .filter((p: any) => p.dataKey.startsWith('expense_'))
                .map((entry: any, index: number) => {
                  const category = entry.dataKey.replace('expense_', '');
                  return (
                    <div key={index} className="flex justify-between items-center gap-6 py-1">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm">{category}</span>
                      </span>
                      <span className="font-semibold text-sm">{formatCurrency(entry.value)}</span>
                    </div>
                  );
                })}
            </>
          )}

          {payload.filter((p: any) => p.dataKey.startsWith('income_')).length > 0 && (
            <>
              <p className="font-bold text-green-600 mt-3 mb-1">💰 Receitas:</p>
              {payload
                .filter((p: any) => p.dataKey.startsWith('income_'))
                .map((entry: any, index: number) => {
                  const category = entry.dataKey.replace('income_', '');
                  return (
                    <div key={index} className="flex justify-between items-center gap-6 py-1">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm">{category}</span>
                      </span>
                      <span className="font-semibold text-sm">{formatCurrency(entry.value)}</span>
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
        <div className="bg-white p-4 border-2 border-gray-200 rounded-xl shadow-xl">
          <p className="font-bold text-gray-900 text-base">{data.category}</p>
          <p className="text-sm text-gray-600 mt-1">
            {formatCurrency(data.total)}
          </p>
          <p className="text-lg font-bold text-primary-600 mt-2">
            {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Tooltip customizado para o detalhamento de categoria mensal
  const CustomCategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border-2 border-gray-200 rounded-xl shadow-xl">
          <p className="font-bold text-gray-900">{payload[0].payload.month}</p>
          <p className="font-bold text-red-600 text-lg mt-2">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visão geral dos seus gastos</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="input text-sm sm:text-base"
          >
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={180}>Últimos 180 dias</option>
            <option value={365}>Último ano</option>
          </select>
          <button onClick={loadDashboardData} className="btn-primary p-2 sm:p-3">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Saldo Total</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats?.total_balance || 0)}
              </p>
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <Wallet className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Receitas</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats?.total_income || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Despesas</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(stats?.total_expenses || 0)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Transações</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                {stats?.transaction_count || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Receipt className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section with Unified Legend */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Unified Legend */}
        <div className="xl:col-span-1">
          <div className="card h-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Legenda dos Gráficos</h3>
            <div className="space-y-2">
              {Array.from(allCategories).map((category) => (
                <div key={category} className="flex items-center gap-3 py-1.5">
                  <span
                    className="w-5 h-5 rounded flex-shrink-0"
                    style={{ backgroundColor: categoryColorMap.get(category) }}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="xl:col-span-3 space-y-6">
          {/* Weekly Bar Chart */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              📊 Receitas vs Despesas Semanal (em Reais R$)
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                />
                <Tooltip content={<CustomWeeklyTooltip />} />

                {/* Barras de despesas */}
                {expenseCategories.map((category) => (
                  <Bar
                    key={`expense_${category}`}
                    dataKey={`expense_${category}`}
                    stackId="expenses"
                    fill={categoryColorMap.get(category) || '#ef4444'}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationBegin={0}
                  />
                ))}

                {/* Barras de receitas */}
                {incomeCategories.map((category) => (
                  <Bar
                    key={`income_${category}`}
                    dataKey={`income_${category}`}
                    stackId="income"
                    fill={categoryColorMap.get(category) || '#10b981'}
                    isAnimationActive={true}
                    animationDuration={800}
                    animationBegin={0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              🍰 Despesas por Categoria em %
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={categoryStats}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={false}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationBegin={0}
                >
                  {categoryStats.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={categoryColorMap.get(entry.category) || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Categories e Evolução Mensal lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            🏆 Top Categorias de Gastos (em Reais R$)
          </h2>
          <p className="text-sm text-gray-600 mb-2">
            Média mensal dos últimos {getMonthsCount()} {getMonthsCount() === 1 ? 'mês' : 'meses'}
          </p>
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <MousePointerClick className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              <span className="font-bold">Dica:</span> Clique em qualquer barra para ver o detalhamento mensal da categoria!
            </p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryStats.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value / getMonthsCount())}
                labelFormatter={(label) => `${label} (média mensal)`}
              />
              <Bar
                dataKey="total"
                fill="#3b82f6"
                isAnimationActive={true}
                animationDuration={800}
                animationBegin={0}
                radius={[8, 8, 0, 0]}
                cursor="pointer"
                onClick={(data) => {
                  setSelectedCategory(data.category);
                  // Scroll suave até a seção de detalhamento
                  setTimeout(() => {
                    document.getElementById('category-detail')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start'
                    });
                  }, 100);
                }}
              >
                {categoryStats.slice(0, 8).map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={categoryColorMap.get(entry.category) || '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Monthly Detail - Sempre visível */}
        <div id="category-detail" className="card shadow-xl">
          {selectedCategory ? (
            <>
              <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: categoryColorMap.get(selectedCategory) }}
                />
                📈 Evolução Mensal: {selectedCategory} (em Reais R$)
              </h2>
              <p className="text-sm text-gray-600 mt-1 mb-3">
                Análise detalhada dos últimos {getMonthsCount()} {getMonthsCount() === 1 ? 'mês' : 'meses'}
              </p>

              {/* Legenda de cores */}
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Legenda:</span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: categoryColorMap.get(selectedCategory) }}
                  />
                  <span className="text-sm text-gray-600">{selectedCategory}</span>
                </div>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getCategoryMonthlyData(selectedCategory)} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="#888"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#888"
              />
              <Tooltip content={<CustomCategoryTooltip />} />
              <Bar
                dataKey="amount"
                fill={categoryColorMap.get(selectedCategory) || '#3b82f6'}
                radius={[8, 8, 0, 0]}
                isAnimationActive={true}
                animationDuration={1000}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total no Período</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(
                  getCategoryMonthlyData(selectedCategory).reduce((sum, m) => sum + m.amount, 0)
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Média Mensal</p>
              <p className="text-xl font-bold text-blue-600 mt-1">
                {formatCurrency(
                  getCategoryMonthlyData(selectedCategory).length > 0
                    ? getCategoryMonthlyData(selectedCategory).reduce((sum, m) => sum + m.amount, 0) /
                      getCategoryMonthlyData(selectedCategory).length
                    : 0
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Maior Gasto Mensal</p>
              <p className="text-xl font-bold text-red-600 mt-1">
                {formatCurrency(
                  getCategoryMonthlyData(selectedCategory).length > 0
                    ? Math.max(...getCategoryMonthlyData(selectedCategory).map(m => m.amount))
                    : 0
                )}
              </p>
            </div>
          </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center text-gray-500">
                <p className="text-lg">Clique em uma barra do gráfico ao lado</p>
                <p className="text-sm">para ver a evolução mensal da categoria</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">💳 Transações Recentes</h2>
          <Link
            to="/transactions"
            className="text-primary-600 hover:text-primary-700 flex items-center text-sm font-semibold"
          >
            Ver todas
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="space-y-2">
          {recentTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all hover:shadow gap-2"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl flex-shrink-0">{getCategoryIcon(transaction.category)}</div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {transaction.merchant || transaction.description}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(transaction.date.toString()), 'dd/MM/yyyy')} • {transaction.category}
                  </p>
                </div>
              </div>
              <div className="text-right sm:ml-4">
                <p
                  className={`font-bold text-lg ${
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
    'Investimentos': '📈',
    'Outros': '📊',
  };
  return icons[category || 'Outros'] || '📊';
};

export default Dashboard;
