import { useEffect, useState } from 'react';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Download, AlertCircle, RefreshCw, PlusCircle, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { transactionApi } from '../services/api';
import type { Transaction, Category } from '../types';
import BulkRecategorizeModal from '../components/BulkRecategorizeModal';
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
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transações</h1>
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 cursor-pointer"
          onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
        >
          {/* Total de Receitas */}
          <div className="card hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Receitas (12 meses)</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(totalIncome)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <ArrowUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total de Despesas */}
          <div className="card hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Despesas (12 meses)</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(totalExpense)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ArrowDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Saldo Líquido */}
          <div className="card hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Saldo Líquido (12 meses)</p>
                <p className={`text-xl sm:text-2xl font-bold mt-1 ${
                  balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${
                balance >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {balance >= 0 ? (
                  <ArrowUp className="w-6 h-6 text-green-600" />
                ) : (
                  <ArrowDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
          </div>

          {/* Saldo Inicial */}
          <div className="card hover:shadow-lg transition-all bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-semibold">
                  💰 Saldo inicial <span className="text-xs text-gray-400">em {getStartDateLabel()}</span>
                </p>
                <p className="text-xl sm:text-2xl font-bold text-blue-700 mt-1">
                  {initialBalance !== null && initialBalance !== undefined
                    ? formatCurrency(initialBalance)
                    : 'Não definido'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <ArrowUp className="w-6 h-6 text-blue-600" />
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
      <div className="md:hidden space-y-3">
        {filteredTransactions.map((transaction) => {
          const isUncategorized = !transaction.category || transaction.category === 'Definir Categoria' || transaction.category === 'Outros' || transaction.category === 'Sem Categoria';
          return (
            <div
              key={transaction.id}
              className={`card p-4 ${isUncategorized ? 'bg-rose-50 border-l-4 border-rose-400' : 'bg-white'}`}
            >
              {/* Header do Card */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-white shadow-inner flex-shrink-0">
                    <CategoryIconSmall category={transaction.category || 'Outros'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate text-sm">
                      {transaction.merchant || transaction.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(transaction.date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span
                    className={`text-base font-bold ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </div>
              </div>

              {/* Categoria */}
              <div className="flex items-center gap-2 mb-2">
                {isUncategorized && (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <select
                  value={transaction.category || ''}
                  onChange={(e) => handleUpdateCategory(transaction.id, e.target.value)}
                  className={`text-xs border rounded-lg px-2 py-1.5 flex-1 focus:outline-none focus:ring-2 ${
                    isUncategorized ? 'border-rose-400 bg-rose-100 text-gray-900 font-semibold focus:ring-rose-500' : 'border-gray-300 bg-white text-gray-900 focus:ring-primary-500'
                  }`}
                >
                  {categories.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Badge de Tipo */}
              <div className="flex justify-end">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => {
                const isUncategorized = !transaction.category || transaction.category === 'Definir Categoria' || transaction.category === 'Outros' || transaction.category === 'Sem Categoria';
                return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 transition ${isUncategorized ? 'bg-rose-50 border-l-4 border-rose-400' : ''}`}
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
                            <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              ⚠️ Sem categoria definida - Favor categorizar manualmente
                            </div>
                          </div>
                        )}
                        <select
                          value={transaction.category || ''}
                          onChange={(e) => handleUpdateCategory(transaction.id, e.target.value)}
                          className={`text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 ${
                            isUncategorized ? 'border-rose-400 bg-rose-100 text-gray-900 font-semibold focus:ring-rose-500' : 'border-gray-300 bg-white text-gray-900 focus:ring-primary-500'
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
    </div>
  );
};

export default Transactions;
