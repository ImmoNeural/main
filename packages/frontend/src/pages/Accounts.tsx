import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Wallet, RefreshCw, Trash2, Plus, AlertCircle } from 'lucide-react';
import { bankApi } from '../services/api';
import type { BankAccount } from '../types';

const Accounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await bankApi.getAccounts();
      setAccounts(response.data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
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
    if (!confirm('Tem certeza que deseja desconectar esta conta?')) {
      return;
    }

    try {
      await bankApi.deleteAccount(accountId);
      await loadAccounts();
      alert('Conta desconectada com sucesso!');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Erro ao desconectar conta');
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas Bancárias</h1>
          <p className="text-gray-500 mt-1">Gerencie suas contas conectadas</p>
        </div>
        <Link to="/connect-bank" className="btn-primary flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>Conectar Banco</span>
        </Link>
      </div>

      {/* No accounts message */}
      {accounts.length === 0 && (
        <div className="card text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhuma conta conectada
          </h3>
          <p className="text-gray-500 mb-6">
            Conecte sua conta bancária para começar a rastrear seus gastos
          </p>
          <Link to="/connect-bank" className="btn-primary inline-flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Conectar primeira conta</span>
          </Link>
        </div>
      )}

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => (
          <div key={account.id} className="card">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-primary-100 rounded-full">
                  <Wallet className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{account.bank_name}</h3>
                  <p className="text-sm text-gray-500">
                    {account.account_type || 'Conta Corrente'}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  account.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {account.status === 'active' ? 'Ativa' : 'Inativa'}
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

            {/* Actions */}
            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => handleSync(account.id)}
                disabled={syncing === account.id}
                className="flex-1 btn-secondary flex items-center justify-center space-x-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${syncing === account.id ? 'animate-spin' : ''}`}
                />
                <span>Sincronizar</span>
              </button>
              <button
                onClick={() => handleDelete(account.id)}
                className="btn-danger flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      {accounts.length > 0 && (
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                Sobre a sincronização
              </h3>
              <p className="text-sm text-blue-800">
                As contas são sincronizadas automaticamente através do Open Banking (PSD2).
                Você pode sincronizar manualmente a qualquer momento clicando no botão "Sincronizar".
                O acesso é válido por 90 dias, após esse período será necessário reconectar a conta.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
