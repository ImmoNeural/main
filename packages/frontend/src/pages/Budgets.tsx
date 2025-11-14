import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { transactionApi } from '../services/api';
import type { Transaction } from '../types';
import { startOfMonth, subMonths, format } from 'date-fns';
import { ArrowRight, TrendingUp } from 'lucide-react';

// --- BASE DE REGRAS COMPLETA EXTRAÍDA DE categorization_service.ts ---
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
];

interface CategoryData {
  type: string;
  category: string;
  subcategory: string;
  icon: string;
  color: string;
  note: string;
  currentSpent: number;
  suggestedBudget: number;
  monthsWithData: number;
}

interface GroupedCategory {
  icon: string;
  color: string;
  totalSpent: number;
  totalBudget: number;
  subcategories: CategoryData[];
}

// Componente de Barra de Budget
const BudgetBar: React.FC<{ totalBudget: number; totalSpent: number; compact?: boolean }> = ({ totalBudget, totalSpent, compact = false }) => {
  if (totalBudget === 0) {
    return (
      <div className="mt-3 mb-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">Sem budget definido</span>
          <span className="text-gray-600 font-semibold">
            Gasto: R$ {totalSpent.toFixed(2).replace('.', ',')}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100"></div>
      </div>
    );
  }

  const isExceeded = totalSpent > totalBudget;
  const percentage = Math.min((totalSpent / totalBudget) * 100, 100);
  const excessAmount = Math.max(0, totalSpent - totalBudget);
  const remainingAmount = Math.max(0, totalBudget - totalSpent);

  const barColor = isExceeded ? '#FF9800' : '#4CAF50';
  const statusText = isExceeded
    ? `Excedido R$ ${excessAmount.toFixed(2).replace('.', ',')}`
    : `R$ ${remainingAmount.toFixed(2).replace('.', ',')} disponível`;
  const textColor = isExceeded ? '#FF9800' : '#4CAF50';
  const fillWidth = isExceeded ? '100%' : `${percentage}%`;

  return (
    <div className={compact ? "mt-2 mb-1" : "mt-3 mb-2"}>
      <div className={`flex justify-between ${compact ? 'text-[10px]' : 'text-xs'} font-bold mb-1`}>
        <span style={{ color: textColor }}>{statusText}</span>
        <span className="text-gray-500">
          Budget: R$ {totalBudget.toFixed(2).replace('.', ',')}
        </span>
      </div>

      <div className="relative h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="absolute h-full rounded-full transition-all duration-500"
          style={{
            width: fillWidth,
            backgroundColor: barColor,
            boxShadow: isExceeded ? '0 0 8px rgba(255, 152, 0, 0.7)' : 'none',
          }}
        ></div>
      </div>

      {!compact && (
        <div className="text-[10px] text-gray-400 mt-1">
          Gasto: R$ {totalSpent.toFixed(2).replace('.', ',')} {totalBudget > 0 && `(${percentage.toFixed(0)}%)`}
        </div>
      )}
    </div>
  );
};

export default function Budgets() {
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<Record<string, Record<string, GroupedCategory>>>({});

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      // Buscar transações dos últimos 12 meses
      const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
      const response = await transactionApi.getTransactions({
        start_date: format(twelveMonthsAgo, 'yyyy-MM-dd'),
        limit: 10000,
      });

      const txs = response.data.transactions;

      // Processar transações e calcular médias
      processTransactions(txs);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTransactions = (txs: Transaction[]) => {
    const grouped: Record<string, Record<string, GroupedCategory>> = {};

    // Inicializar estrutura com todas as categorias
    ALL_CATEGORY_RULES.forEach((rule) => {
      if (!grouped[rule.type]) {
        grouped[rule.type] = {};
      }
      if (!grouped[rule.type][rule.category]) {
        grouped[rule.type][rule.category] = {
          icon: rule.icon,
          color: rule.color,
          totalSpent: 0,
          totalBudget: 0,
          subcategories: [],
        };
      }
    });

    // Agrupar transações por categoria/subcategoria e calcular gastos
    const subcategoryMap: Record<string, {
      monthlyTotals: Record<string, number>;
      rule: CategoryRule;
      currentMonthSpent: number;
    }> = {};

    ALL_CATEGORY_RULES.forEach((rule) => {
      const key = `${rule.category}::${rule.subcategory}`;
      subcategoryMap[key] = {
        monthlyTotals: {},
        rule,
        currentMonthSpent: 0,
      };
    });

    const currentMonth = format(new Date(), 'yyyy-MM');

    txs.forEach((tx) => {
      // Ignorar receitas (valores positivos) para budgets
      if (tx.amount >= 0) return;
      if (!tx.category) return;

      // Buscar a subcategoria correspondente nas regras
      const matchingRule = ALL_CATEGORY_RULES.find(
        rule => rule.category === tx.category
      );

      if (matchingRule) {
        const key = `${matchingRule.category}::${matchingRule.subcategory}`;
        if (subcategoryMap[key]) {
          const month = format(new Date(tx.date), 'yyyy-MM');
          const amount = Math.abs(tx.amount);

          if (!subcategoryMap[key].monthlyTotals[month]) {
            subcategoryMap[key].monthlyTotals[month] = 0;
          }
          subcategoryMap[key].monthlyTotals[month] += amount;

          // Gasto do mês atual
          if (month === currentMonth) {
            subcategoryMap[key].currentMonthSpent += amount;
          }
        }
      }
    });

    // Calcular médias e montar estrutura final
    Object.entries(subcategoryMap).forEach(([_key, data]) => {
      const monthlyValues = Object.values(data.monthlyTotals);
      const monthsWithData = monthlyValues.length;
      const avgMonthly = monthsWithData > 0
        ? monthlyValues.reduce((sum, val) => sum + val, 0) / monthsWithData
        : 0;

      const categoryData: CategoryData = {
        type: data.rule.type,
        category: data.rule.category,
        subcategory: data.rule.subcategory,
        icon: data.rule.icon,
        color: data.rule.color,
        note: data.rule.note,
        currentSpent: data.currentMonthSpent,
        suggestedBudget: Math.round(avgMonthly),
        monthsWithData,
      };

      // Adicionar à estrutura agrupada
      if (grouped[data.rule.type] && grouped[data.rule.type][data.rule.category]) {
        grouped[data.rule.type][data.rule.category].subcategories.push(categoryData);
        grouped[data.rule.type][data.rule.category].totalSpent += categoryData.currentSpent;
        grouped[data.rule.type][data.rule.category].totalBudget += categoryData.suggestedBudget;
      }
    });

    setCategoryData(grouped);
  };

  const costTypes = Object.keys(categoryData).filter(type => type !== 'Movimentações');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando budgets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen pb-20 lg:pb-6">
      <header className="max-w-6xl mx-auto mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
          🎯 Budgets por Categoria
        </h1>
        <p className="text-sm sm:text-base text-gray-500 mt-2">
          Orçamentos sugeridos baseados na média dos últimos meses. Clique em uma categoria para ver detalhes.
        </p>
      </header>

      <main className="max-w-7xl mx-auto space-y-8 sm:space-y-12">
        {costTypes.map((costType) => (
          <section key={costType}>
            <h2
              className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 pb-2 border-b-2 text-gray-700"
              style={{
                borderColor:
                  costType === 'Despesas Fixas'
                    ? '#3F51B5'
                    : costType === 'Despesas Variáveis'
                    ? '#FF9800'
                    : '#4CAF50',
              }}
            >
              {costType}
              <span className="text-xs sm:text-sm font-medium ml-2 sm:ml-3 text-gray-500">
                ({Object.keys(categoryData[costType]).length} Categorias Principais)
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Object.entries(categoryData[costType]).map(([categoryName, data]) => (
                <Link
                  key={categoryName}
                  to={`/app/budgets/${encodeURIComponent(categoryName)}`}
                  className="bg-white rounded-2xl shadow-xl border-t-4 p-4 sm:p-5 flex flex-col transform hover:scale-[1.02] transition duration-300 cursor-pointer"
                  style={{ borderTopColor: data.color }}
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <span className="text-2xl sm:text-3xl">{data.icon}</span>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-wider flex-1">
                      {categoryName}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </div>

                  <BudgetBar totalBudget={data.totalBudget} totalSpent={data.totalSpent} />

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      {data.subcategories.length} subcategoria{data.subcategories.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {costTypes.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Nenhum dado disponível</h3>
            <p className="text-gray-500 mb-4">
              Conecte sua conta bancária para começar a gerenciar seus budgets.
            </p>
            <Link
              to="/app/connect-bank"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Conectar Banco <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto mt-8 sm:mt-12 text-center text-xs text-gray-400">
        <p>Budgets calculados automaticamente com base no histórico de transações.</p>
      </footer>
    </div>
  );
}
