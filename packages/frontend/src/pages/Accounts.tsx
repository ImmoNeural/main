import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Wallet, RefreshCw, Trash2, AlertCircle, CheckCircle, Plus, CreditCard, Clock, Calendar } from 'lucide-react';
import { bankApi } from '../services/api';
import type { BankAccount } from '../types';
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

// Tint pairs permitidos para o icon-chip do banco
const BANK_TINTS = [
  'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300',
  'bg-accent-50 text-accent-600 dark:bg-accent-900/40 dark:text-accent-300',
  'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300',
  'bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
];

// Função para obter a tint do banco (rotação determinística pelo nome)
const getBankTint = (bankName: string): string => {
  const name = bankName.toLowerCase();
  if (name.includes('nubank')) return BANK_TINTS[0];
  if (name.includes('itau') || name.includes('itaú')) return BANK_TINTS[3];
  if (name.includes('bradesco')) return BANK_TINTS[2];
  if (name.includes('santander')) return BANK_TINTS[2];
  if (name.includes('caixa')) return BANK_TINTS[0];
  if (name.includes('brasil') || name.includes('bb')) return BANK_TINTS[3];
  if (name.includes('inter')) return BANK_TINTS[3];
  if (name.includes('c6')) return BANK_TINTS[4];
  if (name.includes('original')) return BANK_TINTS[1];
  if (name.includes('neon')) return BANK_TINTS[0];
  if (name.includes('next')) return BANK_TINTS[1];
  return BANK_TINTS[0];
};

// Componente de ícone do banco
const BankIcon = ({ bankName, isActive, size = 'normal', logoUrl }: { bankName: string; isActive: boolean; size?: 'normal' | 'large'; logoUrl?: string | null }) => {
  // Prioridade: 1) logo_url do Pluggy, 2) logo estático local, 3) iniciais
  const logo = logoUrl || getBankLogo(bankName);
  const initials = bankName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const tint = getBankTint(bankName);

  const sizeClasses = size === 'large' ? 'w-16 h-16 rounded-2xl' : 'icon-chip-lg';
  const textSize = size === 'large' ? 'text-xl' : 'text-base';

  if (logo) {
    return (
      <div className={`${sizeClasses} icon-chip overflow-hidden bg-white dark:bg-slate-700 p-2 ${isActive ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
        <img
          src={logo}
          alt={bankName}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = `<span class="${textSize} font-bold text-slate-700 dark:text-slate-200">${initials}</span>`;
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} icon-chip ${tint} ${isActive ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
      <span className={`${textSize} font-bold`}>{initials}</span>
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
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4" data-tour="accounts-page-content">
      <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="page-header__titles">
          <div>
            <h1 className="page-title">Contas Bancárias</h1>
            <p className="page-subtitle mt-1">Gerencie suas contas conectadas</p>
          </div>
        </div>
        <div className="page-header__actions">
          <Link to="/app/transactions" className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
            <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
            <span>Importar Transações</span>
          </Link>
        </div>
      </div>

      {/* No accounts message */}
      {accounts.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="icon-chip icon-chip-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 mb-4">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Nenhuma conta conectada
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-5">
              Conecte sua conta bancária para começar a rastrear seus gastos
            </p>
            <Link to="/app/transactions" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              <span>Importar Transações</span>
            </Link>
          </div>
        </div>
      )}

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const isActive = activeAccountId === account.id;
          return (
          <div
            key={account.id}
            className={`card card-interactive relative overflow-hidden p-0 ${
              isActive ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            {/* Header */}
            <div className={`relative px-6 pt-6 pb-4 ${isActive ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
              {/* Badge de status */}
              <div className="absolute top-4 right-4">
                <span className={`badge ${isActive ? 'badge-success' : 'badge-neutral'}`}>
                  {isActive && <span className="w-1.5 h-1.5 bg-accent-500 rounded-full animate-pulse" />}
                  {isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              {/* Ícone e nome do banco */}
              <div className="flex items-center gap-4 pr-20">
                <BankIcon bankName={account.bank_name} isActive={isActive} size="large" logoUrl={account.logo_url} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">{account.bank_name}</h3>
                    {isActive && <CheckCircle className="w-5 h-5 text-accent-600 dark:text-accent-400 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
                    <CreditCard className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{account.account_type || 'Conta Corrente'}</span>
                  </p>
                  {isActive && (
                    <p className="text-xs text-primary-600 dark:text-primary-300 font-medium mt-1">
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
                    <p className="section-label">Saldo</p>
                    {account.credit_limit && account.credit_limit > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Limite: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(account.credit_limit)}</span>
                      </p>
                    )}
                  </div>
                  <p className={`text-3xl font-bold ${account.balance >= 0 ? 'text-accent-600 dark:text-accent-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(account.balance)}
                  </p>
                  {/* Mostrar saldo disponível quando houver limite e saldo negativo */}
                  {account.credit_limit && account.credit_limit > 0 && account.balance < 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Disponível no limite: <span className="font-semibold">{formatCurrency(account.credit_limit + account.balance)}</span>
                    </p>
                  )}
                  {/* Mostrar saldo total disponível quando houver limite e saldo positivo */}
                  {account.credit_limit && account.credit_limit > 0 && account.balance >= 0 && (
                    <p className="text-xs text-accent-600 dark:text-accent-400 mt-1">
                      Total disponível: <span className="font-semibold">{formatCurrency(account.credit_limit + account.balance)}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="section-label">Cartão de Crédito</p>
                    {account.credit_limit && account.credit_limit > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Limite: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(account.credit_limit)}</span>
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                    Fatura: {formatCurrency(Math.abs(account.balance))}
                  </p>
                  {account.credit_limit && account.credit_limit > 0 && (
                    <p className="text-xs text-accent-600 dark:text-accent-400 mt-1">
                      Disponível: <span className="font-semibold">{formatCurrency(account.credit_limit - Math.abs(account.balance))}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Última sync</p>
                    <p className="text-slate-700 dark:text-slate-200 font-medium">
                      {account.last_sync_at
                        ? format(new Date(account.last_sync_at), 'dd/MM HH:mm')
                        : 'Nunca'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Conectada em</p>
                    <p className="text-slate-700 dark:text-slate-200 font-medium">
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
                  className="btn-primary w-full flex items-center justify-center gap-2"
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
                  className="btn-secondary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  title="Sincronizar transações"
                >
                  <RefreshCw className={`w-5 h-5 ${syncing === account.id ? 'animate-spin' : ''}`} />
                  <span>Sincronizar</span>
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="btn-danger flex items-center justify-center"
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
        <div className="info-card">
          <AlertCircle className="w-5 h-5 text-primary-600 dark:text-primary-300 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
              Sobre a sincronização e gerenciamento de dados
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong>Sincronização inteligente:</strong> O sistema busca apenas transações novas desde a última sincronização, economizando tempo e recursos.
              <br />
              <strong>Validade:</strong> O acesso via Open Finance é válido por 90 dias. Após esse período, basta reconectar a conta.
              <br />
              <strong>Deletar conta:</strong> Ao clicar no ícone de lixeira, a conta e TODAS as transações associadas serão deletadas permanentemente. Você pode reimportar o CSV ou reconectar via Open Finance para recriar a conta.
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Accounts;
