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

// 🗺️ MAPEAMENTO DE SUBCATEGORIAS → CATEGORIAS
// Usado para corrigir transações que têm subcategoria no campo category
const SUBCATEGORY_TO_CATEGORY_MAP: Record<string, string> = {
  // Alimentação
  'Compras de Mercado': 'Supermercado',
  'Restaurantes e Delivery': 'Alimentação',
  'Padaria': 'Alimentação',
  // Saúde
  'Odontologia': 'Saúde',
  'Farmácias e Drogarias': 'Saúde',
  'Médicos e Clínicas': 'Saúde',
  'Academia e Fitness': 'Saúde',
  // Entretenimento
  'Lazer e Diversão': 'Entretenimento',
  'Streaming e Assinaturas': 'Entretenimento',
  // Transporte
  'Apps de Transporte': 'Transporte',
  'Combustível e Pedágio': 'Transporte',
  'Transporte Público': 'Transporte',
  'Seguros': 'Transporte',
  // Compras
  'E-commerce': 'Compras',
  'Moda e Vestuário': 'Compras',
  'Tecnologia': 'Compras',
  // Casa
  'Construção e Reforma': 'Casa',
  'Móveis e Decoração': 'Casa',
  // Banco e Seguradoras
  'Bancos e Fintechs': 'Banco e Seguradoras',
  'Seguradoras': 'Banco e Seguradoras',
  'Empréstimos Bancários': 'Banco e Seguradoras',
  'Financiamentos': 'Banco e Seguradoras',
  // Contas
  'Telefonia e Internet': 'Contas',
  'Energia e Água': 'Contas',
  'Condomínio': 'Contas',
  'Aluguel de Eletrodomésticos': 'Contas',
  'Aluguel de Imóvel': 'Contas',
  'Boletos e Débitos': 'Contas',
  // Educação
  'Livrarias e Papelarias': 'Educação',
  'Cursos e Ensino': 'Educação',
  // Pet
  'Alimentação Pet': 'Pet',
  'Médico Pet': 'Pet',
  'Tratamentos Pet': 'Pet',
  'Seguradoras Pet': 'Pet',
  // Viagens
  'Aéreo e Turismo': 'Viagens',
  // Investimentos
  'Aplicações e Investimentos': 'Investimentos',
  'Poupança e Capitalização': 'Investimentos',
  'Corretoras e Fundos': 'Investimentos',
  // Receitas
  'Salário e Rendimentos': 'Salário',
  'Rendimentos de Investimentos': 'Receitas',
  // Transferências
  'PIX': 'Transferências',
  'TED/DOC': 'Transferências',
  // Outros
  'Saques em Dinheiro': 'Saques',
  'IOF e Impostos': 'Impostos e Taxas',
  'Requer Classificação Manual': 'Não Categorizado',
};

/**
 * Converte subcategoria para categoria, se necessário
 * Se o valor for uma subcategoria conhecida, retorna a categoria correspondente
 * Caso contrário, retorna o valor original
 */
function normalizeCategory(categoryOrSubcategory: string): string {
  // Verificar se é uma subcategoria conhecida
  if (SUBCATEGORY_TO_CATEGORY_MAP[categoryOrSubcategory]) {
    return SUBCATEGORY_TO_CATEGORY_MAP[categoryOrSubcategory];
  }
  // Retornar o valor original (já é uma categoria)
  return categoryOrSubcategory;
}

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
      console.log('\n========== 🔍 INÍCIO DA ANÁLISE DO RADAR ==========');

      // 1. Buscar budgets configurados
      const budgetsResponse = await budgetApi.getAllBudgets();
      const budgets = budgetsResponse.data;

      console.log('\n📊 [STEP 1] BUDGETS CARREGADOS:');
      console.log('Total de categorias com budget:', Object.keys(budgets).length);
      console.log('Detalhes:', JSON.stringify(budgets, null, 2));

      // 2. Buscar transações do mês selecionado
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      console.log(`\n📊 [STEP 2] PERÍODO SELECIONADO:`);
      console.log(`De: ${format(startDate, 'dd/MM/yyyy HH:mm:ss')}`);
      console.log(`Até: ${format(endDate, 'dd/MM/yyyy HH:mm:ss')}`);

      const transactionsResponse = await transactionApi.getTransactions({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        limit: 1000, // Buscar TODAS as transações do mês (sem limite de 100)
      });

      const transactions = transactionsResponse.data.transactions;
      console.log(`\n📊 [STEP 3] TRANSAÇÕES CARREGADAS:`);
      console.log(`Total geral: ${transactions.length} transações`);

      // Análise detalhada das transações
      const debitTransactions = transactions.filter((t) => t.type === 'debit');
      const creditTransactions = transactions.filter((t) => t.type === 'credit');
      const debitWithCategory = debitTransactions.filter((t) => t.category);
      const debitWithoutCategory = debitTransactions.filter((t) => !t.category);

      console.log(`  - Débitos (despesas): ${debitTransactions.length}`);
      console.log(`  - Créditos (receitas): ${creditTransactions.length}`);
      console.log(`  - Débitos COM categoria: ${debitWithCategory.length}`);
      console.log(`  - Débitos SEM categoria: ${debitWithoutCategory.length}`);

      // 3. Agrupar despesas por categoria (apenas despesas, não receitas)
      const expensesByCategory: Record<string, number> = {};
      const transactionsByCategory: Record<string, any[]> = {};

      console.log(`\n📊 [STEP 4] AGREGANDO DESPESAS POR CATEGORIA:`);
      console.log(`\n🔍 ANÁLISE DETALHADA DE TODAS AS TRANSAÇÕES:`);

      // Log de TODAS as transações antes de filtrar
      console.log(`\n📝 TODAS AS ${transactions.length} TRANSAÇÕES (antes do filtro):`);
      const categoryCounts: Record<string, number> = {};

      transactions.forEach((t, idx) => {
        const cat = t.category || 'SEM CATEGORIA';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

        // Log das primeiras 20 transações para debug
        if (idx < 20) {
          console.log(`  #${idx + 1}: ${t.type} | ${cat} | R$ ${Math.abs(t.amount).toFixed(2)} | ${t.description || 'sem descrição'}`);
        }
      });

      console.log(`\n📊 CONTAGEM BRUTA POR CATEGORIA (TODAS as transações):`);
      Object.entries(categoryCounts).sort(([,a], [,b]) => b - a).forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count} transações`);
      });

      let processedCount = 0;
      let skippedCount = 0;

      console.log(`\n🔍 PROCESSANDO APENAS DÉBITOS COM CATEGORIA:`);

      transactions.forEach((t, idx) => {
        const isDebit = t.type === 'debit';
        const hasCategory = !!t.category;

        if (!isDebit || !hasCategory) {
          skippedCount++;
          if (skippedCount <= 10) {
            console.log(`  ⏭️ Pulando #${idx + 1}: type=${t.type}, category=${t.category || 'null'}, motivo=${!isDebit ? 'não é débito' : 'sem categoria'}`);
          }
          return;
        }

        // 🔄 NORMALIZAR: Se t.category contém uma subcategoria, converte para categoria
        const rawCategory = t.category!;
        const category = normalizeCategory(rawCategory);
        const amount = Math.abs(t.amount);

        // Log se houve conversão de subcategoria → categoria
        if (rawCategory !== category) {
          console.log(`  🔄 Convertido: "${rawCategory}" → "${category}"`);
        }

        // Inicializar se não existe
        if (!expensesByCategory[category]) {
          expensesByCategory[category] = 0;
          transactionsByCategory[category] = [];
          console.log(`  🆕 Nova categoria detectada: "${category}"`);
        }

        // Adicionar ao total
        expensesByCategory[category] += amount;
        transactionsByCategory[category].push({
          id: t.id,
          date: new Date(t.date).toLocaleDateString('pt-BR'),
          description: t.description,
          merchant: t.merchant,
          amount: amount,
        });

        processedCount++;
      });

      console.log(`\n✅ ${processedCount} transações de débito COM categoria processadas`);
      console.log(`⏭️ ${skippedCount} transações puladas`);
      console.log(`✅ ${Object.keys(expensesByCategory).length} categorias únicas identificadas\n`);

      // Log detalhado de cada categoria
      console.log('📋 DESPESAS POR CATEGORIA (ordenado por valor):');
      const sortedCategories = Object.entries(expensesByCategory)
        .sort(([, a], [, b]) => b - a);

      sortedCategories.forEach(([category, total], index) => {
        const txCount = transactionsByCategory[category].length;
        console.log(`${index + 1}. ${category}:`);
        console.log(`   Total: R$ ${total.toFixed(2)}`);
        console.log(`   Transações: ${txCount}`);
        console.log(`   Média por transação: R$ ${(total / txCount).toFixed(2)}`);
      });

      // 4. Criar dados do radar combinando budgets e despesas
      const radarData: RadarData[] = [];

      // Pegar todas as categorias únicas (tanto com budget quanto com gasto)
      const allCategories = Array.from(new Set([
        ...Object.keys(budgets),
        ...Object.keys(expensesByCategory),
      ]));

      console.log(`\n📊 [STEP 5] COMBINANDO BUDGETS E DESPESAS:`);
      console.log(`Total de categorias únicas: ${allCategories.length}`);
      console.log(`Categorias:`, allCategories.sort());

      console.log(`\n🔍 ANÁLISE DETALHADA DAS CATEGORIAS:`);
      console.log(`📌 Categorias SOMENTE com budget (${Object.keys(budgets).length}):`);
      Object.keys(budgets).sort().forEach((cat) => {
        console.log(`  - ${cat}: R$ ${budgets[cat].toFixed(2)}`);
      });

      console.log(`\n📌 Categorias SOMENTE com despesas (${Object.keys(expensesByCategory).length}):`);
      Object.keys(expensesByCategory).sort().forEach((cat) => {
        console.log(`  - ${cat}: R$ ${expensesByCategory[cat].toFixed(2)}`);
      });

      console.log(`\n📌 Categorias que aparecem em AMBOS:`);
      const inBoth = Object.keys(budgets).filter(cat => expensesByCategory[cat]);
      console.log(`  Total: ${inBoth.length}`);
      inBoth.forEach(cat => {
        console.log(`  - ${cat}: Budget R$ ${budgets[cat].toFixed(2)} | Realizado R$ ${expensesByCategory[cat].toFixed(2)}`);
      });

      console.log(`\n📌 Categorias SOMENTE com budget (sem despesas):`);
      const onlyBudget = Object.keys(budgets).filter(cat => !expensesByCategory[cat]);
      console.log(`  Total: ${onlyBudget.length}`);
      onlyBudget.forEach(cat => {
        console.log(`  - ${cat}: R$ ${budgets[cat].toFixed(2)}`);
      });

      console.log(`\n📌 Categorias SOMENTE com despesas (sem budget):`);
      const onlyExpenses = Object.keys(expensesByCategory).filter(cat => !budgets[cat]);
      console.log(`  Total: ${onlyExpenses.length}`);
      onlyExpenses.forEach(cat => {
        console.log(`  - ${cat}: R$ ${expensesByCategory[cat].toFixed(2)}`);
      });

      console.log(`\n📊 [STEP 6] CRIANDO DADOS DO RADAR:`);

      // Lista de categorias que são RECEITAS e devem ser EXCLUÍDAS do radar de despesas
      // APENAS Salário e Receita são receitas verdadeiras
      const CATEGORIAS_RECEITA = [
        'Salário',
        'Receita',
      ];

      console.log(`\n⚠️ CATEGORIAS DE RECEITA (serão excluídas do radar):`);
      console.log(CATEGORIAS_RECEITA);

      // Calcular totais de budget (com e sem receitas)
      const totalBudgetGeral = Object.values(budgets).reduce((sum, val) => sum + val, 0);
      const totalBudgetDespesas = Object.entries(budgets)
        .filter(([cat]) => !CATEGORIAS_RECEITA.includes(cat))
        .reduce((sum, [, val]) => sum + val, 0);
      const totalBudgetReceitas = Object.entries(budgets)
        .filter(([cat]) => CATEGORIAS_RECEITA.includes(cat))
        .reduce((sum, [, val]) => sum + val, 0);

      console.log(`\n💰 ANÁLISE DOS BUDGETS:`);
      console.log(`   Total Geral (todas categorias): R$ ${totalBudgetGeral.toFixed(2)}`);
      console.log(`   Total Despesas (excluindo receitas): R$ ${totalBudgetDespesas.toFixed(2)}`);
      console.log(`   Total Receitas (excluídas): R$ ${totalBudgetReceitas.toFixed(2)}`);
      console.log(`   Diferença: R$ ${totalBudgetGeral.toFixed(2)} - R$ ${totalBudgetReceitas.toFixed(2)} = R$ ${totalBudgetDespesas.toFixed(2)}`);

      let includedCount = 0;
      let excludedCount = 0;

      allCategories.forEach((category, index) => {
        const orcado = budgets[category] || 0;
        const realizado = expensesByCategory[category] || 0;

        // Verificar se é categoria de receita
        const isReceitaCategory = CATEGORIAS_RECEITA.includes(category);

        // Verificar se é categoria "não categorizado" (várias formas de escrita)
        const isNaoCategorizado =
          category.toLowerCase().includes('não categorizado') ||
          category.toLowerCase().includes('nao categorizado') ||
          category.toLowerCase().includes('sem categoria') ||
          category.toLowerCase().includes('uncategorized') ||
          category.toLowerCase() === 'outros' ||
          category.toLowerCase() === 'other';

        // Log de cada categoria sendo avaliada
        // INCLUIR: Categorias com budget OU com despesas
        // EXCLUIR: Não categorizado, Sem Categoria, e CATEGORIAS DE RECEITA
        const shouldInclude = (orcado > 0 || realizado > 0)
          && !isNaoCategorizado
          && !isReceitaCategory;

        if (shouldInclude) {
          const desvio = realizado - orcado;

          // Calcular desvio percentual de forma correta
          let desvioPercentual = 0;
          if (orcado > 0) {
            desvioPercentual = ((desvio / orcado) * 100);
          } else if (realizado > 0) {
            // Se não há budget mas há gasto, considerar como 100% de excesso
            desvioPercentual = 100;
          }
          // Se orcado = 0 e realizado = 0, desvioPercentual fica 0

          const color = getCategoryColor(category, index);

          radarData.push({
            category,
            orcado,
            realizado,
            desvio,
            desvioPercentual,
            color,
          });

          console.log(`  ✅ #${includedCount + 1} ${category}:`);
          console.log(`     Orçado: R$ ${orcado.toFixed(2)}`);
          console.log(`     Realizado: R$ ${realizado.toFixed(2)}`);
          console.log(`     Desvio: R$ ${desvio.toFixed(2)} (${desvioPercentual.toFixed(1)}%)`);
          console.log(`     Cor: ${color}`);

          includedCount++;
        } else {
          excludedCount++;
          const motivo = isReceitaCategory
            ? '🏦 CATEGORIA DE RECEITA (não entra no radar de despesas)'
            : isNaoCategorizado
            ? '❓ NÃO CATEGORIZADO (excluído do radar)'
            : (orcado === 0 && realizado === 0)
            ? 'sem budget e sem despesas'
            : 'outro motivo';
          console.log(`  ❌ Excluída: ${category} (orçado: R$ ${orcado.toFixed(2)}, realizado: R$ ${realizado.toFixed(2)}, motivo: ${motivo})`);
        }
      });

      console.log(`\n✅ Categorias incluídas no radar: ${includedCount}`);
      console.log(`❌ Categorias excluídas: ${excludedCount}`);

      // Ordenar por MAIOR DESPESA REALIZADA (gasto real)
      radarData.sort((a, b) => b.realizado - a.realizado);

      console.log(`\n📊 [STEP 7] RANKING FINAL (ordenado por despesa real):`);
      radarData.forEach((item, index) => {
        console.log(`${index + 1}º. ${item.category} - R$ ${item.realizado.toFixed(2)}`);
      });

      setData(radarData);

      // 5. Calcular análise
      console.log(`\n📊 [STEP 8] CALCULANDO ANÁLISE GERAL:`);

      if (radarData.length > 0) {
        // Calcular totais
        console.log(`\nCalculando totais de ${radarData.length} categorias:`);

        let totalOrcado = 0;
        let totalRealizado = 0;

        radarData.forEach((item, index) => {
          totalOrcado += item.orcado;
          totalRealizado += item.realizado;

          console.log(`  ${index + 1}. ${item.category}:`);
          console.log(`     Contribuição orçado: R$ ${item.orcado.toFixed(2)}`);
          console.log(`     Contribuição realizado: R$ ${item.realizado.toFixed(2)}`);
        });

        const desvioGeral = totalRealizado - totalOrcado;
        const desvioGeralPercentual = totalOrcado > 0 ? ((desvioGeral / totalOrcado) * 100) : 0;

        console.log(`\n💰 TOTAIS FINAIS:`);
        console.log(`   Total Orçado: R$ ${totalOrcado.toFixed(2)}`);
        console.log(`   Total Realizado: R$ ${totalRealizado.toFixed(2)}`);
        console.log(`   Desvio Geral: R$ ${desvioGeral.toFixed(2)} (${desvioGeralPercentual.toFixed(1)}%)`);
        console.log(`   Status: ${desvioGeral > 0 ? '❌ ACIMA DO ORÇAMENTO' : '✅ DENTRO DO ORÇAMENTO'}`);

        // Encontrar categoria com maior desvio absoluto
        const maxDesvio = radarData.reduce((prev, current) =>
          Math.abs(current.desvio) > Math.abs(prev.desvio) ? current : prev
        );

        console.log(`\n⚠️ CATEGORIA COM MAIOR DESVIO:`);
        console.log(`   Categoria: ${maxDesvio.category}`);
        console.log(`   Orçado: R$ ${maxDesvio.orcado.toFixed(2)}`);
        console.log(`   Realizado: R$ ${maxDesvio.realizado.toFixed(2)}`);
        console.log(`   Desvio: R$ ${maxDesvio.desvio.toFixed(2)} (${maxDesvio.desvioPercentual.toFixed(1)}%)`);

        // Validações de integridade
        console.log(`\n🔍 VALIDAÇÕES DE INTEGRIDADE:`);

        // Verificar se algum valor é NaN
        const hasNaN = radarData.some((item) =>
          isNaN(item.orcado) || isNaN(item.realizado) || isNaN(item.desvio) || isNaN(item.desvioPercentual)
        );
        console.log(`   ✓ Valores NaN detectados: ${hasNaN ? '❌ SIM - ERRO!' : '✅ Não'}`);

        // Verificar se algum valor é negativo (realizado não pode ser negativo)
        const hasNegativeRealizado = radarData.some((item) => item.realizado < 0);
        console.log(`   ✓ Valores negativos em 'realizado': ${hasNegativeRealizado ? '❌ SIM - ERRO!' : '✅ Não'}`);

        // Verificar se soma dos valores individuais bate com o total
        const sumCheck = Math.abs(totalRealizado - radarData.reduce((sum, item) => sum + item.realizado, 0)) < 0.01;
        console.log(`   ✓ Soma de verificação: ${sumCheck ? '✅ OK' : '❌ ERRO - Totais não batem!'}`);

        setAnalysis({
          maxDesvio,
          totalOrcado,
          totalRealizado,
          desvioGeral,
        });

        console.log(`\n========== ✅ FIM DA ANÁLISE DO RADAR ==========\n`);
      } else {
        console.log(`\n⚠️ Nenhuma categoria para analisar.`);
        console.log(`========== ⚠️ FIM DA ANÁLISE DO RADAR (VAZIO) ==========\n`);
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
            Categorias de Despesas - Orçamento vs Realizado
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Mostrando {data.length} categorias de despesas em{' '}
            <span className="font-semibold text-blue-600">
              {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            {' '}(excluindo apenas Salário e Receita)
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
                  <span className="font-semibold text-red-600">Gastos Reais (Vermelho)</span> nas {data.length} categorias de despesas (excluindo receitas).
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
                      Há um <span className="font-semibold text-red-700">excesso de gastos de {formatCurrency(analysis.desvioGeral)}</span> nas {data.length} categorias de despesas.
                      Categorias com maior extrapolação precisam de atenção para melhorar o controle financeiro.
                      Foque em ajustar os hábitos nas categorias onde o vermelho ultrapassa significativamente o azul.
                    </p>
                  ) : (
                    <p>
                      Parabéns! Você teve uma <span className="font-semibold text-green-700">economia de {formatCurrency(Math.abs(analysis.desvioGeral))}</span> nas {data.length} categorias de despesas.
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
