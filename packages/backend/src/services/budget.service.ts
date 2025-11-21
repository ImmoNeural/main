import { supabase } from '../config/supabase';

/**
 * Sincroniza budgets com transações
 * - Identifica categorias sem budget
 * - Calcula média do período
 * - Cria linhas de acordo com tipo_categoria (normal ou hibrido)
 */
export async function syncBudgetsWithTransactions(user_id: string): Promise<void> {
  console.log(`\n🔄 [SYNC BUDGETS] Iniciando sincronização para user ${user_id}`);

  try {
    // 1. Buscar todas as transações do usuário (últimos 12 meses)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('category, amount, date')
      .eq('user_id', user_id)
      .lt('amount', 0) // Apenas despesas
      .gte('date', twelveMonthsAgo.toISOString().split('T')[0]);

    if (txError) {
      console.error('❌ [SYNC] Erro ao buscar transações:', txError.message);
      return;
    }

    if (!transactions || transactions.length === 0) {
      console.log('ℹ️ [SYNC] Nenhuma transação encontrada');
      return;
    }

    // 2. Calcular média mensal por categoria
    const categoryTotals: Record<string, { total: number; months: Set<string> }> = {};

    transactions.forEach(tx => {
      const category = tx.category;
      if (!category) return;

      const month = tx.date.substring(0, 7); // yyyy-MM
      const amount = Math.abs(tx.amount);

      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, months: new Set() };
      }

      categoryTotals[category].total += amount;
      categoryTotals[category].months.add(month);
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

    // 4. Buscar preferências (tipo_categoria)
    const { data: preferences, error: prefError } = await supabase
      .from('preferences')
      .select('category, subcategory, tipo_custo, tipo_categoria')
      .eq('user_id', user_id);

    if (prefError) {
      console.log('⚠️ [SYNC] Tabela preferences não encontrada ou erro:', prefError.message);
    }

    // Mapear tipo_categoria por categoria
    const categoryTypes: Record<string, 'normal' | 'hibrido'> = {};
    preferences?.forEach(p => {
      // Se qualquer subcategoria da categoria tem tipo_categoria='hibrido', a categoria é híbrida
      if (p.tipo_categoria === 'hibrido' || categoryTypes[p.category] === 'hibrido') {
        categoryTypes[p.category] = 'hibrido';
      } else {
        categoryTypes[p.category] = p.tipo_categoria || 'normal';
      }
    });

    // 5. Processar cada categoria com transações
    for (const [category, avgValue] of Object.entries(categoryAverages)) {
      const existingForCategory = budgetsByCategory[category] || [];
      const tipoCategoria = categoryTypes[category] || 'normal';

      console.log(`\n📂 [SYNC] Processando: ${category}`);
      console.log(`   Tipo: ${tipoCategoria}, Média: R$ ${avgValue.toFixed(2)}, Linhas existentes: ${existingForCategory.length}`);

      if (tipoCategoria === 'hibrido') {
        // Categoria híbrida: garantir 2 linhas (fixo + variavel)
        const hasFixo = existingForCategory.some(b => b.tipo_custo === 'fixo');
        const hasVariavel = existingForCategory.some(b => b.tipo_custo === 'variavel');

        // Se já tem ambas, verificar se têm valor
        if (hasFixo && hasVariavel) {
          // Atualizar apenas se budget_value é null ou 0
          for (const budget of existingForCategory) {
            if (!budget.budget_value || budget.budget_value === 0) {
              const valuePerType = Math.round(avgValue / 2);
              await supabase
                .from('custom_budgets')
                .update({ budget_value: valuePerType })
                .eq('id', budget.id);
              console.log(`   ✏️ Atualizado ${budget.tipo_custo}: R$ ${valuePerType.toFixed(2)}`);
            }
          }
        } else {
          // Criar linhas faltantes
          const valuePerType = Math.round(avgValue / 2);

          if (!hasFixo) {
            await supabase.from('custom_budgets').insert({
              user_id,
              category_name: category,
              budget_value: valuePerType,
              tipo_custo: 'fixo',
            });
            console.log(`   ➕ Criado FIXO: R$ ${valuePerType.toFixed(2)}`);
          }

          if (!hasVariavel) {
            await supabase.from('custom_budgets').insert({
              user_id,
              category_name: category,
              budget_value: valuePerType,
              tipo_custo: 'variavel',
            });
            console.log(`   ➕ Criado VARIÁVEL: R$ ${valuePerType.toFixed(2)}`);
          }
        }

      } else {
        // Categoria normal: garantir apenas 1 linha
        if (existingForCategory.length === 0) {
          // Criar linha
          await supabase.from('custom_budgets').insert({
            user_id,
            category_name: category,
            budget_value: avgValue,
          });
          console.log(`   ➕ Criado: R$ ${avgValue.toFixed(2)}`);

        } else if (existingForCategory.length === 1) {
          // Atualizar se não tem valor
          const budget = existingForCategory[0];
          if (!budget.budget_value || budget.budget_value === 0) {
            await supabase
              .from('custom_budgets')
              .update({ budget_value: avgValue })
              .eq('id', budget.id);
            console.log(`   ✏️ Atualizado: R$ ${avgValue.toFixed(2)}`);
          }

        } else {
          // Tem mais de 1 linha - consolidar
          const totalValue = existingForCategory.reduce((sum, b) => sum + (b.budget_value || 0), 0);
          const finalValue = totalValue > 0 ? totalValue : avgValue;

          // Deletar todas e criar uma única
          await supabase
            .from('custom_budgets')
            .delete()
            .eq('user_id', user_id)
            .eq('category_name', category);

          await supabase.from('custom_budgets').insert({
            user_id,
            category_name: category,
            budget_value: finalValue,
          });
          console.log(`   🔄 Consolidado ${existingForCategory.length} linhas em 1: R$ ${finalValue.toFixed(2)}`);
        }
      }
    }

    console.log(`\n✅ [SYNC BUDGETS] Sincronização concluída!\n`);

  } catch (error: any) {
    console.error('❌ [SYNC BUDGETS] Erro geral:', error.message || error);
  }
}
