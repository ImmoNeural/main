import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import SEO from '../components/SEO';

const DataDeletion = () => {
  return (
    <>
      <SEO
        title="Exclusão de Dados | Guru do Dindin"
        description="Solicite a exclusão dos seus dados pessoais do Guru do Dindin. Saiba como remover sua conta e informações."
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
            <h1 className="text-xl font-bold text-white">Exclusão de Dados</h1>
            <p className="text-white/70 text-xs mt-1">
              Instruções para remoção de dados
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
              </div>

              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-xs">
                  A exclusão de dados é permanente e não pode ser desfeita.
                </p>
              </div>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">Como solicitar exclusão</h2>
                <p className="text-gray-600 mb-3">
                  Você pode solicitar a exclusão completa dos seus dados de duas formas:
                </p>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900 text-xs mb-1">1. Pelo aplicativo</p>
                    <p className="text-gray-600 text-xs">
                      Acesse Configurações → Conta → Excluir minha conta
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900 text-xs mb-1">2. Por e-mail</p>
                    <p className="text-gray-600 text-xs">
                      Envie um e-mail para <strong>contato@gurudodindin.com.br</strong> com o assunto "Exclusão de Dados" e o e-mail da sua conta.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">Dados que serão excluídos</h2>
                <ul className="list-disc list-inside space-y-1 text-gray-600 text-xs">
                  <li>Informações de cadastro (nome, e-mail)</li>
                  <li>Transações financeiras importadas</li>
                  <li>Contas bancárias conectadas</li>
                  <li>Orçamentos e metas</li>
                  <li>Preferências e configurações</li>
                  <li>Histórico de uso</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">Prazo de exclusão</h2>
                <p className="text-gray-600">
                  Seus dados serão completamente removidos em até <strong>30 dias</strong> após a solicitação. Durante este período, sua conta ficará inativa.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">Dados retidos</h2>
                <p className="text-gray-600">
                  Alguns dados podem ser retidos por mais tempo apenas para cumprir obrigações legais ou regulatórias, como registros de transações para fins fiscais.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">Confirmação</h2>
                <p className="text-gray-600">
                  Você receberá um e-mail confirmando a exclusão dos seus dados quando o processo for concluído.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-gray-900 mb-2">Dúvidas</h2>
                <p className="text-gray-600">
                  Entre em contato: <strong>contato@gurudodindin.com.br</strong>
                </p>
              </section>

              <div className="pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
                Conforme a Lei Geral de Proteção de Dados (LGPD)
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

export default DataDeletion;
