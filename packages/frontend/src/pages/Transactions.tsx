import { useEffect, useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Download, AlertCircle, RefreshCw, PlusCircle, ArrowUp, ChevronDown, ChevronUp, Upload, Trash2, DollarSign, PieChart, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { transactionApi } from '../services/api';
import type { Transaction, Category } from '../types';
import BulkRecategorizeModal from '../components/BulkRecategorizeModal';
import ImportTransactionsModal from '../components/ImportTransactionsModal';
import { CategoryIconSmall } from '../components/CategoryIcons';

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState(new Date()); // Para navegação de mês/ano
  const [isLoading, setIsLoading] = useState(false);
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

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedType]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        transactionApi.getTransactions({
          category: selectedCategory || undefined,
          type: selectedType || undefined,
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
    const confirmDelete = confirm(
      '🗑️ ATENÇÃO: Apagar TODAS as transações?\n\n' +
      '⚠️ ESTA AÇÃO É IRREVERSÍVEL!\n\n' +
      'Isso irá apagar permanentemente:\n' +
      '• Todas as suas transações importadas\n' +
      '• Todos os dados do banco Supabase\n' +
      '• Esta ação NÃO pode ser desfeita\n\n' +
      'Tem certeza absoluta que deseja continuar?'
    );

    if (!confirmDelete) return;

    // Segunda confirmação
    const doubleConfirm = confirm(
      '⚠️ ÚLTIMA CONFIRMAÇÃO\n\n' +
      'Digite OK para confirmar que você entende que:\n\n' +
      '• TODOS os dados serão PERDIDOS\n' +
      '• Esta ação é PERMANENTE e IRREVERSÍVEL\n\n' +
      'Deseja realmente apagar tudo?'
    );

    if (!doubleConfirm) return;

    setIsLoading(true);
    try {
      console.log('🗑️ Deletando todas as transações...');
      const response = await transactionApi.deleteAll();
      console.log('✅ Transações deletadas:', response.data);

      alert(
        `✅ Transações deletadas com sucesso!\n\n` +
        `🗑️ Total deletado: ${response.data.deleted} transações\n\n` +
        `${response.data.message}`
      );

      // Recarregar transações (deve estar vazio agora)
      await loadData();
    } catch (error: any) {
      console.error('❌ Erro ao deletar:', error);
      alert(
        `❌ Erro ao deletar transações\n\n` +
        `${error.response?.data?.error || error.message || 'Erro desconhecido'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecategorizeAll = async () => {
    const confirmRecategorize = confirm(
      '🔄 Recategorizar todas as transações?\n\n' +
      'Isso irá aplicar as regras de categorização automática em TODAS as suas transações.\n\n' +
      '⚠️ Importante:\n' +
      '• Apenas transações com 80%+ de confiança serão categorizadas\n' +
      '• Transações abaixo de 80% ficarão como "Não Categorizado"\n' +
      '• Você pode recategorizar manualmente depois\n\n' +
      'Deseja continuar?'
    );

    if (!confirmRecategorize) return;

    setIsLoading(true);
    try {
      console.log('🔄 Iniciando recategorização de todas as transações...');
      const response = await transactionApi.recategorizeAll();
      console.log('✅ Recategorização concluída:', response.data);

      alert(
        `✅ Recategorização concluída!\n\n` +
        `📊 Total: ${response.data.total} transações\n` +
        `✅ Atualizadas: ${response.data.updated} transações\n` +
        `➖ Sem alteração: ${response.data.unchanged} transações\n\n` +
        `🎯 Categorizadas (≥80%): ${response.data.categorized || 0} transações\n` +
        `❓ Não Categorizadas (<80%): ${response.data.uncategorized || 0} transações\n\n` +
        `${response.data.message}`
      );

      // Recarregar transações
      await loadData();
    } catch (error: any) {
      console.error('❌ Erro ao recategorizar:', error);
      alert(
        `❌ Erro ao recategorizar transações\n\n` +
        `${error.response?.data?.error || error.message || 'Erro desconhecido'}`
      );
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

  const filteredTransactions = transactions.filter((transaction) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      transaction.merchant?.toLowerCase().includes(searchLower) ||
      transaction.description?.toLowerCase().includes(searchLower) ||
      transaction.category?.toLowerCase().includes(searchLower);

    // Filtro por período (mês/ano selecionado no PeriodSelector)
    const matchesPeriod = format(new Date(transaction.date), 'yyyy-MM') === format(currentPeriod, 'yyyy-MM');

    return matchesSearch && matchesPeriod;
  });

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

  const balance = totalIncome - totalExpense;

  console.log('\n📊 DEBUG TRANSAÇÕES (Últimos 12 meses):');
  console.log(`   Total transações: ${last12MonthsTransactions.length}`);
  console.log(`   Total Income: R$ ${totalIncome.toFixed(2)}`);
  console.log(`   Total Expenses (todos débitos): R$ ${totalExpense.toFixed(2)}`);
  console.log(`   Investimentos (débito+crédito): R$ ${totalInvestments.toFixed(2)}`);
  console.log(`   Investimentos (só débito): R$ ${totalInvestmentsDebitOnly.toFixed(2)}`);

  // Calcular breakdown mensal dos últimos 12 meses COMPLETOS
  const getMonthlyBreakdown = () => {
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

  const monthlyBreakdown = getMonthlyBreakdown();

  const handleUpdateCategory = async (transactionId: string, newCategory: string) => {
    try {
      console.log('🔄 Atualizando categoria da transação:', transactionId, 'para:', newCategory);

      // Encontrar a transação sendo atualizada
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) {
        console.log('⚠️ Transação não encontrada:', transactionId);
        return;
      }

      console.log('📋 Categoria anterior:', transaction.category);
      console.log('🏷️ Nova categoria:', newCategory);

      // Atualizar a transação atual
      await transactionApi.updateCategory(transactionId, newCategory);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, category: newCategory } : t
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

    // Cores para as categorias (usando cores vibrantes)
    const categoryColors: Record<string, string> = {
      'Moradia': 'bg-red-500',
      'Alimentação': 'bg-yellow-500',
      'Contas': 'bg-green-500',
      'Entretenimento': 'bg-blue-500',
      'Transporte': 'bg-indigo-500',
      'Educação': 'bg-purple-500',
      'Saúde': 'bg-pink-500',
      'Compras': 'bg-orange-500',
      'Supermercado': 'bg-lime-500',
    };

    const data = Object.entries(categoriesMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        color: categoryColors[name] || 'bg-gray-500'
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Transações</h1>
            <p className="text-sm text-gray-500 mb-4">{filteredTransactions.length} transações encontradas</p>

            {/* Botões de ação - lado esquerdo */}
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-secondary flex items-center space-x-2 text-sm sm:text-base"
                title="Importar transações manualmente (CSV ou individual)"
              >
                <Upload className="w-4 sm:w-5 h-4 sm:h-5" />
                <span className="hidden md:inline">Importar</span>
                <span className="md:hidden">Import</span>
              </button>
              <button
                onClick={handleRecategorizeAll}
                className="btn-secondary flex items-center space-x-2 text-sm sm:text-base"
                disabled={isLoading}
                title="Recategorizar todas as transações usando IA (threshold 80%)"
              >
                <RefreshCw className={`w-4 sm:w-5 h-4 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Recategorizar</span>
                <span className="md:hidden">Recat.</span>
              </button>
              <button
                onClick={exportToCSV}
                className="btn-secondary flex items-center space-x-2 px-3 text-sm"
                title="Exportar para CSV"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">CSV</span>
              </button>
              <button
                onClick={loadData}
                className="btn-secondary flex items-center space-x-2 text-sm sm:text-base"
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 sm:w-5 h-4 sm:h-5 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
              <button
                onClick={handleDeleteAll}
                className="btn-secondary bg-red-50 text-red-600 hover:bg-red-100 border-red-200 flex items-center space-x-2 text-sm sm:text-base"
                disabled={isLoading}
                title="Apagar TODAS as transações do banco de dados (IRREVERSÍVEL)"
              >
                <Trash2 className="w-4 sm:w-5 h-4 sm:h-5" />
                <span className="hidden md:inline">Apagar Todas</span>
                <span className="md:hidden">Apagar</span>
              </button>
            </div>
          </div>

          {/* Botão Conectar Banco - lado direito */}
          <div className="flex-shrink-0">
            <button
              onClick={() => navigate('/app/connect-bank')}
              className="btn-primary flex items-center space-x-2 text-sm sm:text-base"
            >
              <PlusCircle className="w-4 sm:w-5 h-4 sm:h-5" />
              <span>Conectar Banco</span>
            </button>
          </div>
        </div>

        {/* Resumo Financeiro (Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {/* Total de Receitas */}
          <div className="p-6 rounded-2xl shadow-xl transition duration-300 hover:shadow-2xl bg-green-50">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-600">Receitas (desde {getStartDateLabel()})</h3>
              <ChevronUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="mt-2 font-extrabold text-3xl text-green-600">
              {formatCurrency(totalIncome)}
            </p>
          </div>

          {/* Total de Despesas */}
          <div className="p-6 rounded-2xl shadow-xl transition duration-300 hover:shadow-2xl bg-red-50">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-600">Despesas (desde {getStartDateLabel()})</h3>
              <ChevronDown className="w-5 h-5 text-red-500" />
            </div>
            <p className="mt-2 font-extrabold text-3xl text-red-600">
              {formatCurrency(totalExpense)}
            </p>
          </div>

          {/* Saldo Líquido */}
          <div className={`p-6 rounded-2xl shadow-xl transition duration-300 hover:shadow-2xl ${balance >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-600">Saldo (desde {getStartDateLabel()})</h3>
              <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
            </div>
            <p className={`mt-2 font-extrabold text-3xl ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(balance)}
            </p>
          </div>

          {/* Saldo Inicial */}
          <div className="p-6 rounded-2xl shadow-xl transition duration-300 hover:shadow-2xl bg-gradient-to-br from-indigo-50 to-purple-50">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-indigo-600">💰 Inicial ({getStartDateLabel()})</h3>
              <ArrowUp className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="mt-2 font-extrabold text-3xl text-indigo-700">
              {initialBalance !== null && initialBalance !== undefined
                ? formatCurrency(initialBalance)
                : 'N/D'}
            </p>
          </div>
        </div>

        {/* Distribuição de Despesas e Filtros */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

          {/* Painel Esquerdo: Distribuição de Despesas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 h-full">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-blue-600" />
                Distribuição de Despesas (Total: {formatCurrency(expenseDistribution.total)})
              </h3>

              {expenseDistribution.data.length > 0 ? (
                <div className="flex flex-col space-y-3">
                  {expenseDistribution.data.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center">
                      <span className={`w-3 h-3 ${item.color} rounded-full mr-3 flex-shrink-0`}></span>
                      <div className="flex-grow text-sm text-gray-700">
                        {item.name}
                      </div>
                      <div className="text-sm font-semibold text-gray-800 w-24 text-right">
                        {item.percentage.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-500 w-32 text-right">
                        {formatCurrency(item.value)}
                      </div>
                    </div>
                  ))}
                  {expenseDistribution.data.length > 5 && (
                    <div className="text-sm text-gray-500 mt-2">
                      ... e {expenseDistribution.data.length - 5} {expenseDistribution.data.length - 5 === 1 ? 'outra categoria' : 'outras categorias'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500 mt-2 text-center py-6">
                  Nenhuma despesa para exibir no gráfico neste período.
                </div>
              )}
            </div>
          </div>

          {/* Painel Direito: Filtros e Navegação */}
          <div className="flex flex-col gap-6">

            {/* Seletor de Período */}
            <div className="p-4 bg-white rounded-xl shadow-md border border-gray-200">
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePreviousMonth}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <div className="text-lg font-bold text-gray-800">
                    {format(currentPeriod, 'MMMM', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())}
                  </div>
                  <span className="block text-xs text-gray-500">
                    {format(currentPeriod, 'yyyy')}
                  </span>
                </div>

                <button
                  onClick={handleNextMonth}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Busca Consolidada */}
            <div className="p-4 bg-white rounded-xl shadow-md border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Busca e Filtros</h3>

              {/* Campo de Busca por Texto */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar transações..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              {/* Dropdowns (Categoria e Tipo) */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Category Filter */}
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition appearance-none bg-white pr-8"
                  >
                    <option value="">Todas categorias</option>
                    {categories.map((cat) => (
                      <option key={cat.category} value={cat.category}>
                        {cat.icon} {cat.category}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Type Filter */}
                <div className="relative">
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition appearance-none bg-white pr-8"
                  >
                    <option value="">Todos tipos</option>
                    <option value="credit">Receitas</option>
                    <option value="debit">Despesas</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Botão Filtros Avançados */}
              <button
                className="flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-100 transition font-semibold"
                title="Filtros Avançados"
              >
                <Filter className="w-5 h-5 mr-2" />
                Filtros Avançados
              </button>
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

        {/* Breakdown Mensal Expansível */}
        {showMonthlyBreakdown && (
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
        )}

        {/* Tabela de Transações */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Data
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Descrição / Detalhe
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Categoria
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(transaction => {
                const isUncategorized = !transaction.category || transaction.category === 'Não Categorizado';
                const isReceita = transaction.type === 'credit';
                const rowBgClass = isUncategorized ? 'bg-gray-100' : (isReceita ? 'hover:bg-green-50' : 'hover:bg-red-50');
                const valueClass = isReceita ? 'text-green-500' : 'text-red-500';

                return (
                  <tr key={transaction.id} className={`border-b border-gray-100 transition-all duration-150 ${rowBgClass}`}>
                    <td className="p-4 text-sm font-medium text-gray-500">
                      {format(new Date(transaction.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-inner flex-shrink-0">
                          <CategoryIconSmall category={transaction.category || 'Outros'} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">{transaction.merchant || transaction.description}</div>
                          {transaction.reference && (
                            <div className="text-xs text-gray-500 mt-0.5">{transaction.reference}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {isUncategorized && (
                          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        )}
                        <select
                          value={transaction.category || ''}
                          onChange={(e) => handleUpdateCategory(transaction.id, e.target.value)}
                          className={`text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 ${
                            isUncategorized ? 'border-gray-400 bg-gray-100 text-gray-900 font-semibold focus:ring-gray-500' : 'border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                          }`}
                        >
                          {categories.map((cat) => (
                            <option key={cat.category} value={cat.category}>
                              {cat.category}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === 'credit'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.type === 'credit' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={`p-4 text-base ${valueClass}`}>
                      {isReceita ? '+' : '-'} {formatCurrency(Math.abs(transaction.amount))}
                    </td>
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Nenhuma transação encontrada para o termo de busca.
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
  );
};

export default Transactions;
