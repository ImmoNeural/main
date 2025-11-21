import { supabase } from '../config/supabase';

/**
 * Sincroniza budgets com transações
 *
 * LÓGICA:
 * 1. Busca todas as categorias marcadas como 'hibrido' na tabela preferences
 * 2. Para cada categoria híbrida:
 *    - Se não existe em custom_budgets → cria 2 linhas (fixo + variavel)
 *    - Se existe 1 linha → adiciona a linha faltante
 *    - Se já existem 2 linhas → não faz nada
 * 3. Para categorias normais com transações: cria 1 linha se não existir
 */
export async function syncBudgetsWithTransactions(user_id: string): Promise<void> {
  console.log(`\n🔄 [SYNC BUDGETS] Iniciando sincronização para user ${user_id}`);

  try {
    // 1. Buscar todas as transações do usuário (últimos 12 meses) para calcular médias
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('category, amount, date')
      .eq('user_id', user_id)
      .lt('amount', 0); // Apenas despesas

    if (txError) {
      console.error('❌ [SYNC] Erro ao buscar transações:', txError.message);
      return;
    }

    // 2. Calcular média mensal por categoria
    const categoryTotals: Record<string, { total: number; months: Set<string> }> = {};

    (transactions || []).forEach(tx => {
      const category = tx.category;
      if (!category) return;

      const dateStr = typeof tx.date === 'number'
        ? new Date(tx.date).toISOString().substring(0, 7)
        : String(tx.date).substring(0, 7);
      const amount = Math.abs(tx.amount);

      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, months: new Set() };
      }

      categoryTotals[category].total += amount;
      categoryTotals[category].months.add(dateStr);
    });

    const categoryAverages: Record<string, number> = {};
    for (const [category, data] of Object.entries(categoryTotals)) {
      const monthCount = Math.max(data.months.size, 1);
      categoryAverages[category] = Math.round(data.total / monthCount);
    }

    console.log(`📊 [SYNC] Médias calculadas para ${Object.keys(categoryAverages).length} categorias`);

    // 3. Buscar budgets existentes
    const { data: existingBudgets, error: budgetError } = await supabase
      .from('custom_budgets')
      .select('*')
      .eq('user_id', user_id);

    if (budgetError) {
      console.error('❌ [SYNC] Erro ao buscar budgets:', budgetError.message);
      return;
    }

    // Mapear budgets existentes por categoria
    const budgetsByCategory: Record<string, any[]> = {};
    existingBudgets?.forEach(b => {
      if (!budgetsByCategory[b.category_name]) {
        budgetsByCategory[b.category_name] = [];
      }
      budgetsByCategory[b.category_name].push(b);
    });

    // 4. Buscar preferências - encontrar categorias HÍBRIDAS
    const { data: preferences, error: prefError } = await supabase
      .from('preferences')
      .select('category, subcategory, tipo_custo, tipo_categoria')
      .eq('user_id', user_id);

    if (prefError) {
      console.log('⚠️ [SYNC] Tabela preferences não encontrada ou erro:', prefError.message);
    }

    // Identificar categorias híbridas (onde tipo_categoria = 'hibrido')
    const hybridCategories = new Set<string>();
    preferences?.forEach(p => {
      if (p.tipo_categoria === 'hibrido') {
        hybridCategories.add(p.category);
      }
    });

    console.log(`🔀 [SYNC] Categorias híbridas encontradas: ${[...hybridCategories].join(', ') || 'nenhuma'}`);

    // 5. PROCESSAR CATEGORIAS HÍBRIDAS
    for (const category of hybridCategories) {
      const existingForCategory = budgetsByCategory[category] || [];
      const avgValue = categoryAverages[category] || 0;
      const valuePerType = Math.round(avgValue / 2);

      console.log(`\n📂 [SYNC] Processando categoria HÍBRIDA: ${category}`);
      console.log(`   Média: R$ ${avgValue.toFixed(2)}, Linhas existentes: ${existingForCategory.length}`);

      const hasFixo = existingForCategory.some(b => b.tipo_custo === 'fixo');
      const hasVariavel = existingForCategory.some(b => b.tipo_custo === 'variavel');

      // Se não existe nenhuma linha → criar 2 (fixo + variavel)
      if (existingForCategory.length === 0) {
        console.log(`   ➕ Criando 2 linhas (categoria não existia)`);

        await supabase.from('custom_budgets').insert({
          user_id,
          category_name: category,
          budget_value: valuePerType,
          tipo_custo: 'variavel',
        });
        console.log(`      ✅ Criado VARIÁVEL: R$ ${valuePerType.toFixed(2)}`);

        await supabase.from('custom_budgets').insert({
          user_id,
          category_name: category,
          budget_value: valuePerType,
          tipo_custo: 'fixo',
        });
        console.log(`      ✅ Criado FIXO: R$ ${valuePerType.toFixed(2)}`);

      // Se existe 1 linha → adicionar a faltante
      } else if (existingForCategory.length === 1) {
        console.log(`   ➕ Adicionando linha faltante (existia apenas 1)`);

        // Pegar o valor da linha existente para dividir
        const existingValue = existingForCategory[0].budget_value || avgValue;
        const newValuePerType = Math.round(existingValue / 2);

        // Atualizar a linha existente com metade do valor
        await supabase
          .from('custom_budgets')
          .update({ budget_value: newValuePerType })
          .eq('id', existingForCategory[0].id);

        // Criar a linha faltante
        if (!hasFixo) {
          await supabase.from('custom_budgets').insert({
            user_id,
            category_name: category,
            budget_value: newValuePerType,
            tipo_custo: 'fixo',
          });
          console.log(`      ✅ Criado FIXO: R$ ${newValuePerType.toFixed(2)}`);
        }

        if (!hasVariavel) {
          await supabase.from('custom_budgets').insert({
            user_id,
            category_name: category,
            budget_value: newValuePerType,
            tipo_custo: 'variavel',
          });
          console.log(`      ✅ Criado VARIÁVEL: R$ ${newValuePerType.toFixed(2)}`);
        }

      // Se já existem 2+ linhas com fixo E variavel → verificar se têm valor
      } else if (hasFixo && hasVariavel) {
        console.log(`   ✓ Já possui 2 linhas (fixo + variavel)`);

        // Atualizar apenas se budget_value é null ou 0
        for (const budget of existingForCategory) {
          if (!budget.budget_value || budget.budget_value === 0) {
            await supabase
              .from('custom_budgets')
              .update({ budget_value: valuePerType })
              .eq('id', budget.id);
            console.log(`      ✏️ Atualizado ${budget.tipo_custo}: R$ ${valuePerType.toFixed(2)}`);
          }
        }

      // Se existem linhas mas falta fixo ou variavel
      } else {
        console.log(`   ➕ Completando linhas faltantes`);

        if (!hasFixo) {
          await supabase.from('custom_budgets').insert({
            user_id,
            category_name: category,
            budget_value: valuePerType,
            tipo_custo: 'fixo',
          });
          console.log(`      ✅ Criado FIXO: R$ ${valuePerType.toFixed(2)}`);
        }

        if (!hasVariavel) {
          await supabase.from('custom_budgets').insert({
            user_id,
            category_name: category,
            budget_value: valuePerType,
            tipo_custo: 'variavel',
          });
          console.log(`      ✅ Criado VARIÁVEL: R$ ${valuePerType.toFixed(2)}`);
        }
      }
    }

    // 6. PROCESSAR CATEGORIAS NORMAIS (não híbridas) que têm transações
    for (const [category, avgValue] of Object.entries(categoryAverages)) {
      // Pular se é categoria híbrida (já foi processada)
      if (hybridCategories.has(category)) {
        continue;
      }

      const existingForCategory = budgetsByCategory[category] || [];

      // Se não existe nenhuma linha, criar uma
      if (existingForCategory.length === 0) {
        console.log(`\n📂 [SYNC] Processando categoria NORMAL: ${category}`);
        console.log(`   ➕ Criando linha: R$ ${avgValue.toFixed(2)}`);

        await supabase.from('custom_budgets').insert({
          user_id,
          category_name: category,
          budget_value: avgValue,
        });

      // Se existe 1 linha sem valor, atualizar
      } else if (existingForCategory.length === 1) {
        const budget = existingForCategory[0];
        if (!budget.budget_value || budget.budget_value === 0) {
          console.log(`\n📂 [SYNC] Processando categoria NORMAL: ${category}`);
          console.log(`   ✏️ Atualizando valor: R$ ${avgValue.toFixed(2)}`);

          await supabase
            .from('custom_budgets')
            .update({ budget_value: avgValue })
            .eq('id', budget.id);
        }
      }
      // Se já tem valor, não mexer
    }

    console.log(`\n✅ [SYNC BUDGETS] Sincronização concluída!\n`);

  } catch (error: any) {
    console.error('❌ [SYNC BUDGETS] Erro geral:', error.message || error);
  }
}
