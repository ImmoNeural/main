import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Wallet, RefreshCw, Trash2, AlertCircle, CheckCircle, Plus, CreditCard, Clock, Calendar, Lock } from 'lucide-react';
import { bankApi } from '../services/api';
import type { BankAccount } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import { useOnboarding } from '../hooks/useOnboarding';

// Mapa de logos de bancos brasileiros conhecidos
const bankLogos: Record<string, string> = {
  'nubank': 'https://logodownload.org/wp-content/uploads/2019/08/nubank-logo-1.png',
  'itau': 'https://logodownload.org/wp-content/uploads/2014/05/itau-logo-1.png',
  'itaú': 'https://logodownload.org/wp-content/uploads/2014/05/itau-logo-1.png',
  'bradesco': 'https://logodownload.org/wp-content/uploads/2014/04/bradesco-logo-1.png',
  'santander': 'https://logodownload.org/wp-content/uploads/2016/10/Santander-logo-1.png',
  'caixa': 'https://logodownload.org/wp-content/uploads/2014/02/caixa-logo-1.png',
  'banco do brasil': 'https://logodownload.org/wp-content/uploads/2014/05/banco-do-brasil-logo-1.png',
  'bb': 'https://logodownload.org/wp-content/uploads/2014/05/banco-do-brasil-logo-1.png',
  'inter': 'https://logodownload.org/wp-content/uploads/2019/09/banco-inter-logo-1.png',
  'c6': 'https://logodownload.org/wp-content/uploads/2020/02/c6-bank-logo-1.png',
  'original': 'https://logodownload.org/wp-content/uploads/2019/06/banco-original-logo-1.png',
  'sicoob': 'https://logodownload.org/wp-content/uploads/2020/02/sicoob-logo-1.png',
  'sicredi': 'https://logodownload.org/wp-content/uploads/2018/04/sicredi-logo-1.png',
  'banrisul': 'https://logodownload.org/wp-content/uploads/2018/09/banrisul-logo.png',
  'picpay': 'https://logodownload.org/wp-content/uploads/2018/05/picpay-logo-1.png',
  'mercado pago': 'https://logodownload.org/wp-content/uploads/2018/12/mercado-pago-logo.png',
  'stone': 'https://logodownload.org/wp-content/uploads/2020/12/stone-logo.png',
  'pagbank': 'https://logodownload.org/wp-content/uploads/2020/02/pagbank-logo.png',
  'pagseguro': 'https://logodownload.org/wp-content/uploads/2020/02/pagbank-logo.png',
  'neon': 'https://logodownload.org/wp-content/uploads/2019/09/neon-logo.png',
  'next': 'https://logodownload.org/wp-content/uploads/2019/07/next-logo-1.png',
  'xp': 'https://logodownload.org/wp-content/uploads/2019/03/xp-investimentos-logo.png',
  'btg': 'https://logodownload.org/wp-content/uploads/2020/05/btg-pactual-logo.png',
  'safra': 'https://logodownload.org/wp-content/uploads/2020/02/safra-logo.png',
};

// Função para obter logo do banco
const getBankLogo = (bankName: string): string | null => {
  const normalizedName = bankName.toLowerCase().trim();

  for (const [key, url] of Object.entries(bankLogos)) {
    if (normalizedName.includes(key)) {
      return url;
    }
  }
  return null;
};

// Função para obter cor do banco
const getBankColor = (bankName: string): string => {
  const name = bankName.toLowerCase();
  if (name.includes('nubank')) return 'from-purple-500 to-purple-600';
  if (name.includes('itau') || name.includes('itaú')) return 'from-orange-500 to-orange-600';
  if (name.includes('bradesco')) return 'from-red-500 to-red-600';
  if (name.includes('santander')) return 'from-red-600 to-red-700';
  if (name.includes('caixa')) return 'from-blue-600 to-blue-700';
  if (name.includes('brasil') || name.includes('bb')) return 'from-yellow-500 to-yellow-600';
  if (name.includes('inter')) return 'from-orange-500 to-orange-600';
  if (name.includes('c6')) return 'from-gray-800 to-black';
  if (name.includes('original')) return 'from-green-500 to-green-600';
  if (name.includes('neon')) return 'from-cyan-500 to-cyan-600';
  if (name.includes('next')) return 'from-green-400 to-green-500';
  return 'from-primary-500 to-primary-600';
};

// Componente de ícone do banco
const BankIcon = ({ bankName, isActive, size = 'normal', logoUrl }: { bankName: string; isActive: boolean; size?: 'normal' | 'large'; logoUrl?: string | null }) => {
  // Prioridade: 1) logo_url do Pluggy, 2) logo estático local, 3) iniciais
  const logo = logoUrl || getBankLogo(bankName);
  const initials = bankName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const gradientColor = getBankColor(bankName);

  const sizeClasses = size === 'large' ? 'w-16 h-16' : 'w-12 h-12';
  const textSize = size === 'large' ? 'text-xl' : 'text-base';

  if (logo) {
    return (
      <div className={`${sizeClasses} rounded-2xl overflow-hidden bg-white shadow-md flex items-center justify-center p-2 ${isActive ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
        <img
          src={logo}
          alt={bankName}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = `<span class="${textSize} font-bold text-gray-700">${initials}</span>`;
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} rounded-2xl bg-gradient-to-br ${gradientColor} shadow-lg flex items-center justify-center ${isActive ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
      <span className={`${textSize} font-bold text-white`}>{initials}</span>
    </div>
  );
};

const Accounts = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  // Check if tutorial is active - skip API calls during tutorial
  const { showOnboarding } = useOnboarding();

  // Get subscription info for plan-based restrictions
  const { planType, isTrialActive } = useSubscription();

  // Determine if Open Finance connection is allowed based on plan
  // Durante trial, acesso total como Conectado Plus
  const isManualPlan = planType === 'manual' && !isTrialActive;
  const isConectadoPlan = planType === 'conectado' && !isTrialActive;
  const isConectadoPlusPlan = planType === 'conectado_plus' || isTrialActive; // Trial = Conectado Plus

  // Get max allowed accounts based on plan
  const getMaxAccounts = () => {
    if (isTrialActive) return 4; // Trial = Conectado Plus
    if (isManualPlan) return 0;
    if (isConectadoPlan) return 3;
    if (isConectadoPlusPlan) return 4;
    return 0; // Default: no accounts allowed
  };

  const maxAccounts = getMaxAccounts();
  const canConnectMore = (isTrialActive || !isManualPlan) && accounts.length < maxAccounts;

  useEffect(() => {
    // Durante tutorial, pular chamadas de API e mostrar estado vazio rapidamente
    if (showOnboarding) {
      console.log('🎮 Accounts: Tutorial mode - skipping API calls');
      setLoading(false);
      return;
    }

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
  }, [showOnboarding]);

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
      alert('✅ Conta sincronizada!');
    } catch (error) {
      console.error('Error syncing account:', error);
      alert('❌ Erro ao sincronizar.');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('⚠️ Deletar conta e todas as transações?\n\nEsta ação é irreversível.')) {
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
      alert(`✅ Conta deletada! ${deletedTrans} ${deletedTrans === 1 ? 'transação removida' : 'transações removidas'}.`);
    } catch (error: any) {
      console.error('❌ Erro ao deletar conta:', error);
      console.error('Detalhes do erro:', error.response?.data || error.message);
      alert(`❌ Erro ao deletar conta.`);
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
    <div className="max-w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4" data-tour="accounts-page-content">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">Contas Bancárias</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Gerencie suas contas conectadas</p>
        </div>
        {isManualPlan ? (
          <div className="relative group">
            <button
              disabled
              className="btn-secondary flex items-center space-x-2 w-full sm:w-auto justify-center opacity-60 cursor-not-allowed"
            >
              <Lock className="w-4 sm:w-5 h-4 sm:h-5" />
              <span className="text-sm sm:text-base">Conectar Banco</span>
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg">
              Disponível apenas nos planos Conectado ou Conectado Plus
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        ) : !canConnectMore && accounts.length > 0 ? (
          <div className="relative group">
            <button
              disabled
              className="btn-secondary flex items-center space-x-2 w-full sm:w-auto justify-center opacity-60 cursor-not-allowed"
            >
              <Lock className="w-4 sm:w-5 h-4 sm:h-5" />
              <span className="text-sm sm:text-base">Conectar Banco</span>
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 shadow-lg">
              Limite de {maxAccounts} contas atingido. Faça upgrade para conectar mais.
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        ) : (
          <Link to="/app/connect-bank" className="btn-primary flex items-center space-x-2 w-full sm:w-auto justify-center">
            <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
            <span className="text-sm sm:text-base">Conectar Banco</span>
          </Link>
        )}
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const isActive = activeAccountId === account.id;
          return (
          <div
            key={account.id}
            className={`relative bg-white rounded-3xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl ${
              isActive ? 'ring-2 ring-primary-500' : 'hover:-translate-y-1'
            }`}
          >
            {/* Header com gradiente */}
            <div className={`relative px-6 pt-6 pb-4 ${isActive ? 'bg-gradient-to-br from-primary-50 to-green-50' : 'bg-gradient-to-br from-gray-50 to-white'}`}>
              {/* Badge de status */}
              <div className="absolute top-4 right-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                  {isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {/* Ícone e nome do banco */}
              <div className="flex items-center gap-4 pr-20">
                <BankIcon bankName={account.bank_name} isActive={isActive} size="large" logoUrl={account.logo_url} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-lg truncate">{account.bank_name}</h3>
                    {isActive && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5 truncate">
                    <CreditCard className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{account.account_type || 'Conta Corrente'}</span>
                  </p>
                  {isActive && (
                    <p className="text-xs text-primary-600 font-medium mt-1">
                      Banco Ativo no Dashboard
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Corpo do card */}
            <div className="px-6 py-5">
              {/* Saldo - não mostrar para cartões de crédito */}
              {account.account_type !== 'card' ? (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Saldo</p>
                    {account.credit_limit && account.credit_limit > 0 && (
                      <p className="text-xs text-gray-500">
                        Limite: <span className="font-semibold text-gray-700">{formatCurrency(account.credit_limit)}</span>
                      </p>
                    )}
                  </div>
                  <p className={`text-3xl font-bold ${account.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    {formatCurrency(account.balance)}
                  </p>
                  {/* Mostrar saldo disponível quando houver limite e saldo negativo */}
                  {account.credit_limit && account.credit_limit > 0 && account.balance < 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Disponível no limite: <span className="font-semibold">{formatCurrency(account.credit_limit + account.balance)}</span>
                    </p>
                  )}
                  {/* Mostrar saldo total disponível quando houver limite e saldo positivo */}
                  {account.credit_limit && account.credit_limit > 0 && account.balance >= 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Total disponível: <span className="font-semibold">{formatCurrency(account.credit_limit + account.balance)}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cartão de Crédito</p>
                    {account.credit_limit && account.credit_limit > 0 && (
                      <p className="text-xs text-gray-500">
                        Limite: <span className="font-semibold text-gray-700">{formatCurrency(account.credit_limit)}</span>
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-purple-600">
                    Fatura: {formatCurrency(Math.abs(account.balance))}
                  </p>
                  {account.credit_limit && account.credit_limit > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      Disponível: <span className="font-semibold">{formatCurrency(account.credit_limit - Math.abs(account.balance))}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Última sync</p>
                    <p className="text-gray-700 font-medium">
                      {account.last_sync_at
                        ? format(new Date(account.last_sync_at), 'dd/MM HH:mm')
                        : 'Nunca'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Conectada em</p>
                    <p className="text-gray-700 font-medium">
                      {format(new Date(account.connected_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer com ações */}
            <div className="px-6 pb-6 pt-2 space-y-3">
              {/* Botão de ativar (se não ativo) */}
              {!isActive && (
                <button
                  onClick={() => setActiveAccount(account.id)}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Usar no Dashboard</span>
                </button>
              )}

              {/* Botões de ação */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSync(account.id)}
                  disabled={syncing === account.id}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  title="Sincronizar transações"
                >
                  <RefreshCw className={`w-5 h-5 ${syncing === account.id ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-all"
                  title="Desconectar e remover conta"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
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
    </div>
  );
};

export default Accounts;
