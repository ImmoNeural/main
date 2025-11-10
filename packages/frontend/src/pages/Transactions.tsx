import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search, Download, X } from 'lucide-react';
import { transactionApi } from '../services/api';
import type { Transaction, Category } from '../types';

interface SimilarTransactionsModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  similarTransactions: Transaction[];
  selectedCategory: string;
  onClose: () => void;
  onApply: (transactionIds: string[]) => void;
}

const SimilarTransactionsModal = ({
  isOpen,
  transaction,
  similarTransactions,
  selectedCategory,
  onClose,
  onApply,
}: SimilarTransactionsModalProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Selecionar todas por padrão
      setSelectedIds(similarTransactions.map((t) => t.id));
    } else {
      setSelectedIds([]);
    }
  }, [isOpen, similarTransactions]);

  if (!isOpen || !transaction) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === similarTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(similarTransactions.map((t) => t.id));
    }
  };

  const totalAmount = similarTransactions
    .filter((t) => selectedIds.includes(t.id))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Transações Similares Encontradas
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Encontramos {similarTransactions.length} transação(ões) similar(es) a:{' '}
              <span className="font-semibold">{transaction.merchant || transaction.description}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Deseja aplicar a categoria{' '}
              <span className="font-semibold text-primary-600">{selectedCategory}</span> para todas?
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.length === similarTransactions.length}
                  onChange={handleSelectAll}
                  className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <span className="font-medium text-gray-900">
                  Selecionar todas ({similarTransactions.length})
                </span>
              </label>
              <div className="text-sm text-gray-600">
                Total selecionado:{' '}
                <span className="font-semibold text-gray-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {/* Transaction List */}
            {similarTransactions.map((trans) => (
              <label
                key={trans.id}
                className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(trans.id)}
                  onChange={() => handleToggle(trans.id)}
                  className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">
                        {trans.merchant || trans.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(trans.date), 'dd/MM/yyyy')}
                      </p>
                      {trans.category && (
                        <p className="text-xs text-gray-400 mt-1">
                          Categoria atual: {trans.category}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        trans.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {trans.type === 'credit' ? '+' : '-'}
                      {formatCurrency(Math.abs(trans.amount))}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={() => onApply(selectedIds)}
            disabled={selectedIds.length === 0}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Aplicar a {selectedIds.length} transação(ões)
          </button>
        </div>
      </div>
    </div>
  );
};

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    transaction: Transaction | null;
    similarTransactions: Transaction[];
    newCategory: string;
  }>({
    transaction: null,
    similarTransactions: [],
    newCategory: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedType]);

  const loadData = async () => {
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        transactionApi.getTransactions({
          category: selectedCategory || undefined,
          type: selectedType || undefined,
          limit: 100,
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
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const searchLower = search.toLowerCase();
    return (
      transaction.merchant?.toLowerCase().includes(searchLower) ||
      transaction.description?.toLowerCase().includes(searchLower) ||
      transaction.category?.toLowerCase().includes(searchLower)
    );
  });

  const handleUpdateCategory = async (transactionId: string, newCategory: string) => {
    try {
      // Primeiro, atualizar a transação atual
      await transactionApi.updateCategory(transactionId, newCategory);
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId ? { ...t, category: newCategory } : t
        )
      );

      // Depois, buscar transações similares
      const similarRes = await transactionApi.findSimilar(transactionId);

      if (similarRes.data.count > 0) {
        // Abrir modal se houver transações similares
        setModalData({
          transaction: similarRes.data.transaction,
          similarTransactions: similarRes.data.similar,
          newCategory,
        });
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleApplySimilar = async (transactionIds: string[]) => {
    try {
      if (transactionIds.length === 0) {
        setIsModalOpen(false);
        return;
      }

      // Atualizar múltiplas transações
      await transactionApi.bulkUpdateCategory(transactionIds, modalData.newCategory);

      // Atualizar state local
      setTransactions((prev) =>
        prev.map((t) =>
          transactionIds.includes(t.id) ? { ...t, category: modalData.newCategory } : t
        )
      );

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error applying category to similar transactions:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalData({
      transaction: null,
      similarTransactions: [],
      newCategory: '',
    });
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
        <button onClick={exportToCSV} className="btn-primary flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
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
                    <select
                      value={transaction.category || ''}
                      onChange={(e) => handleUpdateCategory(transaction.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      {categories.map((cat) => (
                        <option key={cat.category} value={cat.category}>
                          {cat.icon} {cat.category}
                        </option>
                      ))}
                    </select>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Transações Similares */}
      <SimilarTransactionsModal
        isOpen={isModalOpen}
        transaction={modalData.transaction}
        similarTransactions={modalData.similarTransactions}
        selectedCategory={modalData.newCategory}
        onClose={handleCloseModal}
        onApply={handleApplySimilar}
      />
    </div>
  );
};

export default Transactions;
