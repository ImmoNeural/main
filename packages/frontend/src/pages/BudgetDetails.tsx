import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { transactionApi } from '../services/api';
import type { Transaction } from '../types';
import { startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Edit } from 'lucide-react';
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
  // DESPESAS VARIÁVEIS
  { type: 'Despesas Variáveis', category: 'Supermercado', subcategory: 'Compras de Mercado', icon: '🛒', color: '#4CAF50', note: 'Grandes redes e atacados.' },
  { type: 'Despesas Variáveis', category: 'Alimentação', subcategory: 'Restaurantes e Delivery', icon: '🍕', color: '#FF5722', note: 'Restaurantes e delivery.' },
  { type: 'Despesas Variáveis', category: 'Transporte', subcategory: 'Apps de Transporte', icon: '🚗', color: '#2196F3', note: 'Apps de transporte.' },
  { type: 'Despesas Variáveis', category: 'Transporte', subcategory: 'Combustível e Pedágio', icon: '⛽', color: '#FF9800', note: 'Combustível e pedágio.' },
  { type: 'Despesas Variáveis', category: 'Transporte', subcategory: 'Transporte Público', icon: '🚌', color: '#3F51B5', note: 'Metrô, trem e ônibus.' },
  { type: 'Despesas Variáveis', category: 'Compras', subcategory: 'E-commerce', icon: '🛍️', color: '#E91E63', note: 'Compras online.' },
  { type: 'Despesas Variáveis', category: 'Compras', subcategory: 'Moda e Vestuário', icon: '👕', color: '#FF4081', note: 'Roupas e calçados.' },
  { type: 'Despesas Variáveis', category: 'Compras', subcategory: 'Tecnologia', icon: '📱', color: '#607D8B', note: 'Eletrônicos.' },
  { type: 'Despesas Variáveis', category: 'Casa', subcategory: 'Construção e Reforma', icon: '🏠', color: '#795548', note: 'Materiais de construção.' },
  { type: 'Despesas Variáveis', category: 'Casa', subcategory: 'Móveis e Decoração', icon: '🛋️', color: '#8D6E63', note: 'Móveis e decoração.' },
  { type: 'Despesas Variáveis', category: 'Entretenimento', subcategory: 'Lazer e Diversão', icon: '🎮', color: '#9C27B0', note: 'Cinema, shows, parques.' },
  { type: 'Despesas Variáveis', category: 'Saúde', subcategory: 'Farmácias e Drogarias', icon: '💊', color: '#009688', note: 'Farmácias.' },
  { type: 'Despesas Variáveis', category: 'Saúde', subcategory: 'Academia e Fitness', icon: '🏋️', color: '#FF5722', note: 'Academias.' },
  { type: 'Despesas Variáveis', category: 'Pet', subcategory: 'Pet Shop e Veterinário', icon: '🐕', color: '#FF9800', note: 'Pet shop e veterinário.' },
  { type: 'Despesas Variáveis', category: 'Viagens', subcategory: 'Aéreo e Turismo', icon: '✈️', color: '#2196F3', note: 'Viagens.' },

  // DESPESAS FIXAS
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Telefonia e Internet', icon: '📱', color: '#00BCD4', note: 'Telefone e internet.' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Energia e Água', icon: '⚡', color: '#FFC107', note: 'Energia e água.' },
  { type: 'Despesas Fixas', category: 'Contas', subcategory: 'Boletos e Débitos', icon: '📄', color: '#607D8B', note: 'Boletos gerais.' },
  { type: 'Despesas Fixas', category: 'Serviços Financeiros', subcategory: 'Bancos e Fintechs', icon: '💳', color: '#673AB7', note: 'Tarifas bancárias.' },
  { type: 'Despesas Fixas', category: 'Entretenimento', subcategory: 'Streaming e Assinaturas', icon: '📺', color: '#E91E63', note: 'Streaming.' },
  { type: 'Despesas Fixas', category: 'Educação', subcategory: 'Cursos e Ensino', icon: '🎓', color: '#3F51B5', note: 'Cursos e ensino.' },
  { type: 'Despesas Fixas', category: 'Educação', subcategory: 'Livrarias e Papelarias', icon: '📚', color: '#5C6BC0', note: 'Livros e papelaria.' },
  { type: 'Despesas Fixas', category: 'Impostos e Taxas', subcategory: 'IOF e Impostos', icon: '🏦', color: '#F44336', note: 'Impostos.' },
  { type: 'Despesas Fixas', category: 'Saúde', subcategory: 'Odontologia', icon: '🦷', color: '#00BCD4', note: 'Dentistas.' },
  { type: 'Despesas Fixas', category: 'Saúde', subcategory: 'Médicos e Clínicas', icon: '⚕️', color: '#009688', note: 'Médicos e clínicas.' },

  // MOVIMENTAÇÕES (Receitas, Transferências, Investimentos e Saques)
  { type: 'Movimentações', category: 'Salário', subcategory: 'Salário e Rendimentos', icon: '💰', color: '#4CAF50', note: 'Recebimento de salário.' },
  { type: 'Movimentações', category: 'Receitas', subcategory: 'Rendimentos de Investimentos', icon: '💹', color: '#4CAF50', note: 'Juros e dividendos.' },
  { type: 'Movimentações', category: 'Investimentos', subcategory: 'Aplicações e Investimentos', icon: '📈', color: '#2196F3', note: 'CDB, LCA, Tesouro.' },
  { type: 'Movimentações', category: 'Investimentos', subcategory: 'Poupança e Capitalização', icon: '💰', color: '#4CAF50', note: 'Poupança.' },
  { type: 'Movimentações', category: 'Investimentos', subcategory: 'Corretoras e Fundos', icon: '📈', color: '#2196F3', note: 'Corretoras e fundos.' },
  { type: 'Movimentações', category: 'Transferências', subcategory: 'PIX', icon: '💸', color: '#00C853', note: 'PIX enviado/recebido.' },
  { type: 'Movimentações', category: 'Transferências', subcategory: 'TED/DOC', icon: '💸', color: '#FF9800', note: 'TED/DOC.' },
  { type: 'Movimentações', category: 'Saques', subcategory: 'Saques em Dinheiro', icon: '💵', color: '#9E9E9E', note: 'Saques ATM.' },
];

interface MonthData {
  month: string;
  monthLabel: string;
  spent: number;
  budget: number;
  subcategories: Record<string, number>;
}

export default function BudgetDetails() {
  const { categoryName } = useParams<{ categoryName: string }>();
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

  useEffect(() => {
    if (categoryName) {
      loadCategoryData();
    }
  }, [categoryName]);

  const loadCategoryData = async () => {
    setLoading(true);
    try {
      // Encontrar informações da categoria
      const rulesForCategory = ALL_CATEGORY_RULES.filter(r => r.category === decodeURIComponent(categoryName!));
      if (rulesForCategory.length === 0) {
        navigate('/app/budgets');
        return;
      }

      setCategoryInfo({
        icon: rulesForCategory[0].icon,
        color: rulesForCategory[0].color,
        type: rulesForCategory[0].type,
      });

      // Buscar transações dos últimos 12 meses
      const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
      const response = await transactionApi.getTransactions({
        start_date: format(twelveMonthsAgo, 'yyyy-MM-dd'),
        limit: 10000,
      });

      const txs = response.data.transactions;

      // Processar dados mensais
      const monthly: Record<string, MonthData> = {};
      const subcategoryTotals: Record<string, number[]> = {};

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

      // Processar transações
      txs.forEach((tx: Transaction) => {
        // Filtrar apenas despesas da categoria
        if (tx.amount >= 0) return;
        if (tx.category !== decodeURIComponent(categoryName!)) return;

        const month = format(new Date(tx.date), 'yyyy-MM');
        const amount = Math.abs(tx.amount);
        const subcat = tx.category; // Usar category como subcategory

        if (monthly[month]) {
          monthly[month].spent += amount;

          // Agrupar por subcategoria
          if (!monthly[month].subcategories[subcat]) {
            monthly[month].subcategories[subcat] = 0;
          }
          monthly[month].subcategories[subcat] += amount;

          // Coletar para cálculo de média por subcategoria
          if (!subcategoryTotals[subcat]) {
            subcategoryTotals[subcat] = [];
          }
          subcategoryTotals[subcat].push(amount);
        }
      });

      // Calcular média geral (budget sugerido)
      const monthlySpent = Object.values(monthly).map(m => m.spent).filter(s => s > 0);
      const avgBudget = monthlySpent.length > 0
        ? monthlySpent.reduce((sum, val) => sum + val, 0) / monthlySpent.length
        : 0;

      setSuggestedBudget(Math.round(avgBudget));

      // Aplicar budget a todos os meses
      Object.keys(monthly).forEach(month => {
        monthly[month].budget = Math.round(avgBudget);
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

  const handleBudgetSave = () => {
    if (customBudget !== null && customBudget > 0) {
      setSuggestedBudget(customBudget);
      // Atualizar budget em todos os meses
      setMonthlyData(prev => prev.map(m => ({ ...m, budget: customBudget })));
    }
    setIsEditingBudget(false);
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
        <Link
          to="/app/budgets"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Budgets
        </Link>

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
                    Sugerido: média dos últimos meses
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
    </div>
  );
}
