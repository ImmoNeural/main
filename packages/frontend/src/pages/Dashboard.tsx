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
import { format, startOfMonth, subMonths } from 'date-fns';
import { getAllCategoryColors } from '../utils/colors';

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<Array<{
    month: string;
    monthLabel: string;
    expenses: { total: number; byCategory: Array<{ category: string; amount: number }> };
    income: { total: number; byCategory: Array<{ category: string; amount: number }> };
  }>>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(365); // Padrão: 12 meses
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly'); // Novo: controlar visualização

  useEffect(() => {
    // Carregar banco ativo do localStorage
    const savedActiveAccount = localStorage.getItem('activeAccountId');
    if (savedActiveAccount) {
      setActiveAccountId(savedActiveAccount);
    }

    // Listener para mudanças no banco ativo
    const handleActiveAccountChange = (event: any) => {
      const { accountId} = event.detail;
      setActiveAccountId(accountId);
    };

    window.addEventListener('activeAccountChanged', handleActiveAccountChange);
    return () => {
      window.removeEventListener('activeAccountChanged', handleActiveAccountChange);
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [activeAccountId, period]);

  // Inicializar categoria selecionada com a de maior gasto
  useEffect(() => {
    if (!selectedCategory && categoryStats.length > 0) {
      setSelectedCategory(categoryStats[0].category);
    }
  }, [categoryStats]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Calcular número de meses baseado no período (mapeamento exato)
      const monthsMap: Record<number, number> = {
        30: 1,    // 1 mês
        60: 2,    // 2 meses
        90: 3,    // 3 meses
        180: 6,   // 6 meses
        365: 12,  // 12 meses
      };
      const months = monthsMap[period] || Math.ceil(period / 30);

      const accountFilter = activeAccountId ? activeAccountId : undefined;
      console.log(`📊 Loading dashboard data: period=${period} days, months=${months}, account=${accountFilter || 'ALL'}`);

      const [statsRes, categoryRes, weeklyRes, monthlyRes, transactionsRes] = await Promise.all([
        dashboardApi.getStats(period),
        dashboardApi.getExpensesByCategory(period),
        dashboardApi.getWeeklyStats(period), // Passa period em dias, não weeks
        dashboardApi.getMonthlyStatsByCategory(months),
        transactionApi.getTransactions({
          limit: 10,
          account_id: accountFilter
        }),
      ]);

      console.log(`📈 Received weekly stats: ${weeklyRes.data.length} weeks`);
      console.log(`📅 Received monthly stats: ${monthlyRes.data.length} months`);

      setStats(statsRes.data);
      setCategoryStats(categoryRes.data);
      setWeeklyStats(weeklyRes.data);
      setMonthlyStats(monthlyRes.data);
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

  // Calcular data de início do período para o label
  const getStartDateLabel = () => {
    const monthsMap: Record<number, number> = {
      30: 1,    // 1 mês
      60: 2,    // 2 meses
      90: 3,    // 3 meses
      180: 6,   // 6 meses
      365: 12,  // 12 meses
    };

    const totalMonths = monthsMap[period] || Math.ceil(period / 30);
    const monthsToSubtract = totalMonths - 1;
    const startDate = startOfMonth(subMonths(new Date(), monthsToSubtract));

    return format(startDate, 'dd.MM.yy');
  };

  const getMonthsCount = () => {
    return Math.round(period / 30);
  };

  // Toggle de categoria na legenda
  const toggleCategory = (category: string) => {
    setDisabledCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
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
  const weeklyChartData = weeklyStats.map((week, index) => {
    const data: any = {
      week: `S${week.weekNumber}`,
      weekLabel: `Semana ${week.weekNumber}/${week.year}`,
      dateRange: `${format(new Date(week.startDate), 'dd/MM')} - ${format(new Date(week.endDate), 'dd/MM')}`,
      year: week.year,
      index: index, // Para calcular posição do ano
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

  // Preparar dados para o gráfico mensal
  const monthlyChartData = monthlyStats.map((month) => {
    const data: any = {
      month: month.monthLabel.split('/')[0], // Ex: "Nov" de "Nov/2024"
      monthFull: month.monthLabel, // Ex: "Nov/2024"
      monthKey: month.month, // Ex: "2024-11"
      year: month.month.split('-')[0], // Ex: "2024"
    };

    // Adicionar despesas
    month.expenses.byCategory.forEach((cat) => {
      data[`expense_${cat.category}`] = cat.amount;
    });

    // Adicionar receitas
    month.income.byCategory.forEach((cat) => {
      data[`income_${cat.category}`] = cat.amount;
    });

    return data;
  });

  // Categorias de despesas e receitas (filtrar desabilitadas)
  const expenseCategories = Array.from(
    new Set(weeklyStats.flatMap((w) => w.expenses.byCategory.map((c) => c.category)))
  ).filter(cat => !disabledCategories.has(cat));
  const incomeCategories = Array.from(
    new Set(weeklyStats.flatMap((w) => w.income.byCategory.map((c) => c.category)))
  ).filter(cat => !disabledCategories.has(cat));

  // Função para mostrar anos centralizados no eixo X
  const renderYearTick = (props: any) => {
    const { x, y, payload } = props;
    const currentData = chartView === 'weekly' ? weeklyChartData : monthlyChartData;
    const currentIndex = currentData.findIndex((d: any) =>
      chartView === 'weekly' ? d.week === payload.value : d.month === payload.value
    );

    if (currentIndex === -1) return <></>;

    const currentYear = currentData[currentIndex].year;

    // Mostrar ano apenas no meio do grupo de dados do mesmo ano
    const yearGroup = currentData.filter((d: any) => d.year === currentYear);
    const firstIndexOfYear = currentData.findIndex((d: any) => d.year === currentYear);
    const middleIndexOfYear = firstIndexOfYear + Math.floor(yearGroup.length / 2);

    if (currentIndex === middleIndexOfYear) {
      return (
        <g transform={`translate(${x},${y})`}>
          <text
            x={0}
            y={0}
            dy={16}
            textAnchor="middle"
            fill="#666"
            fontSize={14}
            fontWeight="bold"
          >
            {currentYear}
          </text>
        </g>
      );
    }

    return <></>;
  };

  // Preparar dados mensais para o detalhamento da categoria selecionada
  const getCategoryMonthlyData = (category: string) => {
    console.log(`📅 Processando dados mensais para categoria: ${category}`);

    const result = monthlyStats.map((monthData) => {
      const categoryExpense = monthData.expenses.byCategory.find((c) => c.category === category);
      const amount = categoryExpense?.amount || 0;

      console.log(`Month ${monthData.month} (${monthData.monthLabel}): amount=${amount}`);

      return {
        month: monthData.monthLabel.split('/')[0], // Ex: "Jan" de "Jan/2024"
        monthKey: monthData.month,
        amount: amount,
      };
    }).filter((m) => m.amount > 0); // Remover meses sem dados

    console.log(`📊 Resultado final:`, result);
    return result;
  };

  // Tooltip customizado para o gráfico semanal/mensal
  const CustomWeeklyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Procurar dados dependendo da visualização
      const data = chartView === 'weekly'
        ? weeklyChartData.find((d) => d.week === label)
        : monthlyChartData.find((d) => d.month === label);

      // Calcular subtotais
      const expenseItems = payload.filter((p: any) => p.dataKey.startsWith('expense_'));
      const incomeItems = payload.filter((p: any) => p.dataKey.startsWith('income_'));

      const totalExpenses = expenseItems.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      const totalIncome = incomeItems.reduce((sum: number, item: any) => sum + (item.value || 0), 0);

      return (
        <div className="bg-white p-4 border-2 border-gray-200 rounded-xl shadow-xl">
          {chartView === 'weekly' ? (
            <>
              <p className="font-bold text-gray-900 text-base">{data?.weekLabel}</p>
              <p className="text-sm text-gray-600 mb-3">{data?.dateRange}</p>
            </>
          ) : (
            <p className="font-bold text-gray-900 text-base">{data?.monthFull}</p>
          )}

          {expenseItems.length > 0 && (
            <>
              <p className="font-bold text-red-600 mt-2 mb-1">💸 Despesas:</p>
              {expenseItems.map((entry: any, index: number) => {
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
              <div className="flex justify-between items-center gap-6 py-1 mt-2 pt-2 border-t border-gray-200">
                <span className="text-sm font-bold text-red-600">Subtotal Despesas:</span>
                <span className="font-bold text-sm text-red-600">{formatCurrency(totalExpenses)}</span>
              </div>
            </>
          )}

          {incomeItems.length > 0 && (
            <>
              <p className="font-bold text-green-600 mt-3 mb-1">💰 Receitas:</p>
              {incomeItems.map((entry: any, index: number) => {
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
              <div className="flex justify-between items-center gap-6 py-1 mt-2 pt-2 border-t border-gray-200">
                <span className="text-sm font-bold text-green-600">Subtotal Receitas:</span>
                <span className="font-bold text-sm text-green-600">{formatCurrency(totalIncome)}</span>
              </div>
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
            <option value={30}>Último mês</option>
            <option value={60}>Últimos 2 meses</option>
            <option value={90}>Últimos 3 meses</option>
            <option value={180}>Últimos 6 meses</option>
            <option value={365}>Últimos 12 meses</option>
          </select>
          <button onClick={loadDashboardData} className="btn-primary p-2 sm:p-3">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
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

        <div className="card hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-semibold">💰 Saldo inicial em {getStartDateLabel()}</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
                {stats?.initial_balance !== null && stats?.initial_balance !== undefined
                  ? formatCurrency(stats.initial_balance)
                  : 'Não definido'}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
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
            <p className="text-xs text-gray-500 mb-3">Clique para habilitar/desabilitar</p>
            <div className="space-y-2">
              {Array.from(allCategories).map((category) => {
                const isDisabled = disabledCategories.has(category);
                return (
                  <div
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200 group ${
                      isDisabled
                        ? 'opacity-40 hover:opacity-60 bg-gray-100'
                        : 'hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5'
                    }`}
                    title={isDisabled ? 'Clique para habilitar' : 'Clique para desabilitar'}
                  >
                    <span
                      className={`w-5 h-5 rounded flex-shrink-0 transition-all ${
                        isDisabled ? 'bg-gray-300' : ''
                      }`}
                      style={{ backgroundColor: isDisabled ? undefined : categoryColorMap.get(category) }}
                    />
                    <span className={`text-sm font-medium truncate transition-colors ${
                      isDisabled ? 'text-gray-400 line-through' : 'text-gray-700'
                    }`}>
                      {category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="xl:col-span-3 space-y-6">
          {/* Weekly/Monthly Bar Chart */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                📊 Receitas vs Despesas {chartView === 'weekly' ? 'Semanal' : 'Mensal'} (em Reais R$)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartView('weekly')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    chartView === 'weekly'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Semanal
                </button>
                <button
                  onClick={() => setChartView('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    chartView === 'monthly'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Mensal
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartView === 'weekly' ? weeklyChartData : monthlyChartData} margin={{ bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey={chartView === 'weekly' ? 'week' : 'month'}
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  height={60}
                />
                <XAxis
                  dataKey={chartView === 'weekly' ? 'week' : 'month'}
                  xAxisId="year"
                  orientation="bottom"
                  tick={renderYearTick}
                  stroke="transparent"
                  tickLine={false}
                  axisLine={false}
                  height={30}
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
                  data={categoryStats.filter(cat => !disabledCategories.has(cat.category))}
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
                  {categoryStats.filter(cat => !disabledCategories.has(cat.category)).map((entry, index) => (
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
            <BarChart data={categoryStats.filter(cat => !disabledCategories.has(cat.category)).slice(0, 8)}>
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
                {categoryStats.filter(cat => !disabledCategories.has(cat.category)).slice(0, 8).map((entry, index) => (
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
            <BarChart data={getCategoryMonthlyData(selectedCategory)} barSize={35}>
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
            to="/app/transactions"
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
                    {format(new Date(transaction.date), 'dd/MM/yyyy')} • {transaction.category}
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
