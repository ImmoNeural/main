import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Wallet, RefreshCw, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { bankApi } from '../services/api';
import type { BankAccount } from '../types';

const Accounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  useEffect(() => {
    // Inicializar banco ativo do localStorage ANTES de carregar
    const savedActiveAccount = localStorage.getItem('activeAccountId');
    if (savedActiveAccount) {
      console.log('🔄 Inicializando activeAccountId do localStorage:', savedActiveAccount);
      setActiveAccountId(savedActiveAccount);
    }

    loadAccounts();

    // Limpar flag de proteção contra logout após conexão bancária
    // Esta flag é setada em ConnectBank.tsx para evitar logout durante o processo
    const bankConnectionFlag = sessionStorage.getItem('bank_connection_in_progress');
    if (bankConnectionFlag) {
      console.log('🔓 Removendo proteção contra logout (página Accounts carregada)');
      // Delay para garantir que todas as requisições iniciais completem
      setTimeout(() => {
        sessionStorage.removeItem('bank_connection_in_progress');
        console.log('✅ Proteção removida com sucesso');
      }, 2000);
    }
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await bankApi.getAccounts();
      console.log('📋 Loaded accounts:', response.data);
      setAccounts(response.data);

      if (response.data.length === 0) {
        console.log('⚠️ Nenhuma conta encontrada');
        setActiveAccountId(null);
        localStorage.removeItem('activeAccountId');
        setLoading(false);
        return;
      }

      // Verificar se há banco ativo salvo
      const savedActiveAccount = localStorage.getItem('activeAccountId');
      console.log('💾 localStorage activeAccountId:', savedActiveAccount);

      // Verificar se o banco salvo ainda existe na lista
      const savedAccountExists = savedActiveAccount && response.data.some(acc => acc.id === savedActiveAccount);

      if (savedAccountExists) {
        // Se há banco salvo E ele existe, usar ele
        console.log('✅ Banco ativo encontrado e VÁLIDO no localStorage:', savedActiveAccount);
        setActiveAccountId(savedActiveAccount);
      } else {
        // Se não há banco salvo OU ele não existe mais, definir automaticamente
        console.log('🔄 Definindo novo banco ativo automaticamente');

        if (response.data.length === 1) {
          console.log('✅ Apenas 1 conta encontrada - tornando ativa automaticamente');
          const accountId = response.data[0].id;
          console.log('🎯 Ativando conta:', accountId);
          setActiveAccount(accountId);
        } else {
          // Se houver múltiplas contas, usar a primeira com status 'active' (conectada)
          const firstConnectedAccount = response.data.find(acc => acc.status === 'active');
          if (firstConnectedAccount) {
            console.log('✅ Múltiplas contas - definindo primeira conta conectada como ativa:', firstConnectedAccount.id);
            setActiveAccount(firstConnectedAccount.id);
          } else {
            // Fallback: usar a primeira conta da lista
            console.log('⚠️ Nenhuma conta com status active, usando primeira da lista:', response.data[0].id);
            setActiveAccount(response.data[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveAccount = (accountId: string) => {
    setActiveAccountId(accountId);
    localStorage.setItem('activeAccountId', accountId);
    // Disparar evento customizado para atualizar dashboard
    window.dispatchEvent(new CustomEvent('activeAccountChanged', { detail: { accountId } }));
  };

  const handleSync = async (accountId: string) => {
    setSyncing(accountId);
    try {
      await bankApi.syncAccount(accountId);
      await loadAccounts();
      alert('Conta sincronizada com sucesso!');
    } catch (error) {
      console.error('Error syncing account:', error);
      alert('Erro ao sincronizar conta');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('⚠️ ATENÇÃO: Deseja DELETAR esta conta?\n\n🗑️ ESTA AÇÃO É IRREVERSÍVEL!\n\nIsso irá apagar permanentemente:\n• Esta conta bancária\n• TODAS as transações associadas\n• Todos os dados relacionados\n\n❌ Esta ação NÃO pode ser desfeita.\n\n✅ Se importar o CSV novamente ou reconectar via Open Finance, a conta e transações serão recriadas.\n\nTem certeza absoluta que deseja continuar?')) {
      return;
    }

    try {
      console.log('🗑️ Deletando conta e todas transações:', accountId);
      const response = await bankApi.deleteAccount(accountId);
      console.log('✅ Resposta do servidor:', response.data);

      // Se estamos deletando o banco ativo, limpar do localStorage e state
      if (activeAccountId === accountId) {
        console.log('🔄 Limpando banco ativo do localStorage');
        localStorage.removeItem('activeAccountId');
        setActiveAccountId(null);
        // Disparar evento para atualizar dashboard
        window.dispatchEvent(new CustomEvent('activeAccountChanged', { detail: { accountId: null } }));
      }

      // Remover da lista local imediatamente
      console.log('🎯 Removendo conta da lista local');
      setAccounts(prevAccounts => prevAccounts.filter(acc => acc.id !== accountId));

      const deletedTrans = response.data.deletedTransactions || 0;
      alert(`✅ Conta bancária deletada com sucesso!\n\n🗑️ ${deletedTrans} ${deletedTrans === 1 ? 'transação foi deletada' : 'transações foram deletadas'}.\n\n💡 Você pode reimportar o CSV ou reconectar via Open Finance para recriar a conta.`);
    } catch (error: any) {
      console.error('❌ Erro ao deletar conta:', error);
      console.error('Detalhes do erro:', error.response?.data || error.message);
      alert(`Erro ao deletar conta: ${error.response?.data?.error || error.message || 'Erro desconhecido'}`);
      // Se der erro, recarregar do servidor
      await loadAccounts();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-800 tracking-tight">Contas Bancárias</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Gerencie suas contas conectadas</p>
        </div>
        <Link to="/app/connect-bank" className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center">
          <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
          <span className="text-sm sm:text-base">Conectar Banco</span>
        </Link>
      </div>

      {/* No accounts message */}
      {accounts.length === 0 && (
        <div className="card text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma conta conectada
          </h3>
          <p className="text-gray-500">
            Conecte sua conta bancária para começar a rastrear seus gastos
          </p>
        </div>
      )}

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const isActive = activeAccountId === account.id;
          console.log('🔍 Account render:', {
            accountId: account.id,
            accountName: account.bank_name,
            activeAccountId: activeAccountId,
            isActive: isActive,
            match: activeAccountId === account.id
          });
          return (
          <div
            key={account.id}
            className={`card transition-all ${
              isActive ? 'ring-2 ring-primary-500 shadow-lg' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-full ${
                  isActive ? 'bg-primary-600' : 'bg-primary-100'
                }`}>
                  <Wallet className={`w-6 h-6 ${
                    isActive ? 'text-white' : 'text-primary-600'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900">{account.bank_name}</h3>
                    {isActive && (
                      <CheckCircle className="w-4 h-4 text-primary-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {account.account_type || 'Conta Corrente'}
                  </p>
                  {isActive && (
                    <p className="text-xs text-primary-600 font-semibold mt-1">
                      Banco Ativo no Dashboard
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {isActive ? 'Ativo' : 'Não Ativo'}
              </span>
            </div>

            <div className="space-y-3">
              {/* Balance */}
              <div>
                <p className="text-sm text-gray-500">Saldo</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(account.balance)}
                </p>
              </div>

              {/* IBAN */}
              {account.iban && (
                <div>
                  <p className="text-sm text-gray-500">IBAN</p>
                  <p className="text-sm font-mono text-gray-900">
                    {account.iban.replace(/(.{4})/g, '$1 ').trim()}
                  </p>
                </div>
              )}

              {/* Last sync */}
              <div>
                <p className="text-sm text-gray-500">Última sincronização</p>
                <p className="text-sm text-gray-900">
                  {account.last_sync_at
                    ? format(new Date(account.last_sync_at), 'dd/MM/yyyy HH:mm')
                    : 'Nunca'}
                </p>
              </div>

              {/* Connected date */}
              <div>
                <p className="text-sm text-gray-500">Conectada em</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(account.connected_at), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>

            {/* Activate Bank Button */}
            {!isActive && (
              <div className="mt-4">
                <button
                  onClick={() => setActiveAccount(account.id)}
                  className="w-full btn-primary flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Usar este Banco no Dashboard</span>
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => handleSync(account.id)}
                disabled={syncing === account.id}
                className="flex-1 btn-secondary flex items-center justify-center space-x-2"
                title="Sincronizar transações"
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncing === account.id ? 'animate-spin' : ''}`}
                />
                <span>Sincronizar</span>
              </button>
              <button
                onClick={() => handleDelete(account.id)}
                className="btn-danger flex items-center justify-center"
                title="Desconectar e remover conta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
        })}
      </div>

      {/* Info box */}
      {accounts.length > 0 && (
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Sobre a sincronização e gerenciamento de dados
              </h3>
              <p className="text-sm text-blue-800">
                <strong>Sincronização inteligente:</strong> O sistema busca apenas transações novas desde a última sincronização, economizando tempo e recursos.
                <br />
                <strong>Validade:</strong> O acesso via Open Finance é válido por 90 dias. Após esse período, basta reconectar a conta.
                <br />
                <strong>⚠️ Deletar conta:</strong> Ao clicar no ícone de lixeira, a conta e TODAS as transações associadas serão deletadas permanentemente. Você pode reimportar o CSV ou reconectar via Open Finance para recriar a conta.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
