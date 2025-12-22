import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';

const TermsOfService = () => {
  return (
    <>
      <SEO
        title="Termos de Serviço | Guru do Dindin"
        description="Termos de Serviço do Guru do Dindin. Conheça as condições de uso da nossa plataforma de gestão financeira."
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
            <h1 className="text-xl font-bold text-white">Termos de Serviço</h1>
            <p className="text-white/70 text-xs mt-1">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Card de conteúdo */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="space-y-6 text-gray-700 text-sm leading-relaxed">

              <p>
                Bem-vindo ao <strong>Guru do Dindin</strong>. Ao usar nossa plataforma, você concorda com estes termos. Leia atentamente.
              </p>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">1. Aceitação dos Termos</h2>
                <p className="text-gray-600">
                  Ao acessar ou usar o Guru do Dindin, você concorda em cumprir estes Termos de Serviço e nossa Política de Privacidade. Se não concordar, não utilize nossos serviços.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">2. Descrição do Serviço</h2>
                <p className="text-gray-600">
                  O Guru do Dindin é uma plataforma de gestão financeira pessoal que permite:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs mt-2">
                  <li>Conectar contas bancárias via Open Finance</li>
                  <li>Importar transações manualmente ou por CSV</li>
                  <li>Categorizar e analisar gastos</li>
                  <li>Criar orçamentos e metas financeiras</li>
                  <li>Visualizar relatórios e dashboards</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">3. Cadastro e Conta</h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Você deve ter pelo menos 18 anos para usar o serviço</li>
                  <li>As informações de cadastro devem ser verdadeiras</li>
                  <li>Você é responsável por manter sua senha segura</li>
                  <li>Notifique-nos imediatamente sobre uso não autorizado</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">4. Uso Aceitável</h2>
                <p className="text-gray-600 mb-2">Você concorda em NÃO:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Violar leis ou regulamentos aplicáveis</li>
                  <li>Tentar acessar contas de outros usuários</li>
                  <li>Usar o serviço para atividades fraudulentas</li>
                  <li>Interferir no funcionamento da plataforma</li>
                  <li>Compartilhar credenciais de acesso</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">5. Planos e Pagamentos</h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Oferecemos planos gratuitos e pagos</li>
                  <li>Novos usuários recebem 7 dias de trial</li>
                  <li>Pagamentos são processados de forma segura</li>
                  <li>Cancelamentos podem ser feitos a qualquer momento</li>
                  <li>Não há reembolso para períodos parciais</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">6. Open Finance</h2>
                <p className="text-gray-600">
                  A conexão bancária é feita via Open Finance, regulamentado pelo Banco Central do Brasil. Ao conectar sua conta, você autoriza o acesso às suas informações financeiras conforme as permissões solicitadas.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">7. Propriedade Intelectual</h2>
                <p className="text-gray-600">
                  Todo o conteúdo, design, código e marca do Guru do Dindin são de nossa propriedade. Você não pode copiar, modificar ou distribuir sem autorização.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">8. Limitação de Responsabilidade</h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>O serviço é fornecido "como está"</li>
                  <li>Não garantimos disponibilidade ininterrupta</li>
                  <li>Não somos responsáveis por decisões financeiras baseadas nos dados</li>
                  <li>Não nos responsabilizamos por perdas decorrentes do uso</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">9. Encerramento</h2>
                <p className="text-gray-600">
                  Podemos suspender ou encerrar sua conta por violação destes termos. Você pode encerrar sua conta a qualquer momento nas configurações.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">10. Alterações</h2>
                <p className="text-gray-600">
                  Podemos atualizar estes termos periodicamente. Alterações significativas serão comunicadas por e-mail ou na plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">11. Contato</h2>
                <p className="text-gray-600">
                  Dúvidas? Entre em contato: <strong>contato@gurudodindin.com.br</strong>
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">12. Foro</h2>
                <p className="text-gray-600">
                  Estes termos são regidos pelas leis brasileiras. O foro da comarca de São Paulo/SP é eleito para resolver quaisquer disputas.
                </p>
              </section>

              <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                Ao usar o Guru do Dindin, você concorda com estes termos.
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

export default TermsOfService;
