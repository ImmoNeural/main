import { useEffect, useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { budgetApi, transactionApi } from '../services/api';
import { startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface RadarData {
  category: string;
  orcado: number;
  realizado: number;
  desvio: number;
  desvioPercentual: number;
}

interface BudgetRadarChartProps {
  period?: number; // Em dias, padrão 30 (mês atual)
}

export const BudgetRadarChart = ({ period = 30 }: BudgetRadarChartProps) => {
  const [data, setData] = useState<RadarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<{
    maxDesvio: RadarData | null;
    totalOrcado: number;
    totalRealizado: number;
    desvioGeral: number;
  }>({
    maxDesvio: null,
    totalOrcado: 0,
    totalRealizado: 0,
    desvioGeral: 0,
  });

  useEffect(() => {
    loadRadarData();
  }, [period]);

  const loadRadarData = async () => {
    setLoading(true);
    try {
      // 1. Buscar budgets configurados
      const budgetsResponse = await budgetApi.getAllBudgets();
      const budgets = budgetsResponse.data;

      console.log('📊 [RADAR] Budgets carregados:', budgets);

      // 2. Buscar transações do período atual
      const now = new Date();
      const startDate = startOfMonth(now);
      const endDate = endOfMonth(now);

      const transactionsResponse = await transactionApi.getTransactions({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      const transactions = transactionsResponse.data.transactions;
      console.log(`📊 [RADAR] ${transactions.length} transações carregadas`);

      // 3. Agrupar despesas por categoria (apenas despesas, não receitas)
      const expensesByCategory: Record<string, number> = {};

      transactions
        .filter((t) => t.type === 'debit' && t.category)
        .forEach((t) => {
          const category = t.category!;
          if (!expensesByCategory[category]) {
            expensesByCategory[category] = 0;
          }
          expensesByCategory[category] += Math.abs(t.amount);
        });

      console.log('📊 [RADAR] Despesas por categoria:', expensesByCategory);

      // 4. Criar dados do radar combinando budgets e despesas
      const radarData: RadarData[] = [];

      // Pegar todas as categorias únicas (tanto com budget quanto com gasto)
      const allCategories = new Set([
        ...Object.keys(budgets),
        ...Object.keys(expensesByCategory),
      ]);

      allCategories.forEach((category) => {
        const orcado = budgets[category] || 0;
        const realizado = expensesByCategory[category] || 0;

        // Só incluir se tiver budget definido (não faz sentido mostrar sem budget)
        if (orcado > 0) {
          const desvio = realizado - orcado;
          const desvioPercentual = orcado > 0 ? ((desvio / orcado) * 100) : 0;

          radarData.push({
            category,
            orcado,
            realizado,
            desvio,
            desvioPercentual,
          });
        }
      });

      // Ordenar por maior orçamento (categorias mais relevantes primeiro)
      radarData.sort((a, b) => b.orcado - a.orcado);

      // Limitar a 8 categorias para não poluir o radar
      const limitedData = radarData.slice(0, 8);

      console.log('📊 [RADAR] Dados do radar (limitado a 8 categorias):', limitedData);

      setData(limitedData);

      // 5. Calcular análise
      if (limitedData.length > 0) {
        // Encontrar categoria com maior desvio absoluto
        const maxDesvio = limitedData.reduce((prev, current) =>
          Math.abs(current.desvio) > Math.abs(prev.desvio) ? current : prev
        );

        const totalOrcado = limitedData.reduce((sum, item) => sum + item.orcado, 0);
        const totalRealizado = limitedData.reduce((sum, item) => sum + item.realizado, 0);
        const desvioGeral = totalRealizado - totalOrcado;

        setAnalysis({
          maxDesvio,
          totalOrcado,
          totalRealizado,
          desvioGeral,
        });

        console.log('📊 [RADAR] Análise:', {
          maxDesvio: maxDesvio.category,
          desvioPercentual: maxDesvio.desvioPercentual.toFixed(1),
          desvioGeral: desvioGeral.toFixed(2),
        });
      }
    } catch (error) {
      console.error('❌ [RADAR] Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{data.category}</p>
          <p className="text-sm text-blue-600">
            Orçado: {formatCurrency(data.orcado)}
          </p>
          <p className="text-sm text-green-600">
            Realizado: {formatCurrency(data.realizado)}
          </p>
          <p className={`text-sm font-semibold ${data.desvio > 0 ? 'text-red-600' : 'text-green-600'}`}>
            Desvio: {formatCurrency(data.desvio)} ({data.desvioPercentual > 0 ? '+' : ''}{data.desvioPercentual.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Orçamento vs Realizado
        </h3>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm text-center">
            Configure orçamentos para suas categorias para visualizar esta análise.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Orçamento vs Realizado - Análise Radar
      </h3>

      {/* Gráfico de Radar */}
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'dataMax']}
            tick={{ fill: '#6b7280', fontSize: 10 }}
          />
          <Radar
            name="Orçado"
            dataKey="orcado"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
          />
          <Radar
            name="Realizado"
            dataKey="realizado"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.3}
          />
          <Legend />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Análise Automática */}
      {analysis.maxDesvio && (
        <div className="mt-6 space-y-4">
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Análise do Período
            </h4>

            {/* Card de Maior Desvio */}
            <div className={`p-4 rounded-lg mb-3 ${
              analysis.maxDesvio.desvio > 0
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                {analysis.maxDesvio.desvio > 0 ? (
                  <TrendingUp className="w-5 h-5 text-red-600 mt-0.5" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    Maior Desvio: {analysis.maxDesvio.category}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {analysis.maxDesvio.desvio > 0 ? (
                      <>
                        Gastou <span className="font-semibold text-red-700">
                          {formatCurrency(Math.abs(analysis.maxDesvio.desvio))} a mais
                        </span> que o orçado (
                        <span className="font-semibold">
                          +{analysis.maxDesvio.desvioPercentual.toFixed(1)}%
                        </span>).
                      </>
                    ) : (
                      <>
                        Economizou <span className="font-semibold text-green-700">
                          {formatCurrency(Math.abs(analysis.maxDesvio.desvio))}
                        </span> em relação ao orçado (
                        <span className="font-semibold">
                          {analysis.maxDesvio.desvioPercentual.toFixed(1)}%
                        </span>).
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Resumo Geral */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">Total Orçado</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatCurrency(analysis.totalOrcado)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700 font-medium">Total Realizado</p>
                <p className="text-lg font-bold text-green-900">
                  {formatCurrency(analysis.totalRealizado)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                analysis.desvioGeral > 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <p className={`text-xs font-medium ${
                  analysis.desvioGeral > 0 ? 'text-red-700' : 'text-green-700'
                }`}>
                  Desvio Geral
                </p>
                <p className={`text-lg font-bold ${
                  analysis.desvioGeral > 0 ? 'text-red-900' : 'text-green-900'
                }`}>
                  {analysis.desvioGeral > 0 ? '+' : ''}{formatCurrency(analysis.desvioGeral)}
                </p>
              </div>
            </div>

            {/* Interpretação */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold">Interpretação:</span> O gráfico de radar permite visualizar rapidamente
                {analysis.desvioGeral > 0 ? (
                  <> em quais categorias houve <span className="font-semibold text-red-700">excesso de gastos</span> e
                  onde há oportunidades de melhoria no controle financeiro.</>
                ) : (
                  <> que você manteve um <span className="font-semibold text-green-700">bom controle financeiro</span>,
                  gastando dentro ou abaixo do orçado na maioria das categorias.</>
                )}
                {' '}Quanto mais próximas as duas linhas (azul e verde), melhor o controle do orçamento.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
