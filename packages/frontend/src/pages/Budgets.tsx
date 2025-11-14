import React from 'react';

// --- BASE DE REGRAS COMPLETA EXTRAÍDA DE categorization_service.ts ---
// Inclui todas as 33 regras de subcategoria

interface CategoryRule {
  type: string;
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  note: string;
}

const ALL_CATEGORY_RULES: CategoryRule[] = [
  // DESPESAS VARIÁVEIS (Consumo e Lazer)
  { type: 'Despesas Variáveis', category: 'Supermercado', subcategory: 'Compras de Mercado', icon: '🛒', color: '#4CAF50', note: 'Grandes redes e atacados (Carrefour, Assaí, Zaffari).' },
  { type: 'Despesas Variáveis', category: 'Alimentação', subcategory: 'Restaurantes e Delivery', icon: '🍕', color: '#FF5722', note: 'Restaurantes, lanchonetes e apps (iFood, Uber Eats, Outback).' },
  { type: 'Despesas Variáveis', category: 'Transporte', subcategory: 'Apps de Transporte', icon: '🚗', color: '#2196F3', note: 'Corridas de aplicativos (Uber, 99, Cabify).' },
  { type: 'Despesas Variáveis', category: 'Transporte', subcategory: 'Combustível e Pedágio', icon: '⛽', color: '#FF9800', note: 'Postos de gasolina (Shell, Ipiranga) e tags de pedágio (Sem Parar).' },
  { type: 'Despesas Variáveis', category: 'Transporte', subcategory: 'Transporte Público', icon: '🚌', color: '#3F51B5', note: 'Passagens de metrô, trem e ônibus.' },
  { type: 'Despesas Variáveis', category: 'Compras', subcategory: 'E-commerce', icon: '🛍️', color: '#E91E63', note: 'Marketplaces e grandes varejistas online (ML, Amazon, Magalu).' },
  { type: 'Despesas Variáveis', category: 'Compras', subcategory: 'Moda e Vestuário', icon: '👕', color: '#FF4081', note: 'Lojas de roupa e calçados (Renner, C&A, Dafiti).' },
  { type: 'Despesas Variáveis', category: 'Compras', subcategory: 'Tecnologia', icon: '📱', color: '#607D8B', note: 'Eletrônicos, computadores e gadgets.' },
  { type: 'Despesas Variáveis', category: 'Casa', subcategory: 'Construção e Reforma', icon: '🏠', color: '#795548', note: 'Materiais de construção e ferramentas (Leroy Merlin, Telhanorte).' },
  { type: 'Despesas Variáveis', category: 'Casa', subcategory: 'Móveis e Decoração', icon: '🛋️', color: '#8D6E63', note: 'Móveis, estofados e artigos de decoração (Tok & Stok, Etna).' },
  { type: 'Despesas Variáveis', category: 'Entretenimento', subcategory: 'Lazer e Diversão', icon: '🎮', color: '#9C27B0', note: 'Cinema, teatro, shows e parques (Playcenter, Hopi Hari).' },
  { type: 'Despesas Variáveis', category: 'Saúde', subcategory: 'Farmácias e Drogarias', icon: '💊', color: '#009688', note: 'Compra de remédios e itens em Drogasil, Raia, Panvel.' },
  { type: 'Despesas Variáveis', category: 'Saúde', subcategory: 'Academia e Fitness', icon: '🏋️', color: '#FF5722', note: 'Mensalidades de academias e estúdios (Smart Fit, Bodytech).' },
  { type: 'Despesas Variáveis', category: 'Pet', subcategory: 'Pet Shop e Veterinário', icon: '🐕', color: '#FF9800', note: 'Gastos com animais de estimação, ração e veterinário (Petz, Cobasi).' },
  { type: 'Despesas Variáveis', category: 'Viagens', subcategory: 'Aéreo e Turismo', icon: '✈️', color: '#2196F3', note: 'Passagens, hotéis e pacotes (Decolar, Booking, Gol, Azul).' },

  // DESPESAS FIXAS (Recorrentes e Obrigatórias)
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Telefonia e Internet', icon: '📱', color: '#00BCD4', note: 'Planos de telefonia e internet fixa (Vivo, Claro, Oi).' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Energia e Água', icon: '⚡', color: '#FFC107', note: 'Contas de utilidade básica (Sabesp, Enel, Cemig).' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Boletos e Débitos', icon: '📄', color: '#607D8B', note: 'Identificação genérica de pagamento de boletos.' },
  { type: 'Despesas Fixas', category: 'Serviços Financeiros', subcategory: 'Bancos e Fintechs', icon: '💳', color: '#673AB7', note: 'Tarifas e serviços bancários (Itaú, Nubank, PicPay).' },
  { type: 'Despesas Fixas', category: 'Entretenimento', subcategory: 'Streaming e Assinaturas', icon: '📺', color: '#E91E63', note: 'Serviços digitais recorrentes (Netflix, Spotify, Disney+).' },
  { type: 'Despesas Fixas', category: 'Educação', subcategory: 'Cursos e Ensino', icon: '🎓', color: '#3F51B5', note: 'Matrículas, mensalidades e cursos livres.' },
  { type: 'Despesas Fixas', category: 'Educação', subcategory: 'Livrarias e Papelarias', icon: '📚', color: '#5C6BC0', note: 'Livros, artigos de papelaria e material didático.' },
  { type: 'Despesas Fixas', category: 'Impostos e Taxas', subcategory: 'IOF e Impostos', icon: '🏦', color: '#F44336', note: 'Cobrança de impostos e taxas específicas (IOF).' },
  { type: 'Despesas Fixas', category: 'Saúde', subcategory: 'Odontologia', icon: '🦷', color: '#00BCD4', note: 'Mensalidades ou pagamentos recorrentes a dentistas/clínicas.' },
  { type: 'Despesas Fixas', category: 'Saúde', subcategory: 'Médicos e Clínicas', icon: '⚕️', color: '#009688', note: 'Hospitais, exames e consultas médicas (inclui Plano de Saúde recorrente).' },

  // MOVIMENTAÇÕES (Receitas, Transferências, Investimentos e Saques)
  { type: 'Movimentações', category: 'Salário', subcategory: 'Salário e Rendimentos', icon: '💰', color: '#4CAF50', note: 'Recebimento de salário, pró-labore ou depósitos de folha.' },
  { type: 'Movimentações', category: 'Receitas', subcategory: 'Rendimentos de Investimentos', icon: '💹', color: '#4CAF50', note: 'Recebimento de juros, dividendos e resgates de títulos.' },
  { type: 'Movimentações', category: 'Investimentos', subcategory: 'Aplicações e Investimentos', icon: '📈', color: '#2196F3', note: 'Aplicações de débito em CDB, LCA, LCI, Tesouro Direto.' },
  { type: 'Movimentações', category: 'Investimentos', subcategory: 'Poupança e Capitalização', icon: '💰', color: '#4CAF50', note: 'Movimentações de poupança e títulos de capitalização.' },
  { type: 'Movimentações', category: 'Investimentos', subcategory: 'Corretoras e Fundos', icon: '📈', color: '#2196F3', note: 'Transações em corretoras (XP, Rico, Clear) e fundos.' },
  { type: 'Movimentações', category: 'Transferências', subcategory: 'PIX', icon: '💸', color: '#00C853', note: 'Transações instantâneas enviadas ou recebidas.' },
  { type: 'Movimentações', category: 'Transferências', subcategory: 'TED/DOC', icon: '💸', color: '#FF9800', note: 'Transferências tradicionais entre contas.' },
  { type: 'Movimentações', category: 'Saques', subcategory: 'Saques em Dinheiro', icon: '💵', color: '#9E9E9E', note: 'Retiradas em caixas eletrônicos (ATM).' },
];

interface GroupedCategory {
  icon: string;
  color: string;
  subcategories: CategoryRule[];
}

interface GroupedByCostType {
  [costType: string]: {
    [category: string]: GroupedCategory;
  };
}

/**
 * Agrupa as regras pela Categoria Principal dentro de cada Tipo de Despesa (Type)
 * Resultado: { 'Despesas Fixas': { 'Contas': { icon, color, subcategories: [] } }, ... }
 */
const groupedByCostType: GroupedByCostType = ALL_CATEGORY_RULES.reduce((acc: GroupedByCostType, rule) => {
  const costType = rule.type;
  const mainCategory = rule.category;

  if (!acc[costType]) {
    acc[costType] = {};
  }

  if (!acc[costType][mainCategory]) {
    acc[costType][mainCategory] = {
      // Pega o ícone e a cor do primeiro item da categoria como referência para o card
      icon: rule.icon,
      color: rule.color,
      subcategories: [],
    };
  }
  acc[costType][mainCategory].subcategories.push(rule);
  return acc;
}, {});

// Componente auxiliar para renderizar cada subcategoria
const SubcategoryItem: React.FC<{ rule: CategoryRule }> = ({ rule }) => (
  <li className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-100 transition">
    {/* Ícone da Subcategoria (usando a cor de referência da Regra) */}
    <div
      className="w-8 h-8 flex items-center justify-center rounded-full text-lg flex-shrink-0"
      style={{
        backgroundColor: rule.color + '20',
        color: rule.color,
        // Efeito de sombra interna sutil
        boxShadow: `inset 0 1px 3px 0 ${rule.color}30`
      }}
    >
      {rule.icon}
    </div>
    <div className="flex-1">
      <span className="text-sm font-semibold text-gray-900 block">{rule.subcategory}</span>
      <p className="text-xs text-gray-500 mt-0.5">{rule.note}</p>
    </div>
  </li>
);

// Componente principal
export default function Budgets() {
  const costTypes = Object.keys(groupedByCostType);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen pb-20 lg:pb-6">
      <header className="max-w-6xl mx-auto mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight">🗺️ Mapa Completo de Categorias Financeiras</h1>
        <p className="text-sm sm:text-md text-gray-500 mt-2">Visão geral das {ALL_CATEGORY_RULES.length} subcategorias agrupadas por Tipo de Custo e Categoria Principal.</p>
      </header>

      <main className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        {costTypes.map(costType => (
          <section key={costType}>
            <h2
              className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pb-2 border-b-2 text-gray-700"
              style={{ borderColor: costType === 'Despesas Fixas' ? '#3F51B5' : costType === 'Despesas Variáveis' ? '#FF9800' : '#4CAF50' }}
            >
              {costType}
              <span className="text-xs sm:text-sm font-medium ml-2 sm:ml-3 text-gray-500">
                ({Object.keys(groupedByCostType[costType]).length} Categorias Principais)
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Object.entries(groupedByCostType[costType]).map(([categoryName, data]) => (
                // Card de Categoria Principal
                <div
                  key={categoryName}
                  className="bg-white rounded-2xl shadow-xl border-t-4 p-4 sm:p-5 flex flex-col transform hover:scale-[1.02] transition duration-300"
                  style={{ borderTopColor: data.color }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <span className="text-2xl sm:text-3xl">{data.icon}</span>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-wider">{categoryName}</h3>
                  </div>

                  <ul className="space-y-2 sm:space-y-3 flex-grow divide-y divide-gray-100">
                    {data.subcategories.map((rule) => (
                      <SubcategoryItem key={rule.subcategory} rule={rule} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="max-w-6xl mx-auto mt-8 sm:mt-12 text-center text-xs text-gray-400">
        <p>Base de Categorias - Guru do Dindin © | Total de {ALL_CATEGORY_RULES.length} Subcategorias Únicas.</p>
      </footer>
    </div>
  );
}
