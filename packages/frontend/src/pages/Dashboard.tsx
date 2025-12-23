import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Wallet, Receipt, ArrowRight, RefreshCw, MousePointerClick, BarChart3, Upload, PieChart as PieChartIcon, TrendingUp as ChartIcon, Trophy, List, Lock } from 'lucide-react';
import { dashboardApi, transactionApi, bankApi } from '../services/api';
import type { DashboardStats, CategoryStats, WeeklyStats, Transaction, BankAccount } from '../types';
import { CategoryIcon } from '../components/CategoryIcons';
import { BudgetRadarChart } from '../components/BudgetRadarChart';
import ImportTransactionsModal from '../components/ImportTransactionsModal';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../hooks/useOnboarding';
import { getDemoStats, getDemoCategoryStats, getDemoMonthlyStats, getDemoTransactions } from '../utils/demoData';
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

// Função para obter saudação baseada na hora do dia
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

// Função para obter o primeiro nome
const getFirstName = (fullName: string | undefined) => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};

// Componente para estado vazio dos gráficos
const EmptyChartState = ({ message = "Você ainda não tem dados", isManualPlan = false }: { message?: string; isManualPlan?: boolean }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <div className="relative mb-4">
      <BarChart3 className="w-20 h-20 text-gray-300" strokeWidth={1.5} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
      </div>
    </div>
    <p className="text-gray-500 text-sm text-center max-w-xs">
      {message}
    </p>
    {isManualPlan ? (
      <div className="relative group mt-4">
        <button
          disabled
          className="text-gray-400 text-sm font-medium flex items-center gap-1 cursor-not-allowed"
        >
          <Lock className="w-4 h-4" />
          Conectar banco
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg">
          Disponível apenas nos planos Conectado ou Conectado Plus
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    ) : (
      <Link
        to="/app/connect-bank"
        className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
      >
        Conectar banco <ArrowRight className="w-4 h-4" />
      </Link>
    )}
  </div>
);

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
  const [period, setPeriod] = useState(90); // Padrão: 3 meses
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());
  // CORRIGIDO: Inicializar com valor do localStorage para evitar carregar dados sem filtro
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    return localStorage.getItem('activeAccountId');
  });
  const [activeAccount, setActiveAccount] = useState<BankAccount | null>(null); // Dados completos da conta ativa
  const [accountInitialized, setAccountInitialized] = useState(false);
  const transactionsRef = useRef<HTMLDivElement>(null); // Ref para seção de transações
  const [showImportModal, setShowImportModal] = useState(false);

  // Get subscription info for plan-based restrictions
  // Durante trial, acesso total como Conectado Plus
  const { planType, isTrialActive } = useSubscription();
  const isManualPlan = planType === 'manual' && !isTrialActive;

  // Get user info for greeting
  const { user } = useAuth();

  // Check if tutorial is active for demo data
  const { showOnboarding } = useOnboarding();

  const [selectedPeriod, setSelectedPeriod] = useState<{
    type: 'week' | 'month' | null;
    weekNumber?: number;
    year?: number;
    month?: string;
    monthLabel?: string;
    startDate?: string;
    endDate?: string;
  }>({ type: null });

  useEffect(() => {
    // IMPORTANTE: Validar se o activeAccountId do localStorage existe para este usuário
    // antes de carregar os dados. Isso evita mostrar dados vazios quando o ID é inválido.
    const validateActiveAccount = async () => {
      const savedAccountId = localStorage.getItem('activeAccountId');
      console.log('🔍 Dashboard: Validando activeAccountId do localStorage:', savedAccountId);

      if (savedAccountId) {
        try {
          // Buscar contas do usuário para validar
          const response = await bankApi.getAccounts();
          const accounts = response.data as BankAccount[];
          const foundAccount = accounts.find((acc) => acc.id === savedAccountId);

          if (foundAccount) {
            console.log('✅ Dashboard: Conta ativa válida:', savedAccountId);
            setActiveAccountId(savedAccountId);
            setActiveAccount(foundAccount); // Armazenar dados completos da conta
          } else {
            console.log('⚠️ Dashboard: Conta ativa inválida, limpando localStorage');
            localStorage.removeItem('activeAccountId');
            setActiveAccountId(null);
            setActiveAccount(null);

            // Se há contas disponíveis, usar a primeira ativa
            if (accounts.length > 0) {
              const firstActive = accounts.find((acc) => acc.status === 'active') || accounts[0];
              console.log('🔄 Dashboard: Definindo nova conta ativa:', firstActive.id);
              localStorage.setItem('activeAccountId', firstActive.id);
              setActiveAccountId(firstActive.id);
              setActiveAccount(firstActive); // Armazenar dados completos da conta
            }
          }
        } catch (error) {
          console.error('❌ Dashboard: Erro ao validar conta:', error);
          // Em caso de erro, limpar e continuar sem filtro
          localStorage.removeItem('activeAccountId');
          setActiveAccountId(null);
          setActiveAccount(null);
        }
      }

      // Marcar como inicializado após validação
      setAccountInitialized(true);
    };

    validateActiveAccount();

    // Limpar flag de proteção contra logout após conexão bancária
    // Esta flag é setada em ConnectBank.tsx para evitar logout durante o processo
    const bankConnectionFlag = sessionStorage.getItem('bank_connection_in_progress');
    if (bankConnectionFlag) {
      console.log('🔓 Removendo proteção contra logout (Dashboard carregado)');
      // Delay para garantir que todas as requisições iniciais completem
      setTimeout(() => {
        sessionStorage.removeItem('bank_connection_in_progress');
        console.log('✅ Proteção removida com sucesso');
      }, 2000);
    }

    // Listener para mudanças no banco ativo
    const handleActiveAccountChange = async (event: any) => {
      const { accountId } = event.detail;
      console.log('🏦 Dashboard: Conta ativa mudou para:', accountId);
      setActiveAccountId(accountId);

      // Buscar dados completos da nova conta ativa
      if (accountId) {
        try {
          const response = await bankApi.getAccounts();
          const accounts = response.data as BankAccount[];
          const foundAccount = accounts.find((acc) => acc.id === accountId);
          setActiveAccount(foundAccount || null);
        } catch (error) {
          console.error('❌ Dashboard: Erro ao buscar conta:', error);
          setActiveAccount(null);
        }
      } else {
        setActiveAccount(null);
      }
    };

    window.addEventListener('activeAccountChanged', handleActiveAccountChange);
    return () => {
      window.removeEventListener('activeAccountChanged', handleActiveAccountChange);
    };
  }, []);

  // Apply demo data when tutorial is active
  useEffect(() => {
    if (showOnboarding) {
      console.log('🎮 Tutorial active - applying demo data');
      setStats(getDemoStats());
      setCategoryStats(getDemoCategoryStats());
      setMonthlyStats(getDemoMonthlyStats());
      setRecentTransactions(getDemoTransactions().slice(0, 10));
      setLoading(false);
    }
  }, [showOnboarding]);

  useEffect(() => {
    // Skip API calls when tutorial is active (using demo data)
    if (showOnboarding) {
      return;
    }
    // CORRIGIDO: Só carregar dados após a conta ter sido inicializada
    if (accountInitialized) {
      console.log(`🔄 Dashboard: Carregando dados com conta=${activeAccountId || 'TODAS'}`);
      loadDashboardData();
      // Resetar período selecionado quando mudar o período ou conta
      setSelectedPeriod({ type: null });
    }
  }, [activeAccountId, period, accountInitialized, showOnboarding]);

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

      // IMPORTANTE: Passar account_id para TODAS as APIs do dashboard
      // Isso garante que apenas transações da conta ativa sejam mostradas
      const [statsRes, categoryRes, weeklyRes, monthlyRes, transactionsRes, accountsRes] = await Promise.all([
        dashboardApi.getStats(period, accountFilter),
        dashboardApi.getExpensesByCategory(period, accountFilter),
        dashboardApi.getWeeklyStats(period, accountFilter),
        dashboardApi.getMonthlyStatsByCategory(months, accountFilter),
        transactionApi.getTransactions({
          limit: 10,
          account_id: accountFilter
        }),
        bankApi.getAccounts(), // Buscar contas atualizadas (saldo e limite)
      ]);

      console.log(`📈 Received weekly stats: ${weeklyRes.data.length} weeks`);
      console.log(`📅 Received monthly stats: ${monthlyRes.data.length} months`);

      setStats(statsRes.data);
      setCategoryStats(categoryRes.data);
      setWeeklyStats(weeklyRes.data);
      setMonthlyStats(monthlyRes.data);
      setRecentTransactions(transactionsRes.data.transactions);

      // Atualizar dados da conta ativa (para mostrar saldo e limite atualizados)
      if (activeAccountId && accountsRes.data) {
        const accounts = accountsRes.data as BankAccount[];
        const foundAccount = accounts.find((acc) => acc.id === activeAccountId);
        if (foundAccount) {
          setActiveAccount(foundAccount);
          console.log(`💰 Account updated: balance=${foundAccount.balance}, credit_limit=${foundAccount.credit_limit || 'N/A'}`);
        }
      }
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

  // Função para rolar até as transações recentes
  const scrollToTransactions = () => {
    console.log('📜 Scrolling to transactions, ref:', transactionsRef.current);
    if (transactionsRef.current) {
      transactionsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      console.log('✅ Scroll executed');
    } else {
      console.log('❌ transactionsRef.current is null');
    }
  };

  // Carregar transações filtradas quando um período é selecionado
  const loadFilteredTransactions = async (startDate: string, endDate: string) => {
    console.log(`💾 Loading filtered transactions: ${startDate} to ${endDate}`);
    try {
      const accountFilter = activeAccountId ? activeAccountId : undefined;
      console.log('🏦 Account filter:', accountFilter);

      const transactionsRes = await transactionApi.getTransactions({
        start_date: startDate,
        end_date: endDate,
        account_id: accountFilter,
        limit: 1000
      });

      console.log(`✅ Loaded ${transactionsRes.data.transactions.length} transactions`);
      setRecentTransactions(transactionsRes.data.transactions);
    } catch (error) {
      console.error('❌ Error loading filtered transactions:', error);
    }
  };

  // Handler para clique no gráfico mensal
  const handleChartClick = (data: any) => {
    console.log('🖱️ Chart clicked, full data:', data);

    if (!data) {
      console.log('⚠️ No data');
      return;
    }

    let clickedData = data;

    // Se tiver activePayload, usar o primeiro item
    if (data.activePayload && data.activePayload.length > 0) {
      clickedData = data.activePayload[0].payload;
      console.log('📦 Using activePayload:', clickedData);
    }

    console.log('📊 Clicked data:', clickedData);

    // Visualização mensal
    const monthKey = clickedData.monthKey; // ex: '2025-09'

    if (!monthKey) {
      console.log('❌ No monthKey property found');
      return;
    }

    console.log('📅 Searching for monthKey:', monthKey);

    const monthData = monthlyStats.find(m => m.month === monthKey);

    if (monthData) {
      const [year, month] = monthData.month.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

      setSelectedPeriod({
        type: 'month',
        month: monthData.month,
        monthLabel: monthData.monthLabel,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      loadFilteredTransactions(startDate.toISOString(), endDate.toISOString());
      scrollToTransactions();
    }
  };

  // Gerar título dinâmico para transações
  const getTransactionsTitle = () => {
    if (selectedPeriod.type === 'month') {
      return `Transações ${selectedPeriod.monthLabel}`;
    }
    return 'Transações Recentes';
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
    const currentIndex = monthlyChartData.findIndex((d: any) => d.month === payload.value);

    if (currentIndex === -1) return <></>;

    const currentYear = monthlyChartData[currentIndex].year;

    // Mostrar ano apenas no meio do grupo de dados do mesmo ano
    const yearGroup = monthlyChartData.filter((d: any) => d.year === currentYear);
    const firstIndexOfYear = monthlyChartData.findIndex((d: any) => d.year === currentYear);
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

  // Tooltip customizado para o gráfico mensal
  const CustomMonthlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = monthlyChartData.find((d) => d.month === label);

      // Calcular subtotais
      const expenseItems = payload.filter((p: any) => p.dataKey.startsWith('expense_'));
      const incomeItems = payload.filter((p: any) => p.dataKey.startsWith('income_'));

      const totalExpenses = expenseItems.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      const totalIncome = incomeItems.reduce((sum: number, item: any) => sum + (item.value || 0), 0);

      return (
        <div className="bg-white p-4 border-2 border-gray-200 rounded-xl shadow-xl">
          <p className="font-bold text-gray-900 text-base mb-3 text-center">{data?.monthFull}</p>

          <div className="flex gap-6">
            {/* Coluna Despesas */}
            {expenseItems.length > 0 && (
              <div className="flex-1 min-w-[140px]">
                <p className="font-bold text-red-600 mb-2 text-sm">Despesas</p>
                {expenseItems.map((entry: any, index: number) => {
                  const category = entry.dataKey.replace('expense_', '');
                  return (
                    <div key={index} className="flex justify-between items-center gap-3 py-0.5">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-gray-700">{category}</span>
                      </span>
                      <span className="font-medium text-xs">{formatCurrency(entry.value)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center gap-3 py-1 mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs font-bold text-red-600">Total:</span>
                  <span className="font-bold text-xs text-red-600">{formatCurrency(totalExpenses)}</span>
                </div>
              </div>
            )}

            {/* Coluna Receitas */}
            {incomeItems.length > 0 && (
              <div className="flex-1 min-w-[140px]">
                <p className="font-bold text-green-600 mb-2 text-sm">Receitas</p>
                {incomeItems.map((entry: any, index: number) => {
                  const category = entry.dataKey.replace('income_', '');
                  return (
                    <div key={index} className="flex justify-between items-center gap-3 py-0.5">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-xs text-gray-700">{category}</span>
                      </span>
                      <span className="font-medium text-xs">{formatCurrency(entry.value)}</span>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center gap-3 py-1 mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs font-bold text-green-600">Total:</span>
                  <span className="font-bold text-xs text-green-600">{formatCurrency(totalIncome)}</span>
                </div>
              </div>
            )}
          </div>
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
    <div className="max-w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
      <div className="space-y-6">
      {/* Header with Greeting */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">
              {getGreeting()}, {getFirstName(user?.name) || 'usuário'}! 👋
            </h1>
            <p className="text-gray-500 mt-1">Visão geral dos seus gastos</p>
          </div>
          {/* Period selector, refresh and action buttons - all on same line */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="input text-xs sm:text-sm"
              data-tour="period-selector"
            >
              <option value={30}>1 mês</option>
              <option value={60}>2 meses</option>
              <option value={90}>3 meses</option>
              <option value={180}>6 meses</option>
              <option value={365}>12 meses</option>
            </select>
            <button onClick={loadDashboardData} className="btn-primary p-2 sm:p-3 flex-shrink-0">
              <RefreshCw className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
            {isManualPlan ? (
              <div className="relative group">
                <button
                  disabled
                  className="btn-secondary flex items-center justify-center space-x-2 opacity-60 cursor-not-allowed text-xs sm:text-sm px-3 py-2 sm:py-2.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>Conectar Banco</span>
                </button>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg">
                  Disponível apenas nos planos Conectado ou Conectado Plus
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
            ) : (
              <Link to="/app/connect-bank" className="btn-primary flex items-center justify-center space-x-2 text-xs sm:text-sm px-3 py-2 sm:py-2.5" data-tour="connect-bank-btn">
                <Wallet className="w-4 h-4" />
                <span>Conectar Banco</span>
              </Link>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary flex items-center justify-center space-x-2 text-xs sm:text-sm px-3 py-2 sm:py-2.5"
              title="Importar transações CSV"
            >
              <Upload className="w-4 h-4" />
              <span>Importar CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6" data-tour="stats-cards">
        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Saldo total hoje</p>
                {activeAccount?.credit_limit && activeAccount.credit_limit > 0 && (
                  <p className="text-xs text-gray-400 ml-2">
                    Limite: {formatCurrency(activeAccount.credit_limit)}
                  </p>
                )}
              </div>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${(stats?.total_balance || 0) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {formatCurrency(stats?.total_balance || 0)}
              </p>
              {/* Mostrar disponível quando houver limite */}
              {activeAccount?.credit_limit && activeAccount.credit_limit > 0 && (
                <p className={`text-xs mt-1 ${(stats?.total_balance || 0) < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {(stats?.total_balance || 0) < 0
                    ? `Disponível: ${formatCurrency(activeAccount.credit_limit + (stats?.total_balance || 0))}`
                    : `Total disponível: ${formatCurrency(activeAccount.credit_limit + (stats?.total_balance || 0))}`
                  }
                </p>
              )}
            </div>
            <div className="p-3 bg-primary-100 rounded-full">
              <Wallet className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Receitas (desde {getStartDateLabel()})</p>
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
              <p className="text-sm text-gray-500">Despesas (desde {getStartDateLabel()})</p>
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
        <div className="xl:col-span-1 order-2 xl:order-1 self-stretch">
          <div className="card h-full">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
              <List className="w-5 h-5 text-primary-600" />
              Legenda
            </h3>
            <p className="text-xs text-gray-500 mb-2 sm:mb-3">Clique para habilitar/desabilitar</p>
            <div className="space-y-1 sm:space-y-2">
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
        <div className="xl:col-span-3 space-y-6 order-1 xl:order-2">
          {/* Monthly Bar Chart */}
          <div className="card overflow-hidden" data-tour="monthly-chart">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              Receitas vs Despesas Mensal (em Reais R$)
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Últimos {getMonthsCount()} {getMonthsCount() === 1 ? 'mês' : 'meses'}
            </p>
            {monthlyChartData.length === 0 ? (
              <EmptyChartState isManualPlan={isManualPlan} />
            ) : (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={monthlyChartData}
                    margin={{ bottom: 40 }}
                    onClick={handleChartClick}
                    style={{ cursor: 'pointer' }}
                    barSize={20}
                  >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="#888"
                  height={60}
                />
                <XAxis
                  dataKey="month"
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
                <Tooltip content={<CustomMonthlyTooltip />} />

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
                    onClick={handleChartClick}
                    cursor="pointer"
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
                    onClick={handleChartClick}
                    cursor="pointer"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            </div>
            )}
          </div>

          {/* Pie Chart with Legend */}
          <div className="card overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary-600" />
              Despesas por Categoria em %
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Últimos {getMonthsCount()} {getMonthsCount() === 1 ? 'mês' : 'meses'}
            </p>
            {categoryStats.length === 0 ? (
              <EmptyChartState isManualPlan={isManualPlan} />
            ) : (
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4">
              <div className="w-full lg:w-1/2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryStats.filter(cat => !disabledCategories.has(cat.category))}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
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
              <div className="w-full lg:w-1/2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                {categoryStats.filter(cat => !disabledCategories.has(cat.category)).map((item) => (
                  <div key={item.category} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded flex-shrink-0"
                      style={{ backgroundColor: categoryColorMap.get(item.category) || '#94a3b8' }}
                    />
                    <span className="text-xs sm:text-sm text-gray-700 truncate">
                      {item.category} ({item.percentage.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Categories e Evolução Mensal lado a lado */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="card overflow-hidden">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Top Categorias de Gastos (em Reais R$)
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            Média mensal dos últimos {getMonthsCount()} {getMonthsCount() === 1 ? 'mês' : 'meses'}
          </p>
          <div className="flex items-center gap-2 mb-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <MousePointerClick className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-blue-800">
              <span className="font-bold">Dica:</span> Clique para ver o detalhamento!
            </p>
          </div>
          {categoryStats.length === 0 ? (
            <EmptyChartState isManualPlan={isManualPlan} />
          ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[400px] px-4 sm:px-0">
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
            </div>
          )}
        </div>

        {/* Category Monthly Detail - Sempre visível */}
        <div id="category-detail" className="card shadow-xl overflow-hidden">
          {selectedCategory ? (
            <>
              <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <ChartIcon className="w-5 h-5 text-primary-600" />
                <span
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: categoryColorMap.get(selectedCategory) }}
                />
                <span className="truncate">{selectedCategory} (em Reais R$)</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 mb-3">
                Últimos {getMonthsCount()} {getMonthsCount() === 1 ? 'mês' : 'meses'}
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

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[400px] px-4 sm:px-0">
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
              </div>
            </div>

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
          ) : categoryStats.length === 0 ? (
            <>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ChartIcon className="w-5 h-5 text-primary-600" />
                Detalhamento da categoria por mês
              </h2>
              <EmptyChartState isManualPlan={isManualPlan} />
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

      {/* Budget Radar Chart */}
      <BudgetRadarChart />

      {/* Recent Transactions */}
      <div ref={transactionsRef} className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary-600" />
            {getTransactionsTitle()}
          </h2>
          <Link
            to="/app/transactions"
            className="text-primary-600 hover:text-primary-700 flex items-center text-sm font-semibold"
          >
            Ver todas
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Nenhuma transação encontrada neste período</p>
          </div>
        ) : (
          <div className="space-y-3 min-h-[200px]">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition bg-white shadow-sm"
              >
                <CategoryIcon category={transaction.category || 'Outros'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {transaction.merchant || transaction.description}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'credit' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(transaction.date), 'dd/MM/yyyy')} • {transaction.category}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportTransactionsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadDashboardData();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
