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
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { getCategoryColor } from '../utils/colors';

interface RadarData {
  category: string;
  orcado: number;
  realizado: number;
  desvio: number;
  desvioPercentual: number;
  color: string;
}

export const BudgetRadarChart = () => {
  const [data, setData] = useState<RadarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
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

  // Gerar lista dos últimos 12 meses
  const getMonthsList = () => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(subMonths(new Date(), i));
    }
    return months;
  };

  useEffect(() => {
    loadRadarData();
  }, [selectedMonth]);

  const loadRadarData = async () => {
    setLoading(true);
    try {
      // 1. Buscar budgets configurados
      const budgetsResponse = await budgetApi.getAllBudgets();
      const budgets = budgetsResponse.data;

      console.log('📊 [RADAR] Budgets carregados:', budgets);

      // 2. Buscar transações do mês selecionado
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      console.log(`📊 [RADAR] Buscando transações de ${format(startDate, 'dd/MM/yyyy')} até ${format(endDate, 'dd/MM/yyyy')}`);

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
      console.log('📊 [RADAR] Total de categorias com despesas:', Object.keys(expensesByCategory).length);

      // 4. Criar dados do radar combinando budgets e despesas
      const radarData: RadarData[] = [];

      // Pegar todas as categorias únicas (tanto com budget quanto com gasto)
      const allCategories = Array.from(new Set([
        ...Object.keys(budgets),
        ...Object.keys(expensesByCategory),
      ]));

      console.log('📊 [RADAR] Total de categorias únicas (budgets + despesas):', allCategories.length);
      console.log('📊 [RADAR] Categorias únicas:', allCategories);

      allCategories.forEach((category, index) => {
        const orcado = budgets[category] || 0;
        const realizado = expensesByCategory[category] || 0;

        // Incluir apenas se tiver gasto realizado (despesa) E não for "Não categorizado"
        if (realizado > 0 && category !== 'Não categorizado' && category !== 'Sem Categoria') {
          const desvio = realizado - orcado;
          const desvioPercentual = orcado > 0 ? ((desvio / orcado) * 100) : 0;
          const color = getCategoryColor(category, index);

          radarData.push({
            category,
            orcado,
            realizado,
            desvio,
            desvioPercentual,
            color,
          });
        }
      });

      console.log('📊 [RADAR] Categorias após filtro (excluindo Não categorizado):', radarData.length);

      // Ordenar por MAIOR DESPESA REALIZADA (gasto real)
      radarData.sort((a, b) => b.realizado - a.realizado);

      // Pegar TODAS as categorias disponíveis (sem limitar a 18)
      console.log('📊 [RADAR] Total final de categorias no radar:', radarData.length);
      console.log('📊 [RADAR] Dados finais do radar:', radarData);

      setData(radarData);

      // 5. Calcular análise
      if (radarData.length > 0) {
        // Encontrar categoria com maior desvio absoluto
        const maxDesvio = radarData.reduce((prev, current) =>
          Math.abs(current.desvio) > Math.abs(prev.desvio) ? current : prev
        );

        const totalOrcado = radarData.reduce((sum, item) => sum + item.orcado, 0);
        const totalRealizado = radarData.reduce((sum, item) => sum + item.realizado, 0);
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
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-4 h-4 rounded"
              style={{ backgroundColor: data.color }}
            />
            <p className="font-semibold text-gray-900">{data.category}</p>
          </div>
          <p className="text-sm text-blue-600">
            Orçado: {formatCurrency(data.orcado)}
          </p>
          <p className="text-sm font-semibold" style={{ color: data.color }}>
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
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Seletor de Mês - Lado Esquerdo */}
        <div className="lg:w-48 flex-shrink-0">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Selecione o Mês:</h4>
          <div className="space-y-1">
            {getMonthsList().map((month, index) => {
              const isSelected = format(month, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM');
              return (
                <button
                  key={index}
                  onClick={() => setSelectedMonth(month)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {format(month, 'MMMM yyyy', { locale: ptBR })}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo Principal - Gráfico */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Todas as Categorias - Orçamento vs Realizado
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Mostrando {data.length} categorias com despesas em{' '}
            <span className="font-semibold text-blue-600">
              {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
          </p>

      {/* Gráfico de Radar */}
      <ResponsiveContainer width="100%" height={500}>
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="category"
            tick={(props: any) => {
              const { x, y, payload } = props;
              const item = data.find((d) => d.category === payload.value);
              const color = item?.color || '#6b7280';

              return (
                <text
                  x={x}
                  y={y}
                  textAnchor={x > 250 ? 'start' : 'end'}
                  fill={color}
                  fontSize={11}
                  fontWeight="600"
                >
                  {payload.value}
                </text>
              );
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, () => {
              // Calcular o maior valor entre orçado e realizado
              const maxValue = Math.max(...data.flatMap((item) => [item.orcado, item.realizado]));
              // Arredondar para o próximo múltiplo de 500 para escala limpa
              return Math.ceil(maxValue / 500) * 500;
            }]}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(value: number) => formatCurrency(value)}
          />
          {/* Polígono Azul - Orçado (Budget) */}
          <Radar
            name="Orçado (Budget)"
            dataKey="orcado"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.25}
            strokeWidth={2.5}
          />
          {/* Polígono Vermelho - Realizado (Gasto) */}
          <Radar
            name="Realizado (Gasto)"
            dataKey="realizado"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.25}
            strokeWidth={2.5}
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
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: analysis.maxDesvio.color }}
                    />
                    <p className="text-sm font-semibold text-gray-900">
                      Maior Desvio: {analysis.maxDesvio.category}
                    </p>
                  </div>
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

            {/* Interpretação e Análise */}
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-red-50 rounded-lg border border-gray-200">
              <p className="text-sm font-semibold text-gray-800 mb-2">📊 Análise Visual do Gráfico:</p>
              <div className="space-y-2 text-xs text-gray-700">
                <p>
                  <span className="font-semibold">Interpretação:</span> O gráfico de radar compara visualmente o{' '}
                  <span className="font-semibold text-blue-600">Orçamento Planejado (Azul)</span> com os{' '}
                  <span className="font-semibold text-red-600">Gastos Reais (Vermelho)</span> nas 18 categorias de maior impacto financeiro.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 font-bold">⚠️</span>
                    <div>
                      <p className="font-semibold text-red-700">Excesso de Gasto:</p>
                      <p>Quando a área <span className="font-semibold text-red-600">vermelha</span> se estende além da <span className="font-semibold text-blue-600">azul</span>, indica que os gastos superaram o orçamento naquela categoria.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <div>
                      <p className="font-semibold text-green-700">Economia:</p>
                      <p>Quando a área <span className="font-semibold text-red-600">vermelha</span> fica dentro da <span className="font-semibold text-blue-600">azul</span>, mostra que você economizou e gastou menos que o planejado.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-1">Diagnóstico Financeiro:</p>
                  {analysis.desvioGeral > 0 ? (
                    <p>
                      Há um <span className="font-semibold text-red-700">excesso de gastos de {formatCurrency(analysis.desvioGeral)}</span> nas top 18 categorias.
                      Categorias com maior extrapolação precisam de atenção para melhorar o controle financeiro.
                      Foque em ajustar os hábitos nas categorias onde o vermelho ultrapassa significativamente o azul.
                    </p>
                  ) : (
                    <p>
                      Parabéns! Você teve uma <span className="font-semibold text-green-700">economia de {formatCurrency(Math.abs(analysis.desvioGeral))}</span> nas top 18 categorias.
                      O orçamento foi respeitado, e os gastos ficaram controlados. Continue monitorando para manter esse padrão positivo.
                    </p>
                  )}
                </div>

                <p className="mt-2 text-xs text-gray-600">
                  <span className="font-semibold">Escala:</span> Os eixos radiais são calculados proporcionalmente ao maior valor encontrado ({formatCurrency(Math.max(...data.flatMap((item) => [item.orcado, item.realizado])))}).
                  Quanto mais distante do centro, maior o valor em Reais (R$).
                </p>
              </div>
            </div>

            {/* Ranking de Categorias */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs font-semibold text-gray-700 mb-2">Ranking por Despesa Realizada:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 font-semibold w-5">{index + 1}º</span>
                    <span
                      className="w-3 h-3 rounded flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-700 truncate">{item.category}</span>
                    <span className="text-gray-500 ml-auto">{formatCurrency(item.realizado)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
