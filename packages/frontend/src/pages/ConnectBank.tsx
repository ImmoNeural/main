import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Shield, Lock, RefreshCw, AlertTriangle, Landmark, CreditCard, Wallet, PiggyBank } from 'lucide-react';
import { bankApi } from '../services/api';
import type { Bank } from '../types';

// Declaração TypeScript para o Pluggy Connect SDK v2
declare global {
  interface Window {
    PluggyConnect: new (config: {
      connectToken: string;
      includeSandbox?: boolean;
      onSuccess?: (data: { item: { id: string } }) => void;
      onError?: (error: { message: string; data?: unknown }) => void;
      onClose?: () => void;
      onEvent?: (event: { event: string; data?: unknown }) => void;
    }) => {
      init: () => void;
      destroy: () => void;
    };
  }
}

// Função para carregar o SDK do Pluggy dinamicamente
const loadPluggySDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window.PluggyConnect !== 'undefined') {
      resolve();
      return;
    }

    const existingScript = document.querySelector('script[src*="pluggy-connect"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.8.2/pluggy-connect.js';
      script.async = true;
      document.head.appendChild(script);
    }

    let attempts = 0;
    const maxAttempts = 50;
    const intervalMs = 100;

    const check = () => {
      attempts++;
      if (typeof window.PluggyConnect !== 'undefined') {
        resolve();
        return;
      }

      if (attempts >= maxAttempts) {
        reject(new Error('SDK do Pluggy não carregou. Por favor, recarregue a página.'));
        return;
      }

      setTimeout(check, intervalMs);
    };

    check();
  });
};

// Componente de ícone flutuante decorativo
const FloatingIcon = ({ icon: Icon, className }: { icon: any; className: string }) => (
  <div className={`absolute opacity-10 ${className}`}>
    <Icon className="w-full h-full text-primary-600" />
  </div>
);

const ConnectBank = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [_banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);

  useEffect(() => {
    loadBanks();
    handleCallback();
  }, []);

  const loadBanks = async () => {
    setLoading(true);
    setBankError(null);
    try {
      const response = await bankApi.getAvailableBanks();
      setBanks(response.data);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || 'Não foi possível carregar a lista de bancos. Por favor, tente novamente.';
      setBankError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const bankName = searchParams.get('bank_name');

    if (code && state && bankName) {
      try {
        await bankApi.handleCallback(code, state, bankName);
        alert('✅ Conta conectada!');
        navigate('/accounts');
      } catch (error) {
        alert('❌ Erro ao conectar.');
      }
    }
  };

  const handleDirectConnect = async () => {
    setConnecting(true);
    sessionStorage.setItem('bank_connection_in_progress', 'true');

    try {
      const response = await bankApi.connectDirect();
      const connectToken = response.data.connect_token;

      if (!connectToken) {
        alert('❌ Erro: Token de conexão não recebido do servidor. Tente novamente.');
        sessionStorage.removeItem('bank_connection_in_progress');
        setConnecting(false);
        return;
      }

      try {
        await loadPluggySDK();
      } catch (sdkError) {
        alert('❌ Não foi possível carregar o SDK do Pluggy. Por favor, recarregue a página e tente novamente.');
        sessionStorage.removeItem('bank_connection_in_progress');
        setConnecting(false);
        return;
      }

      const pluggyConnect = new window.PluggyConnect({
        connectToken: connectToken,
        onSuccess: async (data) => {
          try {
            const itemId = data.item?.id;
            await bankApi.handleCallback(
              itemId || 'pluggy_sdk_' + Date.now(),
              connectToken,
              'Banco'
            );
            alert(`✅ Conta conectada com sucesso!`);
            sessionStorage.removeItem('bank_connection_in_progress');
            navigate('/app/dashboard');
          } catch (error) {
            alert('❌ Erro ao processar conexão bancária.');
            sessionStorage.removeItem('bank_connection_in_progress');
          }
          setConnecting(false);
        },
        onError: (error) => {
          alert(`❌ Erro na conexão: ${error.message || 'Erro desconhecido'}`);
          sessionStorage.removeItem('bank_connection_in_progress');
          setConnecting(false);
        },
        onClose: () => {
          sessionStorage.removeItem('bank_connection_in_progress');
          setConnecting(false);
        }
      });

      pluggyConnect.init();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao conectar banco.';
      alert(`❌ Erro ao conectar banco\n\n${errorMessage}`);
      sessionStorage.removeItem('bank_connection_in_progress');
      setConnecting(false);
    }
  };

  const _handleSelectBank = (bank: Bank) => {
    setSelectedBank(bank);
    setShowConsent(true);
  };

  const handleConnect = async () => {
    if (!selectedBank) return;

    setConnecting(true);
    sessionStorage.setItem('bank_connection_in_progress', 'true');

    try {
      const response = await bankApi.connectBank(selectedBank.id);
      const authUrl = response.data.authorization_url || '';
      const isDemoMode = response.data.demo_mode === true || authUrl.startsWith('demo-mode://');

      if (isDemoMode) {
        const userConfirmed = confirm(
          `🎭 MODO DEMONSTRAÇÃO\n\n` +
          `Você está conectando ao ${selectedBank.name} em modo de demonstração.\n\n` +
          `Serão geradas transações fictícias realistas brasileiras para você explorar o app.\n\n` +
          `Deseja continuar?`
        );

        if (userConfirmed) {
          await bankApi.handleCallback(
            'DEMO_' + Date.now(),
            response.data.state,
            selectedBank.name
          );
          alert(`✅ Conta ${selectedBank.name} conectada! (modo demonstração)`);
          navigate('/app/dashboard');
        } else {
          sessionStorage.removeItem('bank_connection_in_progress');
          setConnecting(false);
        }
      } else {
        const connectToken = response.data.state || response.data.connect_token || response.data.connectToken || response.data.access_token;

        if (!connectToken || connectToken === 'undefined' || connectToken === 'null') {
          alert('❌ Erro: Token de conexão não recebido do servidor. Tente novamente.');
          sessionStorage.removeItem('bank_connection_in_progress');
          setConnecting(false);
          return;
        }

        try {
          await loadPluggySDK();
        } catch (sdkError) {
          alert('❌ Não foi possível carregar o SDK do Pluggy. Por favor, recarregue a página e tente novamente.');
          sessionStorage.removeItem('bank_connection_in_progress');
          setConnecting(false);
          return;
        }

        const pluggyConnect = new window.PluggyConnect({
          connectToken: connectToken,
          onSuccess: async (data) => {
            try {
              const itemId = data.item?.id;
              await bankApi.handleCallback(
                itemId || 'pluggy_sdk_' + Date.now(),
                connectToken,
                selectedBank?.name || 'Banco'
              );
              alert(`✅ Conta ${selectedBank?.name} conectada com sucesso!`);
              sessionStorage.removeItem('bank_connection_in_progress');
              navigate('/app/dashboard');
            } catch (error) {
              alert('❌ Erro ao processar conexão bancária.');
              sessionStorage.removeItem('bank_connection_in_progress');
            }
            setConnecting(false);
          },
          onError: (error) => {
            alert(`❌ Erro na conexão: ${error.message || 'Erro desconhecido'}`);
            sessionStorage.removeItem('bank_connection_in_progress');
            setConnecting(false);
          },
          onClose: () => {
            sessionStorage.removeItem('bank_connection_in_progress');
            setConnecting(false);
          }
        });

        pluggyConnect.init();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || 'Erro ao conectar banco.';
      const errorCode = error.response?.data?.code;

      if (errorCode === 'BANK_CONNECTION_UNAVAILABLE') {
        alert(`⚠️ Serviço Temporariamente Indisponível\n\n${errorMessage}`);
      } else {
        alert(`❌ Erro ao conectar banco\n\n${errorMessage}`);
      }

      sessionStorage.removeItem('bank_connection_in_progress');
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] relative overflow-hidden">
      {/* Background decorativo com ícones flutuantes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <FloatingIcon icon={Landmark} className="w-32 h-32 -top-4 -left-8 rotate-12" />
        <FloatingIcon icon={CreditCard} className="w-24 h-24 top-20 right-10 -rotate-12" />
        <FloatingIcon icon={Wallet} className="w-20 h-20 bottom-40 -left-4 rotate-6" />
        <FloatingIcon icon={PiggyBank} className="w-28 h-28 bottom-20 right-0 -rotate-6" />
        <FloatingIcon icon={Shield} className="w-16 h-16 top-1/3 right-1/4 rotate-12" />
        <FloatingIcon icon={Landmark} className="w-20 h-20 bottom-10 left-1/3 -rotate-12" />

        {/* Círculos decorativos de gradiente */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-primary-200 to-primary-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-green-200 to-emerald-100 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg shadow-primary-200 mb-4">
            <Landmark className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Conectar Banco
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Conecte sua conta bancária de forma segura via Open Finance
          </p>
        </div>

        {/* Card Principal - Conexão */}
        {!showConsent && (
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8">
            {/* Área Principal com Botão */}
            <div className="relative bg-gradient-to-br from-primary-50 via-white to-green-50 p-8 sm:p-12">
              {/* Padrão decorativo de fundo */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />

              <div className="relative text-center">
                {!bankError ? (
                  <>
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-200">
                      <Shield className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
                      Conecte seu banco
                    </h2>
                    <p className="text-gray-600 mb-8 max-w-sm mx-auto leading-relaxed">
                      Com apenas um clique, selecione seu banco e faça login de forma segura através do Open Finance.
                    </p>
                    <button
                      onClick={handleDirectConnect}
                      disabled={connecting}
                      className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 text-white text-lg font-semibold px-10 py-4 rounded-2xl shadow-lg shadow-primary-200 hover:shadow-xl hover:shadow-primary-300 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {connecting ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          <span>Conectando...</span>
                        </>
                      ) : (
                        <>
                          <Landmark className="w-6 h-6" />
                          <span>Conectar Banco</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-20 h-20 text-amber-500 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 text-xl mb-2">
                      Conexão não disponível
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                      Não foi possível carregar os bancos no momento. Por favor, tente novamente.
                    </p>
                    <button
                      onClick={handleDirectConnect}
                      disabled={connecting}
                      className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                    >
                      {connecting ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-5 h-5" />
                          Tentar novamente
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Segurança - Features Grid */}
            <div className="bg-gray-50/50 border-t border-gray-100 px-6 sm:px-8 py-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="flex flex-col items-center text-center p-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-2">
                    <Lock className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Criptografia<br />de ponta a ponta</span>
                </div>
                <div className="flex flex-col items-center text-center p-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Credenciais<br />nunca armazenadas</span>
                </div>
                <div className="flex flex-col items-center text-center p-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-2">
                    <CheckCircle className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Acesso<br />somente leitura</span>
                </div>
                <div className="flex flex-col items-center text-center p-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">Revogue<br />a qualquer momento</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Consent Screen para quando seleciona banco da lista */}
        {showConsent && selectedBank && (
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8 max-w-2xl mx-auto">
            <div className="p-8 text-center">
              <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                {selectedBank.logo?.startsWith('http') || selectedBank.logo?.startsWith('data:') ? (
                  <img
                    src={selectedBank.logo}
                    alt={selectedBank.name}
                    className="w-24 h-24 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = '<span class="text-6xl">🏦</span>';
                    }}
                  />
                ) : (
                  <span className="text-6xl">{selectedBank.logo || '🏦'}</span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Conectar com {selectedBank.name}
              </h2>
              <p className="text-gray-500 mb-6">
                Você está prestes a autorizar o acesso às suas informações bancárias
              </p>

              <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-primary-600" />
                  Permissões solicitadas
                </h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Ver informações da conta</strong>
                      <p className="text-gray-500">Saldo, número da conta</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Ver transações</strong>
                      <p className="text-gray-500">Histórico dos últimos 90 dias</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>Acesso contínuo</strong>
                      <p className="text-gray-500">Válido por 90 dias (renovável)</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConsent(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={connecting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Autorizar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Card - O que é Open Finance */}
        {!showConsent && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  O que é Open Finance?
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Open Finance é um sistema regulamentado pelo Banco Central do Brasil que permite compartilhar seus dados bancários de forma segura com aplicativos autorizados. Todas as conexões são criptografadas e você tem controle total sobre seus dados.
                </p>
              </div>
            </div>
          </div>
        )}

        {/*
        ========================================
        LISTA DE BANCOS - CÓDIGO COMENTADO
        Descomente se quiser mostrar a lista de bancos disponíveis
        ========================================

        {!showConsent && !bankError && banks.length > 0 && (
          <div className="mt-8 space-y-6">
            {(() => {
              const personalBanks = banks.filter(b => b.type === 'PERSONAL_BANK' || !b.type);
              const businessBanks = banks.filter(b => b.type === 'BUSINESS_BANK');
              const investmentBanks = banks.filter(b => b.type === 'INVESTMENT');

              const BankIcon = ({ bank }: { bank: Bank }) => (
                <button
                  key={bank.id}
                  onClick={() => handleSelectBank(bank)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all p-3 flex items-center justify-center aspect-square"
                  title={bank.name}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                    {bank.logo?.startsWith('http') || bank.logo?.startsWith('data:') ? (
                      <img
                        src={bank.logo}
                        alt={bank.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<span class="text-3xl sm:text-4xl">🏦</span>';
                        }}
                      />
                    ) : (
                      <span className="text-3xl sm:text-4xl">{bank.logo || '🏦'}</span>
                    )}
                  </div>
                </button>
              );

              return (
                <>
                  {personalBanks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">👤</span> Pessoa Física
                      </h3>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {personalBanks.map((bank) => (
                          <BankIcon key={bank.id} bank={bank} />
                        ))}
                      </div>
                    </div>
                  )}

                  {businessBanks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">🏢</span> Pessoa Jurídica
                      </h3>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {businessBanks.map((bank) => (
                          <BankIcon key={bank.id} bank={bank} />
                        ))}
                      </div>
                    </div>
                  )}

                  {investmentBanks.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                        <span className="mr-2">📈</span> Investimentos
                      </h3>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                        {investmentBanks.map((bank) => (
                          <BankIcon key={bank.id} bank={bank} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
        */}
      </div>
    </div>
  );
};

export default ConnectBank;
