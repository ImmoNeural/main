import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Shield, Lock, RefreshCw } from 'lucide-react';
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

const ConnectBank = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    loadBanks();
    handleCallback();
  }, []);

  const loadBanks = async () => {
    setLoading(true);
    try {
      const response = await bankApi.getAvailableBanks();
      setBanks(response.data);
    } catch (error) {
      console.error('Error loading banks:', error);
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
        console.error('Error handling callback:', error);
        alert('❌ Erro ao conectar.');
      }
    }
  };

  const handleSelectBank = (bank: Bank) => {
    setSelectedBank(bank);
    setShowConsent(true);
  };

  const handleConnect = async () => {
    if (!selectedBank) return;

    setConnecting(true);

    // Marcar início de conexão bancária para evitar logout automático
    sessionStorage.setItem('bank_connection_in_progress', 'true');
    console.log('🔒 Proteção contra logout ativada durante conexão bancária');

    try {
      const response = await bankApi.connectBank(selectedBank.id);

      console.log('🔗 Connect response:', response.data);
      console.log('🔗 Authorization URL:', response.data.authorization_url);

      // Verificar se estamos em modo demo
      const authUrl = response.data.authorization_url || '';
      const isDemoMode = response.data.demo_mode === true || authUrl.startsWith('demo-mode://');

      console.log('🔍 Is Demo Mode?', isDemoMode);

      if (isDemoMode) {
        // Modo de demonstração - simular conexão bancária
        console.log('🎭 DEMO MODE activated for', selectedBank.name);

        const userConfirmed = confirm(
          `🎭 MODO DEMONSTRAÇÃO\n\n` +
          `Você está conectando ao ${selectedBank.name} em modo de demonstração.\n\n` +
          `Serão geradas transações fictícias realistas brasileiras para você explorar o app.\n\n` +
          `Deseja continuar?`
        );

        if (userConfirmed) {
          // Simular callback bem-sucedido com dados demo
          await bankApi.handleCallback(
            'DEMO_' + Date.now(),
            response.data.state,
            selectedBank.name
          );
          alert(`✅ Conta ${selectedBank.name} conectada! (modo demonstração)`);

          // Navegar para dashboard - a flag será removida no componente Dashboard.tsx
          console.log('➡️ Navegando para /app/dashboard (proteção ainda ativa)');
          navigate('/app/dashboard');
        } else {
          sessionStorage.removeItem('bank_connection_in_progress');
          setConnecting(false);
        }
      } else {
        // Modo de produção - Usar Pluggy Connect SDK v2 (embed)
        console.log('✅ Opening Pluggy Connect via SDK v2');
        console.log('📦 Full response.data:', JSON.stringify(response.data, null, 2));

        // Extrair o connect token
        const connectToken = response.data.state || response.data.connect_token || response.data.connectToken || response.data.access_token;

        console.log('🔑 Connect Token:', connectToken);
        console.log('🔑 Connect Token type:', typeof connectToken);
        console.log('🔑 Connect Token length:', connectToken?.length);

        // Validar que temos um token válido
        if (!connectToken || connectToken === 'undefined' || connectToken === 'null') {
          console.error('❌ Connect token is missing or invalid!');
          console.error('   response.data:', response.data);
          alert('❌ Erro: Token de conexão não recebido do servidor. Tente novamente.');
          sessionStorage.removeItem('bank_connection_in_progress');
          setConnecting(false);
          return;
        }

        // Verificar se o SDK do Pluggy está disponível
        if (typeof window.PluggyConnect === 'undefined') {
          console.error('❌ Pluggy Connect SDK not loaded!');
          alert('❌ Erro: SDK do Pluggy não carregado. Recarregue a página e tente novamente.');
          sessionStorage.removeItem('bank_connection_in_progress');
          setConnecting(false);
          return;
        }

        // Usar Pluggy Connect SDK v2 (embed) - mais confiável que URL redirect
        console.log('🚀 Initializing Pluggy Connect SDK v2...');

        const pluggyConnect = new window.PluggyConnect({
          connectToken: connectToken,
          includeSandbox: true,
          onSuccess: async (data) => {
            console.log('✅ Pluggy Connect success:', data);
            try {
              // O itemId é retornado diretamente pelo SDK
              const itemId = data.item?.id;
              console.log('📦 Item ID:', itemId);

              // Chamar o callback com o itemId
              await bankApi.handleCallback(
                itemId || 'pluggy_sdk_' + Date.now(),
                connectToken,
                selectedBank?.name || 'Banco'
              );

              alert(`✅ Conta ${selectedBank?.name} conectada com sucesso!`);
              sessionStorage.removeItem('bank_connection_in_progress');
              navigate('/app/dashboard');
            } catch (error) {
              console.error('❌ Error processing Pluggy success:', error);
              alert('❌ Erro ao processar conexão bancária.');
              sessionStorage.removeItem('bank_connection_in_progress');
            }
            setConnecting(false);
          },
          onError: (error) => {
            console.error('❌ Pluggy Connect error:', error);
            alert(`❌ Erro na conexão: ${error.message || 'Erro desconhecido'}`);
            sessionStorage.removeItem('bank_connection_in_progress');
            setConnecting(false);
          },
          onClose: () => {
            console.log('🔒 Pluggy Connect closed by user');
            sessionStorage.removeItem('bank_connection_in_progress');
            setConnecting(false);
          },
          onEvent: (event) => {
            console.log('📡 Pluggy Connect event:', event);
          }
        });

        pluggyConnect.init();
      }
    } catch (error) {
      console.error('❌ Error connecting bank:', error);
      alert('❌ Erro ao conectar banco.');
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
    <div className="max-w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900">Conectar Banco</h1>
        <p className="text-gray-500 mt-1">
          Selecione seu banco para conectar via Open Banking (PSD2)
        </p>
      </div>

      {/* Security Info */}
      <div className="card bg-green-50 border border-green-200">
        <div className="flex items-start space-x-3">
          <Shield className="w-6 h-6 text-green-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900 mb-2">
              Conexão segura via Open Banking
            </h3>
            <ul className="space-y-1 text-sm text-green-800">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Seus dados são protegidos por criptografia de ponta a ponta</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Nunca armazenamos suas credenciais bancárias</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Você pode revogar o acesso a qualquer momento</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Acesso somente leitura - não podemos fazer transações</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Banks Grid */}
      {!showConsent && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {banks.map((bank) => (
            <button
              key={bank.id}
              onClick={() => handleSelectBank(bank)}
              className="card hover:shadow-lg transition-shadow text-left p-6"
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
                  {bank.logo?.startsWith('http') || bank.logo?.startsWith('data:') ? (
                    <img
                      src={bank.logo}
                      alt={bank.name}
                      className="w-16 h-16 object-contain"
                      onError={(e) => {
                        // Fallback para emoji se a imagem falhar
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<span class="text-5xl">🏦</span>';
                      }}
                    />
                  ) : (
                    <span className="text-5xl">{bank.logo || '🏦'}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{bank.name}</h3>
                  <p className="text-sm text-gray-500">{bank.country}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Consent Screen */}
      {showConsent && selectedBank && (
        <div className="card max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
              {selectedBank.logo?.startsWith('http') || selectedBank.logo?.startsWith('data:') ? (
                <img
                  src={selectedBank.logo}
                  alt={selectedBank.name}
                  className="w-32 h-32 object-contain"
                  onError={(e) => {
                    // Fallback para emoji se a imagem falhar
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<span class="text-7xl">🏦</span>';
                  }}
                />
              ) : (
                <span className="text-7xl">{selectedBank.logo || '🏦'}</span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Conectar com {selectedBank.name}
            </h2>
            <p className="text-gray-500">
              Você está prestes a autorizar o acesso às suas informações bancárias
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Permissões solicitadas
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <strong>Ver informações da conta</strong>
                  <p className="text-gray-500">Saldo, número da conta, IBAN</p>
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <strong>Ver transações</strong>
                  <p className="text-gray-500">Histórico de transações dos últimos 90 dias</p>
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <strong>Acesso contínuo</strong>
                  <p className="text-gray-500">Válido por 90 dias (renovável)</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Importante:</strong> Você será redirecionado para o site do {selectedBank.name}
              para fazer login de forma segura. Nunca compartilhamos suas credenciais bancárias
              com terceiros.
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => setShowConsent(false)}
              className="flex-1 btn-secondary"
              disabled={connecting}
            >
              Cancelar
            </button>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex-1 btn-primary flex items-center justify-center space-x-2"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Autorizar e Conectar</span>
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Ao conectar, você concorda com nossos{' '}
            <a href="#" className="text-primary-600 hover:underline">
              Termos de Serviço
            </a>{' '}
            e{' '}
            <a href="#" className="text-primary-600 hover:underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      )}

      {/* Footer Info */}
      {!showConsent && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">
            O que é Open Banking?
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Open Banking (PSD2) é uma regulamentação europeia que permite que você
            compartilhe seus dados bancários de forma segura com aplicativos de terceiros
            autorizados. Isso é feito através de APIs padronizadas e seguras fornecidas
            pelos bancos.
          </p>
          <p className="text-sm text-gray-600">
            Sua segurança é nossa prioridade. Todas as conexões são criptografadas e
            regulamentadas por autoridades financeiras. Você tem controle total sobre
            seus dados e pode revogar o acesso a qualquer momento.
          </p>
        </div>
      )}
      </div>
    </div>
  );
};

export default ConnectBank;
