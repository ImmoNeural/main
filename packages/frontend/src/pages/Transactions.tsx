import { useEffect, useState, useMemo, useRef } from 'react';
import { format, subMonths, startOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Download, AlertCircle, RefreshCw, ArrowUp, ChevronDown, ChevronUp, Receipt, Trash2, DollarSign, PieChart, ChevronLeft, ChevronRight, PlusCircle, Sparkles, RotateCcw, Loader2, Lock, Copy, Wallet } from 'lucide-react';
import { transactionApi, bankApi } from '../services/api';
import type { Transaction, Category, BankAccount } from '../types';
import BulkRecategorizeModal from '../components/BulkRecategorizeModal';
import ImportTransactionsModal from '../components/ImportTransactionsModal';
import { CategoryIconSmall } from '../components/CategoryIcons';
import { useSubscription } from '../hooks/useSubscription';
import { useOnboarding } from '../hooks/useOnboarding';
import { useCountry } from '../contexts/CountryContext';
import { getDemoTransactions } from '../utils/demoData';

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCostType, setSelectedCostType] = useState(''); // Novo: Filtro de tipo de custo
  const [currentPeriod, setCurrentPeriod] = useState(new Date()); // Para navegação de mês/ano
  const [isLoading, setIsLoading] = useState(false);
  // CORRIGIDO: Inicializar com valor do localStorage para evitar carregar dados sem filtro
  const [activeAccountId, setActiveAccountId] = useState<string | null>(() => {
    return localStorage.getItem('activeAccountId');
  });
  const [accountInitialized, setAccountInitialized] = useState(false);

  // Check if tutorial is active for demo data
  const { showOnboarding, shouldShowDemoData } = useOnboarding();
  const prevShowOnboarding = useRef(showOnboarding);

  // Get subscription info for plan-based restrictions
  // Durante trial, acesso total como Conectado Plus
  const { planType, isTrialActive } = useSubscription();
  const { country } = useCountry();

  // Plan-based feature flags
  // Durante trial, usuário tem acesso total (como Conectado Plus)
  const isManualPlan = planType === 'manual' && !isTrialActive;
  const isConectadoPlan = planType === 'conectado' && !isTrialActive;
  const isConectadoPlusPlan = planType === 'conectado_plus' || isTrialActive; // Trial = Conectado Plus

  // Categorize button: disabled for manual, enabled without AI for conectado, full AI for conectado_plus
  const canUseAI = isConectadoPlusPlan || isTrialActive;

  // Mapeamento de subcategorias por categoria
  const subcategoriesMap: Record<string, string[]> = {
    'Supermercado': ['Compras de Mercado'],
    'Alimentação': ['Restaurantes e Delivery', 'Padaria'],
    'Saúde': ['Odontologia', 'Farmácias e Drogarias', 'Médicos e Clínicas', 'Academia e Fitness'],
    'Entretenimento': ['Lazer e Diversão', 'Streaming e Assinaturas'],
    'Transporte': ['Apps de Transporte', 'Combustível e Pedágio', 'Transporte Público', 'Seguros', 'Estacionamentos'],
    'Compras': ['E-commerce', 'Moda e Vestuário', 'Tecnologia'],
    'Casa': ['Construção e Reforma', 'Móveis e Decoração'],
    'Banco e Seguradoras': ['Bancos e Fintechs', 'Seguradoras', 'Empréstimos Bancários', 'Financiamentos', 'Cheque Especial'],
    'Contas': ['Telefonia e Internet', 'Energia e Água', 'Boletos e Débitos', 'Condomínio', 'Aluguel de Eletrodomésticos', 'Aluguel de Imóvel'],
    'Educação': ['Livrarias e Papelarias', 'Cursos e Ensino'],
    'Pet': ['Alimentação', 'Médico', 'Tratamentos', 'Seguradoras'],
    'Viagens': ['Aéreo e Turismo'],
    'Salário': ['Salário e Rendimentos'],
    'Saques': ['Saques em Dinheiro'],
    'Investimentos': ['Aplicações e Investimentos', 'Poupança e Capitalização', 'Corretoras e Fundos'],
    'Receitas': ['Rendimentos de Investimentos'],
    'Transferências': ['PIX', 'TED/DOC'],
    'Impostos e Taxas': ['IOF e Impostos'],
  };
  // const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false); // Temporariamente desabilitado

  // Estados para o modal de recategorização em lote
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [similarTransactions, setSimilarTransactions] = useState<Array<Transaction & { matchScore: number; matchedWords: string[] }>>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Estados para o modal de debug (desabilitado por enquanto)
  // const [showDebugModal, setShowDebugModal] = useState(false);
  // const [debugResult, setDebugResult] = useState<any>(null);
  // const [debugLoading, setDebugLoading] = useState(false);

  // Estado para o modal de importação
  const [showImportModal, setShowImportModal] = useState(false);

  // Estado para saldo inicial (vindo do backend)
  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [initialBalanceDate, setInitialBalanceDate] = useState<string | null>(null);

  // Estado para recategorização com IA
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiProgressText, setAiProgressText] = useState('');

  // Gerar últimos 12 meses dinamicamente (não usado no momento)
  /* const getLast12Months = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      // Capitalizar primeira letra: Janeiro, Fevereiro, etc.
      const monthLabel = format(date, 'MMMM yyyy', { locale: ptBR })
        .replace(/^\w/, (c) => c.toUpperCase());
      months.push({ key: monthKey, label: monthLabel });
    }
    return months;
  }; */

  // Carregar conta ativa do localStorage e ouvir mudanças
  useEffect(() => {
    // Skip validation during tutorial
    if (showOnboarding) {
      console.log('🎮 Transactions: Tutorial mode - skipping account validation');
      return;
    }

    // IMPORTANTE: Validar se o activeAccountId do localStorage existe para este usuário
    const validateActiveAccount = async () => {
      const savedAccountId = localStorage.getItem('activeAccountId');
      console.log('🔍 Transactions: Validando activeAccountId:', savedAccountId);

      if (savedAccountId) {
        try {
          const response = await bankApi.getAccounts();
          const accounts = response.data as BankAccount[];
          const foundAccount = accounts.find((acc) => acc.id === savedAccountId);

          if (foundAccount) {
            console.log('✅ Transactions: Conta ativa válida:', savedAccountId);
            setActiveAccountId(savedAccountId);
          } else {
            console.log('⚠️ Transactions: Conta ativa inválida, limpando');
            localStorage.removeItem('activeAccountId');
            setActiveAccountId(null);

            if (accounts.length > 0) {
              const firstActive = accounts.find((acc) => acc.status === 'active') || accounts[0];
              localStorage.setItem('activeAccountId', firstActive.id);
              setActiveAccountId(firstActive.id);
            }
          }
        } catch (error) {
          console.error('❌ Transactions: Erro ao validar conta:', error);
          localStorage.removeItem('activeAccountId');
          setActiveAccountId(null);
        }
      }

      setAccountInitialized(true);
    };

    validateActiveAccount();

    // Listener para mudanças no banco ativo
    const handleActiveAccountChange = (event: any) => {
      const { accountId } = event.detail;
      console.log('🏦 Transactions: Conta ativa mudou para:', accountId);
      setActiveAccountId(accountId);
    };

    window.addEventListener('activeAccountChanged', handleActiveAccountChange);
    return () => {
      window.removeEventListener('activeAccountChanged', handleActiveAccountChange);
    };
  }, [showOnboarding]);

  // Apply demo data when tutorial is active, reload real data when it ends
  useEffect(() => {
    if (shouldShowDemoData) {
      console.log('🎮 Transactions: Tutorial active - applying demo data');
      const demoTransactions = getDemoTransactions();
      setTransactions(demoTransactions);
      setInitialBalance(5000);
      setInitialBalanceDate(null);
      // Set default categories for demo
      setCategories([
        { category: 'Alimentação', icon: '🍕', color: '#FF5722' },
        { category: 'Transporte', icon: '🚗', color: '#2196F3' },
        { category: 'Moradia', icon: '🏠', color: '#795548' },
        { category: 'Saúde e Bem-Estar', icon: '💊', color: '#009688' },
        { category: 'Empréstimos e Financiamentos', icon: '💰', color: '#673AB7' },
        { category: 'Seguros', icon: '🛡️', color: '#673AB7' },
        { category: 'Lazer e Entretenimento', icon: '🎮', color: '#9C27B0' },
        { category: 'Receitas', icon: '💹', color: '#4CAF50' },
        { category: 'Não Categorizado', icon: '❓', color: '#9CA3AF' },
      ]);
      setIsLoading(false);
    } else if (prevShowOnboarding.current && !showOnboarding) {
      // Tutorial just ended - clear demo data and reload real data
      console.log('🔄 Transactions: Tutorial ended - clearing demo data and reloading real data');
      setTransactions([]);
      setCategories([]);
      setInitialBalance(null);
      setIsLoading(true);
      // NÃO resetar accountInitialized - deixar o outro effect cuidar da inicialização
    }
    prevShowOnboarding.current = showOnboarding;
  }, [showOnboarding, shouldShowDemoData]);

  useEffect(() => {
    // Skip API calls during tutorial
    if (showOnboarding) {
      return;
    }
    // CORRIGIDO: Só carregar dados após a conta ter sido inicializada
    if (accountInitialized) {
      console.log(`🔄 Transactions: Carregando dados com conta=${activeAccountId || 'TODAS'}`);
      loadData();
    }
  }, [selectedCategory, selectedType, activeAccountId, accountInitialized, showOnboarding]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // IMPORTANTE: Filtrar transações pela conta ativa
      const accountFilter = activeAccountId ? activeAccountId : undefined;
      console.log(`📊 Loading transactions: account=${accountFilter || 'ALL'}`);

      const [transactionsRes, categoriesRes] = await Promise.all([
        transactionApi.getTransactions({
          category: selectedCategory || undefined,
          type: selectedType || undefined,
          account_id: accountFilter, // Filtrar por conta ativa
          limit: 10000, // Buscar todas as transações
        }),
        transactionApi.getCategories(),
      ]);

      setTransactions(transactionsRes.data.transactions);

      // Extrair saldo inicial do backend
      if (transactionsRes.data.initial_balance !== undefined && transactionsRes.data.initial_balance !== null) {
        setInitialBalance(transactionsRes.data.initial_balance);
        setInitialBalanceDate(transactionsRes.data.initial_balance_date);
        console.log(`💰 Frontend: Saldo inicial recebido do backend: R$ ${transactionsRes.data.initial_balance.toFixed(2)}`);
      } else {
        setInitialBalance(null);
        setInitialBalanceDate(null);
        console.log(`⚠️ Frontend: Saldo inicial não disponível no backend`);
      }

      // Garantir que "Não Categorizado" esteja sempre disponível no dropdown
      const categoriesWithUncategorized = categoriesRes.data;
      if (!categoriesWithUncategorized.some(cat => cat.category === 'Não Categorizado')) {
        categoriesWithUncategorized.push({
          category: 'Não Categorizado',
          icon: '❓',
          color: '#9CA3AF',
        });
      }
      setCategories(categoriesWithUncategorized);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    // Se tem conta ativa, deletar só dessa conta
    // Se não tem, deletar de todas as contas
    const message = activeAccountId
      ? '⚠️ Deletar TODAS as transações desta conta?\n\nEsta ação é irreversível.'
      : '⚠️ Deletar TODAS as transações de TODAS as contas?\n\nEsta ação é irreversível.';

    const confirmDelete = confirm(message);

    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      console.log('🗑️ Deletando transações...', activeAccountId ? `(conta: ${activeAccountId})` : '(todas as contas)');
      const response = await transactionApi.deleteAll(activeAccountId || undefined);
      console.log('✅ Transações deletadas:', response.data);

      alert(`✅ ${response.data.message}`);

      // Recarregar transações (deve estar vazio agora)
      await loadData();
    } catch (error: any) {
      console.error('❌ Erro ao deletar:', error);
      alert('❌ Erro ao deletar transações.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecategorizeAI = async () => {
    // Contar transações não categorizadas para mostrar no confirm
    const uncategorizedCount = transactions.filter(
      t => !t.category || t.category === 'Não Categorizado'
    ).length;

    if (uncategorizedCount === 0) {
      alert('Não há transações para categorizar. Todas já estão categorizadas!');
      return;
    }

    const confirmRecategorize = confirm(
      `🤖 Categorizar ${uncategorizedCount} transações com IA?\n\n` +
      '• Camada 1: Regras estáticas\n' +
      '• Camada 2: Histórico pessoal + padrões globais\n' +
      '• Camada 3: ChatGPT (para casos difíceis)\n\n' +
      'Apenas transações "Não Categorizado" serão processadas.'
    );

    if (!confirmRecategorize) return;

    setIsAILoading(true);
    setAiProgress(0);
    setAiProgressText('Iniciando categorização...');

    // Simular progresso enquanto backend processa
    const progressInterval = setInterval(() => {
      setAiProgress(prev => {
        if (prev >= 90) return prev; // Parar em 90% até backend responder
        const increment = Math.random() * 15;
        const newProgress = Math.min(prev + increment, 90);

        // Atualizar texto baseado no progresso
        if (newProgress < 30) {
          setAiProgressText('Camada 1: Aplicando regras estáticas...');
        } else if (newProgress < 60) {
          setAiProgressText('Camada 2: Analisando histórico...');
        } else {
          setAiProgressText('Camada 3: Processando com ChatGPT...');
        }

        return newProgress;
      });
    }, 500);

    try {
      console.log('🤖 Iniciando recategorização com IA (3 camadas)...');
      const response = await transactionApi.recategorizeAI(true, country);

      // Backend respondeu, completar progresso
      clearInterval(progressInterval);
      setAiProgress(100);
      setAiProgressText('Concluído!');

      console.log('✅ Recategorização com IA concluída:', response.data);

      // Log detalhado das camadas
      console.log('📊 Estatísticas por camada:');
      console.log(`   🎯 Camada 1 (regras estáticas): ${response.data.layer1}`);
      console.log(`   👤 Camada 2A (histórico pessoal): ${response.data.layer2a}`);
      console.log(`   🌍 Camada 2B (padrões globais): ${response.data.layer2b}`);
      console.log(`   🤖 Camada 3 (ChatGPT): ${response.data.layer3}`);
      console.log(`   ❓ Não categorizadas: ${response.data.uncategorized}`);
      console.log(`   ✅ Total atualizadas: ${response.data.updated}`);

      // Pequeno delay para mostrar 100%
      await new Promise(resolve => setTimeout(resolve, 500));

      alert(
        `✅ Categorização com IA concluída!\n\n` +
        `📊 Resultados:\n` +
        `• Camada 1 (regras): ${response.data.layer1}\n` +
        `• Camada 2 (histórico): ${response.data.layer2a + response.data.layer2b}\n` +
        `• Camada 3 (ChatGPT): ${response.data.layer3}\n` +
        `• Não categorizadas: ${response.data.uncategorized}\n\n` +
        `Total atualizado: ${response.data.updated} transações`
      );

      // Recarregar transações
      await loadData();
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error('❌ Erro ao recategorizar com IA:', error);
      alert('❌ Erro ao recategorizar com IA. Verifique o console para detalhes.');
    } finally {
      setIsAILoading(false);
      setAiProgress(0);
      setAiProgressText('');
    }
  };

  const handleResetCategories = async () => {
    const accountScope = activeAccountId
      ? 'da conta selecionada'
      : 'de TODAS as contas';

    const confirmReset = confirm(
      `⚠️ Resetar categorias?\n\n` +
      `Todas as transações ${accountScope} serão marcadas como "Não Categorizado".\n\n` +
      `Isso permite recategorizar do zero com IA.`
    );

    if (!confirmReset) return;

    setIsLoading(true);
    try {
      const response = await transactionApi.resetCategories(activeAccountId || undefined);
      alert(`✅ ${response.data.updated} transações resetadas para "Não Categorizado"`);
      await loadData();
    } catch (error: any) {
      console.error('❌ Erro ao resetar categorias:', error);
      alert('❌ Erro ao resetar categorias.');
    } finally {
      setIsLoading(false);
    }
  };

  /* Debug function temporarily disabled
  const handleDebugCategorization = async (transaction: Transaction) => {
    console.log('\n\n🐛🐛🐛 ===============================================');
    console.log('🐛 FRONTEND: Iniciando debug de categorização');
    console.log('🐛 ===============================================');
    console.log('Transaction:', transaction);
    console.log('Transaction ID:', transaction.id);
    console.log('Description:', transaction.description);
    console.log('Merchant:', transaction.merchant);
    console.log('Amount:', transaction.amount);

    setDebugLoading(true);
    setShowDebugModal(true);
    setDebugResult(null);

    try {
      console.log('🐛 Chamando API: /api/transactions/debug-categorization');
      console.log('🐛 Payload:', { transactionId: transaction.id });

      const response = await transactionApi.debugCategorization({
        transactionId: transaction.id,
      });

      console.log('✅ FRONTEND: Resposta recebida do backend:');
      console.log(response.data);
      setDebugResult(response.data);
    } catch (error: any) {
      console.error('❌ FRONTEND: Erro ao debugar categorização:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      setDebugResult({
        error: true,
        message: error.response?.data?.error || error.message || 'Erro desconhecido',
      });
    } finally {
      console.log('🐛 FRONTEND: Finalizando debug');
      console.log('🐛 ===============================================\n\n');
      setDebugLoading(false);
    }
  };
  */

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Mapeamento de categorias para tipos de custo
  const costTypeMap: Record<string, string> = {
    // Despesas Fixas
    'Contas': 'Fixos',
    'Banco e Seguradoras': 'Fixos',
    'Entretenimento': 'Fixos', // Streaming e assinaturas
    'Educação': 'Fixos',
    'Impostos e Taxas': 'Fixos',
    'Saúde': 'Fixos', // Planos e mensalidades

    // Despesas Variáveis
    'Supermercado': 'Variáveis',
    'Alimentação': 'Variáveis',
    'Transporte': 'Variáveis',
    'Compras': 'Variáveis',
    'Casa': 'Variáveis',
    'Pet': 'Variáveis',
    'Viagens': 'Variáveis',

    // Investimentos e Movimentações
    'Investimentos': 'Investimentos',
    'Transferências': 'Investimentos',
    'Saques': 'Investimentos',
    'PIX': 'Investimentos',
    'TED/DOC': 'Investimentos',
  };

  const filteredTransactionsRaw = transactions.filter((transaction) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      transaction.merchant?.toLowerCase().includes(searchLower) ||
      transaction.description?.toLowerCase().includes(searchLower) ||
      transaction.category?.toLowerCase().includes(searchLower);

    // Filtro por período (mês/ano selecionado no PeriodSelector)
    const matchesPeriod = format(new Date(transaction.date), 'yyyy-MM') === format(currentPeriod, 'yyyy-MM');

    // Filtro por tipo de custo
    const matchesCostType = !selectedCostType || costTypeMap[transaction.category || ''] === selectedCostType;

    return matchesSearch && matchesPeriod && matchesCostType;
  });

  // Transações filtradas (coluna de saldo removida por segurança)
  const filteredTransactions = filteredTransactionsRaw;

  // Detectar possíveis duplicatas (mesma data + mesmo valor + mesma descrição, mas IDs diferentes)
  const possibleDuplicates = useMemo(() => {
    const duplicateIds = new Set<string>();

    // Criar um mapa para agrupar transações por chave (data + valor + descrição)
    const groupedTransactions = new Map<string, Transaction[]>();

    for (const transaction of filteredTransactions) {
      // Criar chave única: data (apenas dia) + valor absoluto + descrição normalizada
      const dateKey = format(new Date(transaction.date), 'yyyy-MM-dd');
      const amountKey = Math.abs(transaction.amount).toFixed(2);
      const descKey = (transaction.description || transaction.merchant || '').toLowerCase().trim();
      const key = `${dateKey}|${amountKey}|${descKey}`;

      if (!groupedTransactions.has(key)) {
        groupedTransactions.set(key, []);
      }
      groupedTransactions.get(key)!.push(transaction);
    }

    // Marcar transações que aparecem mais de uma vez
    for (const [, group] of groupedTransactions) {
      if (group.length > 1) {
        // Verificar se os IDs são diferentes (confirma que são transações distintas)
        const uniqueIds = new Set(group.map(t => t.transaction_id || t.id));
        if (uniqueIds.size > 1) {
          // São transações diferentes com mesmos dados - marcar como possíveis duplicatas
          group.forEach(t => duplicateIds.add(t.id));
        }
      }
    }

    return duplicateIds;
  }, [filteredTransactions]);

  // Calcular transações dos últimos 12 meses COMPLETOS (para cards de resumo e breakdown)
  // Lógica: 12 meses = mês atual + 11 meses anteriores
  // Ex: Se estamos em 13/11/2025, pega desde 01/12/2024 até agora (dez/2024 a nov/2025 = 12 meses)
  const getLast12MonthsTransactions = () => {
    const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11)); // Início do mês 11 meses atrás
    console.log(`📅 Transações: Filtrando desde ${format(twelveMonthsAgo, 'dd/MM/yyyy')} (12 meses)`);
    return transactions.filter(t => new Date(t.date) >= twelveMonthsAgo);
  };

  const last12MonthsTransactions = getLast12MonthsTransactions();

  // Formatar data de início baseada no saldo inicial do backend
  const getStartDateLabel = () => {
    // Se temos a data do saldo inicial do backend, usar ela
    if (initialBalanceDate) {
      return format(new Date(initialBalanceDate), 'dd.MM.yy');
    }

    // Fallback: se não há transações, usar 12 meses atrás
    if (transactions.length === 0) {
      const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
      return format(twelveMonthsAgo, 'dd.MM.yy');
    }

    // Fallback 2: Pegar a data da transação mais antiga
    const oldestTransaction = transactions.reduce((oldest, current) => {
      return new Date(current.date) < new Date(oldest.date) ? current : oldest;
    }, transactions[0]);

    const startDate = startOfMonth(new Date(oldestTransaction.date));
    return format(startDate, 'dd.MM.yy');
  };

  // Calcular totais dos últimos 12 meses (não afetados por filtros)
  const totalIncome = last12MonthsTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpense = last12MonthsTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalInvestments = last12MonthsTransactions
    .filter(t => t.category === 'Investimentos')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalInvestmentsDebitOnly = last12MonthsTransactions
    .filter(t => t.category === 'Investimentos' && t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // const balance = totalIncome - totalExpense; // Não usado - agora usamos currentMonthBalance

  console.log('\n📊 DEBUG TRANSAÇÕES (Últimos 12 meses):');
  console.log(`   Total transações: ${last12MonthsTransactions.length}`);
  console.log(`   Total Income: R$ ${totalIncome.toFixed(2)}`);
  console.log(`   Total Expenses (todos débitos): R$ ${totalExpense.toFixed(2)}`);
  console.log(`   Investimentos (débito+crédito): R$ ${totalInvestments.toFixed(2)}`);
  console.log(`   Investimentos (só débito): R$ ${totalInvestmentsDebitOnly.toFixed(2)}`);

  // Calcular comparação com o mês anterior
  const previousMonth = subMonths(currentPeriod, 1);
  const previousMonthKey = format(previousMonth, 'yyyy-MM');

  const previousMonthTransactions = last12MonthsTransactions.filter(t => {
    const transactionMonth = format(new Date(t.date), 'yyyy-MM');
    return transactionMonth === previousMonthKey;
  });

  const previousMonthIncome = previousMonthTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const previousMonthExpense = previousMonthTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const previousMonthBalance = previousMonthIncome - previousMonthExpense;

  // Calcular transações do mês atual
  const currentMonthKey = format(currentPeriod, 'yyyy-MM');
  const currentMonthTransactions = last12MonthsTransactions.filter(t => {
    const transactionMonth = format(new Date(t.date), 'yyyy-MM');
    return transactionMonth === currentMonthKey;
  });

  const currentMonthIncome = currentMonthTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const currentMonthExpense = currentMonthTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const currentMonthBalance = currentMonthIncome - currentMonthExpense;

  // Calcular variações percentuais
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const incomeChange = calculatePercentageChange(currentMonthIncome, previousMonthIncome);
  const expenseChange = calculatePercentageChange(currentMonthExpense, previousMonthExpense);
  const balanceChange = calculatePercentageChange(currentMonthBalance, previousMonthBalance);

  // Calcular breakdown mensal dos últimos 12 meses COMPLETOS - Temporariamente desabilitado
  /* const getMonthlyBreakdown = () => {
    const months = [];
    // Começar saldo acumulado com o saldo inicial
    let accumulatedBalance = initialBalance || 0;

    // Loop de 11 até 0 para mostrar 12 meses: mês atual + 11 anteriores
    // Ex: Se estamos em nov/2025, mostra de dez/2024 (i=11) até nov/2025 (i=0) = 12 meses
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'yyyy-MM');
      const monthLabel = format(date, 'MMMM yyyy', { locale: ptBR })
        .replace(/^\w/, (c) => c.toUpperCase());

      // Filtrar transações deste mês (dos últimos 12 meses)
      const monthTransactions = last12MonthsTransactions.filter(t => {
        const transactionMonth = format(new Date(t.date), 'yyyy-MM');
        return transactionMonth === monthKey;
      });

      const monthIncome = monthTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const monthExpense = monthTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const monthBalance = monthIncome - monthExpense;
      accumulatedBalance += monthBalance;

      months.push({
        monthKey,
        monthLabel,
        income: monthIncome,
        expense: monthExpense,
        balance: monthBalance,
        accumulatedBalance
      });
    }

    // Log para verificação: o último saldo acumulado deve ser igual ao saldo da conta corrente
    if (months.length > 0) {
      const lastMonth = months[months.length - 1];
      console.log(`\n✅ VERIFICAÇÃO DO SALDO ACUMULADO:`);
      console.log(`   Saldo inicial: R$ ${(initialBalance || 0).toFixed(2)}`);
      console.log(`   Último saldo acumulado (${lastMonth.monthLabel}): R$ ${lastMonth.accumulatedBalance.toFixed(2)}`);
      console.log(`   Este valor deve ser igual ao saldo da conta corrente!\n`);
    }

    return months;
  };

  const monthlyBreakdown = getMonthlyBreakdown(); */

  const handleUpdateCategory = async (transactionId: string, categoryValue: string) => {
    try {
      // Se o valor contém "::", é uma subcategoria no formato "Categoria::Subcategoria"
      const newCategory = categoryValue.includes('::')
        ? categoryValue.split('::')[0]
        : categoryValue;

      const newSubcategory = categoryValue.includes('::')
        ? categoryValue.split('::')[1]
        : undefined;

      console.log('🔄 Atualizando categoria da transação:', transactionId, 'para:', newCategory);
      if (newSubcategory) {
        console.log('📋 Subcategoria selecionada:', newSubcategory);
      }

      // Encontrar a transação sendo atualizada
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) {
        console.log('⚠️ Transação não encontrada:', transactionId);
        return;
      }

      console.log('📋 Categoria anterior:', transaction.category);
      console.log('🏷️ Nova categoria:', newCategory);
      console.log('🏷️ Nova subcategoria:', newSubcategory || 'nenhuma');

      // Atualizar a transação atual com categoria e subcategoria
      await transactionApi.updateCategory(transactionId, newCategory, newSubcategory);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, category: newCategory, subcategory: newSubcategory } : t
        )
      );

      // SEMPRE buscar transações similares ao mudar categoria (não importa se era categorizada antes)
      if (newCategory && newCategory !== 'Definir Categoria' && newCategory !== 'Outros' && newCategory !== 'Sem Categoria') {
        const description = transaction.description || '';
        const merchant = transaction.merchant || '';

        console.log('🔍 Buscando transações similares a:', { description, merchant, newCategory });

        // Buscar transações similares (excluindo as que já estão na nova categoria)
        const response = await transactionApi.findSimilar(description, merchant, transactionId, newCategory);

        console.log('✅ Transações similares encontradas:', response.data.similar.length);
        console.log('📊 Detalhes:', response.data);

        // Se encontrou transações similares, mostrar modal
        if (response.data.similar.length > 0) {
          console.log('🎯 Abrindo modal de recategorização em lote');
          setSimilarTransactions(response.data.similar);
          setBulkCategory(newCategory);
          setShowBulkModal(true);
        } else {
          console.log('ℹ️ Nenhuma transação similar encontrada');
        }
      } else {
        console.log('⏭️ Pulando busca de similares (categoria inválida)');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar categoria:', error);
      alert('Erro ao atualizar categoria. Tente novamente.');
    }
  };

  const handleBulkConfirm = async (selectedIds: string[]) => {
    // Se nenhuma transação foi selecionada, apenas fechar o modal
    if (selectedIds.length === 0) {
      handleBulkClose();
      return;
    }

    setBulkLoading(true);
    try {
      const response = await transactionApi.bulkUpdateCategory(selectedIds, bulkCategory);

      // Atualizar as transações localmente (apenas as selecionadas)
      setTransactions((prev) =>
        prev.map((t) =>
          selectedIds.includes(t.id) ? { ...t, category: bulkCategory } : t
        )
      );

      // Fechar modal
      setShowBulkModal(false);
      setSimilarTransactions([]);
      setBulkCategory('');

      // Mostrar mensagem de sucesso
      alert(`✅ ${response.data.message}`);
    } catch (error) {
      console.error('Error bulk updating:', error);
      alert('Erro ao recategorizar em lote. Tente novamente.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkClose = () => {
    setShowBulkModal(false);
    setSimilarTransactions([]);
    setBulkCategory('');
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'];
    const rows = filteredTransactions.map((t) => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.merchant || t.description || '',
      t.category || '',
      t.type === 'credit' ? 'Receita' : 'Despesa',
      t.amount.toString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calcular distribuição de despesas por categoria
  const expenseDistribution = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'debit');
    const total = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const categoriesMap = expenses.reduce((acc, t) => {
      const category = t.category || 'Não Categorizado';
      acc[category] = (acc[category] || 0) + Math.abs(t.amount);
      return acc;
    }, {} as Record<string, number>);

    // Cores para as categorias (usando tokens do design system)
    const categoryColors: Record<string, string> = {
      'Moradia': 'bg-red-500',
      'Alimentação': 'bg-amber-500',
      'Contas': 'bg-accent-500',
      'Entretenimento': 'bg-primary-500',
      'Transporte': 'bg-primary-600',
      'Educação': 'bg-primary-400',
      'Saúde': 'bg-red-400',
      'Compras': 'bg-amber-600',
      'Supermercado': 'bg-accent-400',
    };

    const data = Object.entries(categoriesMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        color: categoryColors[name] || 'bg-slate-400'
      }))
      .sort((a, b) => b.value - a.value);

    return { data, total };
  }, [filteredTransactions]);

  // Funções para navegação de período
  const handlePreviousMonth = () => {
    setCurrentPeriod(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentPeriod(prev => addMonths(prev, 1));
  };

  return (
    <div className="max-w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4" data-tour="transactions-page">
      <div className="space-y-6">

        {/* Header */}
        <div className="page-header">
          <div className="page-header__titles">
            <span className="icon-chip icon-chip-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
              <Receipt className="w-6 h-6" />
            </span>
            <div className="min-w-0">
              <h1 className="page-title">Transações</h1>
              <p className="page-subtitle">{filteredTransactions.length} transações encontradas</p>
            </div>
          </div>

          <div className="page-header__actions flex-wrap">
            <div className="relative group">
              {isManualPlan ? (
                <>
                  <button disabled className="btn-secondary opacity-60 cursor-not-allowed">
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">Categorizar</span>
                    <span className="sm:hidden">Cat</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg">
                    Disponível apenas nos planos Conectado ou Conectado Plus
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={handleRecategorizeAI}
                    className={`btn-primary disabled:cursor-not-allowed ${isAILoading ? 'animate-pulse' : ''}`}
                    disabled={isAILoading || isLoading}
                    title={canUseAI ? "Usar IA para categorizar transações" : "Categorização automática (sem IA)"}
                    data-tour="categorize-btn"
                  >
                    {isAILoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{isAILoading ? 'Categorizando...' : 'Categorizar'}</span>
                    <span className="sm:hidden">{isAILoading ? '...' : 'Cat'}</span>
                  </button>
                  {isConectadoPlan && !isAILoading && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-amber-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg">
                      IA desabilitada - Apenas categorização por regras
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-amber-600"></div>
                    </div>
                  )}
                  {isAILoading && (
                    <div className="card absolute -bottom-12 left-0 right-0 w-48 sm:w-64 p-2 z-10">
                      <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                        <span className="truncate max-w-[140px] sm:max-w-[200px]">{aiProgressText}</span>
                        <span className="font-semibold">{Math.round(aiProgress)}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill bg-primary-500" style={{ width: `${aiProgress}%` }} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <button
              onClick={handleResetCategories}
              className="btn-secondary text-amber-600 hover:text-amber-700"
              disabled={isLoading}
              title="Reseta todas para 'Não Categorizado'"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Resetar</span>
            </button>
            <button onClick={exportToCSV} className="btn-secondary" title="Exportar para CSV">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">CSV</span>
            </button>
            <button onClick={loadData} className="btn-secondary" disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-primary"
              title="Importar transações (CSV ou individual)"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button
              onClick={handleDeleteAll}
              className="btn-danger"
              disabled={isLoading}
              title={activeAccountId ? "Apagar transações desta conta (IRREVERSÍVEL)" : "Apagar TODAS as transações (IRREVERSÍVEL)"}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">{activeAccountId ? 'Apagar Conta' : 'Apagar Todas'}</span>
              <span className="sm:hidden">Apagar</span>
            </button>
          </div>
        </div>

        {/* Resumo Financeiro (Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-10">
          {/* Total de Receitas */}
          <div className="stat-tile">
            <div className="flex justify-between items-start">
              <h3 className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Receitas</h3>
              <span className="icon-chip-sm bg-accent-50 text-accent-600 dark:bg-accent-900/40 dark:text-accent-300">
                <ChevronUp className="w-4 h-4" />
              </span>
            </div>
            <p className="mt-1 sm:mt-2 font-extrabold text-lg sm:text-2xl lg:text-3xl text-accent-600 dark:text-accent-400">
              {formatCurrency(currentMonthIncome)}
            </p>
            <p className={`mt-0.5 sm:mt-1 text-xs ${incomeChange >= 0 ? 'text-accent-600 dark:text-accent-400' : 'text-red-600 dark:text-red-400'}`}>
              {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}% vs Mês Passado
            </p>
          </div>

          {/* Total de Despesas */}
          <div className="stat-tile">
            <div className="flex justify-between items-start">
              <h3 className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Despesas</h3>
              <span className="icon-chip-sm bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300">
                <ChevronDown className="w-4 h-4" />
              </span>
            </div>
            <p className="mt-1 sm:mt-2 font-extrabold text-lg sm:text-2xl lg:text-3xl text-red-600 dark:text-red-400">
              {formatCurrency(currentMonthExpense)}
            </p>
            <p className={`mt-0.5 sm:mt-1 text-xs ${expenseChange <= 0 ? 'text-accent-600 dark:text-accent-400' : 'text-red-600 dark:text-red-400'}`}>
              {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}% vs Mês Passado
            </p>
          </div>

          {/* Saldo Líquido */}
          <div className="stat-tile">
            <div className="flex justify-between items-start">
              <h3 className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Saldo</h3>
              <span className={`icon-chip-sm ${currentMonthBalance >= 0 ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300' : 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300'}`}>
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <p className={`mt-1 sm:mt-2 font-extrabold text-lg sm:text-2xl lg:text-3xl ${currentMonthBalance >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatCurrency(currentMonthBalance)}
            </p>
            <p className={`mt-0.5 sm:mt-1 text-xs ${balanceChange >= 0 ? 'text-accent-600 dark:text-accent-400' : 'text-red-600 dark:text-red-400'}`}>
              {balanceChange >= 0 ? '+' : ''}{balanceChange.toFixed(1)}% vs Mês Passado
            </p>
          </div>

          {/* Saldo Inicial */}
          <div className="stat-tile">
            <div className="flex justify-between items-start">
              <h3 className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                <span className="icon-chip-sm bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                  <Wallet className="w-4 h-4" />
                </span>
                <span>Inicial ({getStartDateLabel()})</span>
              </h3>
              <ArrowUp className="w-4 sm:w-5 h-4 sm:h-5 text-primary-500" />
            </div>
            <p className="mt-1 sm:mt-2 font-extrabold text-lg sm:text-2xl lg:text-3xl text-primary-700 dark:text-primary-300">
              {initialBalance !== null && initialBalance !== undefined
                ? formatCurrency(initialBalance)
                : 'N/D'}
            </p>
          </div>
        </div>

        {/* Distribuição de Despesas e Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-10">

          {/* Painel Esquerdo: Distribuição de Despesas */}
          <div className="lg:col-span-2">
            <div className="card p-4 sm:p-6">
              <h3 className="card-title mb-4 sm:mb-6 flex-wrap">
                <span className="icon-chip-sm bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                  <PieChart className="w-4 h-4" />
                </span>
                <span className="break-words">Distribuição de Despesas</span>
                <span className="text-sm font-normal w-full sm:w-auto text-slate-500 dark:text-slate-400">(Total: {formatCurrency(expenseDistribution.total)})</span>
              </h3>

              {expenseDistribution.data.length > 0 ? (
                <div className="list-divider">
                  {expenseDistribution.data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 py-2">
                      <span className={`w-3 h-3 ${item.color} rounded-full flex-shrink-0`}></span>
                      <div className="flex-1 min-w-0 text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate">
                        {item.name}
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 text-right whitespace-nowrap">
                        {item.percentage.toFixed(1)}%
                      </div>
                      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-right whitespace-nowrap w-20 sm:w-28">
                        {formatCurrency(item.value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <PieChart className="w-8 h-8 mb-2" />
                  <p className="text-sm">Nenhuma despesa para exibir no gráfico neste período.</p>
                </div>
              )}
            </div>
          </div>

          {/* Painel Direito: Filtros e Navegação */}
          <div className="lg:col-span-3 flex flex-col gap-6">

            {/* Seletor de Período */}
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePreviousMonth}
                  className="seg-btn"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800 dark:text-white">
                    {format(currentPeriod, 'MMMM', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
                  </div>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {format(currentPeriod, 'yyyy')}
                  </span>
                </div>

                <button
                  onClick={handleNextMonth}
                  className="seg-btn"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Busca Consolidada */}
            <div className="card p-4" data-tour="transactions-filters">
              <h3 className="section-title mb-3">Busca e Filtros</h3>

              {/* Campo de Busca por Texto */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                <input
                  type="text"
                  placeholder="Buscar transações..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {/* Grid com Filtros (esquerda) e Tipo de Transação (direita) */}
              <div className="grid grid-cols-2 gap-4">
                {/* Coluna Esquerda: Categorias e Tipo de Custo */}
                <div className="space-y-4">
                  {/* Filtro de Categorias */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Categorias</label>
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="input appearance-none pr-8"
                      >
                        <option value="">Todas categorias</option>
                        {categories.map((cat) => (
                          <option key={cat.category} value={cat.category}>
                            {cat.icon} {cat.category}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Filtro de Tipo de Custo */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Tipo de Custo</label>
                    <div className="relative">
                      <select
                        value={selectedCostType}
                        onChange={(e) => setSelectedCostType(e.target.value)}
                        className="input appearance-none pr-8"
                      >
                        <option value="">Todos os tipos</option>
                        <option value="Fixos">🔧 Fixos</option>
                        <option value="Variáveis">🛒 Variáveis</option>
                        <option value="Investimentos">📈 Investimentos</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Tipo de Transação (Radio Buttons) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Tipo de Transação</label>
                  <div className="space-y-2">
                    <label className="flex items-center p-2 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <input
                        type="radio"
                        name="transactionType"
                        value=""
                        checked={selectedType === ''}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-xs text-slate-700 dark:text-slate-200">Todas</span>
                    </label>
                    <label className="flex items-center p-2 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-accent-50 dark:hover:bg-accent-900/20 transition">
                      <input
                        type="radio"
                        name="transactionType"
                        value="credit"
                        checked={selectedType === 'credit'}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-4 h-4 text-accent-600 focus:ring-accent-500"
                      />
                      <span className="ml-2 text-xs text-slate-700 dark:text-slate-200 font-medium">💰 Receitas</span>
                    </label>
                    <label className="flex items-center p-2 border border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                      <input
                        type="radio"
                        name="transactionType"
                        value="debit"
                        checked={selectedType === 'debit'}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                      />
                      <span className="ml-2 text-xs text-slate-700 dark:text-slate-200 font-medium">💸 Despesas</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Indicador de expandir/colapsar breakdown mensal - Temporariamente oculto */}
        {/* <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600 transition-colors py-2 px-4 rounded-lg hover:bg-gray-100"
          >
            <span>{showMonthlyBreakdown ? 'Ocultar' : 'Ver'} detalhamento mensal</span>
            {showMonthlyBreakdown ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div> */}

        {/* Breakdown Mensal Expansível - Temporariamente oculto */}
        {/* {showMonthlyBreakdown && (
          <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Detalhamento dos Últimos 12 Meses
            </h3>
            <div className="flex items-start space-x-3 mb-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1 text-gray-800">ℹ️ Sobre o Saldo Acumulado</p>
                <p>
                  O <strong>Saldo Acumulado</strong> é calculado a partir das receitas e despesas mensais (iniciando do zero).
                  Este valor representa a variação acumulada no período, e não o saldo real da conta bancária.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Mês
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Receitas
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Despesas
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Saldo do Mês
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Saldo Acumulado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {monthlyBreakdown.map((month) => (
                    <tr
                      key={month.monthKey}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-150"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                        {month.monthLabel}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                        {formatCurrency(month.income)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                        {formatCurrency(month.expense)}
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium ${
                        month.balance >= 0 ? 'text-gray-800' : 'text-gray-600'
                      }`}>
                        {month.balance >= 0 ? '+' : ''}{formatCurrency(month.balance)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        {formatCurrency(month.accumulatedBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )} */}

        {/* Tabela de Transações */}
        <div className="table-card">
          <div className="w-full">
            <table className="data-table table-fixed">
              <thead>
                <tr>
                  <th scope="col" className="w-[50px] sm:w-20">
                    Data
                  </th>
                  <th scope="col">
                    Descrição
                  </th>
                  <th scope="col" className="hidden md:table-cell w-32 lg:w-40">
                    Categoria
                  </th>
                  <th scope="col" className="hidden sm:table-cell w-20">
                    Tipo
                  </th>
                  <th scope="col" className="w-[90px] sm:w-28 !text-right">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
              {filteredTransactions.map(transaction => {
                const isUncategorized = !transaction.category || transaction.category === 'Não Categorizado';
                const isReceita = transaction.type === 'credit';
                const isPossibleDuplicate = possibleDuplicates.has(transaction.id);
                const rowBgClass = isPossibleDuplicate
                  ? '[&>td]:bg-amber-50 dark:[&>td]:bg-amber-900/15'
                  : (isUncategorized ? '[&>td]:bg-slate-50 dark:[&>td]:bg-slate-800/40' : '');
                const valueClass = isReceita ? 'text-accent-600 dark:text-accent-400' : 'text-red-600 dark:text-red-400';

                return (
                  <tr key={transaction.id} className={rowBgClass}>
                    <td className="!px-1 sm:!px-2 !py-2 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(new Date(transaction.date), 'dd/MM/yy')}
                    </td>
                    <td className="!px-1 sm:!px-2 !py-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="icon-chip-sm bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          <CategoryIconSmall category={transaction.category || 'Não Categorizado'} className="w-3 h-3 sm:w-4 sm:h-4" />
                        </span>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">{transaction.merchant || transaction.description}</span>
                            {isPossibleDuplicate && (
                              <div className="relative group flex-shrink-0">
                                <div className="badge badge-warning cursor-help">
                                  <Copy className="w-3 h-3" />
                                  <span className="hidden sm:inline">Duplicata?</span>
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg min-w-[200px] max-w-[280px]">
                                  <div className="font-semibold mb-1">⚠️ Possível duplicata</div>
                                  <div className="text-slate-300 text-xs leading-relaxed">
                                    Existe outra transação com mesma data, valor e descrição.
                                    <br /><br />
                                    <span className="text-amber-300">Os IDs são diferentes</span>, então foram enviadas como transações distintas pelo banco.
                                    <br /><br />
                                    Verifique no extrato do banco se é um lançamento duplicado.
                                  </div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-slate-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                          {transaction.reference && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{transaction.reference}</div>
                          )}
                          {/* Mostrar categoria em mobile */}
                          <div className="md:hidden mt-1 flex items-center space-x-1" data-tour="category-dropdown-mobile">
                            {isUncategorized && (
                              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                            )}
                            <select
                              value={transaction.subcategory ? `${transaction.category}::${transaction.subcategory}` : transaction.category || ''}
                              onChange={(e) => handleUpdateCategory(transaction.id, e.target.value)}
                              className={`text-xs border rounded-lg px-1 py-0.5 focus:outline-none focus:ring-1 max-w-[100px] truncate ${
                                isUncategorized ? 'border-slate-400 bg-slate-100 text-slate-900 font-semibold focus:ring-slate-500 dark:bg-slate-700 dark:text-white dark:border-slate-500' : 'border-slate-300 bg-white text-slate-900 focus:ring-primary-500 dark:bg-slate-800 dark:text-white dark:border-slate-600'
                              }`}
                            >
                              {/* Opção "Não Categorizado" sempre primeiro */}
                              <option value="Não Categorizado">❓ Não Categorizado</option>
                              {categories.filter(cat => cat.category !== 'Não Categorizado').map((cat) => {
                                const subcats = subcategoriesMap[cat.category] || [];
                                if (subcats.length > 0) {
                                  return (
                                    <optgroup key={cat.category} label={`${cat.icon} ${cat.category}`}>
                                      <option key={cat.category} value={cat.category}>
                                        {cat.category} (geral)
                                      </option>
                                      {subcats.map((sub) => (
                                        <option key={`${cat.category}-${sub}`} value={`${cat.category}::${sub}`}>
                                          ⤷ {sub}
                                        </option>
                                      ))}
                                    </optgroup>
                                  );
                                } else {
                                  return (
                                    <option key={cat.category} value={cat.category}>
                                      {cat.icon} {cat.category}
                                    </option>
                                  );
                                }
                              })}
                            </select>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell !px-2 !py-2">
                      <div className="flex items-center space-x-1" data-tour="category-dropdown">
                        {/* Ícone da categoria */}
                        {!isUncategorized && transaction.category && (
                          <div className="flex-shrink-0">
                            <CategoryIconSmall category={transaction.category} className="w-4 h-4" />
                          </div>
                        )}
                        {isUncategorized && (
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                        )}
                        <select
                          value={transaction.subcategory ? `${transaction.category}::${transaction.subcategory}` : transaction.category || ''}
                          onChange={(e) => handleUpdateCategory(transaction.id, e.target.value)}
                          className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 w-full ${
                            isUncategorized ? 'border-slate-400 bg-slate-100 text-slate-900 font-semibold focus:ring-slate-500 dark:bg-slate-700 dark:text-white dark:border-slate-500' : 'border-slate-300 bg-white text-slate-900 focus:ring-primary-500 dark:bg-slate-800 dark:text-white dark:border-slate-600'
                          }`}
                        >
                          {/* Opção "Não Categorizado" sempre primeiro */}
                          <option value="Não Categorizado">❓ Não Categorizado</option>
                          {categories.filter(cat => cat.category !== 'Não Categorizado').map((cat) => {
                            const subcats = subcategoriesMap[cat.category] || [];
                            if (subcats.length > 0) {
                              return (
                                <optgroup key={cat.category} label={`${cat.icon} ${cat.category}`}>
                                  <option key={cat.category} value={cat.category}>
                                    {cat.category} (geral)
                                  </option>
                                  {subcats.map((sub) => (
                                    <option key={`${cat.category}-${sub}`} value={`${cat.category}::${sub}`}>
                                      ⤷ {sub}
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            } else {
                              return (
                                <option key={cat.category} value={cat.category}>
                                  {cat.icon} {cat.category}
                                </option>
                              );
                            }
                          })}
                        </select>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell !px-2 !py-2">
                      <span className={`badge ${transaction.type === 'credit' ? 'badge-success' : 'badge-danger'}`}>
                        {transaction.type === 'credit' ? 'Rec' : 'Desp'}
                      </span>
                    </td>
                    <td className={`!px-1 sm:!px-2 !py-2 text-xs sm:text-sm font-semibold !text-right whitespace-nowrap ${valueClass}`}>
                      {isReceita ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <Search className="w-8 h-8 mb-2" />
                      <p className="text-sm">Nenhuma transação encontrada para o termo de busca.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

      {/* Modal de Recategorização em Lote */}
      <BulkRecategorizeModal
        isOpen={showBulkModal}
        onClose={handleBulkClose}
        onConfirm={handleBulkConfirm}
        similarTransactions={similarTransactions}
        newCategory={bulkCategory}
        loading={bulkLoading}
      />

      {/* Modal de Debug de Categorização - Temporariamente desabilitado */}
      {/* {showDebugModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">🐛 Debug de Categorização</h2>
                <button
                  onClick={() => setShowDebugModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {debugLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : debugResult?.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold">❌ Erro</p>
                  <p className="text-red-600 text-sm mt-1">{debugResult.message}</p>
                </div>
              ) : debugResult ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">📥 Dados da Transação</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Descrição:</strong> {debugResult.input.description}</p>
                      <p><strong>Merchant:</strong> {debugResult.input.merchant || '(vazio)'}</p>
                      <p><strong>Valor:</strong> {formatCurrency(debugResult.input.amount)}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">🎯 Resultado da IA</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Categoria:</strong> {debugResult.result.icon} {debugResult.result.category}</p>
                      <p><strong>Subcategoria:</strong> {debugResult.result.subcategory}</p>
                      <p><strong>Confiança:</strong> {debugResult.result.confidence}%</p>
                      <p><strong>Match:</strong> {debugResult.result.matchedBy}</p>
                    </div>
                  </div>

                  <div className={`rounded-lg p-4 ${debugResult.analysis.isPassing ? 'bg-green-50' : 'bg-orange-50'}`}>
                    <h3 className="font-semibold text-gray-900 mb-2">📊 Análise (Threshold: {debugResult.analysis.threshold}%)</h3>
                    <div className="text-sm space-y-2">
                      <p>
                        <strong>Será categorizado?</strong>{' '}
                        <span className={`font-bold ${debugResult.analysis.isPassing ? 'text-green-700' : 'text-orange-700'}`}>
                          {debugResult.analysis.willBeCategorizad}
                        </span>
                      </p>
                      <p className="bg-white p-3 rounded border border-gray-200">
                        {debugResult.analysis.reason}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600">
                    <p><strong>💡 Como funciona:</strong></p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Confiança ≥ 80%: Categorizado automaticamente</li>
                      <li>Confiança &lt; 80%: Fica como "Não Categorizado" (fundo cinza)</li>
                      <li>Match por marca: ~90-100% confiança</li>
                      <li>Match por palavra-chave: ~70-80% confiança</li>
                    </ul>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDebugModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-100 transition"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Import Modal */}
      {showImportModal && (
        <ImportTransactionsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadData();
          }}
        />
      )}
      </div>
    </div>
  );
};

export default Transactions;
