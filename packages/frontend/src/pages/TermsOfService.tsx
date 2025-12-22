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

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-gray-700 text-xs">
                  <strong>Guru do Dindin</strong> é uma plataforma de propriedade exclusiva de:
                </p>
                <p className="text-gray-900 font-medium text-xs mt-1">
                  MY CLEVER BOT TECNOLOGIA EM INTELIGENCIA ARTIFICIAL LTDA
                </p>
                <p className="text-gray-600 text-xs">
                  CNPJ: 62.050.286/0001-77
                </p>
              </div>

              <p>
                Bem-vindo ao <strong>Guru do Dindin</strong>. Ao usar nossa plataforma, você concorda com estes termos. Leia atentamente.
              </p>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">1. Aceitação dos Termos</h2>
                <p className="text-gray-600 mb-2">
                  Ao acessar ou usar o Guru do Dindin, você concorda em cumprir estes Termos de Serviço e nossa Política de Privacidade. Se não concordar, não utilize nossos serviços.
                </p>
                <p className="text-gray-600">
                  Estes Termos possuem natureza jurídica de <strong>contrato de adesão</strong>, nos termos do artigo 54 do Código de Defesa do Consumidor, responsabilizando-se o usuário integralmente por todos e quaisquer atos praticados na plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">2. Descrição do Serviço</h2>
                <p className="text-gray-600 mb-2">
                  O Guru do Dindin é uma plataforma de gestão financeira pessoal que permite:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs mt-2">
                  <li>Conectar contas bancárias via Open Finance (regulamentado pelo Banco Central do Brasil)</li>
                  <li>Importar transações manualmente ou por arquivo CSV/OFX</li>
                  <li>Categorizar e analisar gastos automaticamente com inteligência artificial</li>
                  <li>Criar orçamentos e metas financeiras personalizadas</li>
                  <li>Visualizar relatórios, dashboards e evolução patrimonial</li>
                  <li>Receber insights e alertas sobre suas finanças</li>
                </ul>
                <p className="text-gray-600 mt-2 text-xs">
                  <strong>Importante:</strong> O Guru do Dindin é uma ferramenta de organização e visualização financeira. Não somos uma instituição financeira, não oferecemos crédito, investimentos ou qualquer serviço financeiro regulamentado.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">3. Cadastro e Conta</h2>
                <p className="text-gray-600 mb-2">Ao criar sua conta no Guru do Dindin, você declara e concorda que:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Você deve ter pelo menos 18 anos para usar o serviço</li>
                  <li>As informações de cadastro devem ser verdadeiras e atualizadas</li>
                  <li>Você é o único responsável por manter sua senha segura e confidencial</li>
                  <li>A senha é pessoal e intransferível, não sendo permitido seu compartilhamento</li>
                  <li>Notifique-nos imediatamente sobre uso não autorizado da sua conta</li>
                  <li>Não é permitida a cessão, venda ou transferência da conta para terceiros</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">4. Responsabilidades do Usuário</h2>
                <p className="text-gray-600 mb-2">O usuário se compromete a:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Fornecer somente seus próprios dados pessoais, e não os de terceiros</li>
                  <li>Responsabilizar-se pela precisão e veracidade dos dados informados</li>
                  <li>Não violar leis ou regulamentos aplicáveis</li>
                  <li>Não tentar acessar contas de outros usuários</li>
                  <li>Não usar o serviço para atividades fraudulentas ou ilícitas</li>
                  <li>Não interferir no funcionamento da plataforma</li>
                  <li>Não realizar engenharia reversa, descompilar ou modificar o software</li>
                  <li>Não utilizar robôs, scrapers ou métodos automatizados de acesso</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">5. Planos e Pagamentos</h2>
                <p className="text-gray-600 mb-2">Em relação aos planos e pagamentos, aplicam-se as seguintes condições:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Novos usuários recebem 7 dias de trial gratuito do plano Premium</li>
                  <li>Pagamentos são processados de forma segura via gateway de pagamento</li>
                  <li>A cobrança é recorrente (mensal ou anual) conforme o plano escolhido</li>
                  <li>Cancelamentos podem ser feitos a qualquer momento nas configurações</li>
                  <li>Após o cancelamento, você mantém acesso até o fim do período pago</li>
                  <li>Não há reembolso proporcional para períodos parciais não utilizados</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">6. Open Finance e Dados Bancários</h2>
                <p className="text-gray-600 mb-2">
                  A conexão bancária é realizada através do Open Finance, sistema regulamentado pelo Banco Central do Brasil (Resolução BCB nº 32/2020).
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Ao conectar sua conta, você autoriza o acesso às informações financeiras conforme as permissões solicitadas</li>
                  <li>Os dados são transmitidos de forma criptografada e segura</li>
                  <li>Você pode revogar o acesso a qualquer momento diretamente no app do seu banco</li>
                  <li>Não armazenamos suas credenciais bancárias (login e senha do banco)</li>
                  <li>O consentimento para acesso aos dados tem validade de 12 meses, podendo ser renovado</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">7. Propriedade Intelectual</h2>
                <p className="text-gray-600 mb-2">
                  Todo o conteúdo, design, código-fonte, marca, logotipo e demais elementos visuais do Guru do Dindin são de nossa propriedade exclusiva, protegidos pelas leis brasileiras:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Lei nº 9.609/1998 (Proteção de Software)</li>
                  <li>Lei nº 9.610/1998 (Direitos Autorais)</li>
                  <li>Lei nº 9.279/1996 (Propriedade Industrial)</li>
                </ul>
                <p className="text-gray-600 mt-2 text-xs">
                  É proibida a reprodução, cópia, distribuição ou modificação de qualquer conteúdo sem autorização prévia por escrito.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">8. Limitação de Responsabilidade</h2>
                <p className="text-gray-600 mb-2">O Guru do Dindin:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>É fornecido "como está" e "conforme disponibilidade"</li>
                  <li>Não garante disponibilidade ininterrupta ou livre de erros</li>
                  <li><strong>Não é responsável por decisões financeiras</strong> baseadas nos dados, relatórios ou insights fornecidos</li>
                  <li>Não se responsabiliza por perdas, danos ou prejuízos decorrentes do uso da plataforma</li>
                  <li>Não é responsável por falhas de conexão, indisponibilidade de bancos ou problemas de rede</li>
                  <li>Não garante a precisão dos dados importados via Open Finance ou arquivos</li>
                </ul>
                <p className="text-gray-600 mt-2 text-xs">
                  <strong>Recomendamos</strong> que você consulte profissionais qualificados (contadores, planejadores financeiros) antes de tomar decisões financeiras importantes.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">9. Categorização Automática e IA</h2>
                <p className="text-gray-600">
                  O Guru do Dindin utiliza inteligência artificial para categorizar transações automaticamente. Conforme o Art. 20 da LGPD, você tem o direito de solicitar revisão de decisões automatizadas. As categorizações são sugestões e podem ser editadas manualmente pelo usuário a qualquer momento.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">10. Seus Direitos (LGPD)</h2>
                <p className="text-gray-600 mb-2">
                  Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Confirmação da existência de tratamento de seus dados</li>
                  <li>Acesso aos seus dados pessoais</li>
                  <li>Correção de dados incompletos, inexatos ou desatualizados</li>
                  <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
                  <li>Portabilidade dos dados a outro fornecedor</li>
                  <li>Eliminação dos dados pessoais tratados com consentimento</li>
                  <li>Revogação do consentimento a qualquer momento</li>
                </ul>
                <p className="text-gray-600 mt-2 text-xs">
                  Para solicitar a exclusão dos seus dados, acesse nossa{' '}
                  <Link to="/exclusao-dados" className="text-primary-600 font-medium hover:underline">
                    página de exclusão de dados
                  </Link>.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">11. Segurança e Incidentes</h2>
                <p className="text-gray-600">
                  Adotamos medidas técnicas e organizacionais para proteger seus dados. Em caso de incidentes de segurança que possam gerar risco ou dano relevante, comunicaremos os usuários afetados e a Autoridade Nacional de Proteção de Dados (ANPD) conforme exigido pela legislação.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">12. Suspensão e Encerramento</h2>
                <p className="text-gray-600 mb-2">Podemos suspender ou encerrar sua conta em caso de:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Violação de qualquer cláusula destes Termos</li>
                  <li>Prática de atos que causem danos a terceiros ou ao Guru do Dindin</li>
                  <li>Uso da plataforma para atividades ilegais ou fraudulentas</li>
                  <li>Inadimplência no pagamento dos planos contratados</li>
                </ul>
                <p className="text-gray-600 mt-2 text-xs">
                  Em caso de suspensão, o usuário não terá direito a qualquer indenização ou ressarcimento. Você pode encerrar sua conta voluntariamente a qualquer momento nas configurações.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">13. Relação entre as Partes</h2>
                <p className="text-gray-600">
                  Estes Termos não geram nenhum contrato de sociedade, mandato, franquia, relação de trabalho ou parceria entre o usuário e o Guru do Dindin, servindo exclusivamente para regular a utilização da plataforma.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">14. Alterações nos Termos</h2>
                <p className="text-gray-600">
                  Podemos atualizar estes Termos periodicamente. Alterações significativas serão comunicadas por e-mail ou notificação na plataforma com antecedência mínima de 15 dias. O uso continuado após as alterações implica aceitação dos novos termos. Em caso de discordância, você poderá encerrar sua conta.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">15. Validade das Cláusulas</h2>
                <p className="text-gray-600">
                  Caso qualquer cláusula destes Termos seja considerada inválida ou inexequível por autoridade competente, as demais cláusulas permanecerão válidas e em pleno vigor.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">16. Contato</h2>
                <p className="text-gray-600">
                  Dúvidas sobre estes Termos ou sobre a plataforma? Entre em contato: <strong>contato@gurudodindin.com.br</strong>
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">17. Foro e Legislação Aplicável</h2>
                <p className="text-gray-600">
                  Estes Termos são regidos pelas leis da República Federativa do Brasil. Para dirimir quaisquer dúvidas ou controvérsias, fica eleito o Foro da Comarca de São Paulo/SP, com exclusão de qualquer outro, por mais privilegiado que seja.
                </p>
              </section>

              <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                Ao usar o Guru do Dindin, você declara ter lido, compreendido e concordado com estes Termos de Serviço.
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
