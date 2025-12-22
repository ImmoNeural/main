import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

const PrivacyPolicy = () => {
  return (
    <>
      <SEO
        title="Política de Privacidade | Guru do Dindin"
        description="Política de Privacidade do Guru do Dindin. Saiba como coletamos, usamos e protegemos seus dados pessoais."
      />

      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-primary-600 px-4 py-8">
        {/* Background decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-2xl mx-auto">
          {/* Header com Logo */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-block">
              <img
                src="/logo.png"
                alt="Guru do Dindin"
                className="w-16 h-16 object-contain mx-auto mb-2"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </Link>
            <h1 className="text-xl font-bold text-white">Política de Privacidade</h1>
            <p className="text-white/70 text-xs mt-1">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Card de conteúdo */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="space-y-6 text-gray-700 text-sm leading-relaxed">

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-700 text-xs">
                  <strong>Controlador dos dados:</strong>
                </p>
                <p className="text-gray-900 font-medium text-xs mt-1">
                  MY CLEVER BOT TECNOLOGIA EM INTELIGENCIA ARTIFICIAL LTDA
                </p>
                <p className="text-gray-600 text-xs">
                  CNPJ: 62.050.286/0001-77
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  E-mail: contato@gurudodindin.com.br
                </p>
              </div>

              <p>
                O <strong>Guru do Dindin</strong> está comprometido em proteger sua privacidade. Esta política explica como coletamos, usamos e protegemos suas informações, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">1. Dados Coletados</h2>
                <p className="mb-2"><strong>Cadastro:</strong> Nome, e-mail e senha (criptografada).</p>
                <p className="mb-2"><strong>Financeiros:</strong> Transações via Open Finance, saldos, categorias e metas.</p>
                <p><strong>Uso:</strong> Informações do dispositivo, navegador e interações.</p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">2. Como Usamos</h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Fornecer serviços de gestão financeira</li>
                  <li>Categorizar transações automaticamente</li>
                  <li>Gerar relatórios e insights</li>
                  <li>Enviar notificações importantes</li>
                  <li>Garantir segurança da conta</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">3. Compartilhamento</h2>
                <p>
                  <strong>Não vendemos seus dados.</strong> Compartilhamos apenas com provedores de serviço (Supabase, Pluggy) que seguem padrões rigorosos de segurança, ou quando exigido por lei.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">4. Segurança</h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Criptografia HTTPS/TLS</li>
                  <li>Senhas criptografadas</li>
                  <li>Open Finance regulamentado pelo Banco Central</li>
                  <li>Monitoramento contínuo</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">5. Seus Direitos (LGPD)</h2>
                <p className="text-gray-600 mb-2">
                  Conforme a LGPD, você tem direito a:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Acessar seus dados pessoais</li>
                  <li>Corrigir dados incompletos ou desatualizados</li>
                  <li>Solicitar a exclusão dos seus dados</li>
                  <li>Revogar consentimento a qualquer momento</li>
                  <li>Solicitar portabilidade dos dados</li>
                </ul>
                <p className="text-gray-600 mt-2 text-xs">
                  Para exercer seus direitos ou solicitar a exclusão de dados, acesse nossa{' '}
                  <Link to="/exclusao-dados" className="text-primary-600 font-medium hover:underline">
                    página de exclusão de dados
                  </Link>
                  {' '}ou entre em contato pelo e-mail abaixo.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">6. Cookies</h2>
                <p className="text-gray-600">
                  Usamos cookies para manter sua sessão, lembrar preferências e analisar uso via Google Analytics.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">7. Retenção</h2>
                <p className="text-gray-600">
                  Dados são mantidos enquanto sua conta estiver ativa. Após exclusão, são removidos em até 30 dias.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">8. Contato</h2>
                <p className="text-gray-600">
                  Dúvidas? Entre em contato: <strong>contato@gurudodindin.com.br</strong>
                </p>
              </section>

              <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                Ao usar o Guru do Dindin, você concorda com esta política.
              </div>
            </div>

            {/* Botão voltar */}
            <div className="mt-6 text-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicy;
