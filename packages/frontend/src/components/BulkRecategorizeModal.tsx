import { AlertTriangle, Check } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction } from '../types';

interface BulkRecategorizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  similarTransactions: Array<Transaction & { matchScore: number; matchedWords: string[] }>;
  newCategory: string;
  loading: boolean;
}

const BulkRecategorizeModal = ({
  isOpen,
  onClose,
  onConfirm,
  similarTransactions,
  newCategory,
  loading,
}: BulkRecategorizeModalProps) => {
  if (!isOpen) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Recategorizar Transações Similares?
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Encontramos {similarTransactions.length} transação(ões) similar(es) que também podem ser categorizadas como <strong>{newCategory}</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                ℹ️ Como funciona?
              </h3>
              <p className="text-sm text-blue-800">
                Detectamos transações com descrições e palavras-chave similares à transação que você acabou de categorizar.
                Você pode aplicar a mesma categoria a todas de uma só vez para economizar tempo.
              </p>
            </div>

            {similarTransactions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Transações que serão recategorizadas:
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {similarTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <p className="font-medium text-gray-900 truncate">
                              {transaction.merchant || transaction.description}
                            </p>
                          </div>
                          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                            <span>{format(new Date(transaction.date), 'dd/MM/yyyy')}</span>
                            <span>•</span>
                            <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">
                              {Math.round(transaction.matchScore * 100)}% similar
                            </span>
                            {transaction.matchedWords && transaction.matchedWords.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600">
                                  Palavras: {transaction.matchedWords.slice(0, 3).join(', ')}
                                  {transaction.matchedWords.length > 3 && ` +${transaction.matchedWords.length - 3}`}
                                </span>
                              </>
                            )}
                          </div>
                          {transaction.category && transaction.category !== 'Definir Categoria' && (
                            <div className="mt-1">
                              <span className="inline-flex items-center text-xs">
                                <span className="text-gray-500">Atual:</span>
                                <span className="ml-1 font-medium text-gray-700">{transaction.category}</span>
                                <span className="mx-2 text-gray-400">→</span>
                                <span className="font-semibold text-green-600">{newCategory}</span>
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-shrink-0 text-right">
                          <span
                            className={`text-sm font-semibold ${
                              transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <strong>{similarTransactions.length}</strong> transação(ões) será(ão) atualizada(s)
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Atualizando...' : `Sim, Recategorizar ${similarTransactions.length} Transação(ões)`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkRecategorizeModal;
