import { useEffect, useState } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Download, AlertCircle, RefreshCw, PlusCircle, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Upload, Trash2 } from 'lucide-react';
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
  const [selectedMonth, setSelectedMonth] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false);

  // Estados para o modal de recategorização em lote
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [similarTransactions, setSimilarTransactions] = useState<Array<Transaction & { matchScore: number; matchedWords: string[] }>>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Estados para o modal de debug
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // Estado para o modal de importação
  const [showImportModal, setShowImportModal] = useState(false);

  // Gerar últimos 12 meses dinamicamente
  const getLast12Months = () => {
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
  };

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

    // Filtro por mês
    const matchesMonth = selectedMonth
      ? format(new Date(transaction.date), 'yyyy-MM') === selectedMonth
      : true;

    return matchesSearch && matchesMonth;
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

  // Calcular saldo inicial (balance_after da primeira transação de 12 meses atrás)
  const getInitialBalance = () => {
    const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
    const startDayTransactions = last12MonthsTransactions
      .filter(t => {
        const txDate = new Date(t.date);
        return txDate >= twelveMonthsAgo &&
               txDate < new Date(twelveMonthsAgo.getTime() + 24 * 60 * 60 * 1000);
      })
      .filter(t => t.balance_after !== undefined && t.balance_after !== null)
      .sort((a, b) => a.date - b.date);

    return startDayTransactions.length > 0 ? startDayTransactions[0].balance_after : null;
  };

  const initialBalance = getInitialBalance();

  // Formatar data de início dos 12 meses para o label
  const getStartDateLabel = () => {
    const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
    return format(twelveMonthsAgo, 'dd.MM.yyyy');
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
    let accumulatedBalance = 0;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-800 tracking-tight">Transações</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">{filteredTransactions.length} transações encontradas</p>
        </div>
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/app/connect-bank')}
            className="btn-primary flex items-center space-x-2 text-sm sm:text-base flex-1 sm:flex-initial justify-center"
          >
            <PlusCircle className="w-4 sm:w-5 h-4 sm:h-5" />
            <span className="hidden sm:inline">Conectar Banco</span>
            <span className="sm:hidden">Banco</span>
          </button>
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

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar transações..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="input"
          >
            <option value="">Todos os meses</option>
            {getLast12Months().map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input"
          >
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat.category} value={cat.category}>
                {cat.icon} {cat.category}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="input"
          >
            <option value="">Todos os tipos</option>
            <option value="credit">Receitas</option>
            <option value="debit">Despesas</option>
          </select>
        </div>
      </div>

      {/* Resumo Financeiro das Transações Filtradas */}
      <div>
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 cursor-pointer"
          onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
        >
          {/* Total de Receitas */}
          <div className="card hover:shadow-lg transition-all p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 truncate">Receitas (desde {getStartDateLabel()})</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-green-600 mt-0.5 sm:mt-1 truncate">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 lg:p-3 bg-green-100 rounded-full flex-shrink-0 ml-1">
                <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total de Despesas */}
          <div className="card hover:shadow-lg transition-all p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 truncate">Despesas (desde {getStartDateLabel()})</p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-red-600 mt-0.5 sm:mt-1 truncate">
                  {formatCurrency(totalExpense)}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 lg:p-3 bg-red-100 rounded-full flex-shrink-0 ml-1">
                <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Saldo Líquido */}
          <div className="card hover:shadow-lg transition-all p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs lg:text-sm text-gray-500 truncate">Saldo (desde {getStartDateLabel()})</p>
                <p className={`text-sm sm:text-lg lg:text-2xl font-bold mt-0.5 sm:mt-1 truncate ${
                  balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className={`p-1.5 sm:p-2 lg:p-3 rounded-full flex-shrink-0 ml-1 ${
                balance >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {balance >= 0 ? (
                  <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-green-600" />
                ) : (
                  <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-red-600" />
                )}
              </div>
            </div>
          </div>

          {/* Saldo Inicial */}
          <div className="card hover:shadow-lg transition-all bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs lg:text-sm text-blue-600 font-semibold truncate">
                  💰 Inicial <span className="text-[9px] sm:text-xs text-gray-400">{getStartDateLabel()}</span>
                </p>
                <p className="text-sm sm:text-lg lg:text-2xl font-bold text-blue-700 mt-0.5 sm:mt-1 truncate">
                  {initialBalance !== null && initialBalance !== undefined
                    ? formatCurrency(initialBalance)
                    : 'N/D'}
                </p>
              </div>
              <div className="p-1.5 sm:p-2 lg:p-3 bg-blue-100 rounded-full flex-shrink-0 ml-1">
                <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Indicador de expandir/colapsar */}
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-primary-600 transition-colors py-2 px-4 rounded-lg hover:bg-gray-50"
          >
            <span>{showMonthlyBreakdown ? 'Ocultar' : 'Ver'} detalhamento mensal</span>
            {showMonthlyBreakdown ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Breakdown Mensal Expansível */}
        {showMonthlyBreakdown && (
          <div className="card mt-4 overflow-hidden">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Detalhamento dos Últimos 12 Meses
            </h3>
            <div className="flex items-start space-x-2 sm:space-x-3 mb-4 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <AlertCircle className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs sm:text-sm text-gray-700">
                <p className="font-semibold mb-1 text-gray-800">ℹ️ Sobre o Saldo Acumulado</p>
                <p>
                  O <strong>Saldo Acumulado</strong> é calculado a partir das receitas e despesas mensais (iniciando do zero).
                  Este valor representa a variação acumulada no período, e não o saldo real da conta bancária.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-full px-4 sm:px-0">
                <table className="min-w-full">
                <thead className="bg-white border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Mês
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Receitas
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Despesas
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Saldo do Mês
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Saldo Acumulado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {monthlyBreakdown.map((month) => (
                    <tr
                      key={month.monthKey}
                      className="hover:bg-gray-50 transition-colors"
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
          </div>
        )}
      </div>

      {/* Transactions - Cards no Mobile, Tabela no Desktop */}

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {filteredTransactions.map((transaction) => {
          const isUncategorized = !transaction.category || transaction.category === 'Não Categorizado';
          return (
            <div
              key={transaction.id}
              className={`card p-2.5 ${isUncategorized ? 'bg-gray-100 border-l-4 border-gray-400' : 'bg-white'}`}
            >
              {/* Header do Card */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white shadow-inner flex-shrink-0">
                    <CategoryIconSmall category={transaction.category || 'Outros'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate text-xs">
                      {transaction.merchant || transaction.description}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {format(new Date(transaction.date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-1">
                  <span
                    className={`text-sm font-bold ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </div>
              </div>

              {/* Categoria */}
              <div className="flex items-center gap-1.5 mb-1.5">
                {isUncategorized && (
                  <AlertCircle className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                )}
                <select
                  value={transaction.category || ''}
                  onChange={(e) => handleUpdateCategory(transaction.id, e.target.value)}
                  className={`text-[10px] border rounded px-1.5 py-1 flex-1 focus:outline-none focus:ring-1 ${
                    isUncategorized ? 'border-gray-400 bg-gray-100 text-gray-900 font-semibold focus:ring-gray-500' : 'border-gray-300 bg-white text-gray-900 focus:ring-primary-500'
                  }`}
                >
                  {categories.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Badge de Tipo e Botão Debug */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => handleDebugCategorization(transaction)}
                  className="px-2 py-1 bg-gray-100 hover:bg-primary-100 border border-gray-300 hover:border-primary-500 rounded text-xs font-semibold transition"
                  title="🐛 DEBUG"
                >
                  🐛 Debug
                </button>
                <span
                  className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                    transaction.type === 'credit'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {transaction.type === 'credit' ? 'Receita' : 'Despesa'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Debug
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => {
                const isUncategorized = !transaction.category || transaction.category === 'Não Categorizado';
                return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 transition ${isUncategorized ? 'bg-gray-100 border-l-4 border-gray-400' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(transaction.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-inner flex-shrink-0">
                          <CategoryIconSmall category={transaction.category || 'Outros'} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {transaction.merchant || transaction.description}
                          </p>
                          {transaction.reference && (
                            <p className="text-xs text-gray-500 truncate">{transaction.reference}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        {isUncategorized && (
                          <div className="group relative">
                            <AlertCircle className="w-5 h-5 text-orange-600 animate-pulse" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              ⚠️ Sem categoria definida - Favor categorizar manualmente
                            </div>
                          </div>
                        )}
                        <select
                          value={transaction.category || ''}
                          onChange={(e) => handleUpdateCategory(transaction.id, e.target.value)}
                          className={`text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 ${
                            isUncategorized ? 'border-gray-400 bg-gray-100 text-gray-900 font-semibold focus:ring-gray-500' : 'border-gray-300 bg-white text-gray-900 focus:ring-primary-500'
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
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`text-sm font-semibold ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'credit' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleDebugCategorization(transaction)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-primary-100 border border-gray-300 hover:border-primary-500 rounded-lg transition text-lg font-semibold"
                      title="🐛 DEBUG: Clique para ver como esta transação foi categorizada"
                    >
                      🐛 Debug
                    </button>
                  </td>
                </tr>
              );
              })}
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

      {/* Modal de Debug de Categorização */}
      {showDebugModal && (
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
                  <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : debugResult?.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-semibold">❌ Erro</p>
                  <p className="text-red-600 text-sm mt-1">{debugResult.message}</p>
                </div>
              ) : debugResult ? (
                <div className="space-y-4">
                  {/* Input */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">📥 Dados da Transação</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Descrição:</strong> {debugResult.input.description}</p>
                      <p><strong>Merchant:</strong> {debugResult.input.merchant || '(vazio)'}</p>
                      <p><strong>Valor:</strong> {formatCurrency(debugResult.input.amount)}</p>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">🎯 Resultado da IA</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Categoria:</strong> {debugResult.result.icon} {debugResult.result.category}</p>
                      <p><strong>Subcategoria:</strong> {debugResult.result.subcategory}</p>
                      <p><strong>Confiança:</strong> {debugResult.result.confidence}%</p>
                      <p><strong>Match:</strong> {debugResult.result.matchedBy}</p>
                    </div>
                  </div>

                  {/* Analysis */}
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

                  {/* Legend */}
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
                  className="btn-secondary"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
