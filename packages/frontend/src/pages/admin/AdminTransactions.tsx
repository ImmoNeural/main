import { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, RefreshCw, ArrowLeft, User, Calendar, DollarSign, Eye, CreditCard, Wrench } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

// Lista de emails de administradores
const ADMIN_EMAILS = [
  'neurekaai@gmail.com',
];

interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant?: string;
  category?: string;
  subcategory?: string;
  amount: number;
  type: 'credit' | 'debit';
  account_id?: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

const AdminTransactions = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('user_id');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Estado para correção de cartões de crédito
  const [showCreditCardFix, setShowCreditCardFix] = useState(false);
  const [creditCardFixResult, setCreditCardFixResult] = useState<any>(null);
  const [isFixingCreditCards, setIsFixingCreditCards] = useState(false);

  // Função para iniciar impersonação
  const startImpersonation = () => {
    if (!userId) return;

    console.log('🎭 Iniciando impersonação do usuário:', userId);

    localStorage.setItem('impersonate_user_id', userId);
    localStorage.setItem('impersonate_user_name', userInfo?.name || userInfo?.email || 'Usuário');

    // Redirecionar para o dashboard (reload completo para garantir que o header seja enviado)
    window.location.href = '/app/dashboard';
  };

  // Carregar dados quando tiver userId
  useEffect(() => {
    if (userId && user?.email && ADMIN_EMAILS.includes(user.email)) {
      loadData();
    }
  }, [userId, user?.email]);

  const loadData = async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Buscar transações do usuário específico
      const response = await api.get('/admin/transactions', {
        params: { user_id: userId, limit: 10000 },
      });

      setTransactions(response.data.transactions || []);
      setUserInfo(response.data.user || null);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.response?.data?.error || 'Erro ao carregar transações');
    } finally {
      setIsLoading(false);
    }
  };

  // Função para corrigir cartões de crédito (dry run primeiro)
  const previewCreditCardFix = async () => {
    setIsFixingCreditCards(true);
    setCreditCardFixResult(null);
    try {
      const params: any = { dry_run: 'true' };
      if (userId) {
        params.user_id = userId;
      }
      const response = await api.post('/admin/fix-credit-card-transactions', null, { params });
      setCreditCardFixResult(response.data);
      setShowCreditCardFix(true);
    } catch (err: any) {
      console.error('Erro ao verificar cartões:', err);
      alert('Erro ao verificar cartões de crédito: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsFixingCreditCards(false);
    }
  };

  // Função para executar correção de verdade
  const executeCreditCardFix = async () => {
    if (!confirm('Tem certeza que deseja corrigir as transações de cartão de crédito? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsFixingCreditCards(true);
    try {
      const params: any = {};
      if (userId) {
        params.user_id = userId;
      }
      const response = await api.post('/admin/fix-credit-card-transactions', null, { params });
      setCreditCardFixResult(response.data);
      alert(`Correção concluída!\n${response.data.transactionsInverted} transações invertidas\n${response.data.transactionsDeleted} transações deletadas`);
      // Recarregar dados se estiver vendo um usuário específico
      if (userId) {
        loadData();
      }
    } catch (err: any) {
      console.error('Erro ao corrigir cartões:', err);
      alert('Erro ao corrigir cartões de crédito: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsFixingCreditCards(false);
    }
  };

  // Verificar se é admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  // Mostrar loading enquanto auth carrega
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Se não for admin (e auth já carregou), redirecionar
  if (!isAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  // Se não tiver user_id, mostrar formulário de busca
  if (!userId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin - Buscar Usuário</h1>
        <div className="bg-white rounded-xl shadow-md p-6">
          <p className="text-gray-600 mb-4">
            Acesse as transações de um usuário específico usando a URL:
          </p>
          <code className="block bg-gray-100 p-3 rounded-lg text-sm mb-4">
            /app/admin/transactions?user_id=UUID_DO_USUARIO
          </code>
          <p className="text-sm text-gray-500">
            Exemplo: /app/admin/transactions?user_id=a49aacf8-aa8a-4cec-b6e3-e113e91fcb57
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredTransactions = transactions.filter((t) => {
    const searchLower = search.toLowerCase();
    return (
      t.merchant?.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower) ||
      t.category?.toLowerCase().includes(searchLower)
    );
  });

  // Calcular totais
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="max-w-full px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <a
              href="/app/dashboard"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </a>
            <span className="text-gray-400">|</span>
            <span className="text-sm text-orange-600 font-semibold bg-orange-100 px-2 py-0.5 rounded">
              ADMIN
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Transações do Usuário</h1>
          {userInfo && (
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {userInfo.name || 'Sem nome'}
              </span>
              <span>{userInfo.email}</span>
              <span className="text-xs text-gray-400 font-mono">{userId}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={previewCreditCardFix}
            disabled={isFixingCreditCards}
            className="btn-secondary flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-300"
          >
            <CreditCard className={`w-4 h-4 ${isFixingCreditCards ? 'animate-pulse' : ''}`} />
            {isFixingCreditCards ? 'Verificando...' : 'Corrigir Cartões'}
          </button>
          <button
            onClick={startImpersonation}
            className="btn-primary flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
          >
            <Eye className="w-4 h-4" />
            Visualizar como este usuário
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Transações</span>
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {filteredTransactions.length}
          </p>
        </div>

        <div className="bg-green-50 rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Receitas</span>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        <div className="bg-red-50 rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Despesas</span>
            <DollarSign className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, merchant ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Descrição
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.merchant || transaction.description}
                    </div>
                    {transaction.merchant && transaction.description && (
                      <div className="text-xs text-gray-500">{transaction.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {transaction.category || '-'}
                    {transaction.subcategory && (
                      <span className="text-xs text-gray-400 ml-1">
                        ({transaction.subcategory})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        transaction.type === 'credit'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transaction.type === 'credit' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-semibold text-right ${
                      transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de Correção de Cartões de Crédito */}
      {showCreditCardFix && creditCardFixResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Correção de Cartões de Crédito</h2>
                  <p className="text-sm text-gray-500">
                    {userId ? 'Para este usuário' : 'Para todos os usuários'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {creditCardFixResult.accountsProcessed === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conta de cartão de crédito encontrada.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{creditCardFixResult.accountsProcessed}</p>
                      <p className="text-sm text-gray-600">Contas de cartão</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-orange-600">{creditCardFixResult.transactionsInverted}</p>
                      <p className="text-sm text-gray-600">Serão invertidas</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{creditCardFixResult.transactionsDeleted}</p>
                      <p className="text-sm text-gray-600">Serão deletadas</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-700 mb-2">O que será feito:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Transações <span className="text-green-600 font-medium">positivas</span> (compras) serão <span className="text-orange-600 font-medium">invertidas para negativas</span></li>
                      <li>• Transações <span className="text-red-600 font-medium">negativas</span> (pagamentos de fatura) serão <span className="text-red-600 font-medium">deletadas</span></li>
                    </ul>
                  </div>

                  {creditCardFixResult.details && creditCardFixResult.details.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-700 mb-2">Detalhes por conta:</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {creditCardFixResult.details.map((detail: any, index: number) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                            <p className="font-medium text-gray-900">{detail.bank_name}</p>
                            <p className="text-gray-500 text-xs">{detail.account_id}</p>
                            <div className="flex gap-4 mt-1">
                              <span className="text-orange-600">{detail.transactionsToInvert} inverter</span>
                              <span className="text-red-600">{detail.transactionsToDelete} deletar</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {creditCardFixResult.dry_run && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <p className="text-yellow-800 text-sm">
                        <strong>Modo preview:</strong> Nenhuma alteração foi feita ainda. Clique em "Executar Correção" para aplicar as mudanças.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreditCardFix(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Fechar
              </button>
              {creditCardFixResult.dry_run && (creditCardFixResult.transactionsInverted > 0 || creditCardFixResult.transactionsDeleted > 0) && (
                <button
                  onClick={executeCreditCardFix}
                  disabled={isFixingCreditCards}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Wrench className={`w-4 h-4 ${isFixingCreditCards ? 'animate-spin' : ''}`} />
                  {isFixingCreditCards ? 'Executando...' : 'Executar Correção'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
