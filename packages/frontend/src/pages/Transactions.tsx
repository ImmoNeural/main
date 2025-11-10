import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search, Download, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { transactionApi } from '../services/api';
import type { Transaction, Category } from '../types';

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [isRecategorizing, setIsRecategorizing] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedType]);

  const loadData = async () => {
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

    const matchesMonth = selectedMonth
      ? format(new Date(transaction.date), 'yyyy-MM') === selectedMonth
      : true;

    return matchesSearch && matchesMonth;
  });

  const handleUpdateCategory = async (transactionId: string, newCategory: string) => {
    try {
      await transactionApi.updateCategory(transactionId, newCategory);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, category: newCategory } : t
        )
      );
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleRecategorize = async () => {
    if (!confirm('Deseja recategorizar todas as transações automaticamente? As categorias manuais serão substituídas.')) {
      return;
    }

    setIsRecategorizing(true);
    try {
      const response = await transactionApi.recategorizeAll();
      alert(`✨ ${response.data.message}\n\n📊 Total: ${response.data.total}\n✅ Atualizadas: ${response.data.updated}\n⏭️ Mantidas: ${response.data.unchanged}`);
      await loadData(); // Recarregar transações
    } catch (error) {
      console.error('Error recategorizing:', error);
      alert('Erro ao recategorizar transações. Tente novamente.');
    } finally {
      setIsRecategorizing(false);
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transações</h1>
          <p className="text-gray-500 mt-1">{filteredTransactions.length} transações encontradas</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={loadData} className="btn-primary p-3">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleRecategorize}
            disabled={isRecategorizing}
            className="btn-secondary flex items-center space-x-2"
          >
            <Sparkles className="w-5 h-5" />
            <span>{isRecategorizing ? 'Categorizando...' : 'Categorizar Automaticamente'}</span>
          </button>
          <button onClick={exportToCSV} className="btn-primary flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Exportar CSV</span>
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
            <option value="2025-01">Janeiro 2025</option>
            <option value="2024-12">Dezembro 2024</option>
            <option value="2024-11">Novembro 2024</option>
            <option value="2024-10">Outubro 2024</option>
            <option value="2024-09">Setembro 2024</option>
            <option value="2024-08">Agosto 2024</option>
            <option value="2024-07">Julho 2024</option>
            <option value="2024-06">Junho 2024</option>
            <option value="2024-05">Maio 2024</option>
            <option value="2024-04">Abril 2024</option>
            <option value="2024-03">Março 2024</option>
            <option value="2024-02">Fevereiro 2024</option>
            <option value="2024-01">Janeiro 2024</option>
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

      {/* Transactions Table */}
      <div className="card overflow-hidden">
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
                const isUncategorized = !transaction.category || transaction.category === 'Outros';
                return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-gray-50 ${isUncategorized ? 'bg-pink-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(transaction.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.merchant || transaction.description}
                        </p>
                        {transaction.reference && (
                          <p className="text-xs text-gray-500">{transaction.reference}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        {isUncategorized && (
                          <div className="group relative">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              ⚠️ Categoria não encontrada. Favor categorizar manualmente.
                            </div>
                          </div>
                        )}
                        <select
                          value={transaction.category || ''}
                          onChange={(e) => handleUpdateCategory(transaction.id, e.target.value)}
                          className={`text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                            isUncategorized ? 'border-orange-400 bg-orange-50' : 'border-gray-300'
                          }`}
                        >
                          {categories.map((cat) => (
                            <option key={cat.category} value={cat.category}>
                              {cat.icon} {cat.category}
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
    </div>
  );
};

export default Transactions;
