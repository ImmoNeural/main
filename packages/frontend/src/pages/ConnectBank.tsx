import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Shield, Lock, RefreshCw } from 'lucide-react';
import { bankApi } from '../services/api';
import type { Bank } from '../types';

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
        await bankApi.handleCallback(code, state, bankName, 'demo_user');
        alert('Conta conectada com sucesso!');
        navigate('/accounts');
      } catch (error) {
        console.error('Error handling callback:', error);
        alert('Erro ao conectar conta bancária');
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
    try {
      const response = await bankApi.connectBank(selectedBank.id, 'demo_user');

      console.log('🔗 Connect response:', response.data);
      console.log('🔗 Authorization URL:', response.data.authorization_url);

      // Verificar se estamos em modo mock (desenvolvimento)
      const authUrl = response.data.authorization_url || '';
      const isMockMode = authUrl.includes('mock-bank-auth') || authUrl.includes('localhost:3001/mock');

      console.log('🔍 Is Mock Mode?', isMockMode);

      if (isMockMode) {
        // Modo de desenvolvimento - simular conexão
        const mockCallback = confirm(
          `Você será redirecionado para ${selectedBank.name} para autorizar o acesso.\n\n` +
          `Este é um ambiente de demonstração (modo mock). Deseja simular a conexão bem-sucedida?`
        );

        if (mockCallback) {
          // Simular callback bem-sucedido
          await bankApi.handleCallback(
            'mock_code_' + Date.now(),
            response.data.state,
            selectedBank.name,
            'demo_user'
          );
          alert('Conta conectada com sucesso!');
          navigate('/accounts');
        }
      } else {
        // Modo de produção - Integrar com Pluggy Connect Widget
        console.log('✅ Opening Pluggy Connect Widget');

        // Extrair o connect token da URL ou do response
        const connectToken = response.data.state; // O backend retorna o token no state

        console.log('🔑 Connect Token:', connectToken);

        // Verificar se o SDK do Pluggy está disponível
        if (typeof (window as any).PluggyConnect !== 'undefined') {
          // Usar 'new' para instanciar corretamente (sintaxe oficial da documentação)
          const pluggyConnect = new (window as any).PluggyConnect({
            connectToken: connectToken,
            includeSandbox: true,
            onSuccess: async (itemData: any) => {
              console.log('✅ Pluggy Connect Success!', itemData);

              // Processar o callback com o itemId retornado
              try {
                await bankApi.handleCallback(
                  itemData.item.id,
                  connectToken,
                  selectedBank.name,
                  'demo_user'
                );
                alert('Conta conectada com sucesso!');
                navigate('/accounts');
              } catch (error) {
                console.error('❌ Error handling callback:', error);
                alert('Erro ao processar conexão com banco.');
              }
            },
            onError: (error: any) => {
              console.error('❌ Pluggy Connect Error:', error);
              alert('Erro ao conectar com banco: ' + (error.message || 'Erro desconhecido'));
              setConnecting(false);
            },
            onClose: () => {
              console.log('ℹ️ Pluggy Connect closed by user');
              setConnecting(false);
            },
          });

          // Abrir o widget
          pluggyConnect.init();
        } else {
          // Fallback: redirecionar via URL (método antigo)
          console.warn('⚠️ Pluggy SDK not loaded, using redirect fallback');
          window.location.href = authUrl;
        }
      }
    } catch (error) {
      console.error('❌ Error connecting bank:', error);
      alert('Erro ao conectar banco. Verifique as credenciais do provedor Open Banking.');
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Conectar Banco</h1>
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
                <div className="w-12 h-12 flex items-center justify-center">
                  {bank.logo?.startsWith('http') ? (
                    <img
                      src={bank.logo}
                      alt={bank.name}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        // Fallback para emoji se a imagem falhar
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '🏦';
                      }}
                    />
                  ) : (
                    <span className="text-4xl">{bank.logo || '🏦'}</span>
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
            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              {selectedBank.logo?.startsWith('http') ? (
                <img
                  src={selectedBank.logo}
                  alt={selectedBank.name}
                  className="w-24 h-24 object-contain"
                  onError={(e) => {
                    // Fallback para emoji se a imagem falhar
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
  );
};

export default ConnectBank;
