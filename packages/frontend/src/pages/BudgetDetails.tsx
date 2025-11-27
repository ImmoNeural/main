import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { transactionApi, budgetApi, preferencesApi, PreferenceItem } from '../services/api';
import type { Transaction } from '../types';
import { startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Edit, Upload } from 'lucide-react';
import ImportTransactionsModal from '../components/ImportTransactionsModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// Categoria rules (mesmas da página Budgets)
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
  { type: 'Despesas Variáveis', category: 'Alimentação', subcategory: 'Padaria', icon: '🥖', color: '#D2691E', note: 'Padarias e panificadoras.' },
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
  { type: 'Despesas Variáveis', category: 'Pet', subcategory: 'Alimentação', icon: '🦴', color: '#FF9800', note: 'Ração e petiscos para pets.' },
  { type: 'Despesas Variáveis', category: 'Pet', subcategory: 'Médico', icon: '🏥', color: '#FF9800', note: 'Consultas veterinárias.' },
  { type: 'Despesas Variáveis', category: 'Pet', subcategory: 'Tratamentos', icon: '💊', color: '#FF9800', note: 'Vacinas e medicamentos.' },
  { type: 'Despesas Variáveis', category: 'Viagens', subcategory: 'Aéreo e Turismo', icon: '✈️', color: '#2196F3', note: 'Passagens, hotéis e pacotes (Decolar, Booking, Gol, Azul).' },

  // DESPESAS FIXAS (Recorrentes e Obrigatórias)
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Telefonia e Internet', icon: '📱', color: '#00BCD4', note: 'Planos de telefonia e internet fixa (Vivo, Claro, Oi).' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Energia e Água', icon: '⚡', color: '#FFC107', note: 'Contas de utilidade básica (Sabesp, Enel, Cemig).' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Boletos e Débitos', icon: '📄', color: '#607D8B', note: 'Identificação genérica de pagamento de boletos.' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Condomínio', icon: '🏢', color: '#795548', note: 'Taxa condominial e administração.' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Aluguel de Eletrodomésticos', icon: '🔌', color: '#9E9E9E', note: 'Locação de geladeira, máquina de lavar, etc.' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Aluguel de Imóvel', icon: '🏠', color: '#8D6E63', note: 'Aluguel de casa, apartamento ou sala comercial.' },
  { type: 'Despesas Fixas', category: 'Banco e Seguradoras', subcategory: 'Bancos e Fintechs', icon: '🏦', color: '#673AB7', note: 'Tarifas e serviços bancários (Itaú, Nubank, PicPay).' },
  { type: 'Despesas Fixas', category: 'Banco e Seguradoras', subcategory: 'Seguradoras', icon: '🛡️', color: '#673AB7', note: 'Seguros diversos (vida, residencial, etc).' },
  { type: 'Despesas Fixas', category: 'Banco e Seguradoras', subcategory: 'Empréstimos Bancários', icon: '💰', color: '#673AB7', note: 'Parcelas de empréstimos bancários.' },
  { type: 'Despesas Fixas', category: 'Banco e Seguradoras', subcategory: 'Financiamentos', icon: '📋', color: '#673AB7', note: 'Parcelas de financiamentos (veículos, imóveis).' },
  { type: 'Despesas Fixas', category: 'Entretenimento', subcategory: 'Streaming e Assinaturas', icon: '📺', color: '#E91E63', note: 'Serviços digitais recorrentes (Netflix, Spotify, Disney+).' },
  { type: 'Despesas Fixas', category: 'Educação', subcategory: 'Cursos e Ensino', icon: '🎓', color: '#3F51B5', note: 'Matrículas, mensalidades e cursos livres.' },
  { type: 'Despesas Fixas', category: 'Educação', subcategory: 'Livrarias e Papelarias', icon: '📚', color: '#5C6BC0', note: 'Livros, artigos de papelaria e material didático.' },
  { type: 'Despesas Fixas', category: 'Impostos e Taxas', subcategory: 'IOF e Impostos', icon: '🏦', color: '#F44336', note: 'Cobrança de impostos e taxas específicas (IOF).' },
  { type: 'Despesas Fixas', category: 'Saúde', subcategory: 'Odontologia', icon: '🦷', color: '#00BCD4', note: 'Mensalidades ou pagamentos recorrentes a dentistas/clínicas.' },
  { type: 'Despesas Fixas', category: 'Saúde', subcategory: 'Médicos e Clínicas', icon: '⚕️', color: '#009688', note: 'Hospitais, exames e consultas médicas (inclui Plano de Saúde recorrente).' },
  { type: 'Despesas Fixas', category: 'Transporte', subcategory: 'Seguros', icon: '🛡️', color: '#2196F3', note: 'Seguro auto, moto, veículo.' },
  { type: 'Despesas Fixas', category: 'Pet', subcategory: 'Seguradoras', icon: '🛡️', color: '#FF9800', note: 'Plano de saúde pet.' },

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

interface MonthData {
  month: string;
  monthLabel: string;
  spent: number;
  budget: number;
  subcategories: Record<string, number>;
}

export default function BudgetDetails() {
  const { categoryName, tipoCusto } = useParams<{ categoryName: string; tipoCusto: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [categoryInfo, setCategoryInfo] = useState<{
    icon: string;
    color: string;
    type: string;
  } | null>(null);
  const [suggestedBudget, setSuggestedBudget] = useState(0);
  const [customBudget, setCustomBudget] = useState<number | null>(null);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [isCustomBudget, setIsCustomBudget] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (categoryName && tipoCusto) {
      loadCategoryData();
    }
  }, [categoryName, tipoCusto]);

  const loadCategoryData = async () => {
    setLoading(true);
    try {
      const decodedCategory = decodeURIComponent(categoryName!);
      // Normalizar tipoCusto: 'fixo' ou 'variavel' apenas (outros valores viram 'fixo')
      const costType = (tipoCusto === 'fixo' || tipoCusto === 'variavel') ? tipoCusto : 'fixo';

      // Encontrar informações da categoria
      const rulesForCategory = ALL_CATEGORY_RULES.filter(r => r.category === decodedCategory);
      if (rulesForCategory.length === 0) {
        navigate('/app/budgets');
        return;
      }

      // Definir tipo de custo baseado no parâmetro da URL
      const typeLabel = costType === 'fixo' ? 'Custo Fixo' : 'Custo Variável';

      setCategoryInfo({
        icon: rulesForCategory[0].icon,
        color: rulesForCategory[0].color,
        type: typeLabel,
      });

      // Carregar preferências para saber quais subcategorias são deste tipo de custo
      let prefs: PreferenceItem[] = [];
      try {
        const prefsResponse = await preferencesApi.getAll();
        prefs = prefsResponse.data || [];
      } catch (e) {
        console.log('Erro ao carregar preferências');
      }

      // Filtrar subcategorias desta categoria que têm o tipo_custo correto
      const subcatsForThisType = prefs
        .filter(p => p.category === decodedCategory && p.tipo_custo === costType)
        .map(p => p.subcategory);

      // Se não encontrar nas preferências, usar as regras padrão baseadas no tipo da ALL_CATEGORY_RULES
      let validSubcategories: string[] = subcatsForThisType;
      if (validSubcategories.length === 0) {
        // Fallback: usar ALL_CATEGORY_RULES para determinar subcategorias
        const expectedType = costType === 'fixo' ? 'Despesas Fixas' : costType === 'variavel' ? 'Despesas Variáveis' : '';
        validSubcategories = rulesForCategory
          .filter(r => r.type === expectedType)
          .map(r => r.subcategory);
      }

      console.log(`📂 [BUDGET DETAILS] Categoria: ${decodedCategory}, Tipo: ${costType}`);
      console.log(`📂 [BUDGET DETAILS] Subcategorias válidas para este tipo:`, validSubcategories);

      // Buscar transações dos últimos 12 meses
      const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
      const response = await transactionApi.getTransactions({
        start_date: format(twelveMonthsAgo, 'yyyy-MM-dd'),
        limit: 10000,
      });

      const txs = response.data.transactions;

      // Processar dados mensais
      const monthly: Record<string, MonthData> = {};

      // Inicializar últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM/yy', { locale: ptBR });

        monthly[monthKey] = {
          month: monthKey,
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          spent: 0,
          budget: 0,
          subcategories: {},
        };
      }

      // Processar transações - FILTRAR por categoria E subcategorias do tipo correto
      txs.forEach((tx: Transaction) => {
        // Filtrar apenas despesas da categoria
        if (tx.amount >= 0) return;
        if (tx.category !== decodedCategory) return;

        // Se temos subcategorias específicas para filtrar, verificar subcategoria
        // Se a transação tem subcategoria, verificar se está na lista
        // Se não tem subcategoria (tx.subcategory é undefined), incluir apenas se tiver regra para a categoria geral
        const txSubcategory = tx.subcategory || tx.category;
        const shouldInclude = validSubcategories.length === 0 ||
          validSubcategories.includes(txSubcategory) ||
          validSubcategories.includes(tx.category);

        if (!shouldInclude) {
          return; // Não incluir esta transação
        }

        const month = format(new Date(tx.date), 'yyyy-MM');
        const amount = Math.abs(tx.amount);

        if (monthly[month]) {
          monthly[month].spent += amount;

          // Agrupar por subcategoria
          const subcat = txSubcategory;
          if (!monthly[month].subcategories[subcat]) {
            monthly[month].subcategories[subcat] = 0;
          }
          monthly[month].subcategories[subcat] += amount;
        }
      });

      // Buscar budget customizado para esta categoria E tipo_custo
      const categoryKey = decodedCategory;
      let finalBudget = 0; // Iniciar com 0, não calcular média

      try {
        // Buscar budget específico para este tipo_custo
        const budgetResponse = await budgetApi.getBudgetByType(categoryKey, costType);
        if (budgetResponse.data && budgetResponse.data.budget_value !== null && budgetResponse.data.budget_value !== undefined) {
          finalBudget = budgetResponse.data.budget_value;
          setIsCustomBudget(true);
          console.log(`📂 [BUDGET DETAILS] Budget customizado carregado para ${categoryKey} (${costType}): R$ ${finalBudget.toFixed(2)}`);
        } else {
          setIsCustomBudget(false);
          console.log(`📊 [BUDGET DETAILS] Nenhum budget definido para ${categoryKey} (${costType}), usando 0`);
        }
      } catch (error) {
        setIsCustomBudget(false);
        console.log(`📊 [BUDGET DETAILS] Erro ao carregar budget para ${categoryKey} (${costType}), usando 0`);
      }

      setSuggestedBudget(finalBudget);

      // Aplicar budget a todos os meses
      Object.keys(monthly).forEach(month => {
        monthly[month].budget = finalBudget;
      });

      setMonthlyData(Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)));
    } catch (error) {
      console.error('Error loading category data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetEdit = () => {
    setCustomBudget(suggestedBudget);
    setIsEditingBudget(true);
  };

  const handleBudgetSave = async () => {
    // Validação robusta do valor
    const budgetValue = customBudget;
    const costType = tipoCusto || 'fixo';

    console.log(`🔍 [BUDGET DETAILS] Tentando salvar budget:`, {
      customBudget,
      tipoCusto: costType,
      type: typeof customBudget,
      isNull: customBudget === null,
      isNaN: isNaN(customBudget || 0),
    });

    if (budgetValue === null || budgetValue === undefined || isNaN(budgetValue) || budgetValue < 0) {
      alert('Por favor, insira um valor válido (zero ou maior).');
      return;
    }

    // Salvar na API
    const categoryKey = decodeURIComponent(categoryName!);

    try {
      console.log(`💾 [BUDGET DETAILS] Enviando para API:`, {
        category_name: categoryKey,
        budget_value: budgetValue,
        tipo_custo: costType,
      });

      // Salvar com tipo_custo para garantir que vai para o registro correto
      await budgetApi.saveBudget({
        category_name: categoryKey,
        budget_value: budgetValue,
        tipo_custo: costType as 'fixo' | 'variavel',
      });
      console.log(`✅ [BUDGET DETAILS] Budget customizado salvo para ${categoryKey} (${costType}): R$ ${budgetValue.toFixed(2)}`);

      setSuggestedBudget(budgetValue);
      setIsCustomBudget(true);
      // Atualizar budget em todos os meses
      setMonthlyData(prev => prev.map(m => ({ ...m, budget: budgetValue })));
      setIsEditingBudget(false);
    } catch (error: any) {
      console.error(`❌ [BUDGET DETAILS] Erro ao salvar budget para ${categoryKey} (${costType}):`, error);
      console.error(`❌ [BUDGET DETAILS] Response:`, error.response?.data);
      alert(`Erro ao salvar budget: ${error.response?.data?.error || error.message || 'Erro desconhecido'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!categoryInfo) {
    return null;
  }

  const currentMonthData = monthlyData[monthlyData.length - 1] || { spent: 0, budget: suggestedBudget, month: '', monthLabel: '', subcategories: {} };
  const isExceeded = currentMonthData.spent > currentMonthData.budget;
  const percentage = currentMonthData.budget > 0 ? (currentMonthData.spent / currentMonthData.budget) * 100 : 0;
  const excessAmount = Math.max(0, currentMonthData.spent - currentMonthData.budget);
  const remainingAmount = Math.max(0, currentMonthData.budget - currentMonthData.spent);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen pb-20 lg:pb-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex justify-between items-start mb-4">
          <Link
            to="/app/budgets"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Budgets
          </Link>

          <button
            onClick={() => setShowImportModal(true)}
            className="btn-primary flex items-center space-x-2"
            title="Importar transações CSV"
          >
            <Upload className="w-4 sm:w-5 h-4 sm:h-5" />
            <span className="text-sm sm:text-base">Importar CSV</span>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-2">
          <span className="text-5xl">{categoryInfo.icon}</span>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800">{decodeURIComponent(categoryName!)}</h1>
            <p className="text-sm text-gray-500">{categoryInfo.type}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Card Resumo do Mês */}
        <div className="card p-6" style={{ borderTop: `4px solid ${categoryInfo.color}` }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {currentMonthData.monthLabel || format(new Date(), 'MMMM/yy', { locale: ptBR })}
            </h2>
            <span className="text-sm font-semibold text-gray-600">
              Budget: R$ {currentMonthData.budget.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {/* Barra de Status */}
          <div className="mb-4">
            <div className="flex justify-between text-sm font-bold mb-2">
              <span style={{ color: isExceeded ? '#FF9800' : '#4CAF50' }}>
                {isExceeded
                  ? `Excedido R$ ${excessAmount.toFixed(2).replace('.', ',')}`
                  : `R$ ${remainingAmount.toFixed(2).replace('.', ',')} disponível`}
              </span>
              <span className="text-gray-600">
                Gasto: R$ {currentMonthData.spent.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <div className="relative h-4 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="absolute h-full rounded-full transition-all duration-500"
                style={{
                  width: isExceeded ? '100%' : `${Math.min(percentage, 100)}%`,
                  backgroundColor: isExceeded ? '#FF9800' : '#4CAF50',
                  boxShadow: isExceeded ? '0 0 10px rgba(255, 152, 0, 0.7)' : 'none',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                  {percentage.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          {/* Budget Value com edição */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {!isEditingBudget ? (
              <>
                <div>
                  <span className="text-sm text-gray-600">Valor do Budget:</span>
                  <p className="text-2xl font-bold" style={{ color: categoryInfo.color }}>
                    R$ {suggestedBudget.toFixed(2).replace('.', ',')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {isCustomBudget
                      ? '✏️ Valor definido por você'
                      : '📝 Clique no lápis para definir seu budget'}
                  </p>
                </div>
                <button
                  onClick={handleBudgetEdit}
                  className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition"
                  title="Editar budget"
                >
                  <Edit className="w-5 h-5 text-gray-600" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3 w-full">
                <input
                  type="number"
                  value={customBudget || ''}
                  onChange={(e) => setCustomBudget(Number(e.target.value))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Digite o valor do budget"
                  autoFocus
                />
                <button
                  onClick={handleBudgetSave}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setIsEditingBudget(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card Gráfico - Últimos 12 Meses */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📊 Últimos 12 Meses (em Reais R$)
          </h2>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => `R$ ${Number(value).toFixed(2).replace('.', ',')}`}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e5e5' }}
              />
              {/* Linha do budget */}
              <ReferenceLine
                y={suggestedBudget}
                stroke="#999"
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{ value: 'Budget', position: 'right', fill: '#666', fontSize: 12 }}
              />
              <Bar dataKey="spent" fill={`${categoryInfo.color}60`} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Card Lista dos Meses Anteriores */}
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">📅 Histórico Mensal</h2>

          <div className="space-y-3">
            {monthlyData.slice().reverse().map((monthData) => {
              const isExceededMonth = monthData.spent > monthData.budget;
              const percentageMonth = monthData.budget > 0 ? (monthData.spent / monthData.budget) * 100 : 0;
              const excessMonth = Math.max(0, monthData.spent - monthData.budget);
              const remainingMonth = Math.max(0, monthData.budget - monthData.spent);

              return (
                <div
                  key={monthData.month}
                  className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 transition"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-800">{monthData.monthLabel}</h3>
                    <span className="text-sm text-gray-600">
                      Gasto: R$ {monthData.spent.toFixed(2).replace('.', ',')}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span style={{ color: isExceededMonth ? '#FF9800' : '#4CAF50' }}>
                        {isExceededMonth
                          ? `Excedido R$ ${excessMonth.toFixed(2).replace('.', ',')}`
                          : `R$ ${remainingMonth.toFixed(2).replace('.', ',')} disponível`}
                      </span>
                      <span className="text-gray-500">
                        Budget: R$ {monthData.budget.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <div className="relative h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="absolute h-full rounded-full transition-all duration-500"
                        style={{
                          width: isExceededMonth ? '100%' : `${Math.min(percentageMonth, 100)}%`,
                          backgroundColor: isExceededMonth ? '#FF9800' : '#4CAF50',
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportTransactionsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false);
            loadCategoryData();
          }}
        />
      )}
    </div>
  );
}
