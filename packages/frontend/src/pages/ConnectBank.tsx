import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Shield, Lock, RefreshCw, Landmark } from 'lucide-react';
import { bankApi } from '../services/api';

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

const ConnectBank = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    handleCallback();
    setLoading(false);
  }, []);

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
            console.log('[ConnectBank] Pluggy onSuccess - itemId:', itemId);

            const response = await bankApi.handleCallback(
              itemId || 'pluggy_sdk_' + Date.now(),
              connectToken,
              'Banco'
            );

            // Mostrar mensagem do backend (inclui dica de sincronizar)
            const message = response.data?.message || 'Conta conectada com sucesso!';
            alert(`✅ ${message}`);
            sessionStorage.removeItem('bank_connection_in_progress');
            navigate('/app/accounts'); // Ir para contas em vez de dashboard
          } catch (error: any) {
            console.error('[ConnectBank] Erro no callback:', error);

            // Tratamento especial para erro 504 (Gateway Timeout)
            if (error.response?.status === 504 || error.code === 'ECONNABORTED') {
              alert(
                '⏳ A conexão demorou mais que o esperado.\n\n' +
                'Isso é normal para alguns bancos.\n\n' +
                'Por favor, vá para a página "Contas" e verifique se sua conta apareceu. ' +
                'Se não aparecer, aguarde alguns segundos e atualize a página.'
              );
              sessionStorage.removeItem('bank_connection_in_progress');
              navigate('/app/accounts');
              setConnecting(false);
              return;
            }

            const errorMessage = error.response?.data?.error
              || error.response?.data?.message
              || error.message
              || 'Erro ao processar conexão bancária.';
            alert(`❌ Erro ao conectar banco:\n\n${errorMessage}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] relative overflow-hidden">
      {/* Background decorativo sutil */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Card Principal - Conexão */}
        <div className="rounded-3xl shadow-2xl overflow-hidden mb-6">
            {/* Área Principal com Botão - Gradiente escuro elegante */}
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-primary-900 p-8 sm:p-10">
              {/* Padrão decorativo de fundo */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />

              <div className="relative text-center">
                {/* Imagem hero com banco e logos */}
                <div className="mb-5">
                  <img
                    src="/bancos_arq.png"
                    alt="Banco com logos dos principais bancos brasileiros"
                    className="w-40 sm:w-48 md:w-56 h-auto mx-auto drop-shadow-2xl"
                  />
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Conectar Banco
                </h2>
                <p className="text-slate-300 mb-6 max-w-sm mx-auto leading-relaxed text-sm sm:text-base">
                  Importe suas transações automaticamente via Open Finance do Banco Central.
                </p>
                <button
                  onClick={handleDirectConnect}
                  disabled={connecting}
                  className="inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-primary-700 text-lg font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
              </div>
            </div>

            {/* Segurança - Features Grid */}
            <div className="bg-slate-50 px-4 sm:px-6 py-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="flex flex-col items-center text-center p-2">
                  <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center mb-2 shadow-md">
                    <Lock className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium leading-tight">Criptografia<br />de ponta a ponta</span>
                </div>
                <div className="flex flex-col items-center text-center p-2">
                  <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center mb-2 shadow-md">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium leading-tight">Credenciais<br />nunca armazenadas</span>
                </div>
                <div className="flex flex-col items-center text-center p-2">
                  <div className="w-9 h-9 bg-purple-500 rounded-xl flex items-center justify-center mb-2 shadow-md">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium leading-tight">Acesso<br />somente leitura</span>
                </div>
                <div className="flex flex-col items-center text-center p-2">
                  <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center mb-2 shadow-md">
                    <RefreshCw className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-slate-600 font-medium leading-tight">Revogue<br />a qualquer momento</span>
                </div>
              </div>
            </div>
          </div>

        {/* Info Card - O que é Open Finance */}
        <div className="bg-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">
                  O que é Open Finance?
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Open Finance é um sistema regulamentado pelo Banco Central do Brasil que permite compartilhar seus dados bancários de forma segura com aplicativos autorizados. Todas as conexões são criptografadas e você tem controle total sobre seus dados.
                </p>
              </div>
            </div>
          </div>

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
