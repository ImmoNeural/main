import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, Users } from 'lucide-react';
import SEO from '../components/SEO';

const PrivacyPolicy = () => {
  return (
    <>
      <SEO
        title="Política de Privacidade | Guru do Dindin"
        description="Política de Privacidade do Guru do Dindin. Saiba como coletamos, usamos e protegemos seus dados pessoais."
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
        {/* Header */}
        <header className="bg-blue-900/50 backdrop-blur-sm border-b border-blue-700/50">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-blue-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Voltar ao início</span>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-blue-700/30">
            {/* Title */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Política de Privacidade
              </h1>
              <p className="text-blue-200">
                Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-10 text-blue-100">
              {/* Introdução */}
              <section>
                <p className="text-lg leading-relaxed">
                  O <strong className="text-white">Guru do Dindin</strong> ("nós", "nosso" ou "Plataforma") está comprometido em proteger a privacidade dos nossos usuários. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nossos serviços de gestão financeira pessoal.
                </p>
              </section>

              {/* 1. Dados Coletados */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Database className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">1. Dados que Coletamos</h2>
                </div>
                <div className="space-y-4 pl-9">
                  <div>
                    <h3 className="font-medium text-white mb-2">1.1 Dados de Cadastro</h3>
                    <ul className="list-disc list-inside space-y-1 text-blue-200">
                      <li>Nome completo</li>
                      <li>Endereço de e-mail</li>
                      <li>Senha (armazenada de forma criptografada)</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-2">1.2 Dados Financeiros</h3>
                    <ul className="list-disc list-inside space-y-1 text-blue-200">
                      <li>Transações bancárias (quando conectadas via Open Finance)</li>
                      <li>Saldos de contas e cartões</li>
                      <li>Categorias de gastos</li>
                      <li>Metas e orçamentos definidos por você</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-white mb-2">1.3 Dados de Uso</h3>
                    <ul className="list-disc list-inside space-y-1 text-blue-200">
                      <li>Informações sobre como você utiliza a plataforma</li>
                      <li>Dispositivo e navegador utilizados</li>
                      <li>Endereço IP e localização aproximada</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* 2. Como Usamos */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Eye className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">2. Como Usamos seus Dados</h2>
                </div>
                <ul className="list-disc list-inside space-y-2 pl-9 text-blue-200">
                  <li>Fornecer e melhorar nossos serviços de gestão financeira</li>
                  <li>Categorizar automaticamente suas transações</li>
                  <li>Gerar relatórios e insights sobre seus gastos</li>
                  <li>Enviar notificações sobre sua situação financeira</li>
                  <li>Comunicar atualizações importantes sobre a plataforma</li>
                  <li>Garantir a segurança da sua conta</li>
                  <li>Cumprir obrigações legais e regulatórias</li>
                </ul>
              </section>

              {/* 3. Compartilhamento */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">3. Compartilhamento de Dados</h2>
                </div>
                <div className="pl-9 space-y-4">
                  <p>
                    <strong className="text-white">Não vendemos seus dados pessoais.</strong> Seus dados podem ser compartilhados apenas nas seguintes situações:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-blue-200">
                    <li><strong className="text-white">Provedores de serviço:</strong> Utilizamos serviços de terceiros (como Supabase para banco de dados e Pluggy para Open Finance) que processam dados em nosso nome, seguindo rigorosos padrões de segurança.</li>
                    <li><strong className="text-white">Obrigações legais:</strong> Quando exigido por lei, ordem judicial ou autoridade governamental.</li>
                    <li><strong className="text-white">Proteção de direitos:</strong> Para proteger nossos direitos, privacidade, segurança ou propriedade.</li>
                  </ul>
                </div>
              </section>

              {/* 4. Segurança */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">4. Segurança dos Dados</h2>
                </div>
                <div className="pl-9 space-y-4">
                  <p>Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados:</p>
                  <ul className="list-disc list-inside space-y-2 text-blue-200">
                    <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
                    <li>Criptografia de senhas com algoritmos seguros</li>
                    <li>Autenticação segura via Supabase Auth</li>
                    <li>Conexões bancárias via Open Finance com padrões regulamentados pelo Banco Central</li>
                    <li>Monitoramento contínuo de segurança</li>
                    <li>Acesso restrito aos dados por nossa equipe</li>
                  </ul>
                </div>
              </section>

              {/* 5. Seus Direitos */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">5. Seus Direitos (LGPD)</h2>
                </div>
                <div className="pl-9 space-y-4">
                  <p>De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>
                  <ul className="list-disc list-inside space-y-2 text-blue-200">
                    <li>Confirmar a existência de tratamento de seus dados</li>
                    <li>Acessar seus dados pessoais</li>
                    <li>Corrigir dados incompletos ou desatualizados</li>
                    <li>Solicitar a exclusão de seus dados</li>
                    <li>Revogar o consentimento a qualquer momento</li>
                    <li>Solicitar a portabilidade dos dados</li>
                    <li>Obter informações sobre compartilhamento de dados</li>
                  </ul>
                  <p className="mt-4">
                    Para exercer seus direitos, entre em contato conosco através do e-mail indicado abaixo.
                  </p>
                </div>
              </section>

              {/* 6. Cookies */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">6. Cookies e Tecnologias Similares</h2>
                <div className="pl-0 space-y-4">
                  <p>Utilizamos cookies e tecnologias similares para:</p>
                  <ul className="list-disc list-inside space-y-2 text-blue-200">
                    <li>Manter você conectado à sua conta</li>
                    <li>Lembrar suas preferências</li>
                    <li>Analisar o uso da plataforma (via Google Analytics)</li>
                    <li>Melhorar a experiência do usuário</li>
                  </ul>
                  <p>Você pode configurar seu navegador para recusar cookies, mas isso pode afetar algumas funcionalidades da plataforma.</p>
                </div>
              </section>

              {/* 7. Retenção */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">7. Retenção de Dados</h2>
                <p>
                  Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer nossos serviços. Após a exclusão da conta, seus dados serão removidos em até 30 dias, exceto quando a retenção for necessária para cumprir obrigações legais.
                </p>
              </section>

              {/* 8. Menores */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">8. Menores de Idade</h2>
                <p>
                  Nossos serviços não são destinados a menores de 18 anos. Não coletamos intencionalmente dados de menores. Se tomarmos conhecimento de que coletamos dados de um menor, tomaremos medidas para excluí-los.
                </p>
              </section>

              {/* 9. Alterações */}
              <section>
                <h2 className="text-xl font-semibold text-white mb-4">9. Alterações nesta Política</h2>
                <p>
                  Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações significativas por e-mail ou através de um aviso em nossa plataforma. Recomendamos revisar esta página regularmente.
                </p>
              </section>

              {/* 10. Contato */}
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-6 h-6 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">10. Contato</h2>
                </div>
                <div className="pl-9">
                  <p className="mb-4">
                    Se você tiver dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus dados pessoais, entre em contato conosco:
                  </p>
                  <div className="bg-blue-800/50 rounded-lg p-4 space-y-2">
                    <p><strong className="text-white">E-mail:</strong> contato@gurudodindin.com.br</p>
                    <p><strong className="text-white">Site:</strong> www.gurudodindin.com.br</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-blue-700/30 text-center">
              <p className="text-blue-300 text-sm">
                Ao utilizar o Guru do Dindin, você concorda com esta Política de Privacidade.
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao início
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default PrivacyPolicy;
